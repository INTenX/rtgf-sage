# Scaling Evolution Path

**Date:** 2026-03-07
**Author:** INTenX / AI Stack session

This document captures the five-stage evolution model from a personal AI development stack to a multi-client, multi-agent platform — and the two vertical product lines that emerge from it.

---

## The Core Architecture Pattern

Before the stages: the architectural insight that makes the rest viable.

### Skills + MCP Two-Layer Architecture

| Layer | Format | Token cost | Purpose |
|-------|--------|-----------|---------|
| **Skills** | Markdown files (~200 tokens each) | ~250x cheaper | Timeless knowledge and workflow intelligence |
| **MCP servers** | Live execution connections | Full tool call | Live data access and execution |

Skills are loaded as needed — they encode *how to think about a problem* without requiring a live connection. MCP servers connect to live systems for data that changes. A well-structured Skills library makes an agent meaningfully more capable with minimal added cost per turn.

### CHRONICLE as MCP Memory Server

The existing CHRONICLE git-based session archive becomes an MCP server — every past session, decision, and codified pattern becomes retrievable as structured context. This converts a passive archive into active working memory that any agent can query.

### Intent Classifier Layer

A lightweight local model (phi4-mini) sits at the Telegram interface and routes every incoming message to the appropriate LLM tier before any expensive work begins:

```
Telegram message
    → phi4-mini intent classification
        → simple status/query  →  local Ollama model
        → task execution       →  LiteLLM gateway (best-fit cloud/local)
        → complex reasoning    →  Claude API (claude-opus or sonnet)
```

This keeps latency low and cost minimal for the 80% of interactions that don't need a frontier model.

### Artifact Pipeline

The execution pattern across all stages:

```
Telegram dispatch
    → Intent classifier
    → Agent (via Dispatcher)
    → CHRONICLE context pull
    → LLM execution
    → Git artifact (file, commit, PR)
    → Telegram reply with artifact link
```

---

## Stage 1: Personal Stack

**Who:** Solo practitioner (current state)
**Memory substrate:** Git + SQLite (LiteLLM) + LanceDB (semantic)
**AI routing:** LiteLLM gateway — Ollama local + Anthropic + OpenAI
**Interface:** Telegram bot as ambient control plane
**Knowledge:** CHRONICLE — single git repo, single namespace
**Cost model:** Mostly flat-rate subscriptions (Claude Code Pro); API billing routed through LiteLLM

### What's Running

- CHRONICLE for session archival (100+ sessions in production)
- WARD hooks for pre-execution safety gates and audit trail
- BATON for inter-session task handoff
- Dispatcher for autonomous sub-agent execution
- Telegram bot for remote delegation and status
- LiteLLM gateway for routing and cost attribution
- wsl-audit for platform health

### Inflection Point Reached

The system is functional and auditable. The bottleneck is manual curation of Skills and CHRONICLE patterns. Moving to Stage 2 when you're reusing patterns across projects and want to share the framework.

---

## Stage 2: Reusable Framework

**Who:** Solo → others using the same approach; open-source or consulting tool
**Memory substrate:** Git + SQLite/LanceDB (same as Stage 1, but namespaced)
**AI routing:** Skills library published alongside MCP server definitions
**Interface:** Telegram + GitHub (PRs as outputs, not just files)
**Knowledge:** Separate CHRONICLE repos per domain/client

### New in Stage 2

- **Skills library** — curated Markdown files for every repeatable workflow (circuit design review, test fixture spec, client onboarding, code review pattern)
- **CHRONICLE as MCP server** — agents can query past sessions programmatically rather than relying on context injection
- **Client namespace isolation** — per-client CHRONICLE repos; LiteLLM virtual keys per client
- **Vertical Skills packs** — EDA workflow skills (KiCad), MCAD workflow skills (OpenSCAD), consulting delivery skills

### What Changes

Any new Claude Code session can load the Skills library and immediately operate with institutional knowledge. A new engagement doesn't start from scratch — it starts from the pattern library and pulls relevant CHRONICLE sessions before the first message.

### Inflection Point Reached

Framework is generalizable. A second practitioner can pick it up. Moving to Stage 3 when delivering it as a managed service to a client.

---

## Stage 3: Consultant Engagement

**Who:** INTenX delivering the platform as part of a client engagement
**Memory substrate:** Git + SQLite/LanceDB with strict client-namespace isolation
**AI routing:** LiteLLM per-client virtual keys + hard budget enforcement
**Interface:** Client-branded Telegram bot or dedicated control interface
**Knowledge:** Per-client CHRONICLE repo, `client` field enforced on all search

### New in Stage 3

- **Per-client billing attribution** — LiteLLM tracks spend by client tag; CHRONICLE session counts provide subscription-tool attribution
- **WARD audit trail as deliverable** — every tool call logged with client tag becomes audit evidence (`~/.claude/audit/YYYY-MM-DD.jsonl`)
- **Human-in-loop gates** — high-stakes actions (git push, destructive ops, spend > threshold) require Telegram confirm before execution
- **SOC 2 artifact mapping** — CHRONICLE + WARD logs + LiteLLM spend = access control, change management, and cost evidence
- **Deliverable pipeline** — Telegram dispatch → agent execution → git artifact → client review link

### What a Client Engagement Looks Like

1. Client need enters via Telegram (or meeting → CHRONICLE session)
2. Intent classifier routes to appropriate agent and LLM tier
3. Agent pulls relevant CHRONICLE context before executing
4. Deliverable committed to git with full attribution
5. Summary + link returned to Telegram; full session auto-archived
6. End-of-engagement: CHRONICLE export as institutional knowledge artifact

### What Doesn't Scale Yet

Single-tenant infrastructure. Database is local SQLite. Semantic search is LanceDB local. Not suitable for multiple simultaneous clients on shared infra.

### Inflection Point Reached

Proof that the model delivers client value with audit trail. Moving to Stage 4 when a client wants to run this themselves or you're managing 3+ concurrent engagements.

---

## Stage 4: Enterprise Client (or Multi-Client Practice)

**Who:** Client wants to own and operate the stack, or INTenX managing 5+ concurrent engagements
**Memory substrate:** PostgreSQL + pgvector (replaces SQLite + LanceDB)
**Semantic search:** Qdrant (replaces LanceDB; production-grade, multi-tenant)
**Temporal knowledge:** Zep or Graphiti for temporal knowledge graphs
**AI routing:** Multi-tenant LiteLLM with PostgreSQL spend tracking
**Interface:** MCP-isolated per tenant; dedicated agent namespaces
**Knowledge:** CHRONICLE per-client repo + cross-client pattern library (restricted access)

### What Changes Architecturally

| Component | Stage 1-3 | Stage 4 |
|-----------|-----------|---------|
| Knowledge DB | SQLite | PostgreSQL + pgvector |
| Semantic search | LanceDB (local) | Qdrant (multi-tenant) |
| Temporal memory | None | Zep/Graphiti knowledge graph |
| MCP isolation | Shared server | Per-tenant MCP instances |
| Audit trail | Local JSONL | Centralized + SOC 2 mapped |
| Spend tracking | LiteLLM SQLite | LiteLLM PostgreSQL |

### Enterprise Requirements

- **Multi-tenant isolation** — each client's agents cannot access another client's CHRONICLE
- **Role-based access** — `access_level` field in CHRONICLE enforced at query layer
- **Compliance artifacts** — WARD audit logs + CHRONICLE sessions + LiteLLM spend → SOC 2 control evidence package
- **SLAs** — uptime, response time, escalation path
- **Data residency** — CHRONICLE repos in client-controlled GitHub orgs

### Inflection Point Reached

Platform is delivering ROI across multiple concurrent clients at enterprise quality. Moving to Stage 5 when the platform itself is the product.

---

## Stage 5: Product

**Who:** The stack becomes a commercial offering, not just an internal tool
**Revenue model:** Platform license + managed service + vertical product subscriptions
**Open-source:** Core infrastructure (Skills framework, BATON protocol, CHRONICLE format) published under Apache 2
**Commercial:** Managed hosting, enterprise support, vertical Skills packs

### Product Lines That Emerge

#### Product 1: rtgf-ai-stack (Platform)
- Open-source horizontal infrastructure layer
- Commercial: managed hosting + enterprise support tier
- Revenue: $500-2000/mo per client (managed) + professional services

#### Product 2: AI-Agentic Design Suite (Vertical)
- Claude + KiCad for PCB/circuit design (conversational — user never touches files)
- Claude + OpenSCAD for mechanical/fixture design (same pattern)
- Skills packs for EDA workflows, BOM management, design review, DFM analysis
- Integrates with rtgf-ai-stack as Skills + MCP server components
- Revenue: subscription per seat + consulting on complex projects

#### Product 3: TFAAS (Test Fixtures as a Service)
- AI-designed custom test fixtures leased, not sold
- Business model: AI reduces fixture design labor cost 60-80% → lease economics viable
- Client keeps fixture for engagement period; fixture returns or is purchased at end
- Platform infrastructure (CHRONICLE, BATON, Dispatcher) manages fixture design pipeline
- Revenue: monthly lease per fixture + design service fee

#### Product 4: INTenX Consulting
- Engineering practice using all three products internally
- Clients benefit from the platform without managing it
- Case studies become Skills library entries; patterns become open-source contributions
- Revenue: T&M or fixed-fee engagements, with AI cost attribution as deliverable evidence

### The Compounding Effect

Each client engagement produces:
1. CHRONICLE sessions → institutional knowledge
2. WARD audit logs → compliance artifacts
3. Skills library entries → reusable patterns
4. Git artifacts → deliverables and portfolio

Each new engagement starts from a higher base. The platform compounds across all four business lines.

---

## Technology Scaling Path

### Memory Architecture by Stage

| Stage | Writes/day | Read latency | Technology |
|-------|-----------|-------------|------------|
| 1-2 (Solo) | <100 | <1s acceptable | Git + SQLite + LanceDB |
| 3 (Consulting) | 100-1000 | <500ms | Add pgvector, keep LanceDB |
| 4 (Enterprise) | 1000-10k | <100ms | PostgreSQL + pgvector + Qdrant |
| 5 (Product) | 10k+ | <50ms | Distributed Qdrant + Zep temporal |

### The Git Foundation Doesn't Go Away

Git remains the canonical source of truth at every stage. What changes is what's **on top of** git:

- **Solo:** Git is the DB. Direct file reads, manual curation.
- **Consulting:** Git + semantic index. LanceDB indexes git content; queries hit the index.
- **Enterprise:** Git + PostgreSQL + vector store. Git is version history; RDBMS is operational state; vector store is semantic access.
- **Product:** Git is the audit trail. Every agent action commits. Databases are the access layer. Queries never touch git directly.

### What Git Can't Do (And Must Be Supplemented)

| Problem | Git limitation | Solution |
|---------|---------------|---------|
| Temporal facts | "What was true on date X?" requires log traversal | Zep/Graphiti temporal graph |
| Multi-tenant isolation | All files visible to anyone with repo access | Per-tenant repos + MCP isolation |
| Sub-second semantic search | Full-text requires grep; no embedding index | LanceDB (solo) → Qdrant (enterprise) |
| Structured queries | No SQL-style filtering | SQLite → PostgreSQL |
| Compliance audit | Blame + log works, but no query interface | LiteLLM + WARD JSONL → structured query |

---

## What This Isn't

- A SaaS platform from day one — each stage must generate revenue or learning before advancing
- A replacement for Claude Code or Codex CLI — the stack routes and orchestrates; agents do execution
- An AI-first company — INTenX is an engineering practice that uses AI as infrastructure, not an AI company

---

## Next Architectural Steps (Stage 1 → Stage 2)

1. **Skills library** — create `skills/` directory in rtgf-ai-stack; seed with first 5-10 Skills from CHRONICLE patterns
2. **CHRONICLE MCP server** — `chronicle/mcp-server.js` exposing session search + context retrieval as MCP tools
3. **Intent classifier** — integrate phi4-mini routing at the Telegram bot layer before LLM dispatch
4. **LanceDB semantic layer** — index all CHRONICLE `promoted` and `validated` sessions; expose via search CLI and MCP
5. **Per-client namespace enforcement** — `client` field required on all new CHRONICLE sessions; LiteLLM virtual key per client
