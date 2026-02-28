# Rebranding Handoff — Capability Module Renames

**Date:** 2026-02-27
**From:** RTGF session
**For:** AI Stack session

This document provides the context needed to update the AI Stack codebase and documentation to match the capability module renames approved in the INTenX Brand Strategy.

---

## The Four Renames

| Old Name | New Name | Urgency | Reason |
|----------|----------|---------|--------|
| **SENTINEL** | **WARD** | 🔴 Critical | Microsoft Sentinel (registered), SentinelOne (NYSE-listed) — trademark conflict |
| **LORE** | **CHRONICLE** | 🔴 Critical | lore.com (funded, sovereign AI space), Lore AI (London) — trademark conflict |
| **CTX** | **SCOPE** | 🟡 Medium | CTX International, CTX Technology (multiple trademark holders) |
| **RELAY** | **BATON** | 🟡 Medium | relay.app (funded), Box Relay (Box Inc.) |

All four have been renamed everywhere in rtgf-core. The AI Stack needs the same treatment before any public-facing content or publication.

---

## Naming Principle (stated in brand strategy)

> INTenX capability module names are single words, drawn from operational English. Each name is a noun that can also be read as a verb. The name does one job: makes the module's function retrievable from memory.

WARD / CHRONICLE / SCOPE / BATON form a coherent family — same register, same length pattern, dual noun/verb readability.

---

## AI Stack Impact

The AI Stack implements the Context Governance Plane. The two critical renames both affect production components:

### CHRONICLE (was LORE)

The stack has a `lore/` directory. This is a production system (100+ sessions). The rename affects:
- Directory name: `lore/` → `chronicle/`
- Any references to LORE in compose files, scripts, READMEs
- The knowledge repo naming convention (e.g., `intenx-knowledge` is fine — those are project repos, not module names)
- Session export filenames or metadata that reference "LORE" as a system tag
- Any environment variables, config keys, or API paths using "LORE"

The rename is a documentation + config rename, not a data migration. Existing session archives don't need to be renamed — the archive is the archive. The system that manages it is now called CHRONICLE.

### WARD (was SENTINEL)

The stack has a `hooks/` directory implementing PreToolUse/PostToolUse enforcement. This is WARD. Rename affects:
- Any internal references to SENTINEL in hook scripts, config, or comments
- README references
- Compose service names if SENTINEL is used as a service identifier

### BATON (was RELAY)

The stack has a `relay/` directory (planned). Rename affects:
- Directory name: `relay/` → `baton/`
- Any references in compose files, READMEs, scripts

### SCOPE (was CTX)

CTX is referenced in config files and documentation for session/context management. Rename affects:
- Comments and documentation referring to "CTX module"
- Any config keys using CTX as a namespace prefix

---

## What Was Already Clean

These names had no conflicts and are unchanged:
- **BKF**, **PCM**, **RIS**, **RAV** — process governance plane modules
- **RTGF**, **AGaC** — framework and methodology names
- **SEAM** (was MESS) — separate rename tracked in business-ops; not in the stack

---

## rtgf-core Commit Reference

Commit `3d94d9a` — "refactor: rename capability modules per brand strategy"

All 12 affected markdown files in rtgf-core have been updated. Zero instances of old names remain. The rename is clean and verified.

---

## New Naming for Key Phrases

These description strings were also updated in rtgf-core and should be used consistently:

| Old | New |
|-----|-----|
| "Library Of Refined Evidence" (LORE backronym) | "Session Archive and Knowledge Curation" |
| "Runtime Context Management" (CTX expansion) | "Context Scope Management" |

WARD and BATON have no new expansions — they are operational English words, not acronyms. The name is the description.

---

*Source: ~/business-ops/strategy/BRAND-STRATEGY.md — INTenX Brand Strategy, 2026-02-27*
