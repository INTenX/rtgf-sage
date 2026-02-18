#!/bin/bash
# Setup script for client knowledge repositories
# Usage: ./setup-client-repo.sh <client-name> <repo-path>

set -e

CLIENT_NAME="$1"
REPO_PATH="$2"

if [ -z "$CLIENT_NAME" ] || [ -z "$REPO_PATH" ]; then
  echo "Usage: $0 <client-name> <repo-path>"
  echo "Example: $0 Makanui /home/cbasta/makanui-knowledge"
  exit 1
fi

echo "Setting up knowledge repository for: $CLIENT_NAME"
echo "Location: $REPO_PATH"
echo

# Create directory structure
mkdir -p "$REPO_PATH/rcm/archive/canonical"
mkdir -p "$REPO_PATH/rcm/archive/raw/claude-code"
mkdir -p "$REPO_PATH/rcm/archive/raw/chatgpt"
mkdir -p "$REPO_PATH/rcm/archive/raw/gemini"
mkdir -p "$REPO_PATH/rcm/flows/hypothesis"
mkdir -p "$REPO_PATH/rcm/flows/codified"
mkdir -p "$REPO_PATH/rcm/flows/validated"
mkdir -p "$REPO_PATH/rcm/flows/promoted"

# Create config.yaml
cat > "$REPO_PATH/config.yaml" <<EOF
# LORE Knowledge Repository Configuration
# Client: $CLIENT_NAME

binding:
  type: child
  parent:
    repo: "github.com/YOUR_USERNAME/rtgf-sage"
    module: rcm

client:
  name: "$CLIENT_NAME"
  created: "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

rcm:
  enabled: true
  default_fidelity: standard
  auto_sync: true
  platforms:
    - claude-code
    - chatgpt
    - gemini

flow_states:
  hypothesis:
    description: "Auto-imported, untagged sessions"
    auto_import: true
  codified:
    description: "Tagged, structured knowledge"
    requires_tags: true
  validated:
    description: "Quality-checked, reusable sessions"
    requires_review: true
  promoted:
    description: "RAG-indexed, production knowledge"
    export_format: markdown
EOF

# Create README.md
cat > "$REPO_PATH/README.md" <<EOF
# $CLIENT_NAME Knowledge Repository

**LORE Knowledge Base - LLM Session Archive**

Client: $CLIENT_NAME
Created: $(date +%Y-%m-%d)
Managed by: [LORE](https://github.com/YOUR_USERNAME/rtgf-sage)

---

## Structure

\`\`\`
rcm/
├── archive/
│   ├── canonical/      # Universal YAML format (immutable)
│   └── raw/            # Original platform formats
├── flows/
│   ├── hypothesis/     # Auto-imported sessions
│   ├── codified/       # Tagged, structured sessions
│   ├── validated/      # Quality-checked sessions
│   └── promoted/       # RAG-indexed sessions
\`\`\`

---

## Knowledge Flow States

**hypothesis** → **codified** → **validated** → **promoted**

- **Hypothesis:** Auto-imported from LLM platforms (untagged, unvalidated)
- **Codified:** Manually tagged and structured for reuse
- **Validated:** Quality-checked, confirmed valuable
- **Promoted:** Exported to RAG system (AnythingLLM)

---

## Usage

### Import Sessions

\`\`\`bash
# Auto-sync Claude Code sessions
rcm-sync --watch ~/.claude/projects/ --target $(pwd)

# Manual import
rcm-import --source session.jsonl --platform claude-code --target $(pwd)
\`\`\`

### Promote Sessions

\`\`\`bash
# Promote to codified
rcm-flow promote --session SESSION_ID --to codified --tags "tag1,tag2"

# Promote to validated
rcm-flow promote --session SESSION_ID --to validated

# Promote to promoted (RAG export)
rcm-flow promote --session SESSION_ID --to promoted
\`\`\`

### Browse Sessions

\`\`\`bash
# Terminal UI
rcm-tui $(pwd)

# Web Dashboard
cd /path/to/rtgf-sage/tools/web
node server.js $(pwd) 3000
# Open http://localhost:3000
\`\`\`

---

## Git Conventions

All operations use git-native commits:

- \`rcm(import)\` - New session imported
- \`rcm(flow)\` - State transition (e.g., hypothesis → codified)
- \`rcm(promote)\` - Promoted to next state
- \`rcm(export)\` - Exported to external format

---

**Powered by [LORE](https://github.com/YOUR_USERNAME/rtgf-sage) - Session Archive & Governance Engine**
EOF

# Create .gitignore
cat > "$REPO_PATH/.gitignore" <<EOF
# Temporary files
*.tmp
*.swp
*.swo

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Local testing
test-output/
EOF

# Initialize git
cd "$REPO_PATH"
git init
git add .
git commit -m "rcm(init): Initialize $CLIENT_NAME knowledge repository

Managed by LORE (Session Archive & Governance Engine)
Client: $CLIENT_NAME

Directory structure:
- rcm/archive/ - Immutable session archives
- rcm/flows/ - Knowledge Flow states

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

echo
echo "✅ Knowledge repository initialized for $CLIENT_NAME"
echo "   Location: $REPO_PATH"
echo
echo "Next steps:"
echo "  1. cd $REPO_PATH"
echo "  2. gh repo create ${REPO_PATH##*/} --private --source=. --push"
echo "  3. Start importing sessions!"
echo
