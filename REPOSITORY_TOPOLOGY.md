# SAGE Repository Topology

**Date:** 2026-02-11
**Author:** Makanui LLC

---

## Overview

SAGE follows RTGF's parent-child binding pattern with **one tools repo** (public) and **multiple knowledge repos** (private per client).

```
rtgf-sage (tools)                    # Public - Apache 2.0
    ↓ bound-to (parent)
┌───┴────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│                │              │              │              │              │
makanui-     intenx-      sensit-      ratio11-     beaglebone-    test-
knowledge    knowledge    knowledge    knowledge    knowledge      knowledge
(private)    (private)    (private)    (private)    (private)      (private)
```

---

## Repository Details

### Tools Repository (Public)

**Repository:** `rtgf-sage`
**Location:** `/home/cbasta/rtgf-sage/`
**Visibility:** Public
**License:** Apache 2.0
**Purpose:** Reusable SAGE framework, adapters, CLI tools, GUI

**Status:** ✅ Git initialized, ready to push

**Contents:**
- `tools/` - CLI tools (rcm-import, rcm-export, rcm-flow, rcm-sync)
- `tools/adapters/` - Platform converters (Claude Code, ChatGPT, Gemini)
- `tools/serializers/` - Export formats (Markdown, JSON)
- `tools/gui/` - Terminal UI (blessed)
- `tools/web/` - Web Dashboard (Express + Tailwind)
- `rcm/` - Module template, schemas, documentation
- `setup-client-repo.sh` - Client repo initialization script

**Push Command:**
```bash
cd /home/cbasta/rtgf-sage
gh repo create rtgf-sage \
  --public \
  --description "SAGE - Session Archive & Governance Engine. Git-native LLM conversation management." \
  --source=. \
  --push
```

---

### Knowledge Repositories (Private)

All client repos follow identical structure, only client name differs.

#### 1. Makanui LLC (Personal/LLC)

**Repository:** `makanui-knowledge`
**Location:** `/home/cbasta/makanui-knowledge/`
**Client:** Makanui LLC (your personal company)
**Status:** ✅ Git initialized

**Push Command:**
```bash
cd /home/cbasta/makanui-knowledge
gh repo create makanui-knowledge \
  --private \
  --description "Makanui LLC - LLM session knowledge base (SAGE)" \
  --source=. \
  --push
```

---

#### 2. INTenX Engineering (DBA)

**Repository:** `intenx-knowledge`
**Location:** `/home/cbasta/intenx-knowledge/`
**Client:** INTenX Engineering (DBA under Makanui)
**Status:** ✅ Git initialized

**Push Command:**
```bash
cd /home/cbasta/intenx-knowledge
gh repo create intenx-knowledge \
  --private \
  --description "INTenX Engineering - LLM session knowledge base (SAGE)" \
  --source=. \
  --push
```

---

#### 3. Sensit Technologies

**Repository:** `sensit-knowledge`
**Location:** `/home/cbasta/sensit-knowledge/`
**Client:** Sensit Technologies
**Status:** ✅ Git initialized

**Push Command:**
```bash
cd /home/cbasta/sensit-knowledge
gh repo create sensit-knowledge \
  --private \
  --description "Sensit Technologies - LLM session knowledge base (SAGE)" \
  --source=. \
  --push
```

---

#### 4. Ratio11 Electronics

**Repository:** `ratio11-knowledge`
**Location:** `/home/cbasta/ratio11-knowledge/`
**Client:** Ratio11 Electronics
**Status:** ✅ Git initialized

**Push Command:**
```bash
cd /home/cbasta/ratio11-knowledge
gh repo create ratio11-knowledge \
  --private \
  --description "Ratio11 Electronics - LLM session knowledge base (SAGE)" \
  --source=. \
  --push
```

---

#### 5. BeagleBone Projects

**Repository:** `beaglebone-knowledge`
**Location:** `/home/cbasta/beaglebone-knowledge/`
**Client:** BeagleBone Projects
**Status:** ✅ Git initialized

**Push Command:**
```bash
cd /home/cbasta/beaglebone-knowledge
gh repo create beaglebone-knowledge \
  --private \
  --description "BeagleBone Projects - LLM session knowledge base (SAGE)" \
  --source=. \
  --push
```

---

#### 6. Test Knowledge (Development)

**Repository:** `test-knowledge`
**Location:** `/home/cbasta/test-knowledge/`
**Client:** Testing/Development
**Status:** ✅ Git initialized with 23 sessions imported

**Push Command:**
```bash
cd /home/cbasta/test-knowledge
gh repo create test-knowledge \
  --private \
  --description "Test knowledge base - SAGE development (23 sessions)" \
  --source=. \
  --push
```

---

## Knowledge Repository Structure

Each client repo contains:

```
{client}-knowledge/
├── .git/
├── config.yaml           # SAGE binding configuration
├── README.md             # Usage instructions
├── .gitignore
└── rcm/
    ├── archive/
    │   ├── canonical/    # Universal YAML format (immutable)
    │   │   └── 2026/     # Organized by year/month
    │   └── raw/          # Original platform formats
    │       ├── claude-code/
    │       ├── chatgpt/
    │       └── gemini/
    └── flows/
        ├── hypothesis/   # Auto-imported, untagged
        ├── codified/     # Tagged, structured
        ├── validated/    # Quality-checked
        └── promoted/     # RAG-indexed
```

---

## Multi-Client Workflow

### Session Import Routing

Route sessions to appropriate client repos based on project context:

```bash
# Makanui LLC sessions
rcm-import --source session.jsonl --platform claude-code \
  --target /home/cbasta/makanui-knowledge/

# INTenX Engineering sessions
rcm-import --source session.jsonl --platform claude-code \
  --target /home/cbasta/intenx-knowledge/

# Sensit client sessions
rcm-import --source session.jsonl --platform claude-code \
  --target /home/cbasta/sensit-knowledge/

# Ratio11 client sessions
rcm-import --source session.jsonl --platform claude-code \
  --target /home/cbasta/ratio11-knowledge/

# BeagleBone client sessions
rcm-import --source session.jsonl --platform claude-code \
  --target /home/cbasta/beaglebone-knowledge/
```

### Auto-Sync Per Client

Run separate watchers for each client's WSL instance:

```bash
# Terminal 1: Makanui/personal work
rcm-sync --watch ~/.claude/projects/ \
  --target /home/cbasta/makanui-knowledge/ \
  --daemon

# Terminal 2: INTenX engineering
rcm-sync --watch /mnt/wsl/intenx-wsl/.claude/projects/ \
  --target /home/cbasta/intenx-knowledge/ \
  --daemon

# Terminal 3: Sensit client
rcm-sync --watch /mnt/wsl/sensit-wsl/.claude/projects/ \
  --target /home/cbasta/sensit-knowledge/ \
  --daemon

# (And so on for other clients...)
```

---

## Benefits of This Topology

✅ **Clean isolation** - Separate git histories per client (no cross-contamination)
✅ **Simple access control** - Private repos, invite collaborators per client
✅ **Independent backup** - Clone/restore individual client repos
✅ **Audit trails** - Client-specific commit logs for transparency
✅ **RTGF-aligned** - Follows parent-child binding pattern
✅ **Scalable** - Add new clients by running `setup-client-repo.sh`

---

## Next Steps

### 1. Push Tools Repo (Public)

```bash
cd /home/cbasta/rtgf-sage
gh repo create rtgf-sage --public --source=. --push
```

### 2. Push All Knowledge Repos (Private)

```bash
# Push all client repos in sequence
cd /home/cbasta/makanui-knowledge && gh repo create makanui-knowledge --private --source=. --push
cd /home/cbasta/intenx-knowledge && gh repo create intenx-knowledge --private --source=. --push
cd /home/cbasta/sensit-knowledge && gh repo create sensit-knowledge --private --source=. --push
cd /home/cbasta/ratio11-knowledge && gh repo create ratio11-knowledge --private --source=. --push
cd /home/cbasta/beaglebone-knowledge && gh repo create beaglebone-knowledge --private --source=. --push
cd /home/cbasta/test-knowledge && gh repo create test-knowledge --private --source=. --push
```

### 3. Start Importing Sessions

Map your existing Claude Code sessions to appropriate client repos and begin importing!

---

**Status:** 7 repositories initialized (1 tools + 6 knowledge)
**Ready to push:** ✅ All repos have initial commits
**Total setup time:** ~10 minutes

🎉 **SAGE multi-client topology complete!**
