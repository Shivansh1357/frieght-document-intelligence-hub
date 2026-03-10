import json
import logging
import time
from typing import Any

import anthropic

from app.config import Settings
from app.core.prompts import EXTRACTION_PROMPT, LOW_QUALITY_RETRY_PROMPT, SYSTEM_PROMPT

logger = logging.getLogger(__name__)

settings = Settings()

# Minimum number of non-null fields to consider extraction acceptable
MIN_EXTRACTED_FIELDS = 5


def _assess_extraction_quality(result: dict[str, Any]) -> tuple[bool, int]:
    """Check if extraction returned enough non-null fields.

    Returns:
        Tuple of (is_acceptable, non_null_count).
    """
    fields = result.get("fields", {})
    non_null = 0
    for field_data in fields.values():
        if isinstance(field_data, dict):
            value = field_data.get("value")
            if value is not None and value != "" and value != []:
                non_null += 1
        elif field_data is not None:
            non_null += 1
    return non_null >= MIN_EXTRACTED_FIELDS, non_null


class ClaudeClient:
    """Wrapper around the Anthropic API for document extraction."""

    MAX_RETRIES = 3

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.anthropic_api_key
        self.model = settings.claude_model
        self.client = anthropic.Anthropic(api_key=self.api_key)

    def _build_content(
        self, images: list[tuple[str, str]], prompt: str
    ) -> list[dict]:
        """Build the content array with page-numbered images."""
        content = []
        total_pages = len(images)
        for i, (b64_data, media_type) in enumerate(images, 1):
            # Add page number context for multi-page documents
            if total_pages > 1:
                content.append(
                    {"type": "text", "text": f"Page {i} of {total_pages}:"}
                )
            content.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": b64_data,
                    },
                }
            )
        content.append({"type": "text", "text": prompt})
        return content

    def _call_claude(self, content: list[dict]) -> tuple[dict, int]:
        """Make a single Claude API call and parse the JSON response.

        Returns:
            Tuple of (parsed_result, duration_ms).

        Raises:
            json.JSONDecodeError: If response is not valid JSON.
        """
        start_time = time.time()

        response = self.client.messages.create(
            model=self.model,
            max_tokens=16384,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content}],
        )

        duration_ms = int((time.time() - start_time) * 1000)

        # Extract text from response content blocks
        raw_text = ""
        for block in response.content:
            if hasattr(block, "text"):
                raw_text += block.text

        if not raw_text.strip():
            raise json.JSONDecodeError("Empty response from Claude", raw_text, 0)

        # Strip markdown code fences if present
        text = raw_text.strip()
        if text.startswith("```"):
            first_newline = text.index("\n")
            text = text[first_newline + 1 :]
            if text.rstrip().endswith("```"):
                text = text.rstrip()[:-3].rstrip()

        result = json.loads(text)
        result["_meta"] = {
            "model": self.model,
            "duration_ms": duration_ms,
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        }
        return result, duration_ms

    def extract_document(
        self, images: list[tuple[str, str]]
    ) -> dict[str, Any]:
        """Extract structured data from document images using Claude.

        Uses a two-phase approach:
        1. Standard extraction with the main prompt
        2. If extraction quality is low (<5 non-null fields), retry with
           an enhanced prompt that asks Claude to look more carefully

        Args:
            images: List of (base64_data, media_type) tuples.

        Returns:
            Parsed JSON extraction result.

        Raises:
            ExtractionError: If extraction fails after all retries.
        """
        last_error = None
        best_result = None
        best_field_count = 0

        for attempt in range(1, self.MAX_RETRIES + 1):
            try:
                logger.info(
                    "Claude extraction attempt %d/%d for %d image(s)",
                    attempt,
                    self.MAX_RETRIES,
                    len(images),
                )

                # Use enhanced prompt on retry if previous result was low quality
                if attempt > 1 and best_result is not None:
                    prompt = LOW_QUALITY_RETRY_PROMPT + "\n\n" + EXTRACTION_PROMPT
                    logger.info("Using enhanced retry prompt (previous attempt extracted %d fields)", best_field_count)
                else:
                    prompt = EXTRACTION_PROMPT

                content = self._build_content(images, prompt)
                result, duration_ms = self._call_claude(content)

                # Assess extraction quality
                is_acceptable, field_count = _assess_extraction_quality(result)
                line_items = result.get("line_items", [])
                confidence = result.get("overall_confidence", 0)

                logger.info(
                    "Extraction result: %d/%d fields non-null, %d line items, %.0f%% confidence",
                    field_count,
                    len(result.get("fields", {})),
                    len(line_items),
                    confidence,
                )

                # Keep the best result seen so far
                if field_count > best_field_count:
                    best_result = result
                    best_field_count = field_count

                if is_acceptable:
                    return result

                # Low quality — retry with enhanced prompt
                logger.warning(
                    "Low quality extraction on attempt %d: only %d non-null fields. Retrying...",
                    attempt,
                    field_count,
                )

            except json.JSONDecodeError as e:
                last_error = e
                logger.warning(
                    "Failed to parse Claude response as JSON on attempt %d: %s",
                    attempt,
                    str(e),
                )
            except anthropic.APIStatusError as e:
                last_error = e
                # Detect credit exhaustion (HTTP 400 or 403 with specific message)
                body = str(e)
                if "credit balance" in body.lower() or ("too low" in body.lower() and "credit" in body.lower()):
                    raise ExtractionError(f"CREDIT_EXHAUSTED: Your Anthropic API credit balance is too low. Please add credits at console.anthropic.com.")
                elif e.status_code == 429:
                    raise ExtractionError(f"RATE_LIMITED: Anthropic API rate limit reached. Please wait and try again. (HTTP {e.status_code})")
                elif e.status_code == 401:
                    raise ExtractionError(f"AUTH_ERROR: Anthropic API key is invalid or expired. (HTTP {e.status_code})")
                else:
                    last_error = e
                    logger.warning("Anthropic API status error on attempt %d: HTTP %d %s", attempt, e.status_code, str(e)[:200])
            except anthropic.APIConnectionError as e:
                last_error = e
                logger.warning("Anthropic connection error on attempt %d: %s", attempt, str(e)[:200])
            except anthropic.APIError as e:
                # Catch HTML 502 responses (Cloudflare gateway errors)
                body = str(e)
                if "502" in body or "bad gateway" in body.lower():
                    last_error = e
                    logger.warning("Anthropic 502 Bad Gateway on attempt %d (API may be down or credits exhausted)", attempt)
                else:
                    last_error = e
                    logger.warning("Anthropic API error on attempt %d: %s", attempt, body[:200])
            except Exception as e:
                last_error = e
                logger.error(
                    "Unexpected error on attempt %d: %s", attempt, str(e)
                )

            # Exponential backoff between retries
            if attempt < self.MAX_RETRIES:
                backoff = 2 ** attempt
                logger.info("Backing off %d seconds before retry", backoff)
                time.sleep(backoff)

        # Return best result even if it's low quality, rather than failing entirely
        if best_result is not None:
            logger.warning(
                "Returning best extraction result with %d fields after %d attempts",
                best_field_count,
                self.MAX_RETRIES,
            )
            return best_result

        # Build a descriptive error message from the last known error
        last_err_str = str(last_error) if last_error else "Unknown error"
        if "502" in last_err_str or "bad gateway" in last_err_str.lower():
            detail = "CONNECTION_ERROR: Received 502 Bad Gateway from Anthropic — the API may be down or your API key may have hit its usage limit."
        elif isinstance(last_error, anthropic.APIConnectionError) or "connection error" in last_err_str.lower():
            detail = f"CONNECTION_ERROR: Could not reach the Anthropic API. Please check your internet connection and try again."
        else:
            detail = f"API_ERROR: {last_err_str[:300]}"

        raise ExtractionError(f"Extraction failed after {self.MAX_RETRIES} attempts: {detail}")


class ExtractionError(Exception):
    """Raised when document extraction fails."""

    pass
