"""Copilot chat endpoint — AI-powered assistant with DB access."""

import logging
import json
from typing import Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import text

from app.config import Settings
from app.dependencies import DbDep, OrgIdDep

logger = logging.getLogger(__name__)
settings = Settings()

router = APIRouter()


class CopilotMessage(BaseModel):
    question: str
    page_context: Optional[dict] = None


class CopilotResponse(BaseModel):
    answer: str
    data: Optional[dict] = None


# System prompt that gives Claude DB knowledge and role context
COPILOT_SYSTEM_PROMPT = """You are an AI assistant for the Freight Document Intelligence Hub — a platform that processes commercial invoices, packing lists, and bills of lading using AI extraction.

You have access to a PostgreSQL database with the following schema:

TABLES:
1. documents (id UUID, org_id UUID, file_name TEXT, document_type TEXT, status TEXT [uploaded/processing/extracted/reviewed/approved], uploaded_at TIMESTAMP, file_hash TEXT, is_deleted BOOLEAN)
2. extracted_data (id UUID, document_id UUID FK→documents, shipper_name TEXT, shipper_address TEXT, consignee_name TEXT, consignee_address TEXT, vessel_name TEXT, voyage_number TEXT, mbl_number TEXT, hbl_number TEXT, port_of_lading TEXT, port_of_discharge TEXT, country_of_origin TEXT, country_of_destination TEXT, incoterms TEXT, payment_terms TEXT, total_declared_value NUMERIC, currency TEXT, total_gross_weight NUMERIC, total_net_weight NUMERIC, weight_unit TEXT, total_packages INT, package_type TEXT, document_date DATE, invoice_number TEXT, overall_confidence NUMERIC, reference_numbers TEXT[])
3. line_items (id UUID, extracted_data_id UUID FK→extracted_data, description TEXT, hs_code TEXT, quantity NUMERIC, unit TEXT, unit_price NUMERIC, total_amount NUMERIC, currency TEXT, net_weight NUMERIC, gross_weight NUMERIC, confidence NUMERIC)
4. extraction_fields (id UUID, extracted_data_id UUID FK→extracted_data, field_name TEXT, field_value TEXT, confidence_score NUMERIC)
5. field_corrections (id UUID, document_id UUID FK→documents, field_name TEXT, original_value TEXT, corrected_value TEXT, corrected_by TEXT, corrected_at TIMESTAMP, correction_reason TEXT)

IMPORTANT RULES:
- Write PostgreSQL-compatible SQL queries when the user asks data questions
- Always filter by org_id = :org_id for multi-tenant isolation
- Always filter documents.is_deleted = false
- Return your SQL in a <sql> tag if you need to query
- Keep answers concise and helpful
- You can answer about: document counts, field values, confidence scores, corrections, comparisons, status breakdowns, shipper/consignee info, weights, values, etc.
- For UI navigation questions, guide the user to the right page
- Format numbers nicely (commas, percentages, currency)
- If you cannot answer from the data, say so honestly

CURRENT PAGE CONTEXT (what the user is looking at):
{page_context}
"""


def extract_sql(response_text: str) -> Optional[str]:
    """Extract SQL from <sql> tags in Claude's response."""
    if "<sql>" in response_text and "</sql>" in response_text:
        start = response_text.index("<sql>") + 5
        end = response_text.index("</sql>")
        return response_text[start:end].strip()
    return None


def clean_response(response_text: str) -> str:
    """Remove SQL tags from the response shown to the user."""
    import re
    return re.sub(r"<sql>.*?</sql>", "", response_text, flags=re.DOTALL).strip()


@router.post("/chat", response_model=CopilotResponse)
async def copilot_chat(
    db: DbDep,
    org_id: OrgIdDep,
    message: CopilotMessage,
):
    """Chat with the AI copilot. It can answer questions using DOM context and database queries."""
    import anthropic

    page_ctx = str(message.page_context or {})
    system_prompt = COPILOT_SYSTEM_PROMPT.replace("{page_context}", page_ctx)

    try:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        # First call: let Claude decide if it needs data
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": message.question}],
        )

        answer_text = response.content[0].text
        sql_query = extract_sql(answer_text)
        query_data = None

        # If Claude generated a SQL query, execute it
        if sql_query:
            try:
                # Safety: only allow SELECT queries
                normalized = sql_query.strip().lower()
                if not normalized.startswith("select"):
                    return CopilotResponse(
                        answer="I can only run read-only queries for safety.",
                        data=None,
                    )

                result = await db.execute(
                    text(sql_query),
                    {"org_id": org_id},
                )
                rows = result.fetchall()
                columns = list(result.keys()) if rows else []
                query_data = {
                    "columns": columns,
                    "rows": [dict(zip(columns, row)) for row in rows],
                    "count": len(rows),
                }

                # Second call: let Claude interpret the results
                follow_up = client.messages.create(
                    model=settings.claude_model,
                    max_tokens=1024,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": message.question},
                        {"role": "assistant", "content": answer_text},
                        {
                            "role": "user",
                            "content": f"The query returned {len(rows)} row(s). Data: {str(query_data['rows'][:20])}. Now give a clean, natural language answer to my original question based on this data. Do not include SQL in your response.",
                        },
                    ],
                )
                answer_text = follow_up.content[0].text

            except Exception as e:
                logger.error("Copilot SQL execution error: %s", str(e))
                answer_text = clean_response(answer_text)
                answer_text += f"\n\n(I tried to query the database but got an error. Here's what I know from context instead.)"

        return CopilotResponse(
            answer=clean_response(answer_text),
            data=query_data,
        )

    except anthropic.APIError as e:
        logger.error("Copilot Claude API error: %s", str(e))
        return CopilotResponse(
            answer="I'm having trouble connecting to the AI service right now. Please try again in a moment.",
            data=None,
        )
    except Exception as e:
        logger.error("Copilot unexpected error: %s", str(e))
        return CopilotResponse(
            answer="Something went wrong. Please try again.",
            data=None,
        )


@router.post("/chat/stream")
async def copilot_chat_stream(
    db: DbDep,
    org_id: OrgIdDep,
    message: CopilotMessage,
):
    """Stream chat responses via Server-Sent Events (SSE)."""
    import anthropic

    page_ctx = str(message.page_context or {})
    system_prompt = COPILOT_SYSTEM_PROMPT.replace("{page_context}", page_ctx)

    async def sse():
        def emit(payload: dict) -> str:
            return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

        # Let the client know stream started
        yield emit({"type": "start"})

        try:
            client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

            # First call: decide if SQL is needed (non-stream for speed/simplicity)
            first = await client.messages.create(
                model=settings.claude_model,
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": "user", "content": message.question}],
            )
            answer_text = first.content[0].text
            sql_query = extract_sql(answer_text)
            query_data = None

            # If Claude generated SQL, execute it, then stream the final answer.
            if sql_query:
                normalized = sql_query.strip().lower()
                if not normalized.startswith("select"):
                    yield emit(
                        {
                            "type": "done",
                            "answer": "I can only run read-only queries for safety.",
                        }
                    )
                    return

                result = await db.execute(text(sql_query), {"org_id": org_id})
                rows = result.fetchall()
                columns = list(result.keys()) if rows else []
                query_data = {
                    "columns": columns,
                    "rows": [dict(zip(columns, row)) for row in rows],
                    "count": len(rows),
                }

                follow_up_user = (
                    f"The query returned {len(rows)} row(s). "
                    f"Data: {str(query_data['rows'][:20])}. "
                    "Now give a clean, natural language answer to my original question based on this data. "
                    "Do not include SQL in your response."
                )

                async with client.messages.stream(
                    model=settings.claude_model,
                    max_tokens=1024,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": message.question},
                        {"role": "assistant", "content": answer_text},
                        {"role": "user", "content": follow_up_user},
                    ],
                ) as stream:
                    async for text_delta in stream.text_stream:
                        if text_delta:
                            yield emit({"type": "delta", "text": text_delta})

                yield emit({"type": "done", "data": query_data})
                return

            # No SQL needed: stream the first response.
            async with client.messages.stream(
                model=settings.claude_model,
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": "user", "content": message.question}],
            ) as stream:
                async for text_delta in stream.text_stream:
                    if text_delta:
                        yield emit({"type": "delta", "text": text_delta})

            yield emit({"type": "done"})

        except anthropic.APIError as e:
            logger.error("Copilot Claude API error (stream): %s", str(e))
            yield emit(
                {
                    "type": "error",
                    "message": "I'm having trouble connecting to the AI service right now. Please try again in a moment.",
                }
            )
        except Exception as e:
            logger.error("Copilot unexpected error (stream): %s", str(e))
            yield emit({"type": "error", "message": "Something went wrong. Please try again."})

    return StreamingResponse(
        sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
