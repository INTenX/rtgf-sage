# RCM - AI Agent Discovery Instructions

**Module:** Runtime Context Management (RCM)
**Discovery Path:** Deterministic, non-inferential

---

## Purpose

This file provides AI agents (Claude, ChatGPT, Gemini, etc.) with explicit instructions for discovering, importing, managing, and exporting LLM conversation sessions within the RCM framework.

---

## Discovery Protocol

### 1. Determine RCM Root

**If working in RTGF-enabled repository:**
```bash
# Check for RCM capability in config.yaml
yq eval '.capabilities.rcm.enabled' config.yaml

# Get knowledge repo path
RCM_ROOT=$(yq eval '.capabilities.rcm.knowledge_repo' config.yaml)
```

**If working in standalone RCM repository:**
```bash
# Assume current directory is RCM root
RCM_ROOT=$(pwd)
```

### 2. Validate RCM Structure

Required directory structure:
```
$RCM_ROOT/rcm/
├── archive/
│   ├── raw/{platform}/
│   └── canonical/{year}/{month}/
├── flows/
│   ├── hypothesis/
│   ├── codified/
│   ├── validated/
│   └── promoted/
├── schemas/canonical-v1.yaml
└── config.yaml
```

**Validation command:**
```bash
test -f "$RCM_ROOT/rcm/config.yaml" && \
test -d "$RCM_ROOT/rcm/archive/canonical" && \
test -d "$RCM_ROOT/rcm/flows" && \
echo "RCM structure valid" || echo "RCM not initialized"
```

---

## Session Import (Manual)

### Import from Claude Code

**Locate session file:**
```bash
# Claude Code session files location
SESSION_DIR=~/.claude/projects/-home-cbasta*/
SESSION_FILE=$(find $SESSION_DIR -name "*.jsonl" -type f | head -1)
```

**Import command:**
```bash
rcm-import \
  --source "$SESSION_FILE" \
  --platform claude-code \
  --target "$RCM_ROOT" \
  --fidelity standard
```

**What happens:**
1. Session copied to `rcm/archive/raw/claude-code/{session-id}.jsonl`
2. Converted to canonical YAML using `tools/adapters/claude-code.js`
3. Saved to `rcm/archive/canonical/2026/02/{date}_{title}_{short-id}.yaml`
4. Symlinked to `rcm/flows/hypothesis/` (auto-import state)
5. Git commit created: `rcm(import): Import claude-code session {session-id}`

### Import from ChatGPT

**Export from ChatGPT:**
1. ChatGPT UI → Settings → Data Controls → Export Data
2. Download `conversations.json`

**Import command:**
```bash
rcm-import \
  --source ~/Downloads/conversations.json \
  --platform chatgpt \
  --target "$RCM_ROOT"
```

### Import from Gemini

**Export from Gemini:**
1. Gemini UI → Activity → Download conversations
2. Download JSON export

**Import command:**
```bash
rcm-import \
  --source ~/Downloads/gemini-export.json \
  --platform gemini \
  --target "$RCM_ROOT"
```

---

## Session Discovery

### List Sessions by State

```bash
# List all hypothesis sessions (untagged, auto-imported)
ls -lh "$RCM_ROOT/rcm/flows/hypothesis/"

# List codified sessions (tagged, structured)
ls -lh "$RCM_ROOT/rcm/flows/codified/"

# List validated sessions (quality-checked)
ls -lh "$RCM_ROOT/rcm/flows/validated/"

# List promoted sessions (RAG-indexed)
ls -lh "$RCM_ROOT/rcm/flows/promoted/"
```

### Search Sessions

```bash
# Search by tags (future: rcm-search)
grep -r "tags:.*openclaw" "$RCM_ROOT/rcm/archive/canonical/"

# Search by date
find "$RCM_ROOT/rcm/archive/canonical/2026/02/" -name "*.yaml"

# Search by content
grep -r "RTGF framework" "$RCM_ROOT/rcm/archive/canonical/"
```

### Read Session

```bash
# Read canonical YAML
SESSION_FILE="$RCM_ROOT/rcm/flows/hypothesis/2026-02-08_openclaw_55fc0e3d.yaml"
cat "$SESSION_FILE"

# Parse session metadata
yq eval '.session.metadata' "$SESSION_FILE"

# Extract message count
yq eval '.messages | length' "$SESSION_FILE"
```

---

## Flow Management

### Promote Session Through States

**hypothesis → codified** (manual tagging)
```bash
rcm-flow promote \
  --session 55fc0e3d \
  --from hypothesis \
  --to codified \
  --tags "openclaw,workflow,multi-client,wsl"
```

**codified → validated** (quality check)
```bash
rcm-flow promote \
  --session 55fc0e3d \
  --to validated \
  --quality-score 85 \
  --reason "Comprehensive planning discussion with actionable outcomes"
```

**validated → promoted** (RAG export)
```bash
rcm-flow promote \
  --session 55fc0e3d \
  --to promoted \
  --export markdown \
  --rag-workspace client-a
```

**What happens during promotion:**
1. `git mv rcm/flows/{from_state}/{session}.yaml rcm/flows/{to_state}/`
2. Update `session.flow_state.current` in YAML
3. Git commit: `rcm(flow): Promote session 55fc0e3d ({from} → {to})`
4. If `--export` flag: run `rcm-export` to generate Markdown

### Manual Flow Operations (Git-native)

**IMPORTANT: Always use `git mv`, never `mv` or `cp`**

```bash
# Move session from hypothesis to codified
cd "$RCM_ROOT"
git mv \
  rcm/flows/hypothesis/2026-02-08_openclaw_55fc0e3d.yaml \
  rcm/flows/codified/2026-02-08_openclaw_55fc0e3d.yaml

# Update flow_state in file
yq eval '.session.flow_state.current = "codified"' -i \
  rcm/flows/codified/2026-02-08_openclaw_55fc0e3d.yaml

# Commit
git add rcm/flows/codified/2026-02-08_openclaw_55fc0e3d.yaml
git commit -m "rcm(flow): Codify session 55fc0e3d (hypothesis → codified)"
```

---

## Export to RAG Systems

### Export to Markdown (AnythingLLM)

```bash
# Export single session
rcm-export \
  --input "$RCM_ROOT/rcm/flows/promoted/2026-02-08_openclaw_55fc0e3d.yaml" \
  --format markdown \
  --output /path/to/anythingllm/documents/client-a/

# Export all promoted sessions
rcm-export \
  --input "$RCM_ROOT/rcm/flows/promoted/*.yaml" \
  --format markdown \
  --output /path/to/anythingllm/documents/client-a/
```

**Markdown format includes:**
- YAML frontmatter (metadata, tags, participants)
- Human-readable conversation flow
- Tool use blocks (formatted code)
- Thinking blocks (expandable sections)

### Export to JSON (API consumption)

```bash
rcm-export \
  --input "$RCM_ROOT/rcm/flows/validated/*.yaml" \
  --format json \
  --output /tmp/rcm-export/
```

---

## Auto-Sync (Daemon Mode)

### Enable Auto-Import for Claude Code

```bash
# Start watcher in background
rcm-sync \
  --watch ~/.claude/projects/ \
  --platform claude-code \
  --target "$RCM_ROOT" \
  --auto-flow hypothesis \
  --daemon &

# Check daemon status
ps aux | grep rcm-sync

# Stop daemon
pkill -f rcm-sync
```

**What auto-sync does:**
1. Watches `~/.claude/projects/` for new `.jsonl` files
2. Detects session close events (file modification stops)
3. Auto-imports to `rcm/archive/raw/` and `rcm/archive/canonical/`
4. Auto-promotes to `rcm/flows/hypothesis/`
5. Git commit: `rcm(import): Auto-import claude-code session {session-id}`

**Configuration:**
Edit `rcm/config.yaml`:
```yaml
auto_sync:
  enabled: true
  daemon_mode: true
  watch_interval: 5000  # milliseconds
  auto_commit: true
```

---

## RIS Assembly (RTGF Integration)

When RCM is deployed within an RTGF project, AI agents should include RCM context in Research Information Synthesis (RIS).

### Check RCM Capability

```bash
# Check if RCM is enabled
yq eval '.capabilities.rcm.enabled' config.yaml
```

### Include RCM in RIS

**Add to RIS document:**

```markdown
## Runtime Context (RCM)

**Knowledge Repository:** {path from config.yaml}

**Recent Sessions (Last 7 days):**
- [Session Title 1] - {tags} - {flow_state}
- [Session Title 2] - {tags} - {flow_state}

**Relevant Sessions for Current Task:**
- Query: rcm-search --tags {current_task_tags}
- Found: {N} sessions
- Most relevant: {session_title} ({session_id})

**Recommended Actions:**
- Import current session after completion
- Tag with: {suggested_tags}
- Promote to: {suggested_state}
```

### Query RCM for Task Context

```bash
# Find related sessions before starting work
rcm-search \
  --tags $(basename $PWD) \
  --date-range $(date -d '30 days ago' +%Y-%m-%d):$(date +%Y-%m-%d) \
  --flow-state codified,validated,promoted

# Read top result for context
SESSION=$(rcm-search --tags openclaw | head -1)
cat "$RCM_ROOT/rcm/flows/codified/$SESSION"
```

---

## Multi-Client Workflows

### Determine Target Repository

**Rule:** Session destination based on working directory

```bash
# Determine client from current path
case "$PWD" in
  */client-a/*) RCM_ROOT="/home/cbasta/client-a-knowledge" ;;
  */client-b/*) RCM_ROOT="/home/cbasta/client-b-knowledge" ;;
  */client-c/*) RCM_ROOT="/home/cbasta/client-c-knowledge" ;;
  *) RCM_ROOT="/home/cbasta/personal-knowledge" ;;
esac
```

### Import to Correct Repository

```bash
# Auto-detect target based on working directory
rcm-import \
  --source "$SESSION_FILE" \
  --platform claude-code \
  --auto-detect-target \
  --fallback ~/personal-knowledge/
```

### Verify Isolation

```bash
# Ensure no session cross-contamination
diff -r ~/client-a-knowledge/rcm/ ~/client-b-knowledge/rcm/
# Expected: Only directory structure matches, no shared session files
```

---

## Quality Guidelines

### When to Promote Sessions

**hypothesis → codified:**
- ✅ Session has clear, actionable outcomes
- ✅ Add descriptive tags (3-5 keywords)
- ✅ Verify title accurately describes content

**codified → validated:**
- ✅ Quality score ≥ 70 (estimate based on usefulness)
- ✅ Information is accurate and complete
- ✅ Would reference this session in future work

**validated → promoted:**
- ✅ High-value knowledge (quality score ≥ 85)
- ✅ Suitable for RAG ingestion (reusable patterns/solutions)
- ✅ No sensitive information (if sharing repo)

### Tagging Best Practices

**Good tags:**
- Technical: `openclaw`, `rtgf`, `git-native`, `claude-code`
- Category: `workflow`, `bug-fix`, `planning`, `architecture`
- Client: `client-a`, `client-b`, `personal`
- Domain: `multi-client`, `wsl`, `linux`, `automation`

**Avoid:**
- Generic: `discussion`, `conversation`, `session`
- Redundant: `llm` (all sessions are LLM conversations)
- Too specific: `2026-02-08` (use date search instead)

---

## Troubleshooting

### Session Not Importing

```bash
# Check file format
file "$SESSION_FILE"
# Expected: JSON Lines data (JSONL) for Claude Code

# Check adapter availability
ls -l /home/cbasta/rtgf-rcm/tools/adapters/

# Verbose import
rcm-import --source "$SESSION_FILE" --platform claude-code --verbose
```

### Git Conflicts

```bash
# If git mv fails due to uncommitted changes
cd "$RCM_ROOT"
git status

# Commit pending changes first
git add rcm/flows/
git commit -m "rcm(flow): Checkpoint before promotion"

# Retry flow operation
rcm-flow promote --session 55fc0e3d --to codified
```

### Missing Dependencies

```bash
# Check Node.js version
node --version
# Required: ≥18.0.0

# Reinstall dependencies
cd /home/cbasta/rtgf-rcm/
npm install

# Verify CLI tools
which rcm-import rcm-export rcm-flow
```

---

## Reference Commands Summary

```bash
# Import session
rcm-import --source {file} --platform {platform} --target {rcm_root}

# Export to Markdown
rcm-export --input {yaml_files} --format markdown --output {dir}

# Promote through flow
rcm-flow promote --session {id} --to {state} --tags {tags}

# Search sessions
rcm-search --tags {tags} --date-range {start}:{end} --flow-state {state}

# Auto-sync daemon
rcm-sync --watch {dir} --platform {platform} --daemon

# List sessions by state
ls -lh $RCM_ROOT/rcm/flows/{hypothesis|codified|validated|promoted}/

# Read session
cat $RCM_ROOT/rcm/flows/{state}/{session-file}.yaml
```

---

## Next Steps

After mastering basic RCM operations:

1. **Enable auto-sync** - Set up `rcm-sync` daemon for zero-toil archival
2. **Curate hypothesis sessions** - Review auto-imported sessions, promote valuable ones
3. **Build RAG knowledge base** - Export promoted sessions to AnythingLLM
4. **Multi-platform import** - Start importing ChatGPT and Gemini sessions
5. **Search & discovery** - Use `rcm-search` to find relevant past context

---

## See Also

- **README.md** - RCM module contract and architecture
- **schemas/canonical-v1.yaml** - Session schema definition
- **config.yaml** - RCM configuration reference
