#!/bin/bash
# SEO Agent - generate a 6-digit deploy code, send via Telegram, 10-min expiry
set -e
cd /root/agents/seo
set -a
source .env
set +a

CODE=$(shuf -i 100000-999999 -n 1)
EXPIRY=$(( $(date +%s) + 600 ))
NUMS=$(cat /root/agents/seo/pending-nums.txt 2>/dev/null || echo "?")

echo "$CODE" > /root/agents/seo/otp-code.txt
echo "$EXPIRY" > /root/agents/seo/otp-expiry.txt

curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d chat_id=607873860 \
  --data-urlencode "text=🔐 Production deploy code: $CODE

This deploys SEO fixes for issue(s) $NUMS to mulak.app.
Reply: CODE-$CODE
Expires in 10 minutes."
