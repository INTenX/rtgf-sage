# Scenario Suite — End-to-End Integration
**Scope:** Full stack — all platform components in sequence
**Status:** Run last, after all individual component suites pass

---

## Context

End-to-end tests validate the full user-visible workflow: a request enters via Telegram, routes through LiteLLM Gateway, pulls context from CHRONICLE, passes WARD hooks, optionally triggers a BATON handoff, and returns a grounded response.

These tests will fail if any upstream component is broken — they are integration gates, not unit tests. Do not run until individual component suites pass.

---

## Scenario E1 — Telegram → Gateway → CHRONICLE → Reply
**Description:** User sends a question via Telegram; bot retrieves context from CHRONICLE, routes through LiteLLM, and returns a grounded answer.
**Input:** `/ask what is the current status of the LiteLLM gateway?`
**Pass Criteria:**
- Request flows through intent classifier → gateway → model
- CHRONICLE context injected into prompt (session reference visible)
- Response returns to Telegram within 20s
- Response is grounded in real CHRONICLE content, not hallucinated
- Spend recorded in PostgreSQL

---

## Scenario E2 — Telegram → /dispatch → AI Stack Session → Result
**Description:** User dispatches a task via Telegram; it executes in the AI Stack session and result returns to user.
**Input:** `/dispatch summarize the WARD audit log from the last 24 hours`
**Pass Criteria:**
- Task created and visible in AI Stack session
- AI Stack session executes task (reads WARD audit log)
- Result written back and forwarded to Telegram
- End-to-end latency <60s

---

## Scenario E3 — WARD Block Surfaced to User via Telegram
**Description:** A blocked tool call in any session results in a Telegram alert reaching the user.
**Input:** Trigger a WARD block event (e.g., credential file access attempt)
**Pass Criteria:**
- Block fires in the session
- Audit log entry written
- Telegram alert delivered within 30s
- Alert contains: session, blocked command, reason

---

## Scenario E4 — Budget Exhaustion Mid-Session
**Description:** A session exhausts its LiteLLM budget mid-task; user receives a clear error, not a silent failure.
**Input:** Set a low budget cap on the active session's virtual key; run a multi-request task
**Pass Criteria:**
- Pre-cap requests succeed normally
- Post-cap request is rejected with a clear error
- Error is surfaced to user (Telegram or session output) — not silently swallowed
- CHRONICLE session import continues to work (doesn't require gateway budget)

---

## Scenario E5 — Cross-WSL Message → Action → ACK
**Description:** Control Center sends a message to AI Stack Testing session; testing session acts on it; ACK returned.
**Input:** Control Center writes a test request to `ai-stack-testing` mailbox; testing session processes it and sends findings to `intenx-coordinator`
**Pass Criteria:**
- Message received and consumed by testing session
- ACK written back to Control Center
- Findings message delivered to `intenx-coordinator` mailbox
- Full cycle completes within 5 minutes

---

## Scenario E6 — Resilience: Gateway Down, Graceful Degradation
**Description:** LiteLLM Gateway becomes unavailable; stack degrades gracefully without cascading failure.
**Input:** Stop the gateway service; attempt a Telegram /ask command; restart gateway
**Pass Criteria:**
- /ask returns a clear error (not a timeout hang)
- WARD hooks still function during gateway outage
- CHRONICLE search still works (does not require gateway)
- After restart, /ask succeeds on next attempt

---

## Scenario E7 — Full Knowledge Cycle (Import → Search → Promote → Cite)
**Description:** A new session is imported, searched, promoted to codified, and cited in a response.
**Input:**
1. Import a session with known content
2. Query ctx-search for that content
3. Promote session to codified state
4. Send a Telegram /ask that should surface this session
**Pass Criteria:**
- Session found via ctx-search after import
- Promotion succeeds (flow_state and tags updated — regression from 2026-03-14 bug)
- Telegram /ask response cites the session (not a different one)
- Full cycle <5 minutes

---

## Execution Order

Run end-to-end scenarios only after:
- [ ] WARD: all scenarios PASS
- [ ] Messaging: all scenarios PASS
- [ ] LiteLLM Gateway: all scenarios PASS
- [ ] CHRONICLE: all scenarios PASS (including flow promotion regression)
- [ ] Telegram: all scenarios PASS

---

## Status

| Scenario | Status | Gate |
|----------|--------|------|
| E1 — Telegram → Gateway → CHRONICLE → Reply | Pending | All components pass |
| E2 — Telegram → Dispatch → Result | Pending | Telegram + messaging pass |
| E3 — WARD Block → Telegram Alert | Pending | WARD + Telegram pass |
| E4 — Budget exhaustion surfaced | Pending | Gateway + Telegram pass |
| E5 — Cross-WSL message → action → ACK | Pending | Messaging pass |
| E6 — Gateway down, graceful degradation | Pending | All components pass |
| E7 — Full knowledge cycle | Pending | CHRONICLE regression fix + all pass |
