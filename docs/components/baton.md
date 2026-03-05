# BATON — Inter-Session Coordination

**Status:** ⬜ Planned
**Location:** `baton/` (scaffolded)

BATON enables AI agents and sessions to hand off context, tasks, and results to each other — across WSL instances, platforms, and time boundaries.

## Concept

```mermaid
flowchart LR
    subgraph Session_A["Session A (INTenXDev)"]
        A_AGENT["Claude Code\nAgent A"]
        A_OUT["Task result\n+ context summary"]
    end

    subgraph BATON_LAYER["BATON Layer"]
        DISPATCH["Dispatcher\nTask router"]
        ENVELOPE["Handoff Envelope\nstructured JSON"]
        QUEUE["Task Queue\n(Redis / file)"]
    end

    subgraph Session_B["Session B (SensitDev)"]
        B_AGENT["Claude Code\nAgent B"]
        B_IN["Resume context\n+ task assignment"]
    end

    A_AGENT -->|"complete handoff"| A_OUT
    A_OUT --> ENVELOPE
    ENVELOPE --> QUEUE
    QUEUE --> DISPATCH
    DISPATCH --> B_IN
    B_IN --> B_AGENT

    style BATON_LAYER fill:#4a148c,color:#fff
```

## Handoff Envelope Format (Draft)

```json
{
  "baton_version": "1.0",
  "id": "uuid",
  "created_at": "2026-03-05T14:22:01Z",
  "from": {
    "session_id": "abc123",
    "wsl_instance": "INTenXDev",
    "agent": "claude-code"
  },
  "to": {
    "wsl_instance": "SensitDev",
    "agent": "claude-code",
    "routing_hint": "sensit-client-work"
  },
  "task": {
    "type": "implement",
    "title": "Add user auth to Sensit API",
    "description": "...",
    "priority": "high"
  },
  "context": {
    "chronicle_sessions": ["session-id-1", "session-id-2"],
    "working_summary": "...",
    "open_questions": []
  }
}
```

## Planned Architecture

```mermaid
graph TB
    subgraph Dispatcher["Dispatcher (Claude API)"]
        RECV["Receive handoff"]
        ROUTE["Route to target agent"]
        TRACK["Track task status"]
    end

    subgraph Memory["Mem0 (planned)"]
        WM["Working memory\nper-agent state"]
        EM["Episodic memory\nhandoff history"]
    end

    subgraph Transport["Transport"]
        FILE["Shared file\n/mnt/c/Temp/wsl-shared/"]
        REDIS["Redis queue\n(future)"]
    end

    RECV --> Memory
    RECV --> ROUTE
    ROUTE --> Transport
    Transport --> WM
```

## Integration Points

| Component | BATON Integration |
|-----------|------------------|
| CHRONICLE | Handoffs reference session IDs for context |
| LiteLLM Gateway | Dispatcher routes tasks via API calls |
| Telegram | Admin can trigger/monitor handoffs via bot |
| Mem0 | Replace flat `.chat-history.json` with graph memory |

## Phase 4–5 Roadmap

- **Phase 4:** Design task delegation protocol, build Dispatcher component
- **Phase 5:** BATON transport layer, Mem0 integration, cross-WSL routing
