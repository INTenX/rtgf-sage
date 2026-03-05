# Knowledge Flow

How sessions move from raw conversation to searchable knowledge.

## Full Pipeline

```mermaid
flowchart TD
    subgraph Capture["1. Capture"]
        CC["Claude Code session\n(JSONL)"]
        GPT["ChatGPT export\n(JSON)"]
        GEM["Gemini export\n(JSON)"]
    end

    subgraph Import["2. Import (rcm-import)"]
        PARSE["Parse platform format"]
        NORM["Normalize to canonical YAML"]
        META["Extract metadata\ntitle, date, platform"]
    end

    subgraph Archive["3. Archive (GitHub repo)"]
        RAW["archive/raw/{platform}/\n(gitignored)"]
        CAN["archive/canonical/{year}/{month}/\n{id}.md"]
    end

    subgraph Flow["4. Knowledge Flow"]
        HYP["flows/hypothesis/\nAuto-imported\nUnreviewed"]
        COD["flows/codified/\nManually tagged\nStructured"]
        VAL["flows/validated/\nQuality score ≥ 70\nReviewed"]
        PRO["flows/promoted/\nRAG-indexed\nSearchable"]
    end

    subgraph Search["5. Search (ctx-search)"]
        IDX["MiniSearch index\n(BM25, in-memory)"]
        LANCE["LanceDB\n(semantic, planned)"]
        RES["Results: title, snippet,\ntags, flow_state, date"]
    end

    subgraph Inject["6. Inject"]
        SYS["System prompt prefix\n[ARCHIVE CONTENT]"]
        LLM["LLM call\nwith context"]
    end

    CC --> PARSE
    GPT --> PARSE
    GEM --> PARSE
    PARSE --> NORM
    NORM --> META
    META --> RAW
    META --> CAN
    CAN --> HYP

    HYP -->|"rcm-flow promote\n--to codified"| COD
    COD -->|"rcm-flow promote\n--to validated"| VAL
    VAL -->|"rcm-flow promote\n--to promoted"| PRO

    PRO --> IDX
    VAL --> IDX
    IDX --> LANCE
    IDX --> RES
    RES --> SYS
    SYS --> LLM
```

## Quality Scoring

Sessions earn a quality score (0–100) during curation:

| Score Range | Meaning | Auto-promote? |
|-------------|---------|---------------|
| 0–49 | Low — raw capture | No |
| 50–69 | Medium — tagged but unverified | No |
| 70–84 | Good — reviewed, accurate | Yes → validated |
| 85–100 | Excellent — canonical reference | Yes → promoted |

## rcm-flow Commands

```bash
# Promote a session forward
node ~/rtgf-ai-stack/chronicle/tools/cli/rcm-flow.js \
  promote \
  --session <session-id> \
  --to codified \
  --tags "litellm, gateway, docker"

# Set quality score
node ~/rtgf-ai-stack/chronicle/tools/cli/rcm-flow.js \
  score \
  --session <session-id> \
  --score 82

# List sessions in a flow state
node ~/rtgf-ai-stack/chronicle/tools/cli/rcm-flow.js \
  list \
  --state hypothesis \
  --repo ~/intenx-knowledge
```

## State Transitions

```mermaid
stateDiagram-v2
    direction LR

    [*] --> hypothesis: rcm-import\n(automatic, daily cron)

    hypothesis --> hypothesis: stays here\nuntil reviewed
    hypothesis --> codified: rcm-flow promote\n+ add tags

    codified --> validated: rcm-flow promote\n+ quality_score ≥ 70

    validated --> promoted: rcm-flow promote\n(enters RAG index)

    hypothesis --> [*]: auto-prune\nafter 30 days (planned)
```

## Finding Orphaned Sessions

Sessions can be missed by the daily cron (e.g., if the machine was off):

```bash
node ~/rtgf-ai-stack/chronicle/tools/cli/rcm-find-orphans.js \
  --target ~/intenx-knowledge \
  --import
```

This scans `~/.claude/projects/` for JSONL sessions not yet in the knowledge repo and imports them.
