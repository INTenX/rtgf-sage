# PRD: INTenX AI Development Stack
**Version:** 0.1 (Draft)
**Date:** 2026-02-19
**Owner:** INTenX / AI Stack session

---

## Problem Statement

INTenX operates an AI-first consulting practice across multiple clients, disciplines, and WSL environments. As AI usage scales, three problems compound:

1. **No cost attribution.** AI spend (API calls, local compute, subscriptions) is invisible at the client or project level. There's no way to know what a client engagement costs in AI resources.

2. **Knowledge loss.** Valuable reasoning and decisions happen inside LLM sessions — Claude Code, ChatGPT, Gemini — and disappear. There's no durable knowledge base that agents and engineers can query.

3. **Platform fragility.** Each AI service is independently wired. There's no unified routing, no fallback, no budget enforcement, and no observability. A Docker restart storm can take down the whole machine with no detection.

---

## Users

| User | Role |
|------|------|
| **Cole (primary)** | AI-first consultant — designs, builds, and ships across all client engagements |
| **INTenX agents** | Claude Code sessions and future AI agents running across WSL instances |
| **Client teams** | Indirect beneficiaries of knowledge captured and AI infrastructure built on their behalf |
| **Control Center** | Strategic oversight — approves major stack decisions, receives session index |

---

## Goals

1. **Per-client AI cost attribution** — know what each client engagement costs in AI spend, with budget guardrails before spend happens.
2. **Zero-toil session archival** — all LLM conversations across all platforms automatically archived, versioned, searchable.
3. **Unified model routing** — one endpoint for local (Ollama) and cloud (Anthropic, OpenAI) models; swap backends without changing application code.
4. **Platform health observability** — proactive detection of WSL/Docker runaway conditions and resource exhaustion before they cause incidents.
5. **Session-level knowledge reuse** — past sessions discoverable and retrievable as context for future work (RAG pipeline).
6. **Inter-session coordination** — agents and sessions able to hand off context and tasks to each other (RELAY — future).

## Non-Goals

- Building a SaaS product (internal use, potential open-source later)
- Supporting every LLM platform on day one
- Real-time token streaming analytics (logs + summaries are sufficient)
- Replacing Claude Code or Codex CLI as primary agents

---

## Current State (2026-02-19)

| Component | Status | Notes |
|-----------|--------|-------|
| **Ollama** | ✅ Operational | Windows/AMD RX 7600S (8GB VRAM), accessible from all WSL instances. 8 models + deepseek-r1:14b (pulling). |
| **LORE (session archival)** | ✅ Production | Claude Code working, 100+ sessions. ChatGPT/Gemini adapters pending. |
| **LibreChat** | ✅ Keep + decouple | Ollama web UI value. Route RAG through LiteLLM — no direct RAG API integration. |
| **Cross-WSL session index** | ✅ Operational | JSON index exported, queryable by Control Center |
| **wsl-audit** | ✅ Built | `~/.local/bin/wsl-audit` + `scripts/wsl-audit`. Platform health: .wslconfig, memory, Docker restart detection. |
| **LiteLLM gateway** | ✅ Built | `gateway/` + `compose/gateway.yml`. Routes Ollama + Anthropic + OpenAI. Per-client virtual keys + budget enforcement. Needs deploy on Ubuntu-AI-Hub. |
| **Observability (Opcode)** | ⬜ Not started | Session browsing; Opcode first |
| **LORE daily cron** | ⬜ Not started | `cron-daily-import.sh` ready, needs `crontab -e` |
| **RELAY** | ⬜ Planned | Inter-session coordination — not yet designed. Leash (StrongDM) flagged as runtime enforcement candidate. |
| **Platform bridge tools** | ✅ Operational | `showclaude`, `rename-session-by-id`, `resume-by-name` — compensate for Claude Code gaps |

---

## Components

### LORE — Library Of Refined Evidence (`lore/`)
Git-native session archival. Canonical YAML format (OMF-based), knowledge flow states (hypothesis → codified → validated → promoted), per-client isolation via separate repos.

**Remaining work:** Daily import cron, ChatGPT/Gemini adapters, session search CLI.

---

### LiteLLM Gateway (`gateway/`)
Single proxy endpoint routing all model calls. Provides:
- Unified API for Ollama local models + Anthropic + OpenAI + future providers
- Per-client/per-tag spend tracking and budget enforcement
- Model fallback (local → cloud if Ollama unavailable)
- Request logging for cost attribution

**Scope for v1:** Docker Compose service in `compose/`, config in `gateway/`. Route programmatic API calls and any future agent-to-model calls.

**Limitation:** Claude Code and Codex CLI use their own auth (subscription-based) and bypass the gateway. Attribution for these tools requires LORE metadata tagging, not LiteLLM routing. See Billing section below.

---

### Observability (`observability/`)
**Platform layer (wsl-audit):** Proactive WSL/Docker health monitoring. Detects restart storms, missing `.wslconfig` memory caps, stale containers. Single bash script, on-demand + watch mode. **Prerequisite to scaling AI services.**

**Application layer (Opcode):** Auto-detects `~/.claude/projects/`, session browsing UI. Fast to set up.

**Future (OTel + Grafana):** Real-time cross-WSL dashboards. Don't build until Opcode is in and operational tempo justifies it.

---

### RELAY (`relay/`)
Inter-session coordination. Enables Claude Code sessions and future agents to hand off context, tasks, and knowledge across session boundaries.

**Status:** Not yet designed. Dependent on LORE reaching validated state for the knowledge layer.

---

### Scripts (`scripts/`)
Shared operational scripts. Currently lives in `/mnt/c/Temp/wsl-shared/`. Migration into repo provides versioning and portability.
- `ollama-setup.sh` — canonical Ollama environment setup
- `wsl-audit` — platform health tool (when built)

---

## AI Token / API Usage and Billing

### The Current Reality

INTenX currently runs two categories of AI usage:

**Subscription-based (flat rate):**
- Claude Code — Anthropic Pro subscription. No per-call cost, but token visibility is limited: `/context` inside a session shows category breakdown; `claude.ai/settings/usage` shows period-level aggregates only. No granular per-session tracking in console.
- Codex CLI — ChatGPT Plus/Pro subscription. `/status` inside a session shows remaining quota. No per-call tracking.

**Programmatic / gateway-routable:**
- Ollama — free local models (no billing, but client attribution still matters)
- Direct API calls from scripts, LORE pipeline, future agents — currently untracked

### What LiteLLM Actually Provides

LiteLLM tracks every call with full attribution by user, team, tag, or API key. Hierarchical budgeting: Organization → Team → User → Key. Hard budget limits with automatic enforcement. Tag-based cost attribution per client/project. Works across 100+ providers.

Critically: **LiteLLM has a Claude Code granular cost tracking tutorial** — Claude Code can be routed through LiteLLM as a proxy when using API billing. If/when you shift Claude Code from subscription to API billing, routing through LiteLLM gives full per-session token attribution at the client level.

### The Three-Layer Attribution Model

Full per-client billing visibility requires three layers working together:

| Layer | Tool | Covers |
|-------|------|--------|
| **Programmatic tracking** | LiteLLM proxy | Ollama, direct API calls, future agent calls |
| **Subscription session tracking** | LORE metadata + session index | Claude Code (Pro), Codex (ChatGPT sub) |
| **Attribution reporting** | Custom billing query (future) | LiteLLM spend logs + LORE index → per-client invoice |

### Current Attribution by Tool

| Tool | Cost model | Attribution today | Full attribution path |
|------|-----------|------------------|----------------------|
| Claude Code (Pro) | Flat subscription | LORE session tags + working dir | → API billing + LiteLLM proxy |
| Codex CLI (ChatGPT) | Flat subscription | LORE session tags (when adapter built) | → Codex API billing + LiteLLM |
| Ollama | Free | LiteLLM request tags | ✅ Done at P1 |
| Direct API calls | Per-token | LiteLLM virtual keys | ✅ Done at P1 |

### Where Billing Fits in Priority

**P1 — LiteLLM gateway** covers the programmatic layer and future-proofs the subscription tools. Even if Claude Code stays on subscription today, building the gateway now means routing is one config change when billing shifts to API.

**Subscription tool visibility gap (known limitation):** Claude Code Pro and Codex CLI on subscription bypass any proxy. For those tools, LORE session metadata (client tag derived from working directory) is the attribution mechanism. A future `lore-billing` query tool that joins LiteLLM spend logs with LORE session counts could produce client invoices.

**Third-party tools for subscription token monitoring:** `ccusage` and `Claude-Code-Usage-Monitor` (community tools) provide real-time token consumption and predictions for Claude Code Pro. Worth adding to the `scripts/` or `observability/` toolchain.

**Recommendation:** Build LiteLLM at P1, accept that Claude Code Pro is a flat-rate cost center for now, and use LORE session counts as a proxy for capacity attribution per client. The billing query tool is a P4-P5 item once the data layers exist.

---

## Vision

A single person directing a coordinated network of AI agents that autonomously execute client work, accumulate institutional knowledge, track their own costs, and hand off context seamlessly — while the human stays at the strategy and relationship layer.

---

## Phased Roadmap

### Phase 1 — Foundation ✅ *Complete*

Platform safety, model routing, cost attribution, knowledge archival, ambient interface. The stack exists and can be operated without it collapsing.

| Component | Status |
|-----------|--------|
| wsl-audit | ✅ Built |
| LiteLLM gateway | ✅ Deployed |
| LORE (Claude Code) | ✅ Production |
| Telegram bot | ✅ Running |

---

### Phase 2 — Knowledge Activation

Turn LORE from an archive into a knowledge system agents can actually use. Knowledge compounds across sessions instead of evaporating.

- **LORE daily cron** — zero-toil auto-archival, no manual import runs
- **Multi-platform adapters** — ChatGPT and Gemini exports captured (all knowledge in one place)
- **Session search CLI** — query past sessions before starting work
- **RAG pipeline** — promoted sessions → vector store → retrievable context for agents
- **Opcode** — session browsing UI complementing LORE

*Unlocks: A new session can pull what previous sessions knew.*

---

### Phase 3 — Persistent Chief of Staff Interface

The Telegram bot evolves from remote control to stateful agent interface. A persistent presence you can delegate to from anywhere — no terminal required.

- **Conversation history** — stateful multi-turn conversations per chat
- **LORE context injection** — bot pulls relevant past sessions before responding
- **Task tracking** — delegate via Telegram, outcomes reported back

*Unlocks: A persistent agent that knows your history, clients, and current work.*

---

### Phase 4 — Delegatable Agents (Dispatcher)

The critical leap. Claude Code requires a human in the loop. Autonomous execution requires a **Claude API agent layer** — programmatic, dispatchable, no terminal.

- **Task delegation protocol** — structured format: client, goal, context, deliverable
- **Dispatcher component** — Claude API agents dispatched by the bot (`dispatcher/`)
- **LORE context pull** — agents retrieve relevant knowledge before executing
- **Outcome archival** — results automatically archived back into LORE
- **Telegram reporting** — task status and outcomes delivered to bot

*Unlocks: Delegate a task in Telegram, an agent executes it, result lands in knowledge base, summary in your chat.*

---

### Phase 5 — Coordinated Agent Network (RELAY)

Multiple specialized agents with defined roles that coordinate and delegate to each other. Human operates at strategy and review layer only.

- **Agent registry** — what agents exist, what they're capable of
- **Handoff protocol** — structured context passing between agents (`relay/`)
- **Specialized agents** — coder, researcher, analyst, writer roles
- **Human-in-loop gates** — approval checkpoints before high-stakes actions

*Unlocks: The vision. Set direction, agents execute and coordinate, outcomes reported.*

---

## Success Metrics

| Phase | Metric |
|-------|--------|
| 1 — Foundation | Platform doesn't fall over. All model calls routed through gateway. |
| 2 — Knowledge | "I found that in LORE" accelerates work at least once per week. 100% of sessions auto-archived. |
| 3 — Chief of Staff | Can delegate and get a useful response from Telegram without opening a terminal. |
| 4 — Dispatcher | Can assign a scoped task via Telegram and receive a completed deliverable without touching a keyboard. |
| 5 — Network | Multiple agents execute a multi-step client engagement with one human direction-setting prompt. |

---

## Open Questions

1. **RAG target:** AnythingLLM still the right choice? Re-evaluate given LiteLLM decouples the backend.
2. **Dispatcher substrate:** Claude API (Anthropic SDK) vs. an agent framework (LangGraph, CrewAI)? Tradeoffs: control vs. scaffolding.
3. **RELAY protocol:** Minimum viable handoff — file-based LORE reference, message queue, or API?
4. **Human-in-loop gates:** For Phase 4+, what actions require explicit approval before execution?
