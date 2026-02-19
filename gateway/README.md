# LiteLLM Gateway

Single proxy endpoint for all model calls in the INTenX AI stack.

## What This Does

- **Routes** all model calls — Ollama local + Anthropic + OpenAI — through one endpoint
- **Tracks spend** per client via virtual keys and Teams
- **Enforces budgets** — hard monthly limits per client before spend happens
- **Enables fallback** — local-first, falls back to cloud if Ollama unavailable
- **Stable aliases** — application code uses `local-coding`, not `qwen2.5-coder:14b`

## Quick Start

**1. Copy and fill in secrets:**
```bash
cp gateway/.env.example gateway/.env
# Edit gateway/.env — set LITELLM_MASTER_KEY, ANTHROPIC_API_KEY, etc.
```

**2. Start the gateway:**
```bash
docker compose -f compose/gateway.yml --env-file gateway/.env up -d
```

**3. Verify:**
```bash
curl http://localhost:4000/health
curl http://localhost:4000/v1/models
```

**4. Create a client key:**
```bash
# Create team + virtual key for a client (with $50/month budget)
./gateway/setup-client.sh sensit-dev 50

# Without budget limit
./gateway/setup-client.sh personal
```

## Using the Gateway

All clients use the OpenAI-compatible API at `http://localhost:4000/v1`.

```python
import openai

client = openai.OpenAI(
    api_key="sk-virt-...",           # Virtual key from setup-client.sh
    base_url="http://localhost:4000/v1"
)

# Local model (Ollama) — free, no cloud cost
response = client.chat.completions.create(
    model="local-coding",            # Routes to qwen2.5-coder:14b
    messages=[{"role": "user", "content": "Write a Python function"}]
)

# Cloud model — tracked spend
response = client.chat.completions.create(
    model="claude-sonnet-4-6",
    messages=[{"role": "user", "content": "Explain this code"}]
)
```

```bash
# Curl example
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer sk-virt-..." \
  -H "Content-Type: application/json" \
  -d '{"model": "local-fast", "messages": [{"role": "user", "content": "Hello"}]}'
```

## Available Models

### Local (Ollama — free)

| Alias | Underlying Model | Best For |
|-------|-----------------|----------|
| `local-coding` | qwen2.5-coder:14b | Coding — best quality |
| `local-coding-fast` | qwen2.5-coder:7b | Coding — fast |
| `local-general` | llama3.1:8b | General reasoning |
| `local-fast` | llama3.2:3b | Fast chat, simple tasks |
| `local-compact` | phi4-mini | Compact, capable |

Direct Ollama names also work: `qwen2.5-coder:14b`, `deepseek-coder-v2:lite`, `mistral:7b`, `gemma2:2b`.

### Cloud

| Model Name | Provider | Notes |
|-----------|----------|-------|
| `claude-sonnet-4-6` | Anthropic | Primary cloud model |
| `claude-opus-4-6` | Anthropic | Highest capability |
| `claude-haiku-4-5` | Anthropic | Fast, cheap |
| `gpt-4o` | OpenAI | If needed |
| `gpt-4o-mini` | OpenAI | Fast + cheap |

### Fallback Behavior

Local aliases fall back to cloud automatically if Ollama is unavailable:
- `local-coding` → `claude-sonnet-4-6`
- `local-general` → `claude-haiku-4-5`
- `local-fast` → `claude-haiku-4-5`

## Cost Attribution

### Per-Client Spend Tracking

```bash
# Check all team spend
curl http://localhost:4000/spend/teams \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"

# Check specific virtual key spend
curl "http://localhost:4000/spend/keys?key=sk-virt-..." \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"

# All spend logs
curl http://localhost:4000/spend/logs \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"
```

### Budget Enforcement

When a client's monthly budget is exhausted, LiteLLM returns HTTP 429 with a budget-exceeded error. No additional spend occurs.

```bash
# Update budget for a team
curl -X POST http://localhost:4000/team/update \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"team_id": "...", "max_budget": 100}'
```

## UI Dashboard

The built-in LiteLLM UI is available at `http://localhost:4000/ui`.

Login with your `LITELLM_MASTER_KEY`. Shows:
- Model usage and spend by team/key
- Request logs
- Model health status
- Virtual key management

## Attribution for Subscription Tools

Claude Code (Pro) and Codex CLI bypass the gateway. Attribution for these tools uses LORE session metadata:
- Working directory → client identification
- Session duration/count → capacity proxy for invoicing
- See: `lore/ctx/AGENTS.md` for session tagging patterns

When/if switching Claude Code to API billing, route through this gateway for full per-session token attribution (LiteLLM has a Claude Code integration guide).

## Operations

```bash
# View logs
docker compose -f compose/gateway.yml logs -f litellm

# Restart gateway (picks up config changes)
docker compose -f compose/gateway.yml restart litellm

# Stop all
docker compose -f compose/gateway.yml down

# Update LiteLLM image
docker compose -f compose/gateway.yml pull && docker compose -f compose/gateway.yml up -d
```

## Files

```
gateway/
├── config.yaml       — LiteLLM model routing and settings
├── .env.example      — Secrets template (copy to .env, don't commit)
├── .env              — Actual secrets (gitignored)
├── setup-client.sh   — Create per-client team + virtual key
├── client-keys/      — Generated client keys (gitignored)
└── README.md         — This file

compose/
└── gateway.yml       — Docker Compose: LiteLLM + PostgreSQL
```
