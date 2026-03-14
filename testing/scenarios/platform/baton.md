# Scenario Suite — BATON (Task Handoff)
**Component:** BATON (`baton/` — planned)
**Status:** Planned — not yet built. Scenarios defined for when it comes online.

---

## Context

BATON is the inter-session task handoff protocol. It allows one session to drop a unit of work that another session can claim and complete. It is the foundation for task delegation across WSL instances and session types.

Real-world use cases this maps to:
- Hierarchical agent delegation (orchestrator drops work, worker claims it)
- Human-initiated task dispatch (user drops a baton via Telegram)
- Cross-WSL work routing (INTenXDev drops, SensitDev claims)
- Task visibility and status tracking (who owns what, current state)

---

## Scenario 1 — Drop → Claim → Complete Cycle
**Description:** Full lifecycle of a baton from creation to completion.
**Input:** Session A drops baton "research LanceDB options"; Session B claims it; Session B completes it with a result
**Pass Criteria:**
- Drop creates baton file with unique ID, description, metadata
- Claim marks baton as in-progress, assigns to Session B
- Complete marks baton done, attaches result
- State transitions are atomic (no half-written state)

---

## Scenario 2 — Unclaimed Baton Visible to All Sessions
**Description:** A dropped baton is discoverable by any session before it's claimed.
**Input:** Session A drops a baton; Session B and C both check the queue
**Pass Criteria:**
- Both sessions see the baton in list
- Baton shows status=unclaimed, creator, description
- First claim wins; subsequent claim attempt returns "already claimed"

---

## Scenario 3 — Cross-WSL Baton Visibility
**Description:** A baton dropped from INTenXDev is visible from SensitDev (and vice versa).
**Input:** Drop baton from INTenXDev; read list from SensitDev
**Pass Criteria:**
- Baton file visible from both WSL instances (shared Windows path)
- Metadata intact across filesystem boundary (no encoding issues)
- Claim from SensitDev correctly marks ownership

---

## Scenario 4 — Telegram /baton Commands Surface Correct State
**Description:** Telegram interface accurately reflects baton state at each lifecycle stage.
**Input:** Drop baton → `/baton list` → claim → `/baton list` → complete → `/baton show <id>`
**Pass Criteria:**
- `/baton list` reflects current state at each stage (not stale)
- `/baton show` displays full baton including result after completion
- No stale entries remain after completion (or are marked complete, not dropped)

---

## Scenario 5 — Abandoned Baton Recovery
**Description:** A claimed baton whose session disappears can be reclaimed.
**Input:** Session B claims a baton; Session B terminates without completing; Session C attempts to claim
**Pass Criteria:**
- After timeout, baton returns to claimable state (or is flagged as abandoned)
- Session C can claim and complete it
- Final result attributed correctly

---

## Scenario 6 — Baton Payload Integrity
**Description:** Large or structured baton payloads are stored and retrieved intact.
**Input:** Drop a baton with a multi-paragraph description and structured metadata; claim and complete it
**Pass Criteria:**
- All payload content preserved (no truncation)
- Structured fields (tags, context, links) round-trip correctly
- Result payload stored without corruption

---

## Status

| Scenario | Status | Report |
|----------|--------|--------|
| 1 — Drop/Claim/Complete cycle | Not ready — BATON not built | — |
| 2 — Unclaimed visibility | Not ready | — |
| 3 — Cross-WSL visibility | Not ready | — |
| 4 — Telegram /baton state | Not ready | — |
| 5 — Abandoned baton recovery | Not ready | — |
| 6 — Payload integrity | Not ready | — |

**Gate:** Begin testing when BATON module is implemented and `baton/` directory is populated.
