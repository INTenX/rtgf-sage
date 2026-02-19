# CTX - Context Management

**RTGF Module Contract**

## Purpose

CTX (Context Management) treats LLM conversations as version-controlled knowledge artifacts. It enables agent-agnostic session archival, cross-platform conversation management, and git-native knowledge flow curation.

## Problem

LLM conversations are scattered across multiple platforms (Claude Code, ChatGPT, Gemini) with no unified way to:
- Archive and version-control sessions across platforms
- Track evolving thinking over time
- Reuse conversation context in RAG systems
- Isolate multi-client work (separate git repositories)
- Share methodology with others building AI-native infrastructure

## Solution

CTX provides:
1. **Agent-agnostic converters** - Transform platform-specific formats to unified canonical YAML (OMF-based)
2. **Git-native Knowledge Flow** - Sessions flow through states via directory location: hypothesis → codified → validated → promoted
3. **Multi-client isolation** - Separate git repositories per client (clean access control)
4. **RAG integration** - Export promoted sessions to Markdown for AnythingLLM/vector DB ingestion
5. **Auto-sync** - Zero-toil archival from Claude Code (optional for other platforms)

## Architecture

### State-as-Directory Physics

CTX uses RTGF's "State-as-Directory" pattern:

```
ctx/
├── archive/                    # Immutable history
│   ├── raw/                    # Original platform formats
│   │   ├── claude-code/
│   │   ├── chatgpt/
│   │   └── gemini/
│   └── canonical/              # Unified YAML format (OMF-based)
│       └── 2026/
│           ├── 01/
│           └── 02/
│
├── flows/                      # Knowledge Flow states
│   ├── hypothesis/             # Auto-imported, untagged
│   ├── codified/               # Tagged, structured
│   ├── validated/              # Quality-checked
│   └── promoted/               # RAG-indexed (symlinks)
│
├── schemas/                    # Format definitions
│   ├── canonical-v1.yaml       # Universal session schema
│   ├── claude-code.yaml
│   ├── chatgpt.yaml
│   └── gemini.yaml
│
└── config.yaml                 # CTX configuration
```

### Canonical Format (Standard Fidelity)

Based on **Open Message Format (OMF)** with RTGF extensions:

```yaml
session:
  id: "uuid-v4"
  canonical_version: "1.0"
  created_at: "2026-02-08T13:53:15.450Z"
  source:
    platform: "claude-code"
    session_id: "55fc0e3d-f168-4d13-8cea-858a5cd0d672"
  metadata:
    title: "OpenClaw Installation Planning"
    tags: ["openclaw", "workflow", "multi-client"]
  flow_state:
    current: "hypothesis"

messages:
  - id: "c31003b5-9eb7-4344-a43e-a8ded5645b7b"
    timestamp: "2026-02-08T13:53:15.411Z"
    role: "user"
    content: "I need better orchestration..."
  - id: "89b79d2a-e4ae-47c8-bf0d-3030334ed671"
    role: "assistant"
    model: "claude-opus-4-5-20251101"
    content: "Let me help you..."
    thinking: "The user is asking about..."
    usage:
      input_tokens: 9
      output_tokens: 3
```

**Three fidelity levels:**
- **Minimal:** Metadata only (~1KB) - for indexing
- **Standard:** Full conversation + tool use + thinking (~10-50KB) - **DEFAULT**
- **Full:** Complete lossless archive (~100KB-1MB) - for migration

## Knowledge Flow States

Sessions progress through states using git operations (`git mv`, never `mv` or `cp`):

```
1. hypothesis (auto-import)
   ↓ (manual tagging + ctx-flow promote)
2. codified (structured, tagged)
   ↓ (quality check)
3. validated (quality_score ≥ 70)
   ↓ (export to RAG)
4. promoted (RAG-indexed, knowledge base)
```

**Git commit conventions:**
- `ctx(import): Import claude-code session 55fc0e3d`
- `ctx(flow): Codify session 55fc0e3d (hypothesis → codified)`
- `ctx(promote): Promote session 55fc0e3d to validated`

## Multi-Client Repository Topology

**Decision:** Separate git repositories per client (simpler than backend multi-tenancy)

```
/home/cbasta/client-a-knowledge/
  ├── .git/
  ├── config.yaml              # Binds to client-a RTGF
  └── ctx/                     # CTX module instance

/home/cbasta/client-b-knowledge/
  ├── .git/
  └── ctx/

/home/cbasta/personal-knowledge/
  ├── .git/
  └── ctx/                     # Cross-client learnings, tools, methods
```

Each repository has independent git history, isolated sessions, and separate RAG workspaces.

## Usage

### Import Session

```bash
# Manual import
ctx-import \
  --source ~/.claude/projects/-home-cbasta/55fc0e3d.jsonl \
  --platform claude-code \
  --target ~/client-a-knowledge/

# Auto-sync (daemon mode)
ctx-sync \
  --watch ~/.claude/projects/ \
  --platform claude-code \
  --auto-flow hypothesis \
  --target ~/client-a-knowledge/
```

### Flow Management

```bash
# Promote from hypothesis to codified
ctx-flow promote \
  --session 55fc0e3d \
  --from hypothesis \
  --to codified \
  --tags "openclaw,workflow,multi-client"

# Validate and promote to RAG
ctx-flow promote \
  --session 55fc0e3d \
  --to validated \
  --quality-score 85

ctx-flow promote \
  --session 55fc0e3d \
  --to promoted \
  --export markdown
```

### Export to Markdown (RAG ingestion)

```bash
ctx-export \
  --input ctx/flows/promoted/*.yaml \
  --format markdown \
  --output /path/to/anythingllm/documents/
```

### Search & Discovery

```bash
# Search by tags
ctx-search --tags openclaw,workflow

# Search by date
ctx-search --date-range 2026-02-01:2026-02-10

# Search by content
ctx-search --full-text "RTGF framework"

# Search by state
ctx-search --flow-state validated
```

## RTGF Integration

When deployed to a client RTGF repository, CTX extends config.yaml:

```yaml
# Add to existing RTGF config.yaml
capabilities:
  bkf: { topology: directory-based }
  pcm: { mindset_path: "pcm/" }

  # NEW: Runtime Context Management
  rcm:
    enabled: true
    knowledge_repo: "/home/cbasta/client-a-knowledge"
    auto_sync: true
    default_fidelity: "standard"
```

## Platform Support

| Platform | Status | Import Method | Export Format |
|----------|--------|---------------|---------------|
| **Claude Code** | ✅ MVP | Auto-sync (JSONL) | Standard fidelity |
| **ChatGPT** | 🚧 Phase 1 | Manual export (JSON) | Standard fidelity |
| **Gemini** | 🚧 Phase 1 | Manual export (JSON) | Standard fidelity |
| **Custom** | 🔮 Future | Adapter API | Configurable |

## Standards Adoption

- **Open Message Format (OMF):** Base schema for conversation structure
- **ISO 8601 Timestamps:** UTC with millisecond precision
- **UUIDv4 Session IDs:** Universal unique identifiers
- **Git-native Operations:** All state transitions via `git mv`

## Dependencies

**Runtime:**
- Node.js ≥18.x
- Git ≥2.x

**npm packages (Apache 2.0 / MIT):**
- js-yaml, commander, uuid, fast-glob, gray-matter, chokidar

## Implementation Status

**Phase 0 (Week 1): MVP** ✅ Current
- ✅ Canonical schema definition (OMF-based)
- ✅ Claude Code → canonical converter
- ✅ Canonical → Markdown serializer
- ✅ ctx-import CLI tool
- ✅ ctx-export CLI tool
- ✅ Directory structure and config

**Phase 1 (Week 2): Multi-Platform**
- ⏳ ChatGPT converter
- ⏳ Gemini converter

**Phase 2 (Week 3): Flow Management**
- ⏳ ctx-flow CLI tool
- ⏳ ctx-sync auto-import daemon

**Phase 3 (Week 4): Discovery**
- ⏳ ctx-search CLI tool
- ⏳ Session indexing

## License

Apache 2.0 (core functionality)

## See Also

- **AGENTS.md** - AI agent discovery instructions
- **schemas/canonical-v1.yaml** - Session schema definition
- **config.yaml** - CTX configuration reference
