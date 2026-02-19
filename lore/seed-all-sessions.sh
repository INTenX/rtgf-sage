#!/bin/bash
# Seed all existing Claude Code sessions into client knowledge repos
#
# This script helps route your 46 existing Claude sessions to appropriate client repos

set -e

CLAUDE_PROJECTS="$HOME/.claude/projects"
LORE_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🌱 LORE Session Seeding Wizard"
echo "================================"
echo
echo "Found 46 Claude Code sessions across 5 projects:"
echo "  • business-ops: 3 sessions"
echo "  • kicad-tools: 1 session"
echo "  • resale-app: 1 session"
echo "  • test: 3 sessions"
echo "  • home-cbasta: 21 sessions (already in test-knowledge)"
echo
echo "Let's route them to your client knowledge repos!"
echo

# Project → Client mapping (you can customize this)
declare -A PROJECT_MAPPING=(
  ["-home-cbasta-business-ops"]="makanui-knowledge"
  ["-home-cbasta-dev-tools-electrical-kicad-tools"]="intenx-knowledge"  # Default: engineering work
  ["-home-cbasta-resale-app"]="makanui-knowledge"  # Default: personal project
  ["-home-cbasta-test"]="test-knowledge"
  ["-home-cbasta"]="test-knowledge"  # Already imported
)

# Ask user to confirm mappings
echo "📋 Project → Client Mapping:"
echo
for project in "${!PROJECT_MAPPING[@]}"; do
  client="${PROJECT_MAPPING[$project]}"
  echo "  $project → $client"
done
echo
read -p "Is this mapping correct? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo
  echo "Let's customize the mapping..."
  echo

  # KiCad tools - which client?
  echo "KiCad tools project is for:"
  echo "  1) INTenX (engineering business)"
  echo "  2) Sensit (client)"
  echo "  3) Ratio11 (client)"
  echo "  4) BeagleBone (client)"
  read -p "Choose (1-4): " kicad_choice
  case $kicad_choice in
    1) PROJECT_MAPPING["-home-cbasta-dev-tools-electrical-kicad-tools"]="intenx-knowledge" ;;
    2) PROJECT_MAPPING["-home-cbasta-dev-tools-electrical-kicad-tools"]="sensit-knowledge" ;;
    3) PROJECT_MAPPING["-home-cbasta-dev-tools-electrical-kicad-tools"]="ratio11-knowledge" ;;
    4) PROJECT_MAPPING["-home-cbasta-dev-tools-electrical-kicad-tools"]="beaglebone-knowledge" ;;
  esac

  # Resale app - which client?
  echo
  echo "Resale app project is for:"
  echo "  1) Makanui (personal/LLC)"
  echo "  2) Other client"
  read -p "Choose (1-2): " resale_choice
  case $resale_choice in
    1) PROJECT_MAPPING["-home-cbasta-resale-app"]="makanui-knowledge" ;;
    2)
      echo "Which client? (sensit/ratio11/beaglebone/intenx)"
      read -p "> " client_name
      PROJECT_MAPPING["-home-cbasta-resale-app"]="${client_name}-knowledge"
      ;;
  esac
fi

echo
echo "✓ Final mapping confirmed:"
for project in "${!PROJECT_MAPPING[@]}"; do
  client="${PROJECT_MAPPING[$project]}"
  echo "  $project → $client"
done
echo

# Import sessions
echo "🚀 Starting import..."
echo

total_imported=0
total_skipped=0

for project in "${!PROJECT_MAPPING[@]}"; do
  client="${PROJECT_MAPPING[$project]}"
  client_path="$HOME/$client"
  project_path="$CLAUDE_PROJECTS/$project"

  if [ ! -d "$project_path" ]; then
    echo "⚠️  Skipping $project (directory not found)"
    continue
  fi

  # Count sessions in this project
  session_count=$(find "$project_path" -maxdepth 1 -name "*.jsonl" -type f 2>/dev/null | wc -l)

  if [ $session_count -eq 0 ]; then
    echo "⚠️  Skipping $project (no sessions found)"
    continue
  fi

  echo "📦 Importing $session_count sessions from $project → $client"

  # Skip if already imported to test-knowledge
  if [ "$client" == "test-knowledge" ] && [ "$project" == "-home-cbasta" ]; then
    echo "   ↳ Already imported (skipping)"
    total_skipped=$((total_skipped + session_count))
    continue
  fi

  # Import using rcm-import
  for session_file in "$project_path"/*.jsonl; do
    if [ -f "$session_file" ]; then
      session_name=$(basename "$session_file" .jsonl)

      # Check if already imported (avoid duplicates)
      if find "$client_path/rcm/archive/canonical" -name "*$session_name*.yaml" 2>/dev/null | grep -q .; then
        echo "   ↳ $session_name (already imported, skipping)"
        total_skipped=$((total_skipped + 1))
        continue
      fi

      # Import
      node "$LORE_ROOT/tools/cli/rcm-import.js" \
        --source "$session_file" \
        --platform claude-code \
        --target "$client_path" \
        2>&1 | sed 's/^/     /'

      if [ $? -eq 0 ]; then
        total_imported=$((total_imported + 1))
      fi
    fi
  done

  echo
done

echo "✅ Import complete!"
echo
echo "Summary:"
echo "  • Imported: $total_imported sessions"
echo "  • Skipped: $total_skipped sessions (already imported)"
echo
echo "Next steps:"
echo "  1. Browse sessions in Web UI:"
echo "     cd $LORE_ROOT/tools/web"
echo "     node server.js ~/makanui-knowledge 3001"
echo
echo "  2. Promote valuable sessions:"
echo "     node $LORE_ROOT/tools/cli/rcm-flow.js promote \\"
echo "       --session SESSION_ID \\"
echo "       --to codified \\"
echo "       --tags 'project,topic'"
echo
echo "  3. Set up auto-sync for future sessions:"
echo "     node $LORE_ROOT/tools/cli/rcm-sync.js \\"
echo "       --watch ~/.claude/projects/ \\"
echo "       --target ~/makanui-knowledge/ \\"
echo "       --daemon"
echo
