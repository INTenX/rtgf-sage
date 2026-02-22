#!/usr/bin/env bash
# install-hooks.sh — Deploy SENTINEL hooks to ~/.claude/hooks/
# Part of rtgf-ai-stack Phase 2: Security Foundation
#
# What this does:
#   1. Creates ~/.claude/hooks/ and ~/.claude/audit/ with correct permissions
#   2. Copies pre-tool-use.sh and post-tool-use.sh from repo
#   3. Copies policy/blocked-patterns.json
#   4. Creates ~/.claude/hooks/sentinel.env from example (if not already present)
#   5. Registers PreToolUse + PostToolUse hooks in ~/.claude/settings.json
#
# Usage:
#   bash ~/rtgf-ai-stack/hooks/install-hooks.sh
#   bash ~/rtgf-ai-stack/hooks/install-hooks.sh --dry-run
#   bash ~/rtgf-ai-stack/hooks/install-hooks.sh --disable
#
# After install:
#   Fill in ~/.claude/hooks/sentinel.env with TELEGRAM_TOKEN + TELEGRAM_CHAT_ID
#   Start a Claude Code session — check ~/.claude/audit/YYYY-MM-DD.jsonl

set -uo pipefail

DRY_RUN=false
DISABLE=false

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        --disable)  DISABLE=true ;;
    esac
done

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_SRC="${REPO_DIR}/hooks"
HOOKS_DEST="${HOME}/.claude/hooks"
AUDIT_DIR="${HOME}/.claude/audit"
SETTINGS="${HOME}/.claude/settings.json"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "${GREEN}[ OK ]${RESET} $*"; }
warn() { echo -e "${YELLOW}[WARN]${RESET} $*"; }
info() { echo -e "  --  $*"; }
step() { echo -e "\n${BOLD}$*${RESET}"; }

echo ""
echo -e "${BOLD}SENTINEL Hook Installer — rtgf-ai-stack${RESET}"
echo "Source:  ${HOOKS_SRC}"
echo "Dest:    ${HOOKS_DEST}"
echo "Config:  ${SETTINGS}"
$DRY_RUN && echo -e "${YELLOW}DRY RUN — no changes will be made${RESET}"
$DISABLE && echo -e "${YELLOW}DISABLE mode — removing hook registrations${RESET}"

# ── Disable mode: remove hook registrations ───────────────────────────────────
if $DISABLE; then
    step "Removing SENTINEL hooks from settings.json"
    python3 - "$SETTINGS" <<'PYEOF'
import json, sys, os

settings_path = sys.argv[1]
if not os.path.exists(settings_path):
    print("  --  settings.json not found — nothing to remove")
    sys.exit(0)

with open(settings_path) as f:
    try:
        settings = json.load(f)
    except Exception as e:
        print(f"[WARN] Could not parse settings.json: {e}")
        sys.exit(1)

hooks = settings.get("hooks", {})
removed = 0
for event in ("PreToolUse", "PostToolUse"):
    if event in hooks:
        original = hooks[event]
        hooks[event] = [
            h for h in original
            if not any("sentinel" in str(hh.get("command", "")).lower()
                       or "pre-tool-use" in str(hh.get("command", ""))
                       or "post-tool-use" in str(hh.get("command", ""))
                       for hh in h.get("hooks", []))
        ]
        removed += len(original) - len(hooks[event])

settings["hooks"] = hooks
with open(settings_path, "w") as f:
    json.dump(settings, f, indent=2)
    f.write("\n")

print(f"[ OK ] Removed {removed} SENTINEL hook registration(s) from {settings_path}")
PYEOF
    echo ""
    echo "SENTINEL hooks disabled. Re-run without --disable to re-enable."
    exit 0
fi

# ── Create directories ────────────────────────────────────────────────────────
step "Creating directories"
for dir in "$HOOKS_DEST" "${HOOKS_DEST}/policy" "$AUDIT_DIR"; do
    if [[ ! -d "$dir" ]]; then
        $DRY_RUN && info "Would create: $dir" || mkdir -p "$dir"
        ok "Created: $dir"
    else
        ok "Exists:  $dir"
    fi
done

# ── Copy hook scripts ─────────────────────────────────────────────────────────
step "Installing hook scripts"
for script in pre-tool-use.sh post-tool-use.sh; do
    src="${HOOKS_SRC}/${script}"
    dst="${HOOKS_DEST}/${script}"
    if [[ ! -f "$src" ]]; then
        warn "Source not found: $src — skipping"
        continue
    fi
    if $DRY_RUN; then
        info "Would copy + chmod 755: $src → $dst"
    else
        cp "$src" "$dst"
        chmod 755 "$dst"
    fi
    ok "Installed: $dst"
done

# ── Copy policy ───────────────────────────────────────────────────────────────
step "Installing block policy"
policy_src="${HOOKS_SRC}/policy/blocked-patterns.json"
policy_dst="${HOOKS_DEST}/policy/blocked-patterns.json"
if [[ -f "$policy_src" ]]; then
    if $DRY_RUN; then
        info "Would copy: $policy_src → $policy_dst"
    else
        cp "$policy_src" "$policy_dst"
    fi
    ok "Installed: $policy_dst"
else
    warn "Policy file not found: $policy_src"
fi

# ── Create sentinel.env if not present ───────────────────────────────────────
step "Checking sentinel.env"
sentinel_env="${HOOKS_DEST}/sentinel.env"
example_env="${HOOKS_SRC}/sentinel.env.example"
if [[ ! -f "$sentinel_env" ]]; then
    if $DRY_RUN; then
        info "Would create from example: $sentinel_env"
    else
        if [[ -f "$example_env" ]]; then
            cp "$example_env" "$sentinel_env"
        else
            printf '# SENTINEL Hook Configuration\nTELEGRAM_TOKEN=\nTELEGRAM_CHAT_ID=\n' > "$sentinel_env"
        fi
        chmod 600 "$sentinel_env"
    fi
    ok "Created: $sentinel_env"
    info "ACTION REQUIRED: fill in TELEGRAM_TOKEN + TELEGRAM_CHAT_ID"
else
    ok "Exists:  $sentinel_env"
    # Check if values are filled in
    if grep -qE '^TELEGRAM_TOKEN=$' "$sentinel_env" 2>/dev/null; then
        warn "TELEGRAM_TOKEN not set in sentinel.env — blocks will be logged but not alerted"
    fi
fi

# ── Register hooks in settings.json ──────────────────────────────────────────
step "Registering hooks in settings.json"
python3 - "$HOOKS_DEST" "$SETTINGS" "$DRY_RUN" <<'PYEOF'
import json, sys, os

hooks_dest    = sys.argv[1]
settings_path = sys.argv[2]
dry_run       = sys.argv[3] == "True"

pre_hook  = os.path.join(hooks_dest, "pre-tool-use.sh")
post_hook = os.path.join(hooks_dest, "post-tool-use.sh")

new_hooks = {
    "PreToolUse": [
        {
            "matcher": ".*",
            "hooks": [{"type": "command", "command": pre_hook}]
        }
    ],
    "PostToolUse": [
        {
            "matcher": ".*",
            "hooks": [{"type": "command", "command": post_hook}]
        }
    ]
}

# Load existing settings
settings = {}
if os.path.exists(settings_path):
    try:
        with open(settings_path) as f:
            settings = json.load(f)
    except Exception as e:
        print(f"  [WARN] Could not parse existing settings.json: {e}")
        print(f"         Will create a new settings.json with hooks only")

existing_hooks = settings.get("hooks", {})

# Merge: keep non-SENTINEL hooks, replace/add SENTINEL hooks
for event in ("PreToolUse", "PostToolUse"):
    existing = existing_hooks.get(event, [])
    # Remove any existing SENTINEL hook entries to avoid duplicates
    filtered = [
        h for h in existing
        if not any(
            "pre-tool-use" in str(hh.get("command", "")) or
            "post-tool-use" in str(hh.get("command", ""))
            for hh in h.get("hooks", [])
        )
    ]
    existing_hooks[event] = filtered + new_hooks[event]

settings["hooks"] = existing_hooks

if dry_run:
    print(f"       Would write to: {settings_path}")
    print(json.dumps({"hooks": new_hooks}, indent=2))
else:
    with open(settings_path, "w") as f:
        json.dump(settings, f, indent=2)
        f.write("\n")
    print(f"[ OK ] Updated: {settings_path}")
PYEOF

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Installation complete.${RESET}"
echo ""
echo "Next steps:"
echo "  1. Fill in Telegram config: ${HOOKS_DEST}/sentinel.env"
echo "  2. Start a new Claude Code session (hooks activate on next session)"
echo "  3. Check audit log: ${AUDIT_DIR}/$(date -u '+%Y-%m-%d').jsonl"
echo "  4. Test a block: ask Claude to run 'cat /etc/passwd' — should be blocked"
echo ""
echo "To disable hooks: bash ${REPO_DIR}/hooks/install-hooks.sh --disable"
echo ""
