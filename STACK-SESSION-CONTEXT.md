# AI Development Stack — Session Context
**Last Updated:** 2026-02-18
**Updated By:** INTenX Control Center

---

## 📬 Control Center Decisions — 2026-02-18

*Read this first. All strategic questions from the former SAGE session are resolved.*

| Topic | Decision |
|-------|----------|
| **Session name** | **AI Stack** (was SAGE) |
| **Repo** | `rtgf-ai-stack` → `github.com/INTenX/rtgf-ai-stack` |
| **SAGE rename** | **LORE** (Library Of Refined Evidence) — locked. Update all docs/tooling before public release. |
| **LibreChat** | **Keep + decouple.** Keep short-term for Ollama web UI value. Route RAG through LiteLLM so backend is swappable. Do NOT build deep integrations against LibreChat's RAG API directly. |
| **LiteLLM gateway** | **Implement now.** Priority before scaling usage further. Routes Ollama + cloud APIs, per-client cost attribution. |
| **Observability** | **Opcode first, OTel+Grafana later.** Don't over-build for current operational tempo. |
| **OpenClaw** | **Deprecate.** Superseded by Claude Code + Control Center + LORE + RELAY. |
| **Security bridge tools** | Document in `rtgf-ai-stack` as **platform bridge layer** — compensating for Claude Code gaps (`/rename`, tasklist config, `resume-by-name`, `showclaude`, session index tools). Track for deprecation when Claude Code adds native support. |

**Your calls (low-risk, do when ready):**
- Enable daily LORE import cron — `crontab -e`, low risk, reversible
- SensitDev orphan detection — run the detection prompt on SensitDev WSL
- ChatGPT/Gemini exports — import when convenient

**Platform Bridge Layer — Claude Code Gap Tools** (all in `~/.local/bin/` on INTenXDev WSL):

| Tool | Command | Compensates For |
|------|---------|----------------|
| `showclaude` | `showclaude [-t] [session-id\|--all]` | No native cross-session visibility in Claude Code — shows all sessions with task lists |
| `rename-session-by-id` | `rename-session-by-id <id> "name"` | No native `/rename` in Claude Code — renames a session by ID prefix |
| `resume-by-name` | `resume-by-name "AI Stack"` | No native named session resume — list sessions or resume by name |
| `show-tasks` | `show-tasks` | Original task display tool — **superseded by `showclaude`** |

These are monitoring infrastructure for the stack session. Document in `rtgf-ai-stack/scripts/` or `rtgf-ai-stack/bridge/`. Track each for deprecation when Claude Code adds native support.

**Proposed `rtgf-ai-stack` repo structure:**
```
rtgf-ai-stack/
├── lore/           (session archival + knowledge curation — formerly sage tools)
├── relay/          (inter-session coordination — when built)
├── gateway/        (LiteLLM config)
├── observability/  (Opcode + OTel/Grafana config)
├── compose/        (Docker compose for LibreChat and other services)
└── scripts/        (ollama-setup.sh and shared service scripts)
```

---

## Current Stack State

### Ollama (Local Models) — Operational ✅
- **Running on:** Windows (AMD AI Bundle), accessible from all WSL instances
- **Setup script:** `/mnt/c/Temp/wsl-shared/ollama-setup.sh`
- **Models installed (2026-02-18):**

| Model | Size | Best For |
|-------|------|----------|
| qwen2.5-coder:14b | 9.0 GB | Coding — best quality |
| deepseek-coder-v2:lite | 8.9 GB | Coding — MoE architecture |
| llama3.1:8b | 4.9 GB | General reasoning |
| qwen2.5-coder:7b | 4.7 GB | Coding — fast |
| mistral:7b | 4.4 GB | General purpose |
| phi4-mini | 2.5 GB | Compact, capable |
| llama3.2:3b | 2.0 GB | Fast chat |
| gemma2:2b | 1.6 GB | Ultra-fast, simple tasks |

### LibreChat — Keep + Decouple ✅ (Decision 2026-02-18)
- **Installed on:** Ubuntu-AI-Hub WSL instance
- **Source:** `/home/cbasta/LibreChat`
- **UI:** `http://localhost:3080` (from Ubuntu-AI-Hub)
- **Components:** LibreChat API, MongoDB, MeiliSearch, RAG API, pgvector
- **Configured endpoints:** Ollama (via `host.docker.internal:11434`), OpenAI placeholder
- **Decision:** Keep short-term for Ollama web UI value. Route RAG through LiteLLM so backend is swappable. Do NOT build deep integrations against LibreChat's RAG API directly.

### Session Archival Tools (LORE) — Production Ready ✅
- **Location:** `~/rtgf-sage/tools/`
- **Status:** CLI, TUI, web dashboard all functional
- **Claude Code adapter:** Working — 100+ sessions imported across production knowledge repos
- **ChatGPT/Gemini adapters:** Pending
- **Knowledge repos deployed:** 7 (1 public tools, 6 private per-client)
- **Daily import cron:** Not yet enabled; set up when ready to populate

### Observability — Opcode First ⬜ (Decision 2026-02-18)
- **Decision:** Opcode first, OTel+Grafana later. Don't over-build for current operational tempo.
- **Action needed:** Install and configure Opcode (auto-detects `~/.claude/projects/`)

### AI Gateway / Cost Governance — Implement Now ⬜ (Decision 2026-02-18)
- **Decision:** LiteLLM. Priority before scaling usage further.
- **Value:** Single gateway for Ollama local + cloud APIs; per-client cost attribution
- **Action needed:** Implement in `rtgf-ai-stack/gateway/`

---

## Resolved Decisions (2026-02-18)

All open decisions resolved by Control Center. See decisions table at top of this file.

| # | Question | Resolution |
|---|----------|------------|
| 1 | LibreChat — keep or replace? | **Keep + decouple.** Route RAG through LiteLLM. No deep integrations. |
| 2 | LiteLLM gateway — add? | **Implement now.** Priority before scaling. |
| 3 | Observability platform? | **Opcode first**, OTel+Grafana later. |
| 4 | Capability module naming? | **SAGE→LORE, RCM→CTX, ISC/AIRC→RELAY** — locked. |

---

## Network Reference

| Service | From Ubuntu-AI-Hub | From Other WSL | From Docker |
|---------|-------------------|----------------|-------------|
| Ollama API | `http://<gateway>:11434` | `http://<gateway>:11434` | `http://host.docker.internal:11434` |
| LibreChat UI | `http://localhost:3080` | `http://<hub-ip>:3080` | N/A |
| MeiliSearch | `http://localhost:7700` | `http://<hub-ip>:7700` | `http://meilisearch:7700` |
| MongoDB | Internal Docker only | Internal Docker only | `mongodb://mongodb:27017` |

- Gateway IP: auto-detected via `ip route show default | awk '{print $3}'`
- Ubuntu-AI-Hub IP: `172.27.109.43` (may change on reboot)

---

## Prior Work Reference
- Full LORE development history: `~/rtgf-sage/SESSION_CONTEXT_2026-02-11.md`
- CTX module operations detail: `~/rtgf-sage/ctx/AGENTS.md`
- Governance research (tool landscape, RAG options): `~/rtgf/RTGF-Governance-Research-2026-02-17.md`
- Trademark research (SAGE rename required): `~/rtgf/RTGF-Trademark-Research-2026-02-18.md`
