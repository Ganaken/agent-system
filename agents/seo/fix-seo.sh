#!/bin/bash
# SEO Fix Agent - fixes chosen issues on dev, verifies build, pushes dev
# Usage: bash fix-seo.sh "1,2,3"
set -e
cd /root/agents/seo
set -a
source .env
set +a
NUMS="$1"
if [ -z "$NUMS" ]; then
  echo "usage: bash fix-seo.sh \"1,2,3\""
  exit 1
fi
ISSUES=$(ls -t /root/agents/seo/reports/issues-*.txt | head -1)
WORK="/root/agents/seo/work"
rm -rf "$WORK"
mkdir -p "$WORK"
cd "$WORK"

tg() {
  curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d chat_id=607873860 \
    --data-urlencode "text=$1" > /dev/null
}

tg "🔧 SEO Agent: starting fixes for issue(s) $NUMS on the dev branch. This takes a few minutes."

git clone --branch dev https://x-access-token:$GITHUB_TOKEN@github.com/Ganaken/mulak-app.git repo
cd repo
git config user.email "abdulla.ahli@Live.com"
git config user.name "Mulak SEO Agent"

# Sync main into dev FIRST so conflicts surface now, not at deploy time
git fetch origin main
if ! git merge origin/main -m "chore: sync main into dev before SEO fixes"; then
  git merge --abort
  tg "❌ SEO Agent: dev and main have a conflict that needs a human. Nothing was changed. Resolve the conflict between dev and main, then run the fix again."
  exit 1
fi

# Trust the workspace so Claude Code can run headless here
python3 - <<'EOF'
import json, os
p = "/root/.claude.json"
d = json.load(open(p)) if os.path.exists(p) else {}
d.setdefault("projects", {})
d["projects"].setdefault("/root/agents/seo/work/repo", {})
d["projects"]["/root/agents/seo/work/repo"]["hasTrustDialogAccepted"] = True
json.dump(d, open(p, "w"), indent=2)
print("workspace trusted")
EOF

# Heartbeat: tell Abdulla it's alive every 4 minutes while Claude works
(
  while true; do
    sleep 240
    tg "⏳ SEO Agent: still working on issue(s) $NUMS..."
  done
) &
HEARTBEAT_PID=$!
trap "kill $HEARTBEAT_PID 2>/dev/null" EXIT

ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY claude -p "You are the SEO fix agent for mulak-app. You are in the repo at $WORK/repo on the dev branch.
Read the issue list at $ISSUES. Fix ONLY these issue numbers: $NUMS. Do not touch anything else.
Rules:
- Make the smallest correct change for each chosen issue.
- Never DELETE or DROP anything. Never touch the database. Never touch .env files.
- Do not commit or push - the script does that.
- After the edits run: npx tsc --noEmit  and  npm run build. Both must pass. Fix whatever breaks.
- If an issue needs real legal or business content you cannot invent (lawyer text, customer names, certifications), do NOT fake it. Skip it and say so in the summary.
Then write $WORK/summary.txt in this exact shape, in SIMPLE plain English for a non-technical founder. No jargon, no file paths in the sentences, no code:
ISSUE <n>: <one line saying what was wrong>
FIXED: <one line saying what you changed, in plain words>
RESULT: <one line saying what changes for the business now>
FILES: <file names only, comma separated>
(repeat for each issue, blank line between)
Then a final line exactly: BUILD=OK or BUILD=FAIL
" --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebFetch,Task"

kill $HEARTBEAT_PID 2>/dev/null
trap - EXIT

SUMMARY=$(cat "$WORK/summary.txt" 2>/dev/null || echo "no summary written")
if ! grep -q "BUILD=OK" "$WORK/summary.txt" 2>/dev/null; then
  tg "❌ SEO Agent: build FAILED. Nothing pushed to dev.
$SUMMARY"
  exit 1
fi
cd "$WORK/repo"
git add -A
git commit -m "fix(seo): issues $NUMS - automated by SEO agent"
git push origin dev
FILES=$(git diff --stat HEAD~1 HEAD | tail -1)
echo "$NUMS" > /root/agents/seo/pending-nums.txt
tg "✅ SEO Agent: fixes are on the dev branch.
$SUMMARY
Changed: $FILES
Checks: TypeScript clean, build clean.
Say 'push to production' when you want this live on mulak.app."
