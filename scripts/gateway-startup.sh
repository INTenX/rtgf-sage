#!/usr/bin/env bash
# gateway-startup.sh — Start LiteLLM gateway on Ubuntu-AI-Hub boot
#
# Called from /etc/wsl.conf [boot] command= when the WSL instance starts.
# Runs as root; switches to cbasta for docker compose.
#
# Setup (on Ubuntu-AI-Hub):
#   1. Copy this script: sudo cp ~/rtgf-ai-stack/scripts/gateway-startup.sh /usr/local/bin/gateway-startup.sh
#   2. Make executable:  sudo chmod +x /usr/local/bin/gateway-startup.sh
#   3. Add to /etc/wsl.conf:
#        [boot]
#        command=/usr/local/bin/gateway-startup.sh
#   4. Restart distro from PowerShell: wsl --terminate Ubuntu-AI-Hub && wsl -d Ubuntu-AI-Hub
#
# Logs: /var/log/gateway-startup.log

LOG=/var/log/gateway-startup.log
USER=cbasta
REPO="/home/${USER}/rtgf-ai-stack"
COMPOSE_FILE="${REPO}/compose/gateway.yml"
ENV_FILE="${REPO}/gateway/.env"

log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$LOG"; }

log "=== Gateway startup ==="

# Wait for Docker daemon to be ready (up to 30s)
for i in $(seq 1 15); do
    if docker info >/dev/null 2>&1; then
        log "Docker ready (attempt $i)"
        break
    fi
    log "Waiting for Docker... ($i/15)"
    sleep 2
done

if ! docker info >/dev/null 2>&1; then
    log "ERROR: Docker not ready after 30s — aborting"
    exit 1
fi

# Check env file exists
if [[ ! -f "$ENV_FILE" ]]; then
    log "ERROR: $ENV_FILE not found — gateway not started"
    exit 1
fi

# Pull latest config (optional — remove if you don't want auto-pull on boot)
# su -c "git -C ${REPO} pull --quiet" "$USER" >> "$LOG" 2>&1

# Start gateway (only litellm service — no db dependency)
log "Starting litellm gateway..."
su -c "docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} up -d litellm" "$USER" >> "$LOG" 2>&1

if [[ $? -eq 0 ]]; then
    log "Gateway started successfully"
else
    log "ERROR: docker compose up failed — check $LOG"
fi
