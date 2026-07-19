#!/bin/bash
# SEO Agent - merge dev to main (production) after email code verification
# Usage: bash push-prod.sh <6-digit code>
set -e
cd /root/agents/seo
set -a
source .env
set +a

GIVEN="$1"
SAVED=$(cat /root/agents/seo/otp-code.txt 2>/dev/null || echo "none")
EXPIRY=$(cat /root/agents/seo/otp-expiry.txt 2>/dev/null || echo "0")
NOW=$(date +%s)
NUMS=$(cat /root/agents/seo/pending-nums.txt 2>/dev/null || echo "?")

if [ "$SAVED" = "none" ]; then
  echo "No code was requested. Ask for a deploy code first."
  exit 1
fi

if [ "$NOW" -gt "$EXPIRY" ]; then
  rm -f /root/agents/seo/otp-code.txt /root/agents/seo/otp-expiry.txt
  curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d chat_id=607873860 \
    --data-urlencode "text=⏰ That code expired. Ask for a new deploy code."
  exit 1
fi

if [ "$GIVEN" != "$SAVED" ]; then
  curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d chat_id=607873860 \
    --data-urlencode "text=⛔ Wrong code. Production push cancelled. Ask for a new code to try again."
  exit 1
fi

WORK="/root/agents/seo/work"
cd "$WORK/repo"
git config user.email "abdulla.ahli@Live.com"
git config user.name "Mulak SEO Agent"
git fetch origin
git checkout main
git pull origin main
git merge origin/dev --no-edit
git push origin main
git checkout dev

rm -f /root/agents/seo/otp-code.txt /root/agents/seo/otp-expiry.txt /root/agents/seo/pending-code.txt /root/agents/seo/pending-nums.txt

curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d chat_id=607873860 \
  --data-urlencode "text=🚀 PRODUCTION: dev merged to main. Fixes for issue(s) $NUMS are deploying to mulak.app via Vercel.

Next audit will show the new score."

