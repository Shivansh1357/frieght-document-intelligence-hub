import base64
import json
import logging
import time
from typing import Any

import anthropic

from app.config import Settings
from app.core.prompts import EXTRACTION_PROMPT, SYSTEM_PROMPT

logger = logging.getLogger(__name__)

settings = Settings()


class ClaudeClient:
    """Wrapper around the Anthropic API for document extraction."""

    MAX_RETRIES = 3

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.anthropic_api_key
        self.model = settings.claude_model
        self.client = anthropic.Anthropic(api_key=self.api_key)

    def extract_document(
        self, images: list[tuple[str, str]]
    ) -> dict[str, Any]:
        """Extract structured data from document images using Claude.

        Args:
            images: List of (base64_data, media_type) tuples.
                    media_type should be 'image/png', 'image/jpeg', etc.

        Returns:
            Parsed JSON extraction result.

        Raises:
            ExtractionError: If extraction fails after all retries.
        """
        content = []
        for b64_data, media_type in images:
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
        content.append({"type": "text", "text": EXTRACTION_PROMPT})

        last_error = None
        for attempt in range(1, self.MAX_RETRIES + 1):
            try:
                logger.info(
                    "Claude extraction attempt %d/%d for %d image(s)",
                    attempt,
                    self.MAX_RETRIES,
                    len(images),
                )
                start_time = time.time()

                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=8192,
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
                    raise json.JSONDecodeError(
                        "Empty response from Claude", raw_text, 0
                    )

                # Strip markdown code fences if present
                text = raw_text.strip()
                if text.startswith("```"):
                    # Remove opening fence (```json or ```)
                    first_newline = text.index("\n")
                    text = text[first_newline + 1 :]
                    # Remove closing fence
                    if text.rstrip().endswith("```"):
                        text = text.rstrip()[:-3].rstrip()

                # Parse the JSON response
                result = json.loads(text)
                result["_meta"] = {
                    "model": self.model,
                    "duration_ms": duration_ms,
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                }
                return result

            except json.JSONDecodeError as e:
                last_error = e
                logger.warning(
                    "Failed to parse Claude response as JSON on attempt %d: %s",
                    attempt,
                    str(e),
                )
            except anthropic.APIError as e:
                last_error = e
                logger.warning(
                    "Anthropic API error on attempt %d: %s", attempt, str(e)
                )
            except Exception as e:
                last_error = e
                logger.error(
                    "Unexpected error on attempt %d: %s", attempt, str(e)
                )

        raise ExtractionError(
            f"Extraction failed after {self.MAX_RETRIES} attempts: {last_error}"
        )


class ExtractionError(Exception):
    """Raised when document extraction fails."""

    pass
