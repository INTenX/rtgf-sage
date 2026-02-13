# SAGE - Session Archive & Governance Engine
## Agent Guidance

**Purpose:** LLM session management, knowledge curation, and cross-platform archival

---

## What is SAGE?

SAGE (Session Archive & Governance Engine) is a **git-native LLM conversation management system** built on RTGF principles. It enables:

- Multi-platform session import (Claude Code, ChatGPT, Gemini)
- Knowledge flow curation (hypothesis → codified → validated → promoted)
- Multi-client isolation (separate knowledge repos per client)
- RAG integration (export to AnythingLLM)

**SAGE solves:** "Not enough context" and "context rot" through systematic session archival and progressive refinement.

---

## Table Stakes (How to Work)

### Git Workflow
**Canonical Documentation:** [RTGF-Test-Fixture-Projects/git-workflow.md](https://github.com/INTenX/RTGF-Test-Fixture-Projects)

**Key Points:**
- **Git-native operations:** All state transitions via `git mv` (never manual `mv`)
- **Commit conventions:** `rcm(import)`, `rcm(flow)`, `rcm(export)`
- **Git identity:** intenx-bot (225476919+intenx-bot@users.noreply.github.com)
- **Co-author:** Cole Basta + Claude Sonnet 4.5

### Authentication
- GitHub App: intenx-agent-platform (time-limited tokens)
- File protection: Active (~/.claude/settings.json)
- Security score: 4/4

---

## Repository Structure

```
rtgf-sage/                          # Tools repo (this repo, public)
├── AGENT_GUIDANCE.md               # This file (project-level)
├── README.md                       # Project overview
├── REPOSITORY_TOPOLOGY.md          # Multi-client structure
├── tools/
│   ├── cli/                        # rcm-import, rcm-export, rcm-flow, rcm-sync
│   ├── gui/                        # rcm-tui (terminal UI)
│   ├── web/                        # Web dashboard (Express + Tailwind)
│   ├── adapters/                   # Platform converters (Claude Code, ChatGPT, Gemini)
│   └── lib/                        # Common utilities
└── rcm/
    ├── AGENTS.md                   # Module-level discovery (read this for RCM details)
    ├── schemas/canonical-v1.yaml   # Session schema (OMF-based)
    └── README.md                   # RCM module contract

Knowledge repos (separate, private):
/home/cbasta/intenx-knowledge/      # INTenX business sessions
/home/cbasta/sensit-knowledge/      # Sensit client sessions
/home/cbasta/makanui-knowledge/     # Makanui LLC sessions
/home/cbasta/ratio11-knowledge/     # Ratio11 client sessions
/home/cbasta/beaglebone-knowledge/  # BeagleBone project sessions
/home/cbasta/test-knowledge/        # SAGE testing (23 sessions)
```

---

## Knowledge Flow States

**Progressive Refinement Funnel:**
```
hypothesis → codified → validated → promoted
   (raw)      (tagged)   (checked)   (RAG-indexed)
```

**State Meanings:**
- **hypothesis:** Auto-imported, untagged, unvalidated (raw capture)
- **codified:** Manually tagged, structured for reuse (curator effort applied)
- **validated:** Quality-checked, confirmed valuable (peer reviewed or self-validated)
- **promoted:** RAG-indexed, production knowledge (exported to AnythingLLM)

**Implementation:**
- Directory location = state representation (RTGF "State-as-Directory" physics)
- All transitions via `git mv` (never manual file operations)
- Symlinks in `rcm/flows/` pointing to `rcm/archive/canonical/` (single source of truth)

---

## Multi-Client Isolation

**Pattern:** Separate knowledge repo per client
```
rtgf-sage (public tools)
    ↓ parent
    ├── intenx-knowledge (private)       # INTenX business
    ├── sensit-knowledge (private)       # Sensit client
    ├── makanui-knowledge (private)      # Makanui LLC
    ├── ratio11-knowledge (private)      # Ratio11 client
    └── beaglebone-knowledge (private)   # BeagleBone project
```

**Session routing:** Based on working directory or explicit --target flag

---

## Current Status

**Deployment:**
- ✅ Production-ready (7 repos deployed, 1 public + 6 private)
- ✅ CLI tools complete (import, export, flow, sync)
- ✅ TUI and Web Dashboard functional
- ✅ Claude Code adapter working (23 test sessions)
- ⚠️ ChatGPT/Gemini adapters pending (Phase 1)
- ⚠️ Knowledge repos empty (experimental, awaiting daily import cron)

**Testing:**
- 23 sessions imported to test-knowledge
- Flows tested: 21 hypothesis, 2 codified
- Platform: Claude Code only (ChatGPT/Gemini pending)

---

## Common Operations

### For Session Import
**Read:** `rcm/AGENTS.md` (comprehensive module-level instructions)

**Quick reference:**
```bash
# Import Claude Code session
node tools/cli/rcm-import.js \
  --source ~/.claude/projects/-home-cbasta-*/SESSION_ID.jsonl \
  --platform claude-code \
  --target /home/cbasta/intenx-knowledge/

# Lands in: rcm/flows/hypothesis/ (auto-imported state)
```

### For Session Curation
```bash
# Promote through states
node tools/cli/rcm-flow.js promote \
  --session SESSION_ID \
  --to codified \
  --tags "project,topic,discipline"

# Export to RAG
node tools/cli/rcm-export.js \
  --input /home/cbasta/intenx-knowledge/rcm/flows/promoted/*.yaml \
  --format markdown \
  --output /path/to/anythingllm/documents/
```

### For Session Discovery
```bash
# Terminal UI (interactive)
node tools/gui/rcm-tui.js /home/cbasta/intenx-knowledge/

# Web Dashboard
node tools/web/server.js /home/cbasta/intenx-knowledge/ 3000
# Open http://localhost:3000
```

---

## Key Technical Decisions

### 1. Dual Repository Pattern (Tools vs Knowledge)
- **Tools:** Public, reusable (rtgf-sage)
- **Knowledge:** Private, per-client (intenx-knowledge, sensit-knowledge, etc.)
- **Why:** Clean separation, access control, DRY for tools

### 2. Directory-Based State Management
- State = directory location (not metadata fields)
- Git tracks state transitions automatically
- No external database required
- **Invariant:** Always use `git mv` for state transitions

### 3. YAML Over JSON
- Human-readable (important for git diffs)
- Supports comments (useful for annotations)
- Standard in RTGF ecosystem
- **Format:** OMF (Open Message Format) base + RTGF extensions

### 4. Symlinks for Flow States
- Canonical archive: Single source of truth
- Flow directories: Symlinks to canonical
- Fast state transitions (just move symlink)
- No data duplication

### 5. Standard Fidelity Default
- Include: Full conversation + thinking + tool uses
- Why: Balances completeness vs storage (~10-50KB per session)
- Preserves reasoning process (valuable for analysis)
- Can downsample later if needed

---

## Integration with INTenX Ecosystem

### SAGE's Role in Context Management

**Problem SAGE Solves:**
- **Not enough context:** Can't remember what was done in past sessions
- **Context rot:** Conversation history gets compressed, lost, or stale

**How SAGE Helps:**
1. **Persistent Archive:** Sessions stored in git, never lost
2. **Progressive Curation:** Flow states filter signal from noise
3. **Cross-Platform:** Import from Claude, ChatGPT, Gemini
4. **Searchable:** Find relevant past context on-demand
5. **RAG Integration:** Promoted sessions available for semantic search

### Relationship to Other Systems

**RTGF (Real-Time Governance Framework):**
- SAGE follows RTGF principles (git-native, state-as-directory)
- Can be integrated with RTGF projects (capability module)
- Shares commit conventions and workflow patterns

**Portfolio Managers:**
- Portfolio Manager sessions should be imported to respective knowledge repos
- Example: Sensit Portfolio Manager → sensit-knowledge

**Control Center (INTenX):**
- Control Center sessions → intenx-knowledge
- Coordinates across portfolio managers and dev-tools

**Dev-Tools:**
- Development sessions for tools → intenx-knowledge
- Session context already imported for kicad-tools

---

## Workflow Examples

### Daily Import Workflow (Planned)
```bash
# Cron job (daily at 2am):
# Import all sessions from yesterday to appropriate knowledge repo

# INTenXDev sessions → intenx-knowledge
find ~/.claude/projects/-home-cbasta/ -name "*.jsonl" -mtime -1 | \
  xargs -I {} node /home/cbasta/rtgf-sage/tools/cli/rcm-import.js \
    --source {} \
    --platform claude-code \
    --target /home/cbasta/intenx-knowledge/

# SensitDev sessions → sensit-knowledge (on SensitDev WSL)
# Similar command run on SensitDev instance
```

### Manual Curation Workflow
```bash
# 1. Browse hypothesis sessions
node /home/cbasta/rtgf-sage/tools/web/server.js \
  /home/cbasta/intenx-knowledge/ 3000

# 2. Identify valuable sessions (in web UI)

# 3. Promote to codified
node /home/cbasta/rtgf-sage/tools/cli/rcm-flow.js promote \
  --session abc12345 \
  --to codified \
  --tags "business-strategy,tfaas,agac"

# 4. Quality check, promote to validated
node /home/cbasta/rtgf-sage/tools/cli/rcm-flow.js promote \
  --session abc12345 \
  --to validated \
  --quality-score 90

# 5. Export to RAG
node /home/cbasta/rtgf-sage/tools/cli/rcm-flow.js promote \
  --session abc12345 \
  --to promoted

node /home/cbasta/rtgf-sage/tools/cli/rcm-export.js \
  --input /home/cbasta/intenx-knowledge/rcm/flows/promoted/abc12345*.yaml \
  --format markdown \
  --output /path/to/anythingllm/
```

---

## References

### Essential Reading
- **rcm/AGENTS.md** - Module-level discovery and detailed operations
- **README.md** - Project overview and architecture
- **REPOSITORY_TOPOLOGY.md** - Multi-client structure explanation
- **SESSION_CONTEXT_2026-02-11.md** - Complete development history and decisions

### Related Documentation
- **RTGF-Test-Fixture-Projects/git-workflow.md** - Canonical git workflow
- **Control Center Memory:** `~/.claude/projects/-home-cbasta/memory/`
- **Security Configuration:** `~/.claude/settings.json`

### Knowledge Repos
- `/home/cbasta/intenx-knowledge/` - INTenX business sessions
- `/home/cbasta/sensit-knowledge/` - Sensit client sessions
- `/home/cbasta/test-knowledge/` - SAGE testing and validation

---

## Quick Start

### For Session Import Work
1. Read this file (you're doing it!)
2. Read `rcm/AGENTS.md` for detailed operations
3. Choose target knowledge repo based on context
4. Run import commands
5. Verify sessions landed in hypothesis/

### For Curation Work
1. Launch Web Dashboard or TUI
2. Browse hypothesis sessions
3. Identify valuable sessions
4. Tag and promote through flow states
5. Export promoted sessions to RAG

### For Development Work
1. Read `SESSION_CONTEXT_2026-02-11.md` for full context
2. Understand architecture decisions
3. Follow existing patterns in tools/
4. Test with test-knowledge repo
5. Update documentation

---

## Important Principles

### Git-Native Operations
**Never:**
- ❌ Manual `mv` or `cp` for state transitions
- ❌ Editing canonical archive files directly
- ❌ Bypassing git for file operations

**Always:**
- ✅ Use `git mv` for state transitions
- ✅ Commit with `rcm(*)` conventions
- ✅ Preserve git history
- ✅ Keep canonical archive immutable

### Single Source of Truth
- Canonical archive in `rcm/archive/canonical/` is immutable
- Flow states use symlinks (not copies)
- YAML file contains metadata AND content
- Git is the version control system (not external DB)

### Multi-Client Isolation
- Each client gets separate knowledge repo
- No cross-contamination of sessions
- Tools repo (rtgf-sage) is shared
- Access control via GitHub repo permissions

---

## Status: Production Ready ✅

- All 7 repositories deployed to GitHub
- CLI, TUI, and Web Dashboard functional
- 23 test sessions successfully imported
- Multi-client isolation verified
- Documentation complete
- Ready for daily use (with guard rails during experimental phase)

**Next Steps:**
- Enable daily import cron jobs
- Populate knowledge repos with session history
- Begin curation workflow (hypothesis → promoted)
- Set up AnythingLLM RAG integration
- Add ChatGPT/Gemini adapters (Phase 1)

---

**For comprehensive implementation details, see:**
- `rcm/AGENTS.md` (module operations)
- `SESSION_CONTEXT_2026-02-11.md` (development history)
