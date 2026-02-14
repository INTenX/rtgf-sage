## Control Center Cross-WSL Session Visibility

**Purpose:** Enable Control Center to discover and query sessions across all WSL instances (ColeWork, SensitDev, etc.)

---

## Architecture

```
Control Center (ColeWork WSL)
    ↓ reads
/home/cbasta/sage-exports/session-index.json
    ↑ generated from
┌───────────────────┬────────────────────┐
ColeWork WSL        SensitDev WSL        (Other WSL instances)
├─ intenx-knowledge ├─ sensit-knowledge
├─ makanui-knowledge
└─ test-knowledge
```

**Key Files:**
- `/home/cbasta/sage-exports/session-index.json` - Consolidated session index
- `/home/cbasta/rtgf-sage/tools/cli/rcm-export-index.js` - Index generator
- `/home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js` - Query tool

---

## For Control Center: How to Query Sessions

### Basic Search

```bash
# Find sessions about "kicad automation"
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --search "kicad automation"

# Find sessions by tag
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --tags "business-strategy,tfaas"

# Find recent sessions
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --recent 10
```

### Filter by Repository/WSL

```bash
# INTenX sessions only
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --repo intenx-knowledge

# Sensit sessions only
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --repo sensit-knowledge

# Sessions from ColeWork WSL
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --wsl ColeWork

# Sessions from SensitDev WSL
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --wsl SensitDev
```

### Filter by State/Platform

```bash
# Only codified sessions (curated, tagged)
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --state codified

# Only Claude Code sessions
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --platform claude-code

# Promoted sessions (RAG-ready)
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --state promoted
```

### Combine Filters

```bash
# INTenX business strategy sessions from last week
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --repo intenx-knowledge \
  --tags "business-strategy" \
  --recent 20

# Sensit sessions from SensitDev WSL
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --repo sensit-knowledge \
  --wsl SensitDev
```

### Output Formats

```bash
# Table (default, human-readable)
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js --search "kicad"

# JSON (for programmatic use)
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --search "kicad" \
  --format json

# Simple list (compact)
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --search "kicad" \
  --format list
```

---

## For Control Center: Reading Session Content

**After finding a session:**

```bash
# Query returns canonical path
# Example: /home/cbasta/intenx-knowledge/rcm/archive/canonical/2026/02/session_abc123.yaml

# Read the full session
cat /home/cbasta/intenx-knowledge/rcm/archive/canonical/2026/02/session_abc123.yaml

# Or use SAGE tools to read it
node /home/cbasta/rtgf-sage/tools/cli/rcm-export.js \
  --input /home/cbasta/intenx-knowledge/rcm/archive/canonical/2026/02/session_abc123.yaml \
  --format markdown \
  --output /tmp/session-export.md

cat /tmp/session-export.md
```

---

## Workflow: Daily Index Update

### From ColeWork WSL (Control Center)

```bash
# Export sessions from ColeWork repos
node /home/cbasta/rtgf-sage/tools/cli/rcm-export-index.js \
  --wsl ColeWork \
  --output /home/cbasta/sage-exports/session-index-colework.json
```

### From SensitDev WSL

```bash
# SSH into SensitDev WSL
wsl -d SensitDev

# Export sessions from SensitDev repos
node /home/cbasta/rtgf-sage/tools/cli/rcm-export-index.js \
  --wsl SensitDev \
  --repos /home/cbasta/sensit-knowledge \
  --output /home/cbasta/sage-exports/session-index-sensitdev.json
```

### Merge Indexes (Control Center)

```bash
# Merge both indexes into one
node /home/cbasta/rtgf-sage/tools/cli/rcm-merge-indexes.js \
  --inputs /home/cbasta/sage-exports/session-index-*.json \
  --output /home/cbasta/sage-exports/session-index.json
```

---

## Current Status

**ColeWork WSL:**
- ✅ intenx-knowledge: 5 sessions
- ✅ makanui-knowledge: 1 session
- ✅ test-knowledge: 23 sessions
- ✅ Index exported: `/home/cbasta/sage-exports/session-index.json`

**SensitDev WSL:**
- ⏳ Pending: Import sessions from SensitDev
- ⏳ Pending: Export index from SensitDev
- ⏳ Pending: Merge with ColeWork index

---

## Next Steps

### Step 1: Import from SensitDev (YOU DO - 10 min)

**On SensitDev WSL:**

```bash
# Clone SAGE tools repo
cd /home/cbasta
git clone https://github.com/cbasta-intenx/rtgf-sage.git

# Import Sensit sessions
for session in ~/.claude/projects/-*/*.jsonl; do
  if [ -f "$session" ]; then
    node /home/cbasta/rtgf-sage/tools/cli/rcm-import.js \
      --source "$session" \
      --platform claude-code \
      --target /home/cbasta/sensit-knowledge
  fi
done

# Export index
node /home/cbasta/rtgf-sage/tools/cli/rcm-export-index.js \
  --wsl SensitDev \
  --repos /home/cbasta/sensit-knowledge \
  --output /mnt/c/sage-exports/session-index-sensitdev.json
```

### Step 2: Merge Indexes (CONTROL CENTER - 5 min)

**Back on ColeWork WSL:**

```bash
# Copy SensitDev index to shared location
cp /mnt/c/sage-exports/session-index-sensitdev.json /home/cbasta/sage-exports/

# Merge indexes (tool to be created)
# For now, query both separately:
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --index /home/cbasta/sage-exports/session-index-colework.json \
  --search "sensit"

node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --index /home/cbasta/sage-exports/session-index-sensitdev.json \
  --search "hardware"
```

### Step 3: Automate Daily Updates (LATER - 20 min)

Create cron jobs on both WSL instances to export indexes nightly.

---

## Use Cases for Control Center

### Use Case 1: "What sessions are running right now?"

```bash
# Show most recent sessions across all WSL instances
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --recent 10 \
  --format list
```

**Result:**
```
abc12345 | SAGE Implementation Session
   test-knowledge | hypothesis | 2026-02-14

def67890 | Sensit Hardware Design v2
   sensit-knowledge | codified | 2026-02-13

ghi11213 | KiCad Automation Tools
   intenx-knowledge | hypothesis | 2026-02-12
```

### Use Case 2: "Find all Sensit-related work"

```bash
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --search "sensit" \
  --format table
```

**Shows:** All sessions mentioning "sensit" across both WSL instances

### Use Case 3: "What business strategy sessions exist?"

```bash
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --tags "business-strategy" \
  --repo intenx-knowledge
```

**Shows:** All INTenX business strategy sessions

### Use Case 4: "What's the latest codified knowledge?"

```bash
node /home/cbasta/rtgf-sage/tools/cli/rcm-query-sessions.js \
  --state codified \
  --recent 20
```

**Shows:** Most recent curated/tagged sessions

---

## Index Format (for programmatic access)

```json
{
  "generated_at": "2026-02-14T...",
  "wsl_instance": "ColeWork",
  "repositories": [
    {
      "name": "intenx-knowledge",
      "path": "/home/cbasta/intenx-knowledge",
      "session_count": 5
    }
  ],
  "sessions": [
    {
      "id": "8c14da2d-...",
      "short_id": "8c14da2d",
      "title": "KiCad BOM Manager Design",
      "created_at": "2026-02-14T...",
      "platform": "claude-code",
      "tags": ["kicad", "automation"],
      "flow_state": "hypothesis",
      "message_count": 739,
      "repository": "intenx-knowledge",
      "wsl_instance": "ColeWork",
      "canonical_path": "/home/cbasta/intenx-knowledge/rcm/archive/canonical/..."
    }
  ],
  "summary": {
    "total_sessions": 29,
    "by_repo": {
      "intenx-knowledge": 5,
      "sensit-knowledge": 0,
      "test-knowledge": 23
    },
    "by_state": {
      "hypothesis": 27,
      "codified": 2
    }
  }
}
```

---

## Troubleshooting

### "Index not found"

**Run:**
```bash
node /home/cbasta/rtgf-sage/tools/cli/rcm-export-index.js --wsl ColeWork
```

### "No sessions from SensitDev"

**Check:**
1. Has SensitDev exported its index?
2. Is the index file accessible from ColeWork?
3. Use `--index` flag to specify SensitDev index path

### "Query returns wrong sessions"

**Verify index is up-to-date:**
```bash
# Re-export index
node /home/cbasta/rtgf-sage/tools/cli/rcm-export-index.js --wsl ColeWork

# Check last updated time
head -5 /home/cbasta/sage-exports/session-index.json
```

---

## Summary

**Control Center now has:**
- ✅ Query tool to search sessions across WSL instances
- ✅ Index of 29 sessions (6 from ColeWork repos, 23 from test-knowledge)
- ✅ Ability to filter by repo, state, tags, WSL instance
- ⏳ Pending: SensitDev session import and index merge

**Commands to remember:**
```bash
# Search sessions
rcm-query-sessions --search "keyword"

# Filter by repo
rcm-query-sessions --repo intenx-knowledge

# Recent sessions
rcm-query-sessions --recent 10

# Update index
rcm-export-index --wsl ColeWork
```

**Next:** Import from SensitDev and merge indexes for complete cross-WSL visibility.
