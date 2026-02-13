#!/bin/bash
# Seed production knowledge repos with current sessions
# Maps projects to appropriate client repos

set -e

SAGE_ROOT="/home/cbasta/rtgf-sage"
CLAUDE_PROJECTS="$HOME/.claude/projects"

echo "🌱 SAGE Production Seeding"
echo "=========================="
echo

# INTenX business sessions
echo "📦 [1/2] Importing INTenX business sessions..."
for session in \
  "$CLAUDE_PROJECTS/-home-cbasta-business-ops-strategy"/*.jsonl \
  "$CLAUDE_PROJECTS/-home-cbasta-business-ops"/*.jsonl \
  "$CLAUDE_PROJECTS/-home-cbasta-dev-tools-electrical-kicad-tools"/*.jsonl
do
  if [ -f "$session" ]; then
    echo "  Importing $(basename "$session")..."
    node "$SAGE_ROOT/tools/cli/rcm-import.js" \
      --source "$session" \
      --platform claude-code \
      --target "$HOME/intenx-knowledge" 2>&1 | grep -E "(✓|✗|Error)" || true
  fi
done

echo
echo "📦 [2/2] Importing Makanui personal sessions..."
for session in "$CLAUDE_PROJECTS/-home-cbasta-resale-app"/*.jsonl; do
  if [ -f "$session" ]; then
    echo "  Importing $(basename "$session")..."
    node "$SAGE_ROOT/tools/cli/rcm-import.js" \
      --source "$session" \
      --platform claude-code \
      --target "$HOME/makanui-knowledge" 2>&1 | grep -E "(✓|✗|Error)" || true
  fi
done

echo
echo "✅ Production seeding complete!"
echo
echo "Status:"
echo "  INTenX: $(find ~/intenx-knowledge/rcm/archive/canonical -name "*.yaml" 2>/dev/null | wc -l) sessions"
echo "  Makanui: $(find ~/makanui-knowledge/rcm/archive/canonical -name "*.yaml" 2>/dev/null | wc -l) sessions"
echo
echo "Next: Browse sessions in Web UI"
echo "  cd $SAGE_ROOT/tools/web"
echo "  node server.js ~/intenx-knowledge 3000"
echo
