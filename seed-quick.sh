#!/bin/bash
# Quick seed - imports all sessions to makanui-knowledge
# (You can organize into other repos later)

set -e

SAGE_ROOT="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_PROJECTS="$HOME/.claude/projects"
TARGET="$HOME/makanui-knowledge"

echo "🚀 Quick Seed: Importing all Claude sessions to makanui-knowledge"
echo

total=0

# Import from each project directory
for project_dir in "$CLAUDE_PROJECTS"/*; do
  if [ -d "$project_dir" ]; then
    project_name=$(basename "$project_dir")

    for session_file in "$project_dir"/*.jsonl; do
      if [ -f "$session_file" ]; then
        echo "Importing $(basename "$session_file")..."

        node "$SAGE_ROOT/tools/cli/rcm-import.js" \
          --source "$session_file" \
          --platform claude-code \
          --target "$TARGET" 2>&1 | grep -E "(✓|✗|Error)" || true

        if [ $? -eq 0 ]; then
          total=$((total + 1))
        fi
      fi
    done
  fi
done

echo
echo "✅ Imported $total sessions to makanui-knowledge"
echo
echo "View them:"
echo "  cd $SAGE_ROOT/tools/web"
echo "  node server.js $TARGET 3001"
echo "  # Open http://localhost:3001"
echo
