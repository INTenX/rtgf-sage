# Architecture Overview

The RTGF AI Stack is a layered infrastructure for AI-first consulting operations across multiple WSL environments, clients, and model backends.

## High-Level Architecture

```mermaid
graph LR
    subgraph WSL_Instances["WSL Instances"]
        direction TB
        CW["INTenXDev (ColeWork)\nPrimary dev + Claude Code"]
        HUB["Ubuntu-AI-Hub\nGateway + LibreChat"]
        SD["SensitDev\nClient isolation"]
    end

    subgraph Windows["Windows Host"]
        OL["Ollama\nAMD RX 7600S GPU\n8 models"]
        TG["Telegram\nMobile interface"]
    end

    subgraph Cloud["Cloud APIs"]
        AN["Anthropic\nClaude Sonnet/Haiku"]
        OA["OpenAI\nGPT-4o etc."]
    end

    subgraph Knowledge["Knowledge Layer"]
        GH["GitHub\nKnowledge Repos\n(1 per client)"]
        IDX["ctx-search\nIn-memory index"]
    end

    CW -->|"LiteLLM virtual key"| HUB
    SD -->|"LiteLLM virtual key"| HUB
    TG -->|"Telegram API"| HUB

    HUB -->|"host.docker.internal"| OL
    HUB -->|"API key"| AN
    HUB -->|"API key"| OA

    CW -->|"rcm-import"| GH
    GH -->|"git pull"| IDX
    IDX -->|"context injection"| HUB
```

## Layer Definitions

### Layer 1 — Model Backends
Raw compute: Ollama (local GPU), Anthropic, OpenAI. No application code talks directly to these.

### Layer 2 — Gateway (LiteLLM)
Single OpenAI-compatible endpoint at `:4000`. Handles:

- Virtual key authentication (per client/team)
- Budget enforcement (monthly spend limits)
- Model routing by alias (`local-general` → `llama3.1:8b`)
- Cloud fallback when Ollama unavailable

### Layer 3 — Interface Layer
Multiple clients, all routing through the gateway:

- **Claude Code** — primary development agent
- **Telegram Bot** — mobile/async interface with conversation history
- **LibreChat** — web UI for Ollama (kept, decoupled from RAG)

### Layer 4 — Knowledge Layer
Session archival and retrieval:

- **CHRONICLE** — imports Claude Code sessions to GitHub knowledge repos (YAML canonical format)
- **ctx-search** — searches knowledge repos, injects relevant context into LLM calls
- **Knowledge repos** — one per client, hosted on GitHub INTenX org

### Layer 5 — Security (WARD)
Every Claude Code tool call passes through hooks:

- Pre-tool-use: check against block policies, log intent
- Post-tool-use: log outcome, send Telegram alerts for CRIT events

## WSL Network Topology

```mermaid
graph TD
    WIN["Windows Host\nOllama :11434"]
    HUB["Ubuntu-AI-Hub\n172.27.x.x\nLiteLLM :4000\nLibreChat :3080"]
    CW["INTenXDev (ColeWork)\n172.27.x.x"]
    SD["SensitDev\n172.27.x.x"]

    WIN <-->|"WSL NAT bridge\nhost.docker.internal"| HUB
    WIN <-->|"WSL NAT bridge"| CW
    WIN <-->|"WSL NAT bridge"| SD

    CW -->|"HTTP :4000"| HUB
    SD -->|"HTTP :4000"| HUB

    style WIN fill:#1a237e,color:#fff
    style HUB fill:#4a148c,color:#fff
    style CW fill:#006064,color:#fff
    style SD fill:#1b5e20,color:#fff
```

!!! note "WSL2 IP Instability"
    WSL2 subnet IPs change on Windows reboot. The Telegram bot has self-healing gateway discovery — it scans WSL subnets for port 4000 if the configured IP is unreachable.
