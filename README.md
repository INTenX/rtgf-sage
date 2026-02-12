# rtgf-rcm

**Runtime Context Management - Git-Native LLM Conversation Archival**

Version: 0.1.0 (Phase 0 MVP)
License: Apache 2.0
Status: Internal Development

---

## Overview

RCM (Runtime Context Management) treats LLM conversations as version-controlled knowledge artifacts. It provides agent-agnostic session archival, cross-platform conversation management, and git-native knowledge flow curation.

**Problem:** LLM conversations scattered across platforms (Claude Code, ChatGPT, Gemini) with no unified archival, versioning, or reuse strategy.

**Solution:** Git-native knowledge management with universal canonical format (OMF-based), flow-state curation (hypothesis → codified → validated → promoted), and RAG integration.

---

## Quick Start

### Installation

```bash
cd /home/cbasta/rtgf-rcm
npm install
npm link  # Make CLI tools globally available
```

### Import a Claude Code Session

```bash
rcm-import \
  --source ~/.claude/projects/-home-cbasta/82138824-9656-40df-83f6-3a673429971a.jsonl \
  --platform claude-code \
  --target ~/personal-knowledge/
```

### Export to Markdown (RAG-ready)

```bash
rcm-export \
  --input ~/personal-knowledge/rcm/flows/promoted/*.yaml \
  --format markdown \
  --output /path/to/anythingllm/documents/
```

---

## Architecture

```
rtgf-rcm/
├── rcm/                           # RTGF module
│   ├── README.md                  # Module contract
│   ├── AGENTS.md                  # AI agent discovery
│   ├── config.yaml                # Configuration
│   ├── archive/
│   │   ├── raw/{platform}/        # Original formats
│   │   └── canonical/{year}/{month}/  # Unified YAML
│   ├── flows/                     # Knowledge Flow states
│   │   ├── hypothesis/            # Auto-imported
│   │   ├── codified/              # Tagged, curated
│   │   ├── validated/             # Quality-checked
│   │   └── promoted/              # RAG-indexed
│   └── schemas/
│       └── canonical-v1.yaml      # Universal schema
└── tools/                         # CLI utilities
    ├── adapters/
    │   └── claude-code.js         # Platform converters
    ├── serializers/
    │   └── markdown.js            # Export formats
    └── cli/
        ├── rcm-import.js          # Import sessions
        └── rcm-export.js          # Export sessions
```

---

## Canonical Format

Based on **Open Message Format (OMF)** with RTGF extensions:

```yaml
session:
  id: "uuid-v4"
  canonical_version: "1.0"
  created_at: "2026-02-08T13:53:15.450Z"
  source:
    platform: "claude-code"
    session_id: "55fc0e3d-..."
  metadata:
    title: "OpenClaw Installation Planning"
    tags: ["openclaw", "workflow", "multi-client"]
  flow_state:
    current: "hypothesis"

messages:
  - id: "c31003b5-..."
    timestamp: "2026-02-08T13:53:15.411Z"
    role: "user"
    content: "I need better orchestration..."
  - id: "89b79d2a-..."
    role: "assistant"
    model: "claude-opus-4-5-20251101"
    content: "Let me help you..."
    thinking: "The user is asking about..."
    usage:
      input_tokens: 9
      output_tokens: 3

fidelity:
  level: "standard"
  preserved_fields: ["thinking", "tool_uses", "usage_metrics"]
```

**Fidelity Levels:**
- **Minimal:** Metadata only (~1KB) - for indexing
- **Standard:** Full conversation + thinking + tools (~10-50KB) - DEFAULT
- **Full:** Complete lossless archive (~100KB-1MB) - for migration

---

## Knowledge Flow States

Sessions progress through states using git operations:

```
1. hypothesis (auto-import, untagged)
   ↓ rcm-flow promote --to codified
2. codified (tagged, structured)
   ↓ quality check
3. validated (quality_score ≥ 70)
   ↓ export to RAG
4. promoted (RAG-indexed, knowledge base)
```

**Git commit conventions:**
- `rcm(import): Import claude-code session 55fc0e3d`
- `rcm(flow): Codify session 55fc0e3d (hypothesis → codified)`
- `rcm(promote): Promote session 55fc0e3d to validated`

---

## Multi-Client Isolation

Separate git repositories per client:

```
/home/cbasta/client-a-knowledge/
  ├── .git/
  └── rcm/

/home/cbasta/client-b-knowledge/
  ├── .git/
  └── rcm/

/home/cbasta/personal-knowledge/
  ├── .git/
  └── rcm/
```

Each repo has independent git history and isolated sessions.

---

## Platform Support

| Platform | Status | Import Method | Fidelity |
|----------|--------|---------------|----------|
| **Claude Code** | ✅ MVP | Auto-sync (JSONL) | Standard |
| **ChatGPT** | 🚧 Phase 1 | Manual export | Standard |
| **Gemini** | 🚧 Phase 1 | Manual export | Standard |

---

## CLI Tools

### rcm-import

Import sessions to RCM:

```bash
rcm-import \
  --source session.jsonl \
  --platform claude-code \
  --target ~/knowledge/ \
  --flow-state hypothesis \
  --tags "openclaw,workflow"
```

**Options:**
- `--source`: Source session file
- `--platform`: Platform name (claude-code, chatgpt, gemini)
- `--target`: RCM root directory
- `--flow-state`: Initial state (default: hypothesis)
- `--tags`: Comma-separated tags
- `--no-commit`: Skip git commit

### rcm-export

Export sessions to various formats:

```bash
rcm-export \
  --input "rcm/flows/promoted/*.yaml" \
  --format markdown \
  --output /path/to/export/
```

**Options:**
- `--input`: File path or glob pattern
- `--format`: Output format (markdown, json)
- `--output`: Output directory
- `--rcm-root`: RCM root (for relative paths)

---

## Development Status

**Phase 0 (Week 1): MVP** ✅ In Progress
- ✅ Project structure and dependencies
- ✅ Canonical schema (OMF-based)
- ✅ Claude Code adapter
- ✅ Markdown serializer
- ✅ rcm-import CLI
- ✅ rcm-export CLI
- ⏳ Testing with existing sessions

**Phase 1 (Week 2): Multi-Platform**
- ⏳ ChatGPT adapter
- ⏳ Gemini adapter

**Phase 2 (Week 3): Flow Management**
- ⏳ rcm-flow CLI
- ⏳ rcm-sync auto-import daemon

**Phase 3 (Week 4): Discovery**
- ⏳ rcm-search CLI
- ⏳ Session indexing

---

## Dependencies

**Runtime:**
- Node.js ≥18.x
- Git ≥2.x

**npm packages (MIT/Apache 2.0):**
- js-yaml - YAML parsing
- commander - CLI framework
- uuid - UUID generation
- fast-glob - File pattern matching
- gray-matter - YAML frontmatter
- chokidar - File system watcher

---

## Standards Adoption

- **Open Message Format (OMF):** Base conversation schema
- **ISO 8601 Timestamps:** UTC with millisecond precision
- **UUIDv4 Session IDs:** Universal unique identifiers
- **Git-native Operations:** All state transitions via `git mv`

---

## Testing

### End-to-End Test

```bash
# Import existing Claude Code session
rcm-import \
  --source ~/.claude/projects/-home-cbasta/82138824-9656-40df-83f6-3a673429971a.jsonl \
  --platform claude-code \
  --target ~/personal-knowledge/

# Verify canonical created
ls ~/personal-knowledge/rcm/archive/canonical/2026/*/

# Export to Markdown
rcm-export \
  --input ~/personal-knowledge/rcm/flows/hypothesis/*.yaml \
  --format markdown \
  --output /tmp/rcm-test-export/

# Verify readable Markdown
cat /tmp/rcm-test-export/*.md
```

---

## Documentation

- **rcm/README.md** - Module contract and architecture
- **rcm/AGENTS.md** - AI agent discovery instructions
- **rcm/schemas/canonical-v1.yaml** - Session schema reference
- **rcm/config.yaml** - Configuration reference

---

## License

Apache 2.0

Core functionality released as open source. Optional enterprise features (observability integration, AI tagging, team collaboration) may use commercial licensing in future releases.

---

## Roadmap

**Internal Use (Weeks 1-8):**
- Validate with personal multi-client workflow
- Refine based on real-world patterns

**Community Release (Month 3):**
- Open-source core (Apache 2.0)
- GitHub repository with docs
- Community feedback loop

**Knowledge Commerce (Month 6):**
- Decision on commercial features
- Potential enterprise edition
- Training/consulting offerings

---

## Contact

Internal development - not yet released publicly.

For questions or collaboration: (TBD after validation phase)
