# Scenario Suite — Telegram Interface
**Component:** Telegram Interface (`interface/`, systemd service on Ubuntu-AI-Hub)
**Status:** Production — live on Ubuntu-AI-Hub

---

## Context

The Telegram bot is the primary human interface to the AI Stack. It routes commands to the appropriate backend component (CHRONICLE for context, LiteLLM Gateway for model calls, BATON for task handoff) and surfaces responses with minimal friction.

Real-world use cases this maps to:
- Human-in-the-loop control plane (approve, query, dispatch tasks)
- Session visibility (what is the stack doing right now?)
- Cost and usage transparency (/wsl, /audit)
- Multi-agent task delegation via chat interface

---

## Scenario 1 — /ask Returns Response with CHRONICLE Context
**Description:** `/ask` command retrieves relevant context from CHRONICLE and returns a grounded response.
**Input:** `/ask what has been discussed about LiteLLM configuration?`
**Pass Criteria:**
- Response references a real session from CHRONICLE (not hallucinated)
- Response includes session reference or date
- Latency <15s end-to-end
- No "I don't know" when relevant sessions exist

---

## Scenario 2 — /wsl Returns Live WSL Status
**Description:** `/wsl` command surfaces real-time WSL instance status.
**Input:** `/wsl`
**Pass Criteria:**
- Response lists active WSL instances visible to the bot
- Output is human-readable (not raw JSON)
- Reflects actual running state (not stale cache)

---

## Scenario 3 — /audit Returns Recent WARD Activity
**Description:** `/audit` command surfaces recent WARD audit log entries.
**Input:** `/audit`
**Pass Criteria:**
- Returns recent audit entries (last N events)
- Includes timestamp, tool, decision for each entry
- Empty log handled gracefully ("no recent events")

---

## Scenario 4 — /dispatch Creates and Completes a Task
**Description:** `/dispatch` creates a task visible to the AI Stack session.
**Input:** `/dispatch research LanceDB semantic search options`
**Pass Criteria:**
- Task created in AI Stack session task queue
- Bot replies with task ID and confirmation
- Task status visible via subsequent status check
- Task can be completed and result returned to Telegram

---

## Scenario 5 — /baton Drop/List/Show Cycle
**Description:** Full BATON cycle through Telegram interface.
**Input:** `/baton drop "review CHRONICLE scenarios"` → `/baton list` → `/baton show <id>`
**Pass Criteria:**
- Drop creates a baton file in the shared path
- List shows the baton with correct metadata
- Show returns full baton content
- All three commands respond within 10s

---

## Scenario 6 — Bot Unreachable — WARD Still Logs
**Description:** If the Telegram bot is down, WARD hooks continue to function locally.
**Input:** Stop the Telegram service; trigger a WARD block event; restart service
**Pass Criteria:**
- WARD block fires correctly even without Telegram
- Audit log entry written during outage
- No crash or exception in WARD hook due to Telegram unavailability
- After restart, subsequent alerts fire normally

---

## Scenario 7 — Intent Classification Routes Correctly
**Description:** The intent classifier in the bot routes messages to the correct model/handler.
**Input:** Send three messages: a simple factual question, a complex reasoning task, a code review
**Pass Criteria:**
- Simple question routes to a small/fast model
- Reasoning task routes to a larger model
- Code review routes to a coding-optimized model
- Model selection is logged or visible in response metadata

---

## Status

| Scenario | Status | Report |
|----------|--------|--------|
| 1 — /ask with CHRONICLE context | Pending | — |
| 2 — /wsl live status | Pending | — |
| 3 — /audit WARD activity | Pending | — |
| 4 — /dispatch task creation | Pending | — |
| 5 — /baton cycle | Pending | — |
| 6 — Bot down, WARD intact | Pending | — |
| 7 — Intent classifier routing | Pending | — |
