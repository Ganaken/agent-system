#!/bin/bash
set -e
source ~/agents/tester/.env

REPORT=""
STATUS="✅ All green"

check_repo () {
  NAME=$1
  URL="https://x-access-token:${GITHUB_TOKEN}@github.com/Ganaken/${NAME}.git"
  rm -rf ~/agents/tester/${NAME}
  git clone --depth 1 "$URL" ~/agents/tester/${NAME} > /dev/null 2>&1
  cd ~/agents/tester/${NAME}
  npm install > /dev/null 2>&1

  if npx tsc --noEmit > /dev/null 2>&1; then
    TSC="tsc ok"
  else
    TSC="tsc FAILED"
    STATUS="❌ Problem found"
  fi

  REPORT="${REPORT}
${NAME}: ${TSC}"
}

check_site () {
  URL=$1
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
  if [ "$CODE" -ge "200" ] && [ "$CODE" -lt "400" ]; then
    REPORT="${REPORT}
${URL}: up (${CODE})"
  else
    REPORT="${REPORT}
${URL}: DOWN (${CODE})"
    STATUS="❌ Problem found"
  fi
}

check_repo "mulak-app"
check_repo "mulak-crm"
check_site "https://mulak.app"
check_site "https://crm.mulak.app"

echo "${STATUS}${REPORT}"
MESSAGE="🤖 Tester report:
${STATUS}${REPORT}"

curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d chat_id="${TELEGRAM_CHAT_ID}" \
  --data-urlencode text="${MESSAGE}" > /dev/null
