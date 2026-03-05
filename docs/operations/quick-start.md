# Quick Start

## Prerequisites

- WSL2 with Ubuntu (INTenXDev + Ubuntu-AI-Hub instances)
- Ollama running on Windows (AMD GPU)
- Docker installed on Ubuntu-AI-Hub
- Node.js 18+ on INTenXDev
- Telegram bot token (from BotFather)

## 1. Start Ollama

```powershell
# Windows — start Ollama server (not the app icon)
& "C:\Users\<user>\AppData\Local\Programs\Ollama\ollama.exe" serve
```

Or from WSL:
```bash
source /mnt/c/Temp/wsl-shared/ollama-setup.sh
```

## 2. Start LiteLLM Gateway (Ubuntu-AI-Hub)

```bash
cd ~/rtgf-ai-stack
# Fill in secrets first
cp gateway/.env.example gateway/.env
# Edit gateway/.env with LITELLM_MASTER_KEY

docker compose -f compose/gateway.yml up -d
```

Verify: `curl http://localhost:4000/health`

## 3. Start Telegram Bot (INTenXDev)

```bash
cd ~/rtgf-ai-stack/interface
# Fill in secrets
cp .env.example .env
# Edit .env with TELEGRAM_TOKEN, GATEWAY_URL, etc.

# Enable as systemd service
systemctl --user enable --now rtgf-interface

# Check it's running
journalctl --user -u rtgf-interface -f
```

Enable persistence without active login session:
```bash
loginctl enable-linger cbasta
```

## 4. Activate WARD Hooks

```bash
bash ~/rtgf-ai-stack/hooks/install-hooks.sh
# Edit ~/.claude/hooks/ward.env with TELEGRAM_TOKEN and TELEGRAM_CHAT_ID
```

## 5. Verify Everything

In Telegram, send `/help` to your bot — you should see the full command menu.

| Check | Command |
|-------|---------|
| Gateway health | `/models` |
| Platform health | `/status` |
| Your chat ID | `/whoami` |
| CHRONICLE search | `/chronicle test query` |

## Common Issues

### "Error fetching models: user aborted a request"

Ollama unreachable or LiteLLM not connected to DB.

```bash
# On Ubuntu-AI-Hub
docker compose -f compose/gateway.yml ps
docker compose -f compose/gateway.yml logs litellm | tail -20
```

### Bot not responding after Windows reboot

Gateway IP changed. The bot auto-discovers — wait ~5s and retry. If persistent:

```bash
# Check what IP gateway is on now
ip route show  # from INTenXDev WSL
```

### "Budget limit reached"

```bash
# Create or reset a key on Ubuntu-AI-Hub
bash ~/rtgf-ai-stack/gateway/setup-client.sh <client> <budget>
# Update LITELLM_DEFAULT_KEY in interface/.env
```
