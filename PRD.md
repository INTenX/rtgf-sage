# PRD: INTenX AI Development Stack

**Version:** 0.3 (Architecture Rework)
**Date:** 2026-03-07
**Owner:** INTenX / AI Stack session

---

## Problem Statement

INTenX operates an AI-first engineering practice across multiple clients, disciplines, and WSL environments. Three compounding problems limit scale:

1. **No cost attribution.** AI spend is invisible at the client or project level. No way to know what an engagement costs in AI resources.

2. **Knowledge loss.** Valuable reasoning and decisions happen inside LLM sessions and disappear. There's no durable knowledge base that agents and engineers can query across sessions or clients.

3. **Platform fragility.** Each AI service is independently wired — no unified routing, no fallback, no budget enforcement, no observability. Context is lost at every session boundary.

The AI stack addresses all three. The platform compounds: each client engagement produces knowledge that makes every future engagement better.

> **Business context:** The platform powers four business lines — INTenX Consulting, AI-Agentic Design Suite, TFAAS, and the platform itself as a product. See `docs/STRATEGY.md` for the full business model.

---

## Users

| User | Role |
|------|------|
| **Cole (primary)** | AI-first engineer — designs, builds, and ships across client engagements |
| **INTenX agents** | Claude Code sessions and Dispatcher agents running across WSL instances |
| **Client teams** | Indirect beneficiaries of knowledge captured and AI infrastructure |
| **Control Center** | Strategic oversight — receives session index, approves major decisions |

---

## Goals

1. **Per-client AI cost attribution** — know what each engagement costs in AI spend, with budget guardrails before spend happens.
2. **Zero-toil session archival** — all LLM conversations across all platforms automatically archived, versioned, searchable.
3. **Unified model routing** — one endpoint for local (Ollama) and cloud (Anthropic, OpenAI); swap backends without changing application code.
4. **Platform health observability** — proactive detection of WSL/Docker runaway conditions and resource exhaustion before incidents.
5. **Security-by-default autonomous operation** — every tool call logged, dangerous operations blocked before execution, full audit trail.
6. **Session-level knowledge reuse** — past sessions discoverable and retrievable as context for future work.
7. **Inter-session coordination** — agents and sessions able to hand off context and tasks across boundaries (BATON).
8. **Autonomous task delegation** — delegate a goal via Telegram, a Dispatcher agent executes it, result archived and reported back.

## Non-Goals

- Building a SaaS from day one (internal use first; open-source and managed tiers come later)
- Supporting every LLM platform on day one
- Replacing Claude Code or Codex CLI as primary agents
- Real-time token streaming analytics (structured logs + summaries are sufficient)

---

## Architecture

### Core Pattern: Skills + MCP Two Layers

| Layer | Format | Token cost | Purpose |
|-------|--------|-----------|---------|
| **Skills** | Markdown files (~200 tokens) | ~250x cheaper than MCP | Timeless knowledge and workflow intelligence |
| **MCP servers** | Live execution connections | Full tool call per use | Live data access and execution |

Skills encode *how to think about a problem*. MCP servers provide live execution. A well-structured Skills library makes every agent meaningfully more capable at minimal cost. This is the efficiency multiplier at every stage of the scaling model.

### CHRONICLE as MCP Memory Server

CHRONICLE is both a passive archive and an active memory server. The MCP interface allows any agent to query past sessions, retrieve codified patterns, and inject relevant context before executing a task — without manual context management.

### Intent Classifier

A lightweight local model (phi4-mini) sits at the Telegram interface and routes every incoming message to the appropriate execution tier before any expensive work begins:

```
Telegram message
    → phi4-mini intent classification
        → status/query        →  local Ollama model
        → task execution      →  LiteLLM gateway (best-fit)
        → complex reasoning   →  Claude API (opus or sonnet)
```

Keeps latency low and cost minimal for the 80% of interactions that don't need a frontier model.

### Artifact Pipeline

```
Telegram dispatch
    → Intent classifier
    → Dispatcher agent
    → CHRONICLE context pull
    → LLM execution
    → Git artifact (file, commit, PR)
    → Telegram reply with summary + link
```

---

## Components

### CHRONICLE — Session Archive and Knowledge Curation (`chronicle/`)

Git-native session archival. Canonical YAML format, knowledge flow states (hypothesis → codified → validated → promoted), per-client isolation via separate repos.

**Current status:** Production — 100+ sessions archived (Claude Code). ChatGPT/Gemini adapters available.

**Planned:**
- MCP server exposing session search + context retrieval as MCP tools
- LanceDB semantic index over promoted + validated sessions
- Per-client `client` field enforced on all sessions and search results

---

### LiteLLM Gateway (`gateway/`)

Single proxy endpoint routing all model calls. Per-client virtual keys + budget enforcement. PostgreSQL spend tracking (deployed on Ubuntu-AI-Hub).

**Current status:** Production — deployed on Ubuntu-AI-Hub, PostgreSQL-backed, `compose/gateway.yml`.

---

### WARD — Security Hooks (`hooks/`)

Pre-execution intercept for every Claude Code tool call. Blocks destructive operations before they execute. Writes structured JSONL audit log as SOC 2 evidence.

**Block patterns:** `rm -rf`, `git reset --hard`, force push, SQL DDL drops, SSH key files, private key files, `curl|bash`.
**Warn patterns:** `.env` access, `--no-verify` commits, production env files.

**Current status:** Built + installed. `hooks/pre-tool-use.sh` + `hooks/post-tool-use.sh`.

---

### Telegram Interface (`interface/`)

Ambient control plane. Stateful conversations, CHRONICLE context injection, Dispatcher delegation, BATON coordination, WARD digest.

**Bot commands:**
- `/ask <question>` — stateful conversation with CHRONICLE context
- `/dispatch <type> <goal>` — delegate task to a Dispatcher agent (research/code/write/analyze)
- `/baton [list|all|drop|show]` — inter-session coordination
- `/audit [date]` — WARD daily digest
- `/models` — Ollama model list
- `/lore` — CHRONICLE import trigger
- `/wsl` — wsl-audit platform health

**Current status:** Production — systemd user service on Ubuntu-AI-Hub.

---

### Dispatcher (`interface/lib/dispatcher.js`)

Dispatches sub-agents via LiteLLM gateway for autonomous task execution. CHRONICLE context pulled before execution. Result archived back into CHRONICLE.

**Agent types:** `research`, `code`, `write`, `analyze`

**Current status:** Built. Integrated with bot `/dispatch` command.

---

### BATON — Inter-Session Coordination (`baton/`)

File-based handoff protocol at `/mnt/c/Temp/wsl-shared/baton/`. Pending/claimed/completed state machine. Full CLI at `~/.local/bin/baton`.

**Current status:** Built. CLI + Telegram commands + protocol spec.

---

### wsl-audit (`scripts/wsl-audit`)

Platform health monitoring. Detects restart storms, missing `.wslconfig` memory caps, stale containers. On-demand + watch mode. Structured JSONL event log.

**Current status:** Production — `~/.local/bin/wsl-audit`.

---

### Skills Library (`skills/`) *(planned)*

Markdown Skills files encoding reusable workflow intelligence: EDA design review, fixture specification, client onboarding, code review, test planning. Loaded by agents as needed — ~250x more efficient than equivalent MCP tool calls for knowledge retrieval.

**Current status:** Not yet created. First priority for Stage 2.

---

## AI Token / API Usage and Billing

### Three-Layer Attribution Model

| Layer | Tool | Covers |
|-------|------|--------|
| **Programmatic tracking** | LiteLLM proxy | Ollama, direct API calls, Dispatcher agents |
| **Subscription session tracking** | CHRONICLE metadata + session index | Claude Code Pro, Codex CLI |
| **Attribution reporting** | Custom billing query (future) | LiteLLM spend logs + CHRONICLE index → per-client |

### By Tool

| Tool | Cost model | Attribution today | Full attribution path |
|------|-----------|------------------|----------------------|
| Claude Code (Pro) | Flat subscription | CHRONICLE session tags + working dir | → API billing + LiteLLM proxy |
| Codex CLI (ChatGPT) | Flat subscription | CHRONICLE session tags | → Codex API + LiteLLM |
| Ollama | Free | LiteLLM request tags | ✅ Done |
| Dispatcher agents | Per-token API | LiteLLM virtual keys | ✅ Done |

---

## Vision

A single engineer directing a coordinated network of AI agents that autonomously execute work, accumulate institutional knowledge, track costs, and hand off context seamlessly — while the human operates at the strategy layer.

---

## Phased Roadmap

### Phase 1 — Foundation ✅ *Complete*

Platform safety, model routing, cost attribution, knowledge archival, ambient interface.

| Component | Status |
|-----------|--------|
| wsl-audit | ✅ Built |
| LiteLLM gateway | ✅ Deployed (Ubuntu-AI-Hub, PostgreSQL) |
| CHRONICLE (Claude Code) | ✅ Production (100+ sessions) |
| Telegram bot | ✅ Running (Ubuntu-AI-Hub, systemd) |
| CHRONICLE daily cron | ✅ Configured |
| WARD hooks | ✅ Built + installed |
| Dispatcher | ✅ Built |
| BATON | ✅ Built |

---

### Phase 2 — Knowledge Activation *(current)*

Turn CHRONICLE from an archive into a knowledge system agents can actively use. Build the Skills layer for efficient workflow knowledge retrieval.

#### 2a. Skills Library

Create `skills/` directory. Seed with first 10 Skills files from CHRONICLE patterns:
- EDA: circuit review, BOM spec, DFM checklist
- MCAD: fixture design workflow, tolerance spec
- Consulting: client onboarding, engagement closure, session tagging
- Platform: CHRONICLE import, WARD audit review, LiteLLM key setup

**Deliverable:** Agents loading skills at session start with no manual context management.

#### 2b. CHRONICLE MCP Server

`chronicle/mcp-server.js` — expose CHRONICLE as an MCP tool set:
- `search_sessions(query, client, state)` — semantic + keyword search
- `get_session(id)` — full session content
- `get_patterns(topic)` — promoted knowledge for a topic
- `add_session_note(id, note)` — annotate sessions from agent context

**Deliverable:** Any agent can pull CHRONICLE context without manual grep or file reads.

#### 2c. LanceDB Semantic Layer

Index all CHRONICLE `promoted` and `validated` sessions in LanceDB. Expose via:
- `chronicle/tools/cli/ctx-search.js` — CLI semantic search
- CHRONICLE MCP server `search_sessions()` tool

**Deliverable:** "What do we know about KiCad footprint libraries?" returns relevant sessions, not grep output.

#### 2d. Intent Classifier

Integrate phi4-mini at the Telegram bot entry point. Route by intent before LLM dispatch. Configuration in `interface/config.yaml` with intent type → model tier mapping.

**Deliverable:** Simple status queries resolved in <2s on local Ollama; only complex work reaches Claude API.

#### Phase 2 Verification

- [ ] Agent loads a Skill and uses it correctly without manual context injection
- [ ] `chronicle/mcp-server.js` returns session results for a test query
- [ ] `ctx-search "KiCad footprint"` returns relevant promoted sessions
- [ ] `/ask "what time is it"` routes to Ollama, not Claude API

---

### Phase 3 — Domain Skills Packs *(next)*

Extend the Skills library with domain-specific workflow intelligence. Skills encode how to approach a class of problem; agents load them before executing domain work.

- **EDA Skills** — KiCad schematic and layout workflow, BOM generation, DFM review checklist
- **MCAD Skills** — OpenSCAD fixture and enclosure design workflow, tolerance spec, DFM constraints
- **Consulting Skills** — client onboarding, engagement closure, session tagging conventions
- **CHRONICLE session type `tfaas-fixture`** — structured frontmatter for fixture design sessions (lease terms, client, revision history)

**Key platform requirement:** Skills must be loadable by any agent (Claude Code or Dispatcher) without manual context injection. CHRONICLE session types must support arbitrary `type` values in frontmatter with type-specific search filtering.

#### Phase 3 Verification

- [ ] Domain Skill loaded by Dispatcher agent with no manual injection; output reflects Skill content
- [ ] `ctx-search --type tfaas-fixture --client <id>` returns correct session subset
- [ ] EDA review Skill invoked by `/dispatch analyze` produces structured DFM checklist

---

### Phase 4 — Multi-Client Scaling *(enterprise)*

Scale from single-practitioner to managing 5+ concurrent clients with audit-grade isolation.

- **PostgreSQL + pgvector** — replace SQLite for operational state
- **Qdrant** — replace LanceDB for production-grade semantic search (multi-tenant)
- **Per-client MCP isolation** — each client's agents operate in isolated namespace
- **CHRONICLE export as deliverable** — structured knowledge artifact at engagement close
- **SOC 2 control mapping** — CHRONICLE + WARD + LiteLLM → formal control evidence package

---

### Phase 5 — Open Platform

- **Open-source core** — Skills framework, BATON protocol, CHRONICLE YAML format (Apache 2)
- **Managed hosting** — INTenX-operated instances for clients who don't self-host
- **Enterprise support tier** — SLA-backed, SOC 2 compliant, data residency options

---

## Success Metrics

| Phase | Metric |
|-------|--------|
| 1 — Foundation | Platform doesn't fall over. All model calls routed. WARD audit log clean. ✅ |
| 2 — Knowledge | "I found that in CHRONICLE" accelerates work at least once per week. Agents load Skills without manual injection. |
| 3 — Skills Packs | Domain Skill used by Dispatcher without manual injection. CHRONICLE session type filtering working. |
| 4 — Multi-client | 5 concurrent clients, no cross-client knowledge leakage, per-client billing artifact exported. |
| 5 — Open Platform | Open-source core published. First external adopter running their own instance. |

---

## RTGF Alignment

| RTGF Level | What it requires | AI Stack phase |
|------------|-----------------|----------------|
| Level 1 (Intentional) | 3-file starter kit, 3 practices | `AGENT_GUIDANCE.md`, `CLAUDE.md` ✅ |
| Level 2 (Rhythmic) | Governance refresh cadence, durable/ephemeral split | CHRONICLE daily cron ✅ |
| Level 3 (Anticipatory) | Automated gates, context governance, multi-client isolation | Phase 1 complete ✅ — WARD + CHRONICLE security fields |
| Level 4 (Self-Correcting) | Governance detects its own drift, compliance mapping | Phase 4 — PostgreSQL + Qdrant + SOC 2 |
| Level 5 (Generative) | Contributing patterns back to ecosystem | Phase 5 — open-source publication |

**Audit posture:** When a client asks "what did your AI agents do during this project?":
- **CHRONICLE** — every session conversation and decision
- **WARD audit log** — every tool call, block, and anomaly
- **LiteLLM** — every model API call with cost attribution
- **Git history** — every file change, attributed and timestamped

---

## Scaling Evolution Reference

The full 5-stage model (Personal Stack → Reusable Framework → Consultant Engagement → Enterprise → Product) with technology stack decisions at each inflection point is documented in `docs/architecture/scaling-evolution.md`.

---

## Open Questions

1. **RAG target:** LanceDB for Phase 2 semantic layer confirmed. Qdrant for Phase 4 multi-tenant. AnythingLLM no longer relevant — the CHRONICLE MCP server provides equivalent access without a separate service.
2. **Dispatcher framework:** Claude API (Anthropic SDK) directly — current approach. No LangGraph/CrewAI needed at current scale. Re-evaluate at Phase 4 when multi-agent coordination becomes complex.
3. **Intent classifier deployment:** phi4-mini via Ollama (running locally). Config in `interface/config.yaml` with thresholds per intent class.
4. **Skills library format:** Standard Markdown with YAML frontmatter (`skill_id`, `domain`, `trigger`, `version`). Loaded by Claude Code via `CLAUDE.md` or by Dispatcher before task execution.
