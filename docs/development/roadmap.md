# Roadmap

## Phase Status

```mermaid
gantt
    title RTGF AI Stack — Phase Delivery
    dateFormat YYYY-MM-DD
    axisFormat %b %Y

    section Phase 0-1
    Foundation + wsl-audit         :done, p1, 2026-01-01, 2026-02-15

    section Phase 2
    WARD hooks                     :done, p2a, 2026-02-15, 2026-02-22
    LiteLLM SQLite + CHRONICLE security :done, p2b, 2026-02-15, 2026-02-22
    wsl-audit event log            :done, p2c, 2026-02-15, 2026-02-22

    section Phase 3
    Session search CLI (ctx-search) :done, p3a, 2026-02-22, 2026-03-01
    CHRONICLE context injection     :done, p3b, 2026-02-22, 2026-03-05
    Telegram bot + conversation history :done, p3c, 2026-02-22, 2026-03-05
    LanceDB embedding pipeline      :active, p3d, 2026-03-05, 2026-03-20
    Auto-prune hypothesis sessions  :p3e, 2026-03-10, 2026-03-20

    section Phase 4
    Task delegation protocol        :p4a, 2026-03-20, 2026-04-01
    Dispatcher component            :p4b, 2026-04-01, 2026-04-15
    Telegram gate                   :p4c, 2026-04-01, 2026-04-15

    section Phase 5
    BATON transport layer           :p5a, 2026-04-15, 2026-05-01
    Mem0 integration                :p5b, 2026-04-15, 2026-05-01
    Cedar policies                  :p5c, 2026-05-01, 2026-05-15
```

## Detailed Phase Breakdown

### ✅ Phase 0–1: Foundation
- Ollama running on Windows AMD GPU
- wsl-audit platform health tool
- CHRONICLE session archival (100+ sessions)
- Knowledge repos deployed (7 repos)
- LibreChat web UI

### ✅ Phase 2: Security Foundation
- WARD Claude Code hooks (`hooks/`)
- LiteLLM gateway deployed on Ubuntu-AI-Hub
- PostgreSQL backend for spend tracking
- wsl-audit event log + Telegram CRIT alerts
- CHRONICLE security fields (flow_state, quality_score)

### ✅ Phase 3 (Partial): Context + Interface
- [x] ctx-search CLI (MiniSearch BM25)
- [x] Telegram bot with conversation history
- [x] CHRONICLE context injection in bot
- [x] systemd service for bot
- [x] Self-healing gateway discovery
- [ ] LanceDB semantic search pipeline
- [ ] Auto-prune hypothesis sessions >30 days
- [ ] ChatGPT/Gemini CHRONICLE adapters (built, needs import run)

### ⬜ Phase 4: Coordination
- [ ] Task delegation protocol design
- [ ] Dispatcher component (`dispatcher/`)
- [ ] Telegram gate (command authorization)
- [ ] Mem0 memory orchestration

### ⬜ Phase 5: BATON
- [ ] Inter-session handoff transport
- [ ] Cross-WSL routing
- [ ] Cedar policy engine
- [ ] Leash/eBPF runtime enforcement

## Priority Items (Now)

| Priority | Task | Why |
|----------|------|-----|
| P0 | `loginctl enable-linger cbasta` | Bot dies on logout |
| P0 | Create LiteLLM keys for intenx/sensit teams | Client isolation |
| P1 | `ctx/archive/raw/` to .gitignore in knowledge repos | Git growth |
| P1 | LanceDB embedding pipeline | Semantic search |
| P2 | Auto-prune hypothesis sessions | Git size |
| P2 | Khoj PoC evaluation | Markdown-native RAG |
