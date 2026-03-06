# Network Topology

## Service Map

```mermaid
graph TB
    subgraph WIN["Windows Host"]
        OL["Ollama :11434\nAMD RX 7600S\nLocal GPU models"]
        WIN_APP["Windows Apps\nBrowser, Telegram Desktop"]
    end

    subgraph HUB["AI Hub WSL\n(gateway host)"]
        GW["LiteLLM Gateway\n:4000 (HTTP)"]
        LC["LibreChat\n:3080 (HTTP)"]
        PG["PostgreSQL\n:5432 (internal)"]
        GW --- PG
    end

    subgraph CW["Dev WSL\n(primary development)"]
        BOT["Telegram Bot\nnode bot.js\nsystemd user service"]
        CC["Claude Code\nclaude CLI"]
        WA["wsl-audit"]
    end

    subgraph SD["Client WSL\n(client isolation)"]
        CC2["Claude Code\n(client isolation)"]
    end

    subgraph CLOUD["Cloud"]
        ANT["Anthropic API\nclaude-sonnet-4-6"]
        OAI["OpenAI API\ngpt-4o etc."]
        TGA["Telegram API\napi.telegram.org"]
        GHB["GitHub\nKnowledge Repos"]
    end

    OL <-->|"host.docker.internal:11434"| GW
    BOT -->|"auto-discovered IP :4000"| GW
    CC -->|"GATEWAY_URL :4000"| GW
    CC2 -->|"hub-ip :4000"| GW
    LC -->|"internal"| GW

    GW -->|"API key"| ANT
    GW -->|"API key"| OAI
    BOT -->|"polling"| TGA

    CC -->|"rcm-import"| GHB
    CC2 -->|"rcm-import"| GHB

    style WIN fill:#1a237e,color:#fff
    style HUB fill:#4a148c,color:#fff
    style CW fill:#006064,color:#fff
    style SD fill:#1b5e20,color:#fff
    style CLOUD fill:#212121,color:#fff
```

## Port Reference

| Service | Host | Port | Protocol | Notes |
|---------|------|------|----------|-------|
| Ollama API | Windows | 11434 | HTTP | Accessible from all WSL via NAT bridge |
| LiteLLM Gateway | AI Hub WSL | 4000 | HTTP | OpenAI-compatible `/v1` endpoint |
| LiteLLM UI | AI Hub WSL | 4000 | HTTP | `/ui` dashboard |
| LibreChat | AI Hub WSL | 3080 | HTTP | Web UI |
| PostgreSQL | AI Hub WSL | 5432 | TCP | Internal, LiteLLM backend only |

## Gateway Discovery

WSL2 subnet IPs change on Windows reboot. The Telegram bot uses auto-discovery:

```mermaid
flowchart TD
    START["API call needed"]
    CHECK["Health check\nconfigured GATEWAY_URL\n(1.5s timeout)"]
    OK["Use configured URL"]
    SCAN["Scan WSL subnets\nfor :4000\n(ip route show)"]
    FOUND["Cache discovered IP\nreturn URL"]
    FAIL["Log error\nreturn original URL\nfor error messages"]

    START --> CHECK
    CHECK -->|"reachable"| OK
    CHECK -->|"unreachable"| SCAN
    SCAN -->|"found"| FOUND
    SCAN -->|"not found"| FAIL
```

## Client Isolation

Each client context has its own LiteLLM virtual key with independent budget:

```mermaid
graph LR
    subgraph Keys["Virtual Keys"]
        IK["intenx-key\n$200/month"]
        SK["sensit-key\n$50/month"]
        MK["makanui-key\n$50/month"]
        ADM["master-key\nno limit (admin)"]
    end

    subgraph Routing["Model Routing"]
        LG["local-general\n→ llama3.1:8b"]
        LC2["local-coding\n→ qwen2.5-coder:14b"]
        LR["local-reason\n→ deepseek-r1:14b"]
        LF["local-fast\n→ llama3.2:3b"]
    end

    IK --> LG
    IK --> LC2
    SK --> LG
    SK --> LC2
    ADM --> LR

    LG -->|"fallback if down"| CL["claude-haiku-4-5"]
    LC2 -->|"fallback if down"| CL2["claude-sonnet-4-6"]
```
