#!/usr/bin/env bash
# SENTINEL — PostToolUse Hook
# rtgf-ai-stack/hooks/post-tool-use.sh → deployed to ~/.claude/hooks/post-tool-use.sh
#
# Logs tool outcomes to the daily audit log.
# Observe-only — never blocks.
#
# Audit log: ~/.claude/audit/YYYY-MM-DD.jsonl
#
# Input (stdin): JSON with session_id, tool_name, tool_input, tool_output

set -uo pipefail

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUDIT_DIR="${HOME}/.claude/audit"
TODAY="$(date -u '+%Y-%m-%d')"
AUDIT_FILE="${AUDIT_DIR}/${TODAY}.jsonl"

mkdir -p "${AUDIT_DIR}"

TMPFILE="$(mktemp /tmp/sentinel-post-XXXXXX.json)"
trap 'rm -f "$TMPFILE"' EXIT
cat > "$TMPFILE"

python3 - "$TMPFILE" "$AUDIT_FILE" <<'PYEOF'
import json
import sys
import os
from datetime import datetime, timezone

tmpfile    = sys.argv[1]
audit_file = sys.argv[2]

try:
    with open(tmpfile) as f:
        data = json.load(f)
except Exception:
    sys.exit(0)

tool_name  = data.get("tool_name", "")
session_id = data.get("session_id", "")

# tool_output may be very large — preview first 500 chars
raw_output = data.get("tool_output", "")
if isinstance(raw_output, (dict, list)):
    raw_str = json.dumps(raw_output)
else:
    raw_str = str(raw_output)

output_len     = len(raw_str)
output_preview = raw_str[:500] + ("..." if output_len > 500 else "")

entry = {
    "ts":             datetime.now(timezone.utc).isoformat(),
    "event":          "post_tool_use",
    "session_id":     session_id[:16] if session_id else "",
    "tool":           tool_name,
    "output_preview": output_preview,
    "output_len":     output_len,
}

try:
    with open(audit_file, "a") as f:
        f.write(json.dumps(entry, separators=(",", ":")) + "\n")
except Exception:
    pass

sys.exit(0)
PYEOF
