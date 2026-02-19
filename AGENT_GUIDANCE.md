# INTenX AI Development Infrastructure
## Agent Guidance

**Purpose:** Evaluate, implement, and maintain INTenX's AI development stack — the local model infrastructure, knowledge base, session archival, observability, and cost governance tools that support all WSL instances and engineering disciplines.

---

## Session Purpose

This session owns the **product development stack** — the shared infrastructure layer that all INTenX agents and sessions run on top of. It is not tied to any single client or project.

**Primary Responsibilities:**
1. Local model infrastructure — Ollama model management and evaluation
2. Knowledge base and RAG — evaluate, maintain, and evolve the knowledge retrieval stack
3. Session archival and curation — pipeline from raw sessions to searchable knowledge
4. Observability — monitoring across WSL instances and agent sessions
5. AI gateway and cost governance — model routing, spend tracking, budget enforcement
6. Stack evaluation — assess new tools against RTGF governance dimension research

---

## Table Stakes (How to Work)

### Git Workflow
- Conventional commits (feat:, fix:, docs:, refactor:, chore:)
- Feature branches for significant changes
- Co-authored commits: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- Git identity: `cole.basta@makanuienterprises.com`

### Connecting to Services

**Ollama (local models):**
```bash
# Load env vars + aliases from any WSL instance
source /mnt/c/Temp/wsl-shared/ollama-setup.sh

# Test connectivity
source /mnt/c/Temp/wsl-shared/ollama-setup.sh --test

# Make permanent
source /mnt/c/Temp/wsl-shared/ollama-setup.sh --bashrc

# After sourcing: use $OLLAMA_HOST and $OLLAMA_API_BASE
# Aliases available: ollama-status, ollama-models, ollama-start
```

**LibreChat (web UI — keep + decouple, see Session Context):**
```bash
# LibreChat runs on Ubuntu-AI-Hub WSL
# UI: http://localhost:3080 (from Ubuntu-AI-Hub) or http://<hub-ip>:3080 (other WSL)
# Source: /home/cbasta/LibreChat on Ubuntu-AI-Hub
# Start: cd /home/cbasta/LibreChat && docker compose up -d
```

**Full service reference:** `/mnt/c/Temp/wsl-shared/CONTEXT.md`

### Session Archival Tools (LORE)
```bash
# Import a Claude Code session to knowledge repo
node ~/rtgf-ai-stack/lore/tools/cli/rcm-import.js \
  --source ~/.claude/projects/-home-cbasta/SESSION_ID.jsonl \
  --platform claude-code \
  --target /home/cbasta/intenx-knowledge/

# Browse sessions (web dashboard)
node ~/rtgf-ai-stack/lore/tools/web/server.js /home/cbasta/intenx-knowledge/ 3000

# Promote session through knowledge flow states
node ~/rtgf-ai-stack/lore/tools/cli/rcm-flow.js promote \
  --session SESSION_ID --to codified --tags "topic,discipline"

# Find orphaned sessions not yet imported
node ~/rtgf-ai-stack/lore/tools/cli/rcm-find-orphans.js \
  --target /home/cbasta/intenx-knowledge/ --import
```

**Knowledge flow states:** `hypothesis → codified → validated → promoted`
**Knowledge repos:** per-client, private (`intenx-knowledge`, `sensit-knowledge`, etc.)
**State implementation:** directory location = state; always use `git mv`, never manual `mv`

---

## Infrastructure Components

### Local Model Layer
- **Ollama** — serves open-weight LLMs via OpenAI-compatible API; runs on Windows (AMD AI Bundle), accessible from all WSL instances
- **Available models:** qwen2.5-coder:14b (best coding), deepseek-coder-v2:lite, llama3.1:8b, phi4-mini, and others
- **Pull new models:** via PowerShell from any WSL instance (see CONTEXT.md)

### Knowledge Base / RAG Layer
- **Current:** LibreChat + RAG API (pgvector) + MeiliSearch — installed on Ubuntu-AI-Hub
- **Decision:** Keep + decouple. Route RAG through LiteLLM. No deep LibreChat integrations.
- **Status:** Production — do not build against LibreChat RAG API directly

### Session Archival Layer (LORE)
- **Tools:** `~/rtgf-ai-stack/lore/tools/` — CLI, TUI, web dashboard
- **Adapters:** Claude Code (working), ChatGPT/Gemini (pending)
- **Knowledge repos:** 6 private per-client repos deployed on GitHub (INTenX org)
- **Status:** Production-ready for Claude Code; 100+ sessions imported

### Observability Layer
- **Decision:** Opcode first, OTel+Grafana later
- **Config:** `~/rtgf-ai-stack/observability/`
- **Status:** Not yet implemented

### AI Gateway / Cost Governance
- **Decision:** LiteLLM — implement now (priority)
- **Config:** `~/rtgf-ai-stack/gateway/`
- **Status:** Not yet implemented

---

## Escalation Points (to Control Center)

- Major stack decisions (replace LibreChat, observability platform choice)
- Budget and cost governance policy decisions
- Cross-client infrastructure changes (affects all WSL instances)
- New WSL instance setup or service deployment
- Locked names: SAGE→LORE, RCM→CTX, ISC/AIRC→RELAY

---

## Decision Authority

**This session handles:**
- Tool evaluation and recommendation (pro/con analysis, PoCs)
- Service configuration and maintenance
- Session archival operations and curation
- Infrastructure documentation

**Control Center handles:**
- Final approval on major stack changes
- Budget decisions
- Cross-client coordination

**User handles:**
- Strategic tool choices
- New service procurement or licensing

---

## References

- Shared services context: `/mnt/c/Temp/wsl-shared/CONTEXT.md`
- Ollama setup script: `/mnt/c/Temp/wsl-shared/ollama-setup.sh`
- Session context (current state, decisions): `~/rtgf-ai-stack/STACK-SESSION-CONTEXT.md`
- Control Center memory: `~/.claude/projects/-home-cbasta/memory/MEMORY.md`
- RTGF governance research: `~/rtgf/RTGF-Governance-Research-2026-02-17.md`
- CTX module operations: `~/rtgf-ai-stack/lore/ctx/AGENTS.md`
