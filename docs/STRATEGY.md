# INTenX Business Strategy

**Date:** 2026-03-07
**Owner:** INTenX / Cole Basta

The rtgf-ai-stack platform powers four business lines. This document defines each line, how they relate, and how the platform enables them.

---

## Business Lines

### 1. INTenX Consulting

Engineering practice delivering AI-first solutions across client engagements. The platform provides the infrastructure: CHRONICLE captures institutional knowledge, WARD produces audit artifacts, LiteLLM attributes costs per client, and the Dispatcher executes work autonomously.

**Revenue:** T&M or fixed-fee engagements. AI cost attribution included as a deliverable — clients see exactly what AI resources their engagement consumed.

**Platform dependency:** All components. Consulting is the primary driver of platform requirements.

---

### 2. AI-Agentic Design Suite

Conversational design tools for electronics and mechanical engineering. Claude + KiCad for PCB/circuit design. Claude + OpenSCAD for fixture and enclosure design. The user describes intent; Claude writes the files; the user reviews in the native tool. Files are never touched manually.

This is proven in production. It is not a standalone application — it is a Skills pack and MCP server set that runs on the platform.

**Revenue:** Subscription per seat + consulting for complex projects.

**Platform dependency:** Skills library (EDA and MCAD workflow Skills), CHRONICLE (design history and design review patterns), Dispatcher (autonomous design iteration).

---

### 3. TFAAS — Test Fixtures as a Service

Custom test fixtures designed by AI and leased instead of sold. AI reduces fixture design labor cost 60–80%, making lease economics viable where outright sale was the only option.

**Business model:** Client describes test requirements → AI designs fixture (Claude + OpenSCAD) → fixture fabricated → leased for engagement duration → returned or purchased at close. Design files remain in client-namespaced CHRONICLE repo.

**Revenue:** Monthly lease per fixture + design service fee.

**Platform dependency:** AI-Agentic Design Suite (MCAD), CHRONICLE (fixture design history, `type: tfaas-fixture` sessions), LiteLLM (cost attribution per fixture project).

---

### 4. rtgf-ai-stack (Platform)

The infrastructure layer. Open-source core enables adoption and community. Commercial tiers provide managed hosting and enterprise support.

**Revenue:** Managed hosting ($500–2000/mo per client) + enterprise support tier + professional services for onboarding.

**Open-source strategy:** Core infrastructure (Skills framework, BATON protocol, CHRONICLE format) published under Apache 2. This drives adoption, produces contributors, and establishes INTenX as the reference implementation.

---

## How They Compound

Each client engagement produces:
- CHRONICLE sessions → institutional knowledge that accelerates future engagements
- WARD audit logs → compliance artifacts reusable as SOC 2 evidence templates
- Skills library entries → reusable workflow patterns
- Git artifacts → portfolio evidence

The platform compounds across all four lines. Knowledge from a consulting engagement improves the Design Suite Skills. A TFAAS fixture project populates CHRONICLE patterns that reduce the next fixture's design time. The open-source platform attracts clients who then need consulting.

---

## Scaling Path

See `docs/architecture/scaling-evolution.md` for the full 5-stage evolution model: Personal Stack → Reusable Framework → Consultant Engagement → Enterprise → Product.
