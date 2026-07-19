#!/bin/bash
# Returns the link + summary of the latest SEO audit
set -a
source /root/agents/seo/.env
set +a

ROW=$(curl -s "$SUPABASE_URL/rest/v1/seo_audits?select=score,critical_issues,warnings,passed_checks,run_at,report_token&order=run_at.desc&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY")

SCORE=$(echo "$ROW" | jq -r '.[0].score')
CRIT=$(echo "$ROW" | jq -r '.[0].critical_issues')
WARN=$(echo "$ROW" | jq -r '.[0].warnings')
PASS=$(echo "$ROW" | jq -r '.[0].passed_checks')
TOKEN=$(echo "$ROW" | jq -r '.[0].report_token')
DATESTR=$(echo "$ROW" | jq -r '.[0].run_at' | cut -d'T' -f1)

echo "Latest SEO audit ($DATESTR)
Score: $SCORE/100
Critical: $CRIT | Warnings: $WARN | Passed: $PASS
Report: https://crm.mulak.app/reports/seo/$DATESTR?t=$TOKEN"
