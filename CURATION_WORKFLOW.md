# LORE Session Curation Workflow

**Purpose:** Guide for curating sessions from hypothesis → promoted for RAG integration

---

## Overview

**Curation Goal:** Transform raw session captures into high-quality, searchable knowledge artifacts

**Flow States:**
```
hypothesis (raw) → codified (tagged) → validated (checked) → promoted (RAG-indexed)
```

**Time Investment:**
- **hypothesis:** Auto-imported (0 time)
- **codified:** 2-5 min per session (tagging, title review)
- **validated:** 5-10 min per session (quality check, relevance review)
- **promoted:** 1 min per session (export trigger)

---

## Weekly Curation Routine (Recommended)

### Monday Morning (30 min)
**Review previous week's sessions**

1. **Launch Web Dashboard:**
   ```bash
   cd /home/cbasta/rtgf-sage/tools/web
   node server.js ~/intenx-knowledge 3000
   # Open http://localhost:3000
   ```

2. **Browse Hypothesis Sessions:**
   - Click "Hypothesis" card to filter
   - Scan titles for valuable sessions
   - Look for: architecture decisions, problem solutions, learning moments

3. **Identify Quick Wins (5-10 sessions):**
   - Business strategy discussions
   - Technical architecture decisions
   - Client requirements captured
   - Problem-solving sessions

### Tuesday/Wednesday (20 min each)
**Promote to Codified**

For each valuable session:

```bash
# Example: Business strategy session
node tools/cli/rcm-flow.js promote \
  --session abc12345 \
  --to codified \
  --tags "business-strategy,tfaas,agac,2026-q1"

# Example: Technical discussion
node tools/cli/rcm-flow.js promote \
  --session def67890 \
  --to codified \
  --tags "architecture,kicad-tools,sensit,pcb-design"

# Example: Client work
node tools/cli/rcm-flow.js promote \
  --session ghi11213 \
  --to codified \
  --tags "sensit,requirements,hardware-v2"
```

**Tag Strategy:**
- **1st tag:** Domain (business-strategy, architecture, requirements, etc.)
- **2nd tag:** Project/product (tfaas, kicad-tools, sensit-hw, etc.)
- **3rd tag:** Client (sensit, ratio11, makanui, etc.)
- **4th tag:** Time context (2026-q1, january-2026, etc.)

### Thursday (30 min)
**Validate Codified Sessions**

Review last week's codified sessions:

1. **Check quality:**
   - Is the conversation complete?
   - Are key decisions captured?
   - Is context sufficient for future reference?

2. **Promote to Validated:**
   ```bash
   node tools/cli/rcm-flow.js promote \
     --session abc12345 \
     --to validated \
     --quality-score 85
   ```

**Quality Score Rubric:**
- **90-100:** Exceptional - Complete, clear, highly reusable
- **80-89:** Strong - Good context, valuable insights
- **70-79:** Solid - Useful but may need supplemental context
- **Below 70:** Don't promote (or improve first)

### Friday (20 min)
**Promote to RAG**

Export validated sessions for AnythingLLM:

```bash
# Promote to promoted state
node tools/cli/rcm-flow.js promote \
  --session abc12345 \
  --to promoted

# Export to Markdown
node tools/cli/rcm-export.js \
  --input ~/intenx-knowledge/rcm/flows/promoted/*.yaml \
  --format markdown \
  --output ~/anythingllm/documents/intenx/

# Commit and push
cd ~/intenx-knowledge
git add -A
git commit -m "rcm(promote): Weekly curation - 5 sessions promoted to RAG

Sessions promoted:
- Business strategy: TFaaS positioning
- Architecture: KiCad automation v2
- Requirements: Sensit hardware revision

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push
```

---

## Bulk Operations

### Tag Multiple Sessions at Once

```bash
# Find all sessions about a specific topic
node tools/gui/rcm-tui.js ~/intenx-knowledge
# Use TUI to navigate and tag multiple sessions

# Or use a script:
for session_id in abc123 def456 ghi789; do
  node tools/cli/rcm-flow.js promote \
    --session $session_id \
    --to codified \
    --tags "business-strategy,tfaas,q1-2026"
done
```

### Batch Export to RAG

```bash
# Export all promoted sessions
node tools/cli/rcm-export.js \
  --input ~/intenx-knowledge/rcm/flows/promoted/*.yaml \
  --format markdown \
  --output ~/anythingllm/documents/intenx/

# Verify export
ls -lh ~/anythingllm/documents/intenx/
```

---

## Curation Priorities

### High Priority (Promote First)
✅ **Business Strategy Sessions**
- TFaaS positioning, AGAC discussions
- Client proposals and pitches
- Market analysis conversations

✅ **Technical Architecture Decisions**
- Design patterns chosen
- Technology stack decisions
- Performance optimization solutions

✅ **Client Requirements & Specifications**
- Feature discussions with clients
- Hardware/firmware requirements
- Integration specifications

### Medium Priority (Promote When Time Allows)
⚠️ **Problem-Solving Sessions**
- Debugging complex issues
- Workaround discoveries
- Troubleshooting patterns

⚠️ **Learning & Research**
- Tool explorations (KiCad, FPGA, etc.)
- Technology evaluations
- Best practices discussions

### Low Priority (Archive as Hypothesis)
🟡 **Operational/Administrative**
- Session planning conversations
- Tool setup discussions
- General questions

🟡 **Incomplete Sessions**
- Interrupted conversations
- Partial explorations
- Dead-end investigations

---

## Quality Indicators

### Good Session Qualities
✅ Clear problem statement and solution
✅ Complete conversation arc (problem → resolution)
✅ Sufficient context for future reference
✅ Actionable insights or decisions
✅ Reusable patterns or approaches

### Poor Session Qualities
❌ Fragmented or incomplete
❌ Too much trial-and-error without conclusion
❌ Context-dependent on external state
❌ Superseded by later sessions
❌ Sensitive information (credentials, private data)

---

## Tag Vocabulary (Standardized)

### Domains
- `business-strategy` - Strategic planning, positioning
- `architecture` - System design, patterns
- `requirements` - Specs, features, client needs
- `implementation` - Code, firmware, hardware work
- `debugging` - Problem-solving, troubleshooting
- `research` - Tool exploration, learning
- `documentation` - Writing, guides, specs

### Projects/Products
- `tfaas` - Technology-First as a Service
- `agac` - AI Generated Application Code
- `kicad-tools` - KiCad automation suite
- `sensit-hw` - Sensit hardware projects
- `ratio11` - Ratio11 client work
- `beaglebone` - BeagleBone projects
- `portfolio-manager` - Portfolio management system

### Clients
- `intenx` - INTenX internal work
- `sensit` - Sensit Technologies
- `ratio11` - Ratio11 Electronics
- `makanui` - Makanui LLC
- `beaglebone` - BeagleBone community

### Time Context
- `2026-q1`, `2026-q2`, etc. - Quarterly markers
- `january-2026`, `february-2026`, etc. - Monthly markers
- `milestone-v1`, `milestone-v2`, etc. - Version markers

---

## Anti-Patterns (Avoid)

### Over-Curation
❌ **Don't spend 30 min on a 5 min session**
- Quick tagging is better than perfect tagging
- You can always refine later

### Under-Curation
❌ **Don't promote everything**
- hypothesis should be 80% of sessions
- codified should be 15%
- validated should be 4%
- promoted should be 1%

### Tag Explosion
❌ **Don't create too many unique tags**
- Reuse existing tags when possible
- Stick to standard vocabulary above
- Max 5 tags per session

### Premature Promotion
❌ **Don't promote to validated without review**
- Wait 1 week before promoting codified → validated
- Ensures the session is still relevant
- Allows time for follow-up sessions

---

## Metrics to Track

### Weekly Goals
- **Import:** Auto-imported (check cron logs)
- **Codified:** 5-10 sessions per week
- **Validated:** 2-5 sessions per week
- **Promoted:** 1-3 sessions per week

### Monthly Review
- **hypothesis:** Should grow steadily (daily imports)
- **codified:** Should be 10-20% of hypothesis
- **validated:** Should be 20-30% of codified
- **promoted:** Should be 50-70% of validated

### Quality Indicators
- **Search success rate:** Can you find relevant sessions when needed?
- **RAG relevance:** Do AnythingLLM results include LORE content?
- **Reuse frequency:** How often do you reference past sessions?

---

## Tools for Curation

### Web Dashboard (Visual, Mouse-driven)
```bash
node tools/web/server.js ~/intenx-knowledge 3000
# Best for: Browsing, reading full sessions, discovering patterns
```

### Terminal UI (Keyboard-driven)
```bash
node tools/gui/rcm-tui.js ~/intenx-knowledge
# Best for: Quick navigation, bulk operations, SSH access
```

### CLI (Scriptable)
```bash
node tools/cli/rcm-flow.js promote --session abc123 --to codified --tags "tag1,tag2"
# Best for: Automation, batch operations, cron jobs
```

---

## Example Curation Session

**Scenario:** Monday morning, reviewing last week's 15 hypothesis sessions

**Step 1: Scan titles in Web UI (5 min)**
- 3 business strategy sessions ✅
- 2 architecture sessions ✅
- 5 debugging sessions ⚠️
- 3 tool setup sessions 🟡
- 2 incomplete sessions ❌

**Step 2: Promote high-priority (10 min)**
```bash
# Business strategy
node tools/cli/rcm-flow.js promote --session abc123 --to codified \
  --tags "business-strategy,tfaas,positioning,2026-q1"

node tools/cli/rcm-flow.js promote --session def456 --to codified \
  --tags "business-strategy,agac,client-pitch,2026-q1"

# Architecture
node tools/cli/rcm-flow.js promote --session ghi789 --to codified \
  --tags "architecture,kicad-tools,automation,v2"
```

**Step 3: Defer medium-priority (note for later)**
- Mark debugging sessions for review next week
- Tool setup stays in hypothesis (low reuse value)

**Step 4: Commit (2 min)**
```bash
cd ~/intenx-knowledge
git add -A
git commit -m "rcm(flow): Monday curation - 5 sessions promoted to codified

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push
```

**Total time:** 17 minutes
**Sessions curated:** 5 promoted, 5 deferred, 5 remain in hypothesis

---

## Next Steps

1. **Start curation:** Run initial seed, then begin weekly routine
2. **Refine tags:** Build vocabulary based on your actual work
3. **Measure success:** Track search success rate, RAG relevance
4. **Iterate:** Adjust priorities and tag strategy as needed

**Remember:** Curation is a practice, not a perfect science. Start loose, tighten over time.
