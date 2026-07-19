#!/bin/bash
source ~/agents/security/.env
export GIT_TERMINAL_PROMPT=0

LEVEL="${1:-simple}"
REPORT=""
TARGETS=("https://mulak.app" "https://crm.mulak.app")

for T in "${TARGETS[@]}"; do
  HOST=$(echo "$T" | sed 's|https://||')
  SSL=$(timeout 60 testssl --quiet --color 0 --severity HIGH "$HOST" 2>/dev/null | grep -iE "vulnerable" | head -5)
  [ -z "$SSL" ] && SSL="no high-severity SSL issues"
  REPORT="${REPORT}
SSL ${HOST}: ${SSL}"
done

for REPO in mulak-app mulak-crm; do
  URL="https://x-access-token:${GITHUB_TOKEN}@github.com/Ganaken/${REPO}.git"
  rm -rf /tmp/sec-${REPO}
  timeout 60 git clone --depth 1 "$URL" /tmp/sec-${REPO} > /dev/null 2>&1
  LEAKS=$(gitleaks detect --source /tmp/sec-${REPO} --no-banner 2>/dev/null | grep -i "leaks found" || echo "no secrets found")
  REPORT="${REPORT}
Secrets ${REPO}: ${LEAKS}"
  rm -rf /tmp/sec-${REPO}
done

if [ "$LEVEL" = "medium" ] || [ "$LEVEL" = "full" ]; then
  for T in "${TARGETS[@]}"; do
    NIK=$(timeout 130 nikto -h "$T" -maxtime 120s 2>/dev/null | grep -iE "OSVDB|header|not present" | head -5)
    [ -z "$NIK" ] && NIK="no notable findings"
    REPORT="${REPORT}
Nikto ${T}: ${NIK}"
  done
fi

if [ "$LEVEL" = "full" ]; then
  for T in "${TARGETS[@]}"; do
    NUC=$(timeout 300 nuclei -u "$T" -severity medium,high,critical -rate-limit 10 -silent 2>/dev/null | head -10)
    [ -z "$NUC" ] && NUC="no medium+ findings"
    REPORT="${REPORT}
Nuclei ${T}: ${NUC}"
  done
fi

[ -z "$REPORT" ] && REPORT="scan produced no output"

FLAGGED=$(echo "$REPORT" | grep -iE "vulnerable|leaks found|OSVDB|not present" | grep -viE "no |no notable")

if [ -z "$FLAGGED" ]; then
  MESSAGE="🛡️ Security report (${LEVEL}): ✅ All clear — no issues found.
${REPORT}"
else
  AI=$(curl -s https://api.anthropic.com/v1/messages \
    -H "x-api-key: ${ANTHROPIC_API_KEY}" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d "$(python3 -c "import json,os; print(json.dumps({'model':'claude-sonnet-4-6','max_tokens':1000,'messages':[{'role':'user','content':'You are a security advisor for a Next.js app on Vercel. For each real issue below, give the risk in one plain sentence and the exact fix. Be short.\n\n'+os.environ['REPORT']}]}))" REPORT="$REPORT")" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['content'][0]['text'])" 2>/dev/null)
  [ -z "$AI" ] && AI="(AI summary failed)
${REPORT}"
  MESSAGE="🛡️ Security report (${LEVEL}) — issues found:
${AI}"
fi

curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d chat_id="${TELEGRAM_CHAT_ID}" \
  --data-urlencode text="${MESSAGE}" > /dev/null

echo "${MESSAGE}"
