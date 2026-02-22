# AI Development Stack — Session Context
**Last Updated:** 2026-02-22
**Updated By:** INTenX Control Center

---

## 📬 Control Center Decisions — 2026-02-18 (Current)

*Read this first. All strategic questions from the former SAGE session are resolved.*

| Topic | Decision |
|-------|----------|
| **Session name** | **AI Stack** (was SAGE) |
| **Repo** | `rtgf-ai-stack` → `github.com/INTenX/rtgf-ai-stack` ✅ Created |
| **SAGE rename** | **LORE** (Library Of Refined Evidence) — locked. Update all docs/tooling before public release. |
| **LibreChat** | **Keep + decouple.** Keep short-term for Ollama web UI value. Route RAG through LiteLLM so backend is swappable. Do NOT build deep integrations against LibreChat's RAG API directly. |
| **LiteLLM gateway** | ✅ **Implemented** — `gateway/` in rtgf-ai-stack. Per-client virtual keys, budget enforcement, UI at `:4000/ui`. |
| **Observability** | **Opcode first, OTel+Grafana later.** Opcode not yet set up. |
| **OpenClaw** | **Deprecate.** Superseded by Claude Code + Control Center + LORE + RELAY. |
| **Security bridge tools** | Document in `rtgf-ai-stack` as **platform bridge layer** — compensating for Claude Code gaps. Track for deprecation when Claude Code adds native support. |

**Your calls (low-risk, do when ready):**
- SensitDev orphan detection — run the detection prompt on SensitDev WSL
- ChatGPT/Gemini exports — adapters built (refactored-churning-gizmo session), import when convenient

**Platform Bridge Layer — Claude Code Gap Tools** (all in `~/.local/bin/` on INTenXDev WSL):

| Tool | Command | Compensates For |
|------|---------|----------------|
| `showclaude` | `showclaude [-t] [session-id\|--all]` | No native cross-session visibility in Claude Code |
| `rename-session-by-id` | `rename-session-by-id <id> "name"` | No native `/rename` in Claude Code |
| `resume-by-name` | `resume-by-name "AI Stack"` | No native named session resume |
| `show-tasks` | `show-tasks` | **Superseded by `showclaude`** |

---

## Current Stack State (2026-02-22)

### Ollama (Local Models) — Operational ✅
- **Running on:** Windows (AMD AI Bundle), accessible from all WSL instances
- **Setup script:** `/mnt/c/Temp/wsl-shared/ollama-setup.sh`
- **Models installed:**

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

### LiteLLM Gateway — Implemented ✅
- **Location:** `rtgf-ai-stack/gateway/` + `rtgf-ai-stack/compose/gateway.yml`
- **API endpoint:** `http://localhost:4000/v1` (OpenAI-compatible)
- **UI dashboard:** `http://localhost:4000/ui`
- **Per-client keys:** `./gateway/setup-client.sh <client-name> <monthly-budget>`
- **Model aliases:** `local-coding`, `local-general`, `local-fast`, `local-compact`, `local-coding-fast`
- **Cloud fallback:** local aliases fall back to `claude-sonnet-4-6` / `claude-haiku-4-5` if Ollama unavailable
- **Status:** Built. Needs `.env` secrets filled and Docker started to activate.

### Telegram Bot Interface — Built ✅
- **Location:** `rtgf-ai-stack/interface/`
- **Commands:** `/ask`, `/code`, `/reason`, `/fast`, `/status`, `/health`, `/lore`, `/models`, `/spend`, `/import`
- **Multi-client:** Each Telegram group maps to a client via `config.yaml`; LiteLLM virtual key per client
- **LORE search:** `/lore <query>` searches session archive
- **Platform health:** `/status` runs `wsl-audit risks`, `/health` runs `wsl-audit all`
- **Status:** Built. Needs `TELEGRAM_TOKEN` in `interface/.env` and bot created via BotFather to activate.

### SENTINEL (Claude Code Hooks) — Built ✅ Phase 2
- **Location:** `rtgf-ai-stack/hooks/`
- **Deploy:** `bash ~/rtgf-ai-stack/hooks/install-hooks.sh`
- **Audit log:** `~/.claude/audit/YYYY-MM-DD.jsonl`
- **Policy:** `hooks/policy/blocked-patterns.json` (configurable block/warn rules)
- **Config:** `~/.claude/hooks/sentinel.env` (TELEGRAM_TOKEN, TELEGRAM_CHAT_ID)
- **Blocks:** `rm -rf`, `git reset --hard`, force push, SQL DDL drops, SSH keys, private key files
- **Status:** Built. Run `install-hooks.sh` to activate.

### wsl-audit Tool — Built ✅ (Phase 2 enhanced)
- **Location:** `~/.local/bin/wsl-audit` + `rtgf-ai-stack/scripts/`
- **Subcommands:** `status`, `docker`, `processes`, `compose`, `risks`, `all`, `watch [N]`, `events [N]`
- **Phase 2 additions:** Structured JSONL event log (`~/.local/share/wsl-audit/events/`), Telegram CRIT alerts with cooldown
- **Alert config:** `~/.local/share/wsl-audit/alert.env` (TELEGRAM_TOKEN, TELEGRAM_CHAT_ID)
- **Key checks:** `.wslconfig` memory cap, restart policies, RestartCount, orphaned processes
- **Mandatory governance:** Run `wsl-audit compose` before starting any new Docker service

### LORE (Session Archival) — Production Ready ✅
- **Location:** `rtgf-ai-stack/lore/` (was `~/rtgf-sage/tools/`)
- **Status:** CLI, TUI, web dashboard functional; Claude Code adapter working
- **Daily import cron:** ✅ Built (`lore/cron-daily-import.sh`) — needs `crontab -e` to activate
- **Multi-platform adapters:** ✅ ChatGPT + Gemini adapters built (refactored-churning-gizmo session)
- **Knowledge repos deployed:** 7 (1 public tools, 6 private per-client)
- **LORE Markdown migration:** ✅ Complete — sessions stored as Markdown with frontmatter

### LibreChat — Keep + Decouple ✅ (Decision 2026-02-18)
- **Installed on:** Ubuntu-AI-Hub WSL instance
- **Source:** `/home/cbasta/LibreChat`
- **UI:** `http://localhost:3080` (from Ubuntu-AI-Hub)
- **Decision:** Keep short-term. Route RAG through LiteLLM. No deep integrations.

### Observability — Pending ⬜
- **Decision:** Opcode first, OTel+Grafana later
- **Action needed:** Install and configure Opcode (auto-detects `~/.claude/projects/`)

---

## 📬 Incident — WSL/Docker Runaway (2026-02-18)

**Resolved.** `wsl-audit` is the mitigation tool. Mandatory governance artifacts:
- `.wslconfig` with memory cap = required before running AI services
- No `restart: always` without `restart_policy.max_attempts` limit
- Run `wsl-audit compose` before starting any new Docker service

See RTGF session context for governance pattern documentation.

---

## Open Work — This Session

| # | Task | Status | Owner |
|---|------|--------|-------|
| P2 | Run `install-hooks.sh` to activate SENTINEL | **Ready** | You |
| P2 | Fill `~/.claude/hooks/sentinel.env` (Telegram token) | Pending | You |
| P2 | Restart LiteLLM gateway (SQLite DB + verbose logging) | Pending | You |
| P2 | Fill `~/.local/share/wsl-audit/alert.env` (wsl-audit Telegram) | Pending | You |
| — | Fill gateway/.env and activate LiteLLM | Pending | You |
| — | Set up Telegram bot (BotFather + .env) | Pending | You |
| — | Install and configure Opcode observability | Pending | AI Stack session |
| — | SensitDev orphan detection | Pending | AI Stack session |
| — | Import ChatGPT/Gemini history | Pending (adapters ready) | When convenient |

## Active Parallel Session

**`refactored-churning-gizmo` (ed1c4104)** — working in `rtgf-ai-stack/` on:
- LORE phase 2 work (cron ✅, adapters ✅, Markdown migration ✅)
- Next: Session search CLI + RAG pipeline, RELAY design (Phase 5)
- Do not duplicate work — check this session's tasks before starting new LORE/RELAY work

---

## Network Reference

| Service | From Ubuntu-AI-Hub | From Other WSL | From Docker |
|---------|-------------------|----------------|-------------|
| Ollama API | `http://<gateway>:11434` | `http://<gateway>:11434` | `http://host.docker.internal:11434` |
| LiteLLM Gateway | `http://localhost:4000` | `http://<hub-ip>:4000` | N/A |
| LibreChat UI | `http://localhost:3080` | `http://<hub-ip>:3080` | N/A |

- Gateway IP: auto-detected via `ip route show default | awk '{print $3}'`
- Ubuntu-AI-Hub IP: `172.27.109.43` (may change on reboot)

---

## Prior Work Reference
- Full LORE development history: `~/rtgf-ai-stack/lore/SESSION_CONTEXT_2026-02-11.md`
- CTX module operations detail: `~/rtgf-ai-stack/lore/ctx/AGENTS.md`
- Governance research (tool landscape, RAG options): `~/rtgf/RTGF-Governance-Research-2026-02-17.md`
- Trademark research (SAGE rename required): `~/rtgf/RTGF-Trademark-Research-2026-02-18.md`
- refactored-churning-gizmo LORE work: `~/rtgf-ai-stack/lore/IMPLEMENTATION_STATUS.md`
