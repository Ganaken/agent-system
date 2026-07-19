import os, re, json, subprocess, requests, time
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/agents/poster/.env"))

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY  = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY")
TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TG_CHAT  = os.environ.get("TELEGRAM_CHAT_ID")

HEAD = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}
URL_RE = re.compile(r"https://\S+?\.(?:png|jpg|jpeg|webp|mp4|webm)")

def telegram(msg):
    if not TG_TOKEN:
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
            json={"chat_id": TG_CHAT, "text": msg}, timeout=15,
        )
    except Exception:
        pass

def get_rejected():
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/marketing_posts",
        headers=HEAD,
        params={
            "status": "eq.rejected", "content_type": "eq.image",
            "feedback": "not.is.null", "order": "scheduled_date.asc",
            "limit": "50", "select": "id,hook,visual_prompt,feedback",
        },
    )
    return r.json()

def get_lessons():
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/agent_lessons",
        headers=HEAD,
        params={"agent_name": "eq.poster", "active": "eq.true", "select": "lesson"},
    )
    return [row["lesson"] for row in r.json()]

def learn_from_feedback(feedbacks, existing_lessons):
    """Ask Claude to extract permanent lessons from the batch of feedback."""
    if not ANTHROPIC_KEY or not feedbacks:
        return
    prompt = (
        "You manage lesson-learning for a marketing visual agent called the Poster. "
        "The boss rejected some visuals with this feedback:\n"
        + "\n".join(f"- {f}" for f in feedbacks)
        + "\n\nExisting permanent lessons the agent already has:\n"
        + ("\n".join(f"- {l}" for l in existing_lessons) if existing_lessons else "(none)")
        + "\n\nExtract any GENERAL, reusable rules from the feedback that should become "
        "permanent lessons (things the boss will always want, not one-off fixes for a "
        "specific post). Do NOT duplicate existing lessons. If nothing general, return []. "
        "Respond with ONLY a JSON array of short lesson strings, no markdown."
    )
    try:
        r = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-fable-5",
                "max_tokens": 1000,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=60,
        )
        text = r.json()["content"][0]["text"].replace("```json", "").replace("```", "").strip()
        lessons = json.loads(text)
        for lesson in lessons:
            requests.post(
                f"{SUPABASE_URL}/rest/v1/agent_lessons",
                headers={**HEAD, "Content-Type": "application/json"},
                json={"agent_name": "poster", "lesson": lesson, "active": True},
            )
        if lessons:
            telegram("Argus: the Poster learned " + str(len(lessons)) + " new permanent lesson(s) from your feedback:\n" + "\n".join(f"- {l}" for l in lessons))
    except Exception as e:
        print("Lesson learning failed:", e)

def regenerate(post, lessons):
    lesson_text = ("Permanent lessons you must always follow: " + "; ".join(lessons) + ". ") if lessons else ""
    msg = (
        f"REVISION TASK. A marketing visual was rejected and must be redone. "
        f"{lesson_text}"
        f"Post hook: {post['hook']}. Original visual brief: {post['visual_prompt']}. "
        f"The boss's rejection feedback (fix EXACTLY this): {post['feedback']}. "
        f"Regenerate the visual via the Higgsfield MCP applying the feedback. "
        f"Return only the final image URL, nothing else."
    )
    result = subprocess.run(
        ["openclaw", "agent", "--agent", "poster", "-m", msg, "--timeout", "400"],
        capture_output=True, text=True, timeout=450,
    )
    out = result.stdout + result.stderr
    m = URL_RE.search(out)
    return m.group(0) if m else None

def save(post_id, url):
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/marketing_posts",
        headers={**HEAD, "Content-Type": "application/json"},
        params={"id": f"eq.{post_id}"},
        json={"media_url": url, "status": "ready_for_review"},
    )

def main():
    rejected = get_rejected()
    if not rejected:
        print("No rejected posts with feedback.")
        return
    telegram(f"Argus: {len(rejected)} rejected post(s) received. The Poster is fixing them now.")
    lessons = get_lessons()
    # learn general rules from this batch of feedback first
    learn_from_feedback([p["feedback"] for p in rejected], lessons)
    lessons = get_lessons()  # reload including new ones
    ok, failed = 0, 0
    for i, post in enumerate(rejected, 1):
        print(f"[{i}/{len(rejected)}] fixing: {post['hook'][:50]}")
        try:
            url = regenerate(post, lessons)
        except Exception as e:
            print("  ERROR:", e)
            url = None
        if url:
            save(post["id"], url)
            ok += 1
            print("  FIXED:", url)
        else:
            failed += 1
            print("  FAILED - stays rejected")
        time.sleep(3)
    telegram(f"Argus: revisions done. {ok} fixed and back in review, {failed} failed. Check the CRM.")

if __name__ == "__main__":
    main()
