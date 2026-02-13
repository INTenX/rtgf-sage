#!/bin/bash
# Daily import cron job for SAGE
# Runs at 2am daily, imports previous day's sessions
#
# Installation:
#   crontab -e
#   Add: 0 2 * * * /home/cbasta/rtgf-sage/cron-daily-import.sh >> /home/cbasta/logs/sage-import.log 2>&1

set -e

SAGE_ROOT="/home/cbasta/rtgf-sage"
CLAUDE_PROJECTS="$HOME/.claude/projects"
LOG_FILE="$HOME/logs/sage-import-$(date +%Y-%m-%d).log"

mkdir -p "$HOME/logs"

echo "=== SAGE Daily Import ===" | tee -a "$LOG_FILE"
echo "Date: $(date)" | tee -a "$LOG_FILE"
echo | tee -a "$LOG_FILE"

# Function to import sessions modified in last 24 hours
import_recent_sessions() {
  local project_pattern="$1"
  local target_repo="$2"
  local client_name="$3"

  echo "Importing $client_name sessions..." | tee -a "$LOG_FILE"

  local count=0
  find "$CLAUDE_PROJECTS"/$project_pattern -name "*.jsonl" -type f -mtime -1 2>/dev/null | while read session; do
    echo "  $(basename "$session")" | tee -a "$LOG_FILE"

    node "$SAGE_ROOT/tools/cli/rcm-import.js" \
      --source "$session" \
      --platform claude-code \
      --target "$target_repo" >> "$LOG_FILE" 2>&1

    if [ $? -eq 0 ]; then
      count=$((count + 1))
    fi
  done

  echo "  Imported: $count sessions" | tee -a "$LOG_FILE"
  echo | tee -a "$LOG_FILE"
}

# INTenX business sessions (business-ops, kicad-tools, etc.)
import_recent_sessions "-home-cbasta-business-ops*" "$HOME/intenx-knowledge" "INTenX"
import_recent_sessions "-home-cbasta-dev-tools-*" "$HOME/intenx-knowledge" "INTenX (dev-tools)"

# Makanui personal sessions
import_recent_sessions "-home-cbasta-resale-app" "$HOME/makanui-knowledge" "Makanui"

# Test/experimental sessions
import_recent_sessions "-home-cbasta-test" "$HOME/test-knowledge" "Test"

# Commit imported sessions
cd "$HOME/intenx-knowledge" && git add -A && git commit -m "rcm(import): Daily import $(date +%Y-%m-%d)" && git push || true
cd "$HOME/makanui-knowledge" && git add -A && git commit -m "rcm(import): Daily import $(date +%Y-%m-%d)" && git push || true
cd "$HOME/test-knowledge" && git add -A && git commit -m "rcm(import): Daily import $(date +%Y-%m-%d)" && git push || true

echo "✅ Daily import complete" | tee -a "$LOG_FILE"
echo "===================" | tee -a "$LOG_FILE"
