#!/usr/bin/env bash
# setup-client.sh — Create a LiteLLM team + virtual key for a client
#
# Usage:
#   ./gateway/setup-client.sh <client-name> [monthly-budget-usd]
#
# Examples:
#   ./gateway/setup-client.sh sensit-dev 50
#   ./gateway/setup-client.sh personal
#   ./gateway/setup-client.sh client-acme 200
#
# Prerequisites:
#   - LiteLLM gateway running: docker compose -f compose/gateway.yml up -d
#   - LITELLM_MASTER_KEY set in environment (or source gateway/.env)
#
# Output:
#   Team ID and virtual key for the client.
#   Add the virtual key to LORE session metadata for cost attribution.
#   Route all programmatic API calls through the gateway using the virtual key.

set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://localhost:4000}"
MASTER_KEY="${LITELLM_MASTER_KEY:-}"

if [[ -z "$MASTER_KEY" ]]; then
    # Try to load from .env
    ENV_FILE="$(dirname "$0")/.env"
    if [[ -f "$ENV_FILE" ]]; then
        MASTER_KEY=$(grep "^LITELLM_MASTER_KEY=" "$ENV_FILE" | cut -d= -f2- | tr -d '"')
    fi
fi

if [[ -z "$MASTER_KEY" ]]; then
    echo "Error: LITELLM_MASTER_KEY not set" >&2
    echo "  Set it: export LITELLM_MASTER_KEY=your-master-key" >&2
    echo "  Or:     source gateway/.env" >&2
    exit 1
fi

CLIENT_NAME="${1:-}"
MONTHLY_BUDGET="${2:-}"

if [[ -z "$CLIENT_NAME" ]]; then
    echo "Usage: $0 <client-name> [monthly-budget-usd]" >&2
    exit 1
fi

# Sanitize client name for team alias
TEAM_ALIAS="intx-${CLIENT_NAME,,}"
TEAM_ALIAS="${TEAM_ALIAS//[^a-z0-9-]/-}"

echo "Creating LiteLLM team for: $CLIENT_NAME"
echo "  Gateway:      $GATEWAY_URL"
echo "  Team alias:   $TEAM_ALIAS"
if [[ -n "$MONTHLY_BUDGET" ]]; then
    echo "  Monthly budget: \$${MONTHLY_BUDGET} USD"
fi
echo ""

# ─── Create Team ──────────────────────────────────────────────────────────────

TEAM_PAYLOAD="{\"team_alias\": \"$TEAM_ALIAS\", \"metadata\": {\"client\": \"$CLIENT_NAME\", \"created_by\": \"setup-client.sh\"}}"

if [[ -n "$MONTHLY_BUDGET" ]]; then
    TEAM_PAYLOAD="{\"team_alias\": \"$TEAM_ALIAS\", \"max_budget\": $MONTHLY_BUDGET, \"budget_duration\": \"1mo\", \"metadata\": {\"client\": \"$CLIENT_NAME\", \"monthly_budget_usd\": $MONTHLY_BUDGET, \"created_by\": \"setup-client.sh\"}}"
fi

echo "Step 1: Creating team..."
TEAM_RESPONSE=$(curl -s -X POST \
    "$GATEWAY_URL/team/new" \
    -H "Authorization: Bearer $MASTER_KEY" \
    -H "Content-Type: application/json" \
    -d "$TEAM_PAYLOAD")

# Extract team ID from response
TEAM_ID=$(echo "$TEAM_RESPONSE" | grep -o '"team_id":"[^"]*"' | cut -d'"' -f4)

if [[ -z "$TEAM_ID" ]]; then
    echo "Error: Failed to create team" >&2
    echo "Response: $TEAM_RESPONSE" >&2
    exit 1
fi

echo "  Team created: $TEAM_ID"

# ─── Create Virtual Key ───────────────────────────────────────────────────────

echo "Step 2: Creating virtual key..."
KEY_PAYLOAD="{\"team_id\": \"$TEAM_ID\", \"key_alias\": \"${TEAM_ALIAS}-key\", \"metadata\": {\"client\": \"$CLIENT_NAME\"}}"

KEY_RESPONSE=$(curl -s -X POST \
    "$GATEWAY_URL/key/generate" \
    -H "Authorization: Bearer $MASTER_KEY" \
    -H "Content-Type: application/json" \
    -d "$KEY_PAYLOAD")

VIRTUAL_KEY=$(echo "$KEY_RESPONSE" | grep -o '"key":"[^"]*"' | cut -d'"' -f4)

if [[ -z "$VIRTUAL_KEY" ]]; then
    echo "Error: Failed to create virtual key" >&2
    echo "Response: $KEY_RESPONSE" >&2
    exit 1
fi

# ─── Output ───────────────────────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Client setup complete: $CLIENT_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Team ID:      $TEAM_ID"
echo "  Virtual Key:  $VIRTUAL_KEY"
if [[ -n "$MONTHLY_BUDGET" ]]; then
    echo "  Budget:       \$${MONTHLY_BUDGET}/month (hard limit)"
fi
echo ""
echo "Usage:"
echo "  # Use this key in any OpenAI-compatible client:"
echo "  export ANTHROPIC_API_KEY='$VIRTUAL_KEY'  # for LiteLLM proxy"
echo "  export OPENAI_API_KEY='$VIRTUAL_KEY'     # for LiteLLM proxy"
echo "  export OPENAI_BASE_URL='$GATEWAY_URL/v1'"
echo ""
echo "  # Check spend:"
echo "  curl $GATEWAY_URL/spend/keys/$VIRTUAL_KEY -H 'Authorization: Bearer \$LITELLM_MASTER_KEY'"
echo ""
echo "  # Check team spend:"
echo "  curl $GATEWAY_URL/spend/teams -H 'Authorization: Bearer \$LITELLM_MASTER_KEY'"
echo ""

# Optional: save key to a local file for reference
KEYS_DIR="$(dirname "$0")/client-keys"
mkdir -p "$KEYS_DIR"
KEY_FILE="$KEYS_DIR/${CLIENT_NAME}.env"
cat > "$KEY_FILE" <<EOF
# LiteLLM virtual key for: $CLIENT_NAME
# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
# DO NOT COMMIT — add client-keys/ to .gitignore

CLIENT_NAME=$CLIENT_NAME
TEAM_ID=$TEAM_ID
LITELLM_VIRTUAL_KEY=$VIRTUAL_KEY
GATEWAY_URL=$GATEWAY_URL
EOF

echo "  Key saved to: $KEY_FILE (not committed)"
echo ""
echo "LORE session tagging:"
echo "  Add client=$CLIENT_NAME to session metadata for attribution"
