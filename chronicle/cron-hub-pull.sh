#!/bin/bash
# Pull latest knowledge repo updates on AI Hub WSL
# Run ~30min after cron-daily-import.sh to ensure pushes have landed.
#
# Runs on: Ubuntu-AI-Hub WSL
# Installation (on Hub, run: crontab -e):
#   30 2 * * * /home/cbasta/rtgf-ai-stack/chronicle/cron-hub-pull.sh

LOG_FILE="$HOME/logs/chronicle-hub-pull-$(date +%Y-%m-%d).log"
mkdir -p "$HOME/logs"

echo "=== CHRONICLE Hub Pull ===" | tee -a "$LOG_FILE"
echo "Date: $(date)" | tee -a "$LOG_FILE"

for repo in intenx-knowledge sensit-knowledge makanui-knowledge ratio11-knowledge beaglebone-knowledge test-knowledge; do
  dir="$HOME/$repo"
  if [ -d "$dir" ]; then
    result=$(git -C "$dir" pull --ff-only 2>&1 | tail -1)
    echo "  $repo: $result" | tee -a "$LOG_FILE"
  fi
done

echo "✅ Hub pull complete" | tee -a "$LOG_FILE"
echo "===================" | tee -a "$LOG_FILE"
