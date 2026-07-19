#!/bin/bash
# DAEDALUS - Developer Agent
# Usage: bash run-daedalus.sh "fix the calendar overlapping events bug"
# Takes ONE task, works on mulak-app dev branch, build-gated, pushes dev,
# waits for Abdulla's "push to production".
set -e
cd /root/agents/daedalus
set -a
source .env
set +a

TASK="$1"
if [ -z "$TASK" ]; then
  echo 'usage: bash run-daedalus.sh "task description"'
  exit 1
fi

WORK="/root/agents/daedalus/work"
SKILL="/root/agents/daedalus/skill/daedalus_skill.md"
rm -rf "$WORK"
mkdir -p "$WORK"
cd "$WORK"

tg() {
  curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d chat_id=607873860 \
    --data-urlencode "text=$1" > /dev/null
}

tg "🛠 Daedalus: starting task — $TASK
Working on the dev branch. This takes a few minutes."

git clone --branch dev https://x-access-token:$GITHUB_TOKEN@github.com/Ganaken/mulak-app.git repo
cd repo
git config user.email "abdulla.ahli@Live.com"
git config user.name "Daedalus (Mulak Developer Agent)"

# Sync main into dev FIRST so conflicts surface now, not at deploy time
git fetch origin main
if ! git merge origin/main -m "chore: sync main into dev before Daedalus task"; then
  git merge --abort
  tg "❌ Daedalus: dev and main have a conflict that needs a human. Nothing was changed. Resolve the conflict, then send the task again."
  exit 1
fi

# Trust the workspace so Claude Code can run headless here
python3 - <<'EOF'
import json, os
p = "/root/.claude.json"
d = json.load(open(p)) if os.path.exists(p) else {}
d.setdefault("projects", {})
d["projects"].setdefault("/root/agents/daedalus/work/repo", {})
d["projects"]["/root/agents/daedalus/work/repo"]["hasTrustDialogAccepted"] = True
json.dump(d, open(p, "w"), indent=2)
print("workspace trusted")
EOF

# Heartbeat every 4 minutes while Claude works
(
  while true; do
    sleep 240
    tg "⏳ Daedalus: still working on — $TASK"
  done
) &
HEARTBEAT_PID=$!
trap "kill $HEARTBEAT_PID 2>/dev/null" EXIT

ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY claude --model claude-opus-4-8 -p "You are Daedalus, the senior developer agent for mulak-app. Read your identity and rules at $SKILL and the repo's AGENTS.md - follow both completely.

You are in the repo at $WORK/repo on the dev branch.

YOUR TASK: $TASK

Rules (hard):
- Smallest correct change for this task only. Nothing else.
- Never DELETE/DROP/TRUNCATE/ALTER anything. Never touch the database schema. Never touch .env files.
- Do not commit or push - the script does that.
- Any UI work: infographic-style (charts, KPI cards, visuals), match the existing design language, AED money format with tabular-nums.
- After edits run: npx tsc --noEmit  and  npm run build. Both must pass. Fix whatever breaks.
- If the task is ambiguous, dangerous, or needs content you cannot invent: do NOT guess. Write the summary explaining exactly what is needed and set BUILD=FAIL.

Then write $WORK/summary.txt in EXACTLY this shape, simple plain English for a non-technical founder, no jargon, no file paths in the sentences:
TASK: $TASK
DONE: <one or two lines - what you changed, in plain words>
RESULT: <one line - what the user/business sees differently now>
FILES: <file names only, comma separated>
BUILD=OK or BUILD=FAIL (last line, exactly)
" --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebFetch,Task"

kill $HEARTBEAT_PID 2>/dev/null
trap - EXIT

SUMMARY=$(cat "$WORK/summary.txt" 2>/dev/null || echo "no summary written")
if ! grep -q "BUILD=OK" "$WORK/summary.txt" 2>/dev/null; then
  tg "❌ Daedalus: task not completed. Nothing pushed.
$SUMMARY"
  exit 1
fi

cd "$WORK/repo"
git add -A
git commit -m "feat(daedalus): $TASK"
git push origin dev
FILES=$(git diff --stat HEAD~1 HEAD | tail -1)
echo "$TASK" > /root/agents/daedalus/pending-task.txt

tg "✅ Daedalus: task done, changes are on the dev branch.
$SUMMARY
Changed: $FILES
Checks: TypeScript clean, build clean.
Say 'push to production' when you want this live on mulak.app."
