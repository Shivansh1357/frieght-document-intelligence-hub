# ADR-001: Backend Framework Selection

## Status: Accepted

## Date: 2026-03-08

## Context

We need to choose a backend framework for the Freight Document Intelligence Hub. The project brief suggests Node.js (Fastify or Express) or Python (FastAPI). The JD reveals the company uses both in production. We need to process PDFs, integrate with Claude's vision API, and serve a REST API.

## Options Considered

### Option A: FastAPI (Python)

**Pros:**

- Superior PDF processing ecosystem (PyPDF2, pdf2image, Pillow, python-multipart)
- Claude/Anthropic Python SDK is mature and well-documented
- Automatic OpenAPI/Swagger docs generation (impressive in demo)
- Native async support with `asyncio`
- Pydantic for request/response validation (structured extraction output)
- Type hints throughout (professional quality signal)
- Shows language versatility (frontend is TypeScript, backend is Python)
- FastAPI is explicitly listed in their preferred stack

**Cons:**

- Two languages in the stack increases deployment complexity
- Slightly less familiar for pure JS developers

### Option B: Node.js with Fastify

**Pros:**

- Single language across stack (TypeScript everywhere)
- Fastify is fast and production-ready
- Mentioned in JD as their backend choice
- Anthropic JS SDK available

**Cons:**

- PDF processing in Node.js is weaker (pdf-parse, sharp for images)
- Less natural fit for AI/ML pipelines
- Fastify plugin ecosystem smaller than Express

### Option C: Node.js with NestJS

**Pros:**

- Enterprise-grade architecture (decorators, modules, DI)
- TypeScript-first
- Great for large-scale applications

**Cons:**

- Over-engineered for a one-week project
- Heavy boilerplate
- Not mentioned in their preferred stack

### Option D: Node.js with Express

**Pros:**

- Most familiar, largest ecosystem
- Fastest to prototype

**Cons:**

- No built-in validation, no auto docs
- Feels "default" — doesn't demonstrate technical decision-making
- Not mentioned in preferred stack (Fastify is)

## Decision

**FastAPI (Python)**

## Rationale (Second-Order Thinking)

**First-order**: FastAPI is fast to build with and has great PDF/AI tooling.

**Second-order**:

1. Choosing FastAPI shows the panel we can work in their actual stack (it's in their preferred list)
2. Using Python for backend + TypeScript for frontend demonstrates the polyglot thinking they need for a founding engineer who'll build across the platform
3. The auto-generated Swagger docs become a free deliverable for the demo — showing the API to the panel takes zero extra effort
4. Pydantic models mirror the database schema, reducing the gap between extraction output and storage
5. When they scale to Phase 2 (customs filing, tariff calculation), Python's data processing libraries are superior
6. The Claude API's structured output handling is more natural in Python (dict → Pydantic model)

## Consequences

- Need Docker or virtualenv for Python environment
- API contract must be well-documented (Swagger handles this)
- CORS configuration needed for Next.js frontend → FastAPI backend
-   

