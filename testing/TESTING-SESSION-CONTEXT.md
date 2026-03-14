# AI Stack — Scenario Testing Context
**Last Updated:** 2026-03-14
**Updated By:** INTenX Control Center

---

## What's Being Tested

**Scope: AI Stack platform components and platform-operational skills only.**

EDA, MCAD, and consulting skills are out of scope for this session — they belong to a separate practice skills effort (not yet active). Do not test them here.

Two tracks in scope:
1. **Platform skills** — operational skills for running the AI Stack (`skills/platform/`). Must produce correct, actionable output.
2. **Platform components** — WARD, CHRONICLE, LiteLLM Gateway, Telegram interface, Inter-Session Messaging, BATON. Must function correctly in isolation and in combination.

---

## In-Scope Skill Inventory

### Platform Skills (in scope)
| Skill | File | Status |
|-------|------|--------|
| Chronicle Import | `skills/platform/chronicle-import.md` | Needs testing |
| LiteLLM Key Setup | `skills/platform/litellm-key-setup.md` | Needs testing |
| WARD Audit Review | `skills/platform/ward-audit-review.md` | Needs testing |

### Deferred (out of scope — not yet ready)
| Domain | Skills |
|--------|--------|
| EDA | circuit-review, bom-spec, dfm-checklist |
| MCAD | fixture-design-workflow, tolerance-spec |
| Consulting | client-onboarding, engagement-closure |

---

## Platform Component Scenario Plan

### Priority Order (platform components)

| Priority | Component | Rationale |
|----------|-----------|-----------|
| 1 | **WARD** | Security first — misconfigured hook is a live risk |
| 2 | **Inter-Session Messaging** | Foundational — everything else depends on it |
| 3 | **LiteLLM Gateway** | Revenue path — budget enforcement is a trust issue |
| 4 | **CHRONICLE** | Knowledge continuity — high value, not live-risk if degraded |
| 5 | **Telegram Interface** | Operational convenience |
| 6 | **BATON** | Task handoff — works manually if needed |
| 7 | **Skills Library** | Covered in skill scenario plan below |
| 8 | **End-to-End** | Run last, after all components pass individually |

### WARD (Security Hooks)
- Blocked command triggers correctly and fires Telegram alert
- Allowed command passes without prompt
- Audit log entry written with correct fields
- Block on path pattern (credential file access)
- Policy update deploys correctly via install-hooks.sh

### CHRONICLE (Session Archival)
- Session imports cleanly with correct frontmatter
- Orphan detection finds unimported sessions
- Knowledge flow promotion (hypothesis → codified → validated → promoted)
- ctx-search returns relevant sessions for a known query
- MCP server: search_sessions, get_session, get_patterns, add_session_note all return correct results

### LiteLLM Gateway
- Request routes through gateway with correct virtual key
- Spend is recorded in PostgreSQL
- Budget cap enforced (request rejected when over budget)
- Ollama fallback routes correctly
- /wsl and /audit Telegram commands return live data

### Telegram Interface
- /ask returns a response using CHRONICLE context
- /dispatch creates and completes a task via Dispatcher
- /baton drop/list/show cycle works end-to-end
- /relay delivers a message to a named session and returns response

### Inter-Session Messaging
- Message delivered to session mailbox within 1 minute
- ACK written back to sender after consumption
- check-mailbox silent when empty
- Failure/retry scenario (recipient unavailable)
- Archive integrity — no clobbering when two sessions write simultaneously

### BATON Task Handoff
- Drop → claim → complete cycle
- Telegram /baton commands surface correct state
- Cross-WSL baton visible from both instances

### Cross-WSL Scenarios
- SensitDev heartbeat visible from INTenXDev (shared Windows path)
- Message delivered INTenXDev → SensitDev and back
- BATON cross-WSL visibility confirmed

### Error Recovery / Resilience
- MQTT broker down — stack degrades gracefully
- Telegram bot unreachable — WARD still logs locally
- LiteLLM gateway down — fallback path works
- Malformed message in mailbox — check-mailbox handles without crash

### End-to-End: Telegram → Dispatcher → CHRONICLE → Reply
- User sends /dispatch task via Telegram
- Dispatcher pulls CHRONICLE context, executes task
- Result archived back to CHRONICLE
- Telegram reply includes summary and git artifact link

---

## Platform Skill Scenario Plan

**Chronicle Import**
- Scenario A: Import a well-formed session — correct frontmatter, appears in search
- Scenario B: Import a session with missing fields — graceful handling, no silent failures
- Pass criteria: Produces valid import commands, handles edge cases without crashing

**LiteLLM Key Setup**
- Scenario A: New virtual key for a session — correct config generated
- Scenario B: Key with budget cap — budget enforcement config correct
- Pass criteria: Produces valid LiteLLM config, correct syntax, no missing fields

**WARD Audit Review**
- Scenario A: Review an audit log with a blocked command entry
- Scenario B: Review a clean audit log — no false alarms
- Pass criteria: Correctly identifies blocked events, produces actionable summary

---

## Test Execution Process

For each scenario:
1. Read the skill file to understand its intended behavior
2. Construct a realistic sample input matching the scenario
3. Invoke the skill (or simulate invocation by applying its prompt to sample input)
4. Evaluate output against pass criteria
5. Document in `reports/YYYY-MM-DD-{skill}-{scenario}.md`
6. If fail: send bug report to AI Stack session mailbox

---

## Reporting Format

Each report in `reports/`:
```markdown
# Skill Test Report — {Skill Name} — Scenario {X}
**Date:** YYYY-MM-DD
**Skill:** skills/{domain}/{skill}.md
**Scenario:** [description]
**Result:** PASS / FAIL
**Issues:** [list any issues found]
**Sample Input:** [what was used]
**Output Summary:** [what was produced]
**Recommendation:** [approve / fix required / needs Cole review]
```

---

## Deployment Gate

Before any platform component or platform skill is marked production-ready:
- All scenarios for that component: PASS
- No functional regressions introduced by recent AI Stack changes
- Platform skills: output is correct and actionable

Message Control Center at `/mnt/c/temp/messages/INTenXDev/intenx-coordinator/` with:
- Per-component pass/fail summary
- Any failures with reproduction steps
- Explicit "APPROVED FOR PRODUCTION" or "NOT READY — see findings"

---

## References

- Skills directory: `~/rtgf-ai-stack/skills/`
- AI Stack context: `~/rtgf-ai-stack/STACK-SESSION-CONTEXT.md`
- AI Stack session mailbox: `/mnt/c/temp/messages/INTenXDev/ai-stack/`
- Control Center: INTenXDev WSL
