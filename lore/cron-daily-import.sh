#!/bin/bash
# Daily import cron job for LORE
# Runs at 2am daily, imports previous day's sessions
#
# Installation:
#   crontab -e
#   Add: 0 2 * * * /home/cbasta/rtgf-ai-stack/lore/cron-daily-import.sh

set -e

LORE_ROOT="/home/cbasta/rtgf-ai-stack/lore"
CLAUDE_PROJECTS="$HOME/.claude/projects"
LOG_FILE="$HOME/logs/lore-import-$(date +%Y-%m-%d).log"

mkdir -p "$HOME/logs"

echo "=== LORE Daily Import ===" | tee -a "$LOG_FILE"
echo "Date: $(date)" | tee -a "$LOG_FILE"
echo | tee -a "$LOG_FILE"

# Import sessions modified in last 24 hours matching a glob pattern
import_recent_sessions() {
  local project_pattern="$1"
  local target_repo="$2"
  local client_name="$3"

  echo "Importing $client_name sessions..." | tee -a "$LOG_FILE"

  local count=0
  while IFS= read -r session; do
    echo "  $(basename "$session")" | tee -a "$LOG_FILE"

    if node "$LORE_ROOT/tools/cli/rcm-import.js" \
      --source "$session" \
      --platform claude-code \
      --target "$target_repo" >> "$LOG_FILE" 2>&1; then
      count=$((count + 1))
    fi
  done < <(find "$CLAUDE_PROJECTS"/$project_pattern -name "*.jsonl" -type f -mtime -1 2>/dev/null)

  echo "  Imported: $count sessions" | tee -a "$LOG_FILE"
  echo | tee -a "$LOG_FILE"
}

# INTenX — all work/dev sessions
import_recent_sessions "-home-cbasta" "$HOME/intenx-knowledge" "INTenX (home)"
import_recent_sessions "-home-cbasta-business-ops*" "$HOME/intenx-knowledge" "INTenX (business-ops)"
import_recent_sessions "-home-cbasta-dev-tools-*" "$HOME/intenx-knowledge" "INTenX (dev-tools)"
import_recent_sessions "-home-cbasta-mechanical-tools" "$HOME/intenx-knowledge" "INTenX (mechanical)"
import_recent_sessions "-home-cbasta-mess-development" "$HOME/intenx-knowledge" "INTenX (MESS)"
import_recent_sessions "-home-cbasta-rtgf*" "$HOME/intenx-knowledge" "INTenX (rtgf)"

# Makanui — personal/resale sessions
import_recent_sessions "-home-cbasta-resale-app" "$HOME/makanui-knowledge" "Makanui (resale)"
import_recent_sessions "-home-cbasta-personal-finance" "$HOME/makanui-knowledge" "Makanui (finance)"

# Test/experimental sessions
import_recent_sessions "-home-cbasta-test" "$HOME/test-knowledge" "Test"

# Commit + push repos that have new sessions
for repo in intenx-knowledge makanui-knowledge test-knowledge; do
  repo_path="$HOME/$repo"
  if [ -d "$repo_path" ]; then
    cd "$repo_path"
    if ! git diff --quiet HEAD 2>/dev/null || git status --short | grep -q '^[?A]'; then
      git add -A rcm/
      git commit -m "chore(lore): Daily import $(date +%Y-%m-%d)" || true
      git push || true
    fi
  fi
done

echo "✅ Daily import complete" | tee -a "$LOG_FILE"
echo "===================" | tee -a "$LOG_FILE"
