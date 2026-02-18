# LORE → AnythingLLM RAG Integration

**Purpose:** Connect LORE promoted sessions to AnythingLLM for semantic search and context retrieval

---

## Overview

**Goal:** Make validated/promoted LORE sessions searchable and retrievable in AnythingLLM for enhanced context in future conversations.

**Flow:**
```
LORE (promoted) → Markdown Export → AnythingLLM Documents → Vector Embedding → Semantic Search
```

**Value:**
- **Context Persistence:** Never lose important past discussions
- **Cross-Session Learning:** LLM can reference previous solutions
- **Client Context:** Maintain client-specific knowledge bases
- **Search:** Find relevant sessions semantically, not just by tags

---

## Architecture

### LORE Side (Source)
```
intenx-knowledge/
├── rcm/flows/promoted/          # Sessions ready for RAG
│   ├── 2026-02-business-strategy_abc123.yaml (symlink)
│   ├── 2026-02-architecture-kicad_def456.yaml (symlink)
│   └── ...
└── exports/                     # Generated Markdown (git-ignored)
    └── rag-export-2026-02-11/
        ├── 2026-02-business-strategy_abc123.md
        ├── 2026-02-architecture-kicad_def456.md
        └── ...
```

### AnythingLLM Side (Destination)
```
~/.anythingllm/documents/
├── intenx/                      # INTenX workspace
│   ├── sage-2026-q1/
│   │   ├── business-strategy/
│   │   ├── architecture/
│   │   └── requirements/
├── sensit/                      # Sensit workspace
│   └── sage-2026-q1/
└── makanui/                     # Makanui workspace
    └── sage-2026-q1/
```

---

## Setup (One-Time)

### 1. Install AnythingLLM

**Option A: Docker (Recommended)**
```bash
docker run -d \
  --name anythingllm \
  -p 3001:3001 \
  -v ~/anythingllm-storage:/app/server/storage \
  mintplexlabs/anythingllm:latest
```

**Option B: Desktop App**
Download from: https://anythingllm.com/download

### 2. Create Workspaces

1. Open http://localhost:3001
2. Create workspaces:
   - **INTenX** - For intenx-knowledge sessions
   - **Sensit** - For sensit-knowledge sessions
   - **Makanui** - For makanui-knowledge sessions

### 3. Configure Document Paths

**In AnythingLLM Settings:**
- Set document storage path: `~/.anythingllm/documents/`
- Enable automatic re-indexing (watches for new files)

### 4. Set Up Export Directories

```bash
mkdir -p ~/.anythingllm/documents/intenx/sage-2026-q1
mkdir -p ~/.anythingllm/documents/sensit/sage-2026-q1
mkdir -p ~/.anythingllm/documents/makanui/sage-2026-q1
```

---

## Daily/Weekly Export Workflow

### Manual Export (Weekly)

```bash
# 1. Export INTenX promoted sessions
node /home/cbasta/rtgf-sage/tools/cli/rcm-export.js \
  --input ~/intenx-knowledge/rcm/flows/promoted/*.yaml \
  --format markdown \
  --output ~/.anythingllm/documents/intenx/sage-2026-q1/

# 2. Verify export
ls -lh ~/.anythingllm/documents/intenx/sage-2026-q1/
# Should see new .md files

# 3. Trigger AnythingLLM re-index (automatic if enabled)
# Or manually: AnythingLLM UI → Workspace → Upload Documents → Sync

# 4. Test search in AnythingLLM
# Query: "What was the TFaaS positioning strategy?"
# Should return relevant LORE session
```

### Automated Export (Cron)

```bash
# Add to cron-daily-import.sh:
echo "Exporting promoted sessions to AnythingLLM..." | tee -a "$LOG_FILE"

node "$LORE_ROOT/tools/cli/rcm-export.js" \
  --input "$HOME/intenx-knowledge/rcm/flows/promoted/*.yaml" \
  --format markdown \
  --output "$HOME/.anythingllm/documents/intenx/sage-$(date +%Y-q%q)/" \
  >> "$LOG_FILE" 2>&1

# Trigger AnythingLLM sync via API
curl -X POST http://localhost:3001/api/v1/workspace/intenx/sync \
  -H "Authorization: Bearer $ANYTHINGLLM_API_KEY" \
  >> "$LOG_FILE" 2>&1
```

---

## Markdown Export Format

**LORE exports sessions to RAG-optimized Markdown:**

```markdown
---
session_id: abc12345
title: "TFaaS Business Strategy Discussion"
created: 2026-02-08T13:53:15.450Z
platform: claude-code
tags:
  - business-strategy
  - tfaas
  - positioning
  - 2026-q1
flow_state: promoted
quality_score: 90
---

# TFaaS Business Strategy Discussion

**Session ID:** abc12345
**Platform:** Claude Code
**Date:** February 8, 2026
**Tags:** business-strategy, tfaas, positioning, 2026-q1

---

## Conversation

### User (2026-02-08 13:53:15)
I need to refine our TFaaS positioning for the Q1 pitch deck...

### Assistant (2026-02-08 13:53:45)
<details>
<summary>💭 Thinking Process</summary>

Let me analyze the current TFaaS positioning...
</details>

Great question! TFaaS positioning should emphasize...

[Full conversation continues...]

---

## Summary

This session captured the refined TFaaS positioning strategy for Q1 2026, focusing on three key differentiators:
1. Technology-first approach vs traditional consulting
2. AGAC (AI Generated Application Code) as delivery mechanism
3. Portfolio management model for sustained engagement

**Key Decisions:**
- Target: Mid-market companies with 50-200 employees
- Pricing: Subscription model with portfolio allocation
- Delivery: Weekly sprints with AI-assisted code generation

**Follow-up Items:**
- Draft Q1 pitch deck
- Prepare case studies
- Schedule client demos

---

*Exported from LORE (Session Archive & Governance Engine)*
*Original: /home/cbasta/intenx-knowledge/rcm/flows/promoted/2026-02-tfaas-strategy_abc12345.yaml*
```

**Why This Format Works for RAG:**
- ✅ YAML frontmatter with structured metadata
- ✅ Clear section headers for chunking
- ✅ Thinking process preserved (valuable context)
- ✅ Summary section (high-signal content for retrieval)
- ✅ Tags for filtering and relevance ranking

---

## AnythingLLM Configuration

### Workspace Settings (Per Client)

**INTenX Workspace:**
```yaml
Name: INTenX
Description: "INTenX business strategy, architecture, and client work"
Document Sources:
  - ~/.anythingllm/documents/intenx/sage-2026-q1/
  - ~/.anythingllm/documents/intenx/sage-2026-q2/ (future)
Embedding Model: text-embedding-3-large (OpenAI)
Vector DB: ChromaDB (local)
LLM: Claude Opus 4.6 (for retrieval-augmented responses)
```

**Context Settings:**
- Top K results: 5
- Similarity threshold: 0.7
- Max context tokens: 8000
- Include metadata: Yes (session_id, tags, date)

### Retrieval Optimization

**Document Chunking:**
- Chunk size: 1500 tokens
- Overlap: 200 tokens
- Chunking strategy: Semantic (respect message boundaries)

**Metadata Filtering:**
- Enable tag-based filtering (e.g., "find architecture sessions")
- Date range filtering (e.g., "sessions from Q1 2026")
- Quality score filtering (e.g., "only high-quality sessions")

---

## Usage Patterns

### Pattern 1: Context Retrieval

**Scenario:** Starting new session, need context from past discussions

```
User in AnythingLLM: "What was our approach to KiCad automation?"

AnythingLLM retrieves:
- Session abc123: "KiCad Automation Architecture v2"
- Session def456: "Python bindings for KiCad scripting"
- Session ghi789: "Automated BOM generation workflow"

LLM Response: "Based on previous discussions (sessions abc123, def456, ghi789),
your KiCad automation approach uses Python bindings with a three-layer architecture..."
```

### Pattern 2: Decision Tracking

**Scenario:** Client asks "What did we decide about hardware revision?"

```
User in AnythingLLM: "Sensit hardware revision decisions?"

AnythingLLM retrieves:
- Session aaa111: "Sensit Hardware v2 Requirements"
- Session bbb222: "Component selection for Sensit v2"
- Session ccc333: "PCB layout review - Sensit v2"

LLM Response: "From session aaa111 on Jan 15, you decided to go with
the STM32F4 microcontroller instead of ESP32 due to..."
```

### Pattern 3: Learning Persistence

**Scenario:** Solved a problem 2 months ago, can't remember solution

```
User in AnythingLLM: "How did I fix the KiCad Python import error?"

AnythingLLM retrieves:
- Session ddd444: "Debugging KiCad Python import issues"

LLM Response: "In session ddd444 from December, you resolved the Python
import error by setting PYTHONPATH to include KiCad's site-packages..."
```

---

## Quality Metrics

### Retrieval Accuracy
**Measure:** Do retrieved sessions match query intent?
- **Good:** >80% relevant results in top 3
- **Needs improvement:** <60% relevant results

**Fix:** Improve tagging, add more metadata, adjust similarity threshold

### Context Usefulness
**Measure:** Does LLM use retrieved context effectively?
- **Good:** LLM references specific sessions in responses
- **Needs improvement:** LLM ignores retrieved context

**Fix:** Improve Markdown export format, add more summary sections, increase context window

### Search Coverage
**Measure:** Can you find sessions when you know they exist?
- **Good:** >90% of promoted sessions findable with reasonable query
- **Needs improvement:** <70% findable

**Fix:** Review tag vocabulary, add session summaries, improve titles

---

## Troubleshooting

### "AnythingLLM not finding LORE sessions"

**Check:**
1. Are files in correct directory? (`ls ~/.anythingllm/documents/intenx/`)
2. Did AnythingLLM re-index? (Check workspace sync status)
3. Are files valid Markdown? (`cat file.md` should show content)
4. Is embedding working? (Check AnythingLLM logs)

**Fix:**
```bash
# Manual re-sync
curl -X POST http://localhost:3001/api/v1/workspace/intenx/sync \
  -H "Authorization: Bearer $ANYTHINGLLM_API_KEY"

# Verify documents loaded
curl http://localhost:3001/api/v1/workspace/intenx/documents \
  -H "Authorization: Bearer $ANYTHINGLLM_API_KEY"
```

### "Retrieved sessions not relevant"

**Cause:** Poor tagging, generic titles, missing summaries

**Fix:**
1. Improve session tagging in LORE (more specific tags)
2. Add summary sections to promoted sessions (manual edit)
3. Adjust AnythingLLM similarity threshold (lower for more results)

### "Export failing"

**Check:**
```bash
# Test export manually
node tools/cli/rcm-export.js \
  --input ~/intenx-knowledge/rcm/flows/promoted/2026-02*.yaml \
  --format markdown \
  --output /tmp/test-export/

# Check output
ls -lh /tmp/test-export/
cat /tmp/test-export/*.md
```

---

## Roadmap

### Phase 1: Manual Export (Current)
- [x] Markdown serializer
- [x] Export command
- [ ] Test with AnythingLLM
- [ ] Validate retrieval quality

### Phase 2: Automated Export (Next)
- [ ] Add export to daily cron job
- [ ] Trigger AnythingLLM sync via API
- [ ] Monitor export logs
- [ ] Set up alerts for failed exports

### Phase 3: Advanced Features (Future)
- [ ] Session versioning (update exported Markdown when session edited)
- [ ] Incremental export (only export new/changed sessions)
- [ ] Multi-workspace routing (auto-route to correct AnythingLLM workspace)
- [ ] Metadata-based chunking (chunk by message, not token count)

### Phase 4: Integration (Future)
- [ ] Claude Code extension: "Search LORE" command
- [ ] Browser extension: Right-click → "Add to LORE"
- [ ] Slack bot: "/sage search [query]"
- [ ] API endpoint: GET /sage/search?q=...

---

## Best Practices

### DO ✅
- Export weekly (not daily) - gives time for curation
- Tag sessions consistently - improves retrieval
- Add summaries to promoted sessions - boosts relevance
- Test search queries regularly - validate RAG quality
- Review retrieved results - ensure accuracy

### DON'T ❌
- Don't export hypothesis sessions - low quality, noisy
- Don't skip tagging - makes retrieval unreliable
- Don't over-promote - only valuable sessions to RAG
- Don't ignore failed exports - check logs regularly
- Don't forget to re-index - new docs won't be searchable

---

## Success Criteria

**Week 1:**
- [ ] AnythingLLM installed and configured
- [ ] INTenX workspace created
- [ ] First batch of sessions exported (3-5 promoted sessions)
- [ ] Test queries return relevant results

**Month 1:**
- [ ] 10+ promoted sessions in RAG
- [ ] 80%+ search success rate
- [ ] LLM references LORE content in responses
- [ ] Automated export working

**Quarter 1:**
- [ ] 30+ promoted sessions in RAG
- [ ] Multi-client workspaces configured (INTenX, Sensit, Makanui)
- [ ] RAG integrated into daily workflow
- [ ] Measurable value: "I found that solution in LORE!" moments

---

**Next Steps:**
1. Complete Phase 1 seeding (populate intenx-knowledge)
2. Install AnythingLLM (Docker or Desktop)
3. Export first 3-5 promoted sessions
4. Test search and retrieval
5. Refine based on results

**Goal:** By end of Q1 2026, LORE should be your second brain for all LLM interactions.
