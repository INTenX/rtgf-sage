# rtgf-interface — Telegram Bot

Telegram interface for the INTenX AI stack. Routes messages to LiteLLM gateway,
runs stack tools, searches LORE, enforces per-chat client isolation.

## Setup (10 minutes)

**1. Create your bot**
- Open Telegram → message `@BotFather`
- Send `/newbot` → name it (e.g. "INTenX Stack") → get token

**2. Configure**
```bash
cd interface/
cp .env.example .env
# Edit .env — set TELEGRAM_TOKEN at minimum
```

**3. Install and start**
```bash
npm install
npm start
```

**4. Get your chat ID**
- Message your bot anything
- Bot replies with your chat ID from `/whoami`
- Set `ADMIN_CHAT_ID=<your-id>` in `.env`
- Restart: `npm start`

## Commands

| Command | Description | Model |
|---|---|---|
| `/ask <prompt>` | General question | local-general |
| `/code <prompt>` | Coding question | local-coding |
| `/reason <prompt>` | Chain-of-thought reasoning | local-reasoning |
| `/fast <prompt>` | Quick answer | local-fast |
| `/status` | Platform health (wsl-audit risks) | — |
| `/health` | Full platform audit | — |
| `/models` | List available models | — |
| `/model <name>` | Switch model for this session | — |
| `/lore <query>` | Search LORE session archive | — |
| `/whoami` | Show chat ID and config | — |
| `/spend` | Team spend summary (admin) | — |
| `/pull <model>` | Trigger Ollama pull (admin) | — |
| `/import` | Run LORE session import (admin) | — |

Private chat: any non-command message routes to the active model.
Group chat: only explicit commands work (prevents noise).

## Multi-Client Setup

Each Telegram group maps to a client. After deploying the gateway:

```bash
# Create a virtual key for the client
./gateway/setup-client.sh sensit-dev 50

# Add to interface/config.yaml:
chats:
  "-1001234567890":   # get from /whoami in the group
    name: sensit-dev
    client: sensit-dev
    default_model: local-coding
    litellm_key: sk-virt-sensit-...  # from setup-client.sh output
```

Restart the bot — all messages from that group are now attributed to sensit-dev.

## Running as a Service

```bash
# systemd (recommended for always-on)
cat > ~/.config/systemd/user/rtgf-interface.service << EOF
[Unit]
Description=rtgf-interface Telegram bot

[Service]
WorkingDirectory=/home/cbasta/rtgf-ai-stack/interface
ExecStart=/usr/bin/node bot.js
Restart=on-failure
RestartSec=10
EnvironmentFile=/home/cbasta/rtgf-ai-stack/interface/.env

[Install]
WantedBy=default.target
EOF

systemctl --user enable --now rtgf-interface
systemctl --user status rtgf-interface
```

## Files

```
interface/
├── bot.js          — Main bot (~250 lines)
├── config.yaml     — Chat → client mapping, model routing, scheduled jobs
├── .env.example    — Secrets template
├── .env            — Actual secrets (gitignored)
├── package.json
├── README.md
└── lib/
    ├── config.js   — Config loading and chat resolution
    ├── gateway.js  — LiteLLM API client
    ├── lore.js     — LORE archive search
    └── tools.js    — CLI tool runners (wsl-audit, Ollama, etc.)
```
