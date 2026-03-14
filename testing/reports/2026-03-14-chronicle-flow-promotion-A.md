# Skill Test Report — CHRONICLE Knowledge Flow Promotion — Scenario A
**Date:** 2026-03-14
**Component:** CHRONICLE (rcm-flow.js)
**Scenario:** Promote session from hypothesis → codified with tags
**Result:** FAIL

## Issues

1. **flow_state not updated in YAML frontmatter** — file is moved to `rcm/flows/codified/` via `git mv` (correct), but the `flow_state:` field in the markdown frontmatter still reads `hypothesis`. Any tooling or search that reads the frontmatter field directly (e.g. ctx-search, MCP server) will see an incorrect state.

2. **Tags not written** — `--tags "testing,platform,ai-stack"` was passed to `rcm-flow.js promote` but frontmatter shows `tags: []`. Tags are silently discarded.

## Reproduction

```bash
node ~/rtgf-ai-stack/chronicle/tools/cli/rcm-flow.js promote \
  --session 0eb4b812 \
  --to codified \
  --tags "testing,platform,ai-stack" \
  --target /home/cbasta/intenx-knowledge/
# Output claims success, but:
grep -E "flow_state|tags" /home/cbasta/intenx-knowledge/rcm/flows/codified/2026-03-14_ai-stack-testing_0eb4b812.md
# flow_state: hypothesis  ← wrong
# tags: []                ← wrong
```

## What Passed

- `git mv` was used correctly (confirmed via `git show --stat`)
- Git commit created with correct message format
- File moved to correct directory

## Recommendation

Fix required — two bugs in rcm-flow.js: (1) YAML frontmatter update for flow_state not executing, (2) tags argument not being written to frontmatter.
