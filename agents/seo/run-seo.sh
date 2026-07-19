#!/bin/bash
# SEO Agent - weekly audit -> seo_audits (+ designed HTML) -> Telegram link
set -e
cd /root/agents/seo
source .env

REPORT_DIR="/root/agents/seo/reports"
mkdir -p "$REPORT_DIR"
STAMP=$(date +%Y%m%d)
DATESTR=$(date +%Y-%m-%d)
REPORT="$REPORT_DIR/audit-$STAMP.md"
ISSUES="$REPORT_DIR/issues-$STAMP.txt"
HTML="$REPORT_DIR/seo-$STAMP.html"

# 1. Run the audit
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY claude -p "Run a full SEO audit on https://www.mulak.app using the seo skill. Write the complete report to $REPORT. Then write $ISSUES: a numbered list of every critical and high issue, one line each, in simple plain English a non-technical founder understands (WHAT is wrong and WHY it matters, no jargon), max 10, most important first. At the very end of $REPORT, output a line in exactly this format: SCORES|overall=NN|critical=NN|warnings=NN|passed=NN" --allowedTools "Bash,Read,Write,Glob,Grep,WebFetch,WebSearch,Task"

# 2. Parse scores
LINE=$(grep '^SCORES|' "$REPORT" | tail -1)
OVERALL=$(echo "$LINE" | grep -oP 'overall=\K[0-9]+' || echo 0)
CRITICAL=$(echo "$LINE" | grep -oP 'critical=\K[0-9]+' || echo 0)
WARNINGS=$(echo "$LINE" | grep -oP 'warnings=\K[0-9]+' || echo 0)
PASSED=$(echo "$LINE" | grep -oP 'passed=\K[0-9]+' || echo 0)

# 3. Build the styled HTML report
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY claude -p "Build a beautiful HTML report at $HTML. Start from the template at /root/agents/shared/report-template.html and use its CSS classes. Fill: AGENT_NAME=SEO Agent, TITLE='Weekly SEO Audit — mulak.app', DATE=$DATESTR. BODY must contain: (1) a circular score gauge showing $OVERALL/100 using an SVG circle with stroke-dasharray, color red below 50, amber 50-75, green above 75; (2) a kpis row with 4 kpi cards: Score $OVERALL (info), Critical $CRITICAL (bad), Warnings $WARNINGS (warn), Passed $PASSED (good); (3) an 'Issues to fix' section: one .item div per issue from $ISSUES, keep their numbering, tag class 'critical' for the first 4, 'high' for the rest, bold the key phrase in each; (4) a short 'What happens next' section in .content style saying Abdulla replies with issue numbers to fix. Read $ISSUES for the issue texts. Output only the finished file, no commentary." --allowedTools "Read,Write"

# 4. Insert into seo_audits with the HTML embedded
jq -n --arg full "$(cat "$REPORT")" \
  --arg issues "$(cat "$ISSUES" 2>/dev/null || echo '')" \
  --arg html "$(cat "$HTML")" \
  --argjson score "$OVERALL" --argjson crit "$CRITICAL" \
  --argjson warn "$WARNINGS" --argjson pass "$PASSED" \
  '{score:$score,critical_issues:$crit,warnings:$warn,passed_checks:$pass,full_report:$full,top_findings:{issues:$issues,report_html:$html}}' > /tmp/seo_payload.json

TOKEN=$(curl -s -X POST "$SUPABASE_URL/rest/v1/seo_audits" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d @/tmp/seo_payload.json | jq -r '.[0].report_token')

REPORT_URL="https://crm.mulak.app/reports/seo/$DATESTR?t=$TOKEN"

# 5. Telegram: summary + link
PREV=$(curl -s "$SUPABASE_URL/rest/v1/seo_audits?select=score&order=run_at.desc&limit=2" -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" | jq -r ".[1].score // empty")
TREND=""
if [ -n "$PREV" ]; then
  if [ "$OVERALL" -gt "$PREV" ]; then TREND=" (was $PREV ▲)"; elif [ "$OVERALL" -lt "$PREV" ]; then TREND=" (was $PREV ▼)"; else TREND=" (no change)"; fi
fi
MSG="🔍 SEO Weekly Audit — mulak.app
Score: $OVERALL/100$TREND
Critical: $CRITICAL | Warnings: $WARNINGS | Passed: $PASSED

📄 Full designed report:
$REPORT_URL

Reply with which issue numbers to fix."
curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d chat_id=607873860 \
  --data-urlencode "text=$MSG"
