import os, re, subprocess, requests, time
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/agents/poster/.env"))

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY  = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TG_CHAT  = os.environ.get("TELEGRAM_CHAT_ID")

HEAD = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}
IMG_RE = re.compile(r"https://\S+?\.(?:png|jpg|jpeg|webp)")
VID_RE = re.compile(r"https://\S+?\.(?:mp4|webm|mov)")

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

def get_drafts():
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/marketing_posts",
        headers=HEAD,
        params={
            "status": "eq.draft",
            "order": "scheduled_date.asc",
            "limit": "60",
            "select": "id,hook,visual_prompt,content_type",
        },
    )
    return r.json()

def generate(post):
    ctype = (post.get("content_type") or "image").lower()
    if ctype in ("video", "reel"):
        instruction = (
            f"Generate a SHORT VIDEO (5-10 seconds) via the Higgsfield MCP for this post. "
            f"Pick the best video model yourself (Kling, Veo, Seedance, etc.). "
        )
        want_video = True
    else:
        instruction = (
            f"Generate an IMAGE via the Higgsfield MCP for this post. "
            f"For text or infographics use nano_banana_pro. "
        )
        want_video = False

    msg = (
        f"{instruction}"
        f"Post hook: {post['hook']}. Visual to create: {post['visual_prompt']}. "
        f"Follow your identity rules, especially the golden rule: pick a style "
        f"completely different from your recent work. "
        f"Return only the final media URL, nothing else."
    )
    result = subprocess.run(
        ["openclaw", "agent", "--agent", "poster", "-m", msg, "--timeout", "600"],
        capture_output=True, text=True, timeout=650,
    )
    out = result.stdout + result.stderr
    if want_video:
        m = VID_RE.search(out) or IMG_RE.search(out)
    else:
        m = IMG_RE.search(out) or VID_RE.search(out)
    return m.group(0) if m else None

def save(post_id, url):
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/marketing_posts",
        headers={**HEAD, "Content-Type": "application/json"},
        params={"id": f"eq.{post_id}"},
        json={"media_url": url, "status": "ready_for_review"},
    )

def main():
    drafts = get_drafts()
    if not drafts:
        print("No drafts.")
        telegram("Poster: no drafts to process.")
        return
    imgs = sum(1 for p in drafts if (p.get("content_type") or "image").lower() not in ("video", "reel"))
    vids = len(drafts) - imgs
    telegram(f"Poster: starting batch — {imgs} images + {vids} videos. Videos take longer; I'll report when done.")
    print(f"Processing {len(drafts)} drafts ({imgs} img, {vids} vid)...")
    ok, failed = 0, 0
    for i, post in enumerate(drafts, 1):
        ct = (post.get("content_type") or "image")
        print(f"[{i}/{len(drafts)}] ({ct}) {post['hook'][:50]}")
        try:
            url = generate(post)
        except Exception as e:
            print("  ERROR:", e)
            url = None
        if url:
            save(post["id"], url)
            ok += 1
            print("  OK:", url)
        else:
            failed += 1
            print("  FAILED - left as draft")
        time.sleep(3)
    summary = f"Poster: batch done. {ok} ready for review, {failed} failed."
    print(summary)
    telegram(summary + " Review in the CRM.")

if __name__ == "__main__":
    main()
