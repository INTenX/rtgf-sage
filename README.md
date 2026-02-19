# rtgf-ai-stack

**INTenX AI Development Infrastructure**

Monorepo for the AI development stack — local model infrastructure, session archival, knowledge curation, observability, and cost governance.

---

## Structure

```
rtgf-ai-stack/
├── lore/           — Session archival + knowledge curation (LORE)
├── gateway/        — LiteLLM config (Ollama + cloud API routing)
├── observability/  — Opcode + OTel/Grafana config
├── compose/        — Docker Compose for LibreChat and other services
├── scripts/        — Shared service scripts (ollama-setup.sh, wsl-audit)
└── relay/          — Inter-session coordination (RELAY — when built)
```

---

## Components

### LORE — Library Of Refined Evidence (`lore/`)
Git-native LLM conversation archival and knowledge flow management.
- Agent-agnostic session import (Claude Code, ChatGPT, Gemini)
- Knowledge Flow states: hypothesis → codified → validated → promoted
- Per-client isolation via separate knowledge repos
- RAG export pipeline to AnythingLLM

**Status:** Production-ready for Claude Code. ChatGPT/Gemini adapters pending.

See [`lore/README.md`](lore/README.md) for usage.

### Gateway — LiteLLM (`gateway/`)
Single endpoint routing Ollama local models + cloud APIs (Anthropic, OpenAI).
Per-client cost attribution and spend tracking.

**Status:** Implementation pending — priority.

### Observability (`observability/`)
Opcode for session browsing. OTel + Grafana for real-time cross-WSL dashboards.

**Status:** Opcode setup pending.

### Compose (`compose/`)
Docker Compose configs for LibreChat and other services.

### Scripts (`scripts/`)
Shared operational scripts across all WSL instances.
- `ollama-setup.sh` — Ollama environment setup (canonical copy: `/mnt/c/Temp/wsl-shared/`)
- `wsl-audit` — WSL/Docker health monitoring (implementation pending)

### RELAY (`relay/`)
Inter-session coordination. Planned — not yet built.

---

## Session Context

- **Agent guidance:** [`AGENT_GUIDANCE.md`](AGENT_GUIDANCE.md)
- **Stack state + decisions:** [`STACK-SESSION-CONTEXT.md`](STACK-SESSION-CONTEXT.md)

---

## Knowledge Repositories

Per-client private repos on GitHub (INTenX org):

| Repo | Client |
|------|--------|
| `intenx-knowledge` | INTenX (internal) |
| `sensit-knowledge` | Sensit Technologies |
| `makanui-knowledge` | Makanui LLC |
| `ratio11-knowledge` | Ratio11 Electronics |
| `beaglebone-knowledge` | BeagleBone Projects |
| `test-knowledge` | Development/testing |

---

## License

Apache 2.0
