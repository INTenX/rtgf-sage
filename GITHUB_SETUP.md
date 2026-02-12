# GitHub Repository Setup - RTGF-Aligned Strategy

## Overview

Following RTGF's parent-child binding topology, RCM uses a **dual repository pattern**:

```
rtgf-rcm (tools repo)        ← You are here
    ↓ bound-to
{client}-knowledge (data repos)
```

This mirrors RTGF's pattern where:
- **rtgf-core** = framework/tools (like rtgf-rcm)
- **hardware/firmware repos** = project-specific artifacts (like knowledge repos)

---

## Repository #1: rtgf-rcm (Tools Framework)

**Purpose:** Reusable RCM framework, adapters, CLI tools

**Location:** `/home/cbasta/rtgf-rcm/`

**Status:** ✅ Git initialized, ready to push

**Contents:**
- `tools/` - CLI tools, adapters, converters, GUI
- `rcm/` - Module template, schemas, documentation
- `README.md` - Framework documentation
- `package.json` - Dependencies

**Recommended Settings:**
- **Visibility:** Public (Apache 2.0 license)
- **Repository name:** `rtgf-rcm`
- **Description:** "Runtime Context Management - Git-native LLM conversation archival system"
- **Topics:** `llm`, `knowledge-management`, `git-native`, `rtgf`, `conversation-archival`

**Next Steps:**
```bash
cd /home/cbasta/rtgf-rcm

# Create GitHub repo (via gh CLI)
gh repo create rtgf-rcm \
  --public \
  --description "Runtime Context Management - Git-native LLM conversation archival" \
  --source=. \
  --remote=origin \
  --push

# Or create via web UI, then:
git remote add origin git@github.com:YOUR_USERNAME/rtgf-rcm.git
git branch -M main
git push -u origin main
```

---

## Repository #2: test-knowledge (Client Data)

**Purpose:** Session archives, flow states (hypothesis → codified → validated → promoted)

**Location:** `/home/cbasta/test-knowledge/`

**Status:** ✅ Git initialized with 3 commits (23 sessions imported)

**Contents:**
- `rcm/archive/canonical/` - Immutable session archives
- `rcm/flows/` - Knowledge flow state directories (symlinks)
- `config.yaml` - Binds to rtgf-rcm parent

**Recommended Settings:**
- **Visibility:** Private (contains conversation history)
- **Repository name:** `test-knowledge` (or `personal-knowledge`, `{client-name}-knowledge`)
- **Description:** "LLM conversation knowledge base - managed by RCM"

**Next Steps:**
```bash
cd /home/cbasta/test-knowledge

# Create private GitHub repo
gh repo create test-knowledge \
  --private \
  --description "LLM conversation knowledge base" \
  --source=. \
  --remote=origin \
  --push

# Or create via web UI, then:
git remote add origin git@github.com:YOUR_USERNAME/test-knowledge.git
git branch -M main
git push -u origin main
```

**Git History Verification:**
```bash
$ git log --oneline
855b38b rcm(flow): hypothesis → codified [9eaf920f]
9c473f1 rcm(flow): hypothesis → codified [82138824]
cd37f24 rcm(import): Initial archive of 23 Claude Code sessions
```

---

## Multi-Client Topology

For production multi-client usage, replicate the knowledge repo per client:

```
GitHub
├── rtgf-rcm (public)              # Shared tools framework
├── personal-knowledge (private)   # Your internal work
├── client-a-knowledge (private)   # Client A sessions
├── client-b-knowledge (private)   # Client B sessions
└── client-c-knowledge (private)   # Client C sessions
```

**Isolation Benefits:**
- ✅ Separate git histories (no cross-contamination)
- ✅ Independent access control (per-repo collaborators)
- ✅ Clean audit trails (client-specific commit logs)
- ✅ Simple backup/restore (clone specific repos)

---

## Binding Configuration (Future Enhancement)

To fully align with RTGF parent-child binding, add to knowledge repos:

```yaml
# config.yaml in test-knowledge/
binding:
  type: child
  parent:
    repo: "github.com/YOUR_USERNAME/rtgf-rcm"
    commit: "f83953f"  # Pin to specific tools version

capabilities:
  rcm:
    enabled: true
    tools_path: "../rtgf-rcm/tools"
    default_fidelity: "standard"
    auto_sync: true
```

This enables:
- Version pinning of tools
- Reproducible imports across clients
- Toolchain updates via `git submodule update`

---

## Summary

**What's Ready:**
- ✅ rtgf-rcm git initialized (tools repo)
- ✅ test-knowledge git initialized with 23 sessions (knowledge repo)
- ✅ Dual-repo pattern following RTGF parent-child topology
- ✅ Commit conventions working (rcm(import), rcm(flow))

**Next Action:**
Choose one:

1. **Push to GitHub now** (recommended if ready to share)
   ```bash
   cd /home/cbasta/rtgf-rcm
   gh repo create rtgf-rcm --public --source=. --push

   cd /home/cbasta/test-knowledge
   gh repo create test-knowledge --private --source=. --push
   ```

2. **Continue local development** (add more features before publishing)
   - Implement Phase 1 (ChatGPT/Gemini adapters)
   - Implement Phase 3 (rcm-search tool)
   - Test with more sessions

3. **Add documentation first** (polish before open-sourcing)
   - Write comprehensive README.md
   - Add usage examples
   - Create CONTRIBUTING.md

**RTGF Alignment:**
This dual-repo approach follows RTGF's separation of:
- **Tools** (rtgf-rcm) = like rtgf-core, reusable framework
- **Artifacts** (knowledge repos) = like hardware/firmware repos, project-specific data

Both repos use git-native operations and commit conventions, consistent with RTGF physics.
