#!/bin/bash
# Resource Monitor - collects costs/usage into agent_resources table
set -e
set -a
source /root/agents/planner/.env
set +a
ADMIN_KEY=$(cat /root/agents/admin-key.txt | tr -d '[:space:]')
MONTH_START=$(date -u +%Y-%m-01T00:00:00Z)
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# 1. Anthropic cost, month to date (sum all pages)
TOTAL=0
PAGE=""
while true; do
  URL="https://api.anthropic.com/v1/organizations/cost_report?starting_at=$MONTH_START&ending_at=$NOW&bucket_width=1d"
  if [ -n "$PAGE" ]; then URL="$URL&page=$PAGE"; fi
  RESP=$(curl -s "$URL" -H "anthropic-version: 2023-06-01" -H "x-api-key: $ADMIN_KEY")
  SUM=$(echo "$RESP" | jq '[.data[].results[].amount | tonumber] | add // 0')
  TOTAL=$(echo "$TOTAL + $SUM" | bc)
  HAS_MORE=$(echo "$RESP" | jq -r '.has_more')
  if [ "$HAS_MORE" != "true" ]; then break; fi
  PAGE=$(echo "$RESP" | jq -r '.next_page')
done

curl -s -X POST "$SUPABASE_URL/rest/v1/agent_resources" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"resource\":\"anthropic_cost_mtd\",\"label\":\"Anthropic API spend (this month)\",\"amount\":$TOTAL,\"unit\":\"USD\"}" > /dev/null
echo "anthropic mtd: $TOTAL USD"

# 2. Supabase DB size
DB_BYTES=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/db_size_bytes" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -d '{}')
DB_MB=$(echo "scale=1; $DB_BYTES / 1048576" | bc)

curl -s -X POST "$SUPABASE_URL/rest/v1/agent_resources" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"resource\":\"supabase_db_size\",\"label\":\"Database size\",\"amount\":$DB_MB,\"unit\":\"MB\",\"limit_amount\":500}" > /dev/null
echo "db size: $DB_MB MB"
