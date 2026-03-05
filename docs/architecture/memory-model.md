# Memory Model

The AI Stack implements a tri-layer memory architecture spanning ephemeral working memory, structured episodic memory, and durable semantic knowledge.

## Memory Architecture

```mermaid
graph TB
    subgraph L1["Layer 1 — Working Memory (ephemeral)"]
        WM["Telegram conversation history\n.chat-history.json\nRolling 20-turn window"]
        CC_CTX["Claude Code context window\nIn-session only"]
    end

    subgraph L2["Layer 2 — Episodic Memory (session-scoped)"]
        JSONL["Session JSONL files\n~/.claude/projects/*/"]
        YAML["Canonical YAML sessions\ncanonical/{year}/{month}/"]
        META["Session metadata\ntitle, tags, flow_state, quality_score"]
    end

    subgraph L3["Layer 3 — Semantic Memory (durable)"]
        GH_REPO["GitHub Knowledge Repos\n(per client, git-versioned)"]
        IDX["ctx-search index\nMiniSearch (BM25 in-memory)"]
        FLOW["Knowledge Flow States\nhypothesis → codified → validated → promoted"]
    end

    subgraph Inject["Context Injection"]
        CI["getContextForPrompt()\nTop 3 relevant sessions\nInjected as system prompt prefix"]
    end

    CC_CTX -->|"rcm-import daily cron"| JSONL
    JSONL -->|"rcm-import"| YAML
    YAML --> META
    META --> GH_REPO
    GH_REPO -->|"git pull on startup"| IDX
    IDX --> CI
    CI -->|"LLM calls"| WM

    style L1 fill:#0d47a1,color:#fff
    style L2 fill:#1a237e,color:#fff
    style L3 fill:#311b92,color:#fff
    style Inject fill:#4a148c,color:#fff
```

## Knowledge Flow States

Sessions progress through a validation pipeline before reaching the RAG index:

```mermaid
stateDiagram-v2
    [*] --> hypothesis : rcm-import (auto)
    hypothesis --> codified : manual tagging\nrcm-flow promote
    codified --> validated : quality_score ≥ 70\nrcm-flow promote
    validated --> promoted : export to RAG\nrcm-flow promote
    promoted --> [*] : in ctx-search index

    note right of hypothesis
        Auto-imported from\nClaude Code JSONL
        Pruned after 30 days
    end note

    note right of promoted
        Available for\ncontext injection
    end note
```

## Memory Taxonomy

| Type | Layer | Store | Lifetime | Access |
|------|-------|-------|----------|--------|
| **Working** | L1 | `.chat-history.json` | Session / rolling 20 turns | Telegram bot |
| **Episodic** | L2 | YAML + git | Permanent (per session) | rcm-import, rcm-find-orphans |
| **Semantic** | L3 | GitHub repos + MiniSearch | Permanent + searchable | ctx-search |
| **Procedural** | L3 | CLAUDE.md + AGENTS.md | Permanent | Claude Code context |

## Repository Topology

```mermaid
graph TD
    TOOLS["rtgf-ai-stack\n(tools, public, Apache 2.0)"]

    TOOLS -->|"bound-to"| IK["intenx-knowledge\n(private)"]
    TOOLS -->|"bound-to"| SK["sensit-knowledge\n(private)"]
    TOOLS -->|"bound-to"| MK["makanui-knowledge\n(private)"]
    TOOLS -->|"bound-to"| RK["ratio11-knowledge\n(private)"]
    TOOLS -->|"bound-to"| BK["beaglebone-knowledge\n(private)"]
    TOOLS -->|"bound-to"| TK["test-knowledge\n(public)"]

    style TOOLS fill:#006064,color:#fff
    style IK fill:#1a237e,color:#fff
    style SK fill:#1b5e20,color:#fff
    style MK fill:#4a148c,color:#fff
    style RK fill:#bf360c,color:#fff
    style BK fill:#212121,color:#fff
    style TK fill:#33691e,color:#fff
```

Each knowledge repo structure:
```
{client}-knowledge/
├── ctx/
│   ├── archive/
│   │   ├── raw/{platform}/          # Original JSONL (gitignored)
│   │   └── canonical/{year}/{month}/ # Unified YAML
│   ├── flows/
│   │   ├── hypothesis/              # Auto-imported, unreviewed
│   │   ├── codified/                # Tagged, structured
│   │   ├── validated/               # Quality-checked
│   │   └── promoted/                # RAG-indexed
│   └── schemas/
└── README.md
```

## Git Growth Management

!!! warning "Raw session data grows fast"
    `ctx/archive/raw/` JSONL files should be in `.gitignore` in all knowledge repos. Only canonical YAML and flow-state sessions belong in git.

**Mitigation strategy:**

- `raw/` never committed (gitignored)
- `hypothesis/` auto-pruned after 30 days (cron job — **pending**)
- Long-term: git stores manifests only; raw content migrates to S3/cold storage
