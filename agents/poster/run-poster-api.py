import os, requests, time, higgsfield_client
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/agents/poster/.env"))

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY  = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
os.environ["HF_API_KEY"]    = os.environ["HIGGSFIELD_API_KEY"]
os.environ["HF_API_SECRET"] = os.environ["HIGGSFIELD_API_SECRET"]
TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TG_CHAT  = os.environ.get("TELEGRAM_CHAT_ID")

HEAD = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}

STYLES = [
    "golden hour warm light, editorial magazine photography",
    "bright white minimalist, ultra-clean product shot",
    "neon night Dubai street, cinematic film grain",
    "soft overcast morning, lifestyle candid documentary",
    "drone aerial view, epic wide establishing shot",
    "cozy warm interior, candlelit ambiance",
    "harsh noon desert sun, bold contrast",
    "sunset orange tones, reflection shot through glass",
]

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

def get_config(key):
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/agent_config",
        headers=HEAD, params={"key": f"eq.{key}", "select": "value"},
    )
    return r.json()[0]["value"]

def log_usage(credits, model, post_id):
    try:
        requests.post(
            f"{SUPABASE_URL}/rest/v1/higgsfield_usage",
            headers={**HEAD, "Content-Type": "application/json"},
            json={"wallet": "api", "credits": credits,
                  "model": model, "post_id": post_id},
            timeout=15,
        )
    except Exception:
        pass

def get_drafts():
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/marketing_posts",
        headers=HEAD,
        params={
            "status": "eq.draft", "content_type": "eq.image",
            "order": "scheduled_date.asc", "limit": "50",
            "select": "id,hook,visual_prompt",
        },
    )
    return r.json()

def save(post_id, url):
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/marketing_posts",
        headers={**HEAD, "Content-Type": "application/json"},
        params={"id": f"eq.{post_id}"},
        json={"media_url": url, "status": "ready_for_review"},
    )

def main():
    model = get_config("poster_image_model")
    try:
        credits_per_image = float(get_config("higgsfield_credits_per_image"))
    except Exception:
        credits_per_image = 4.0
    drafts = get_drafts()
    if not drafts:
        print("No image drafts.")
        return
    print(f"Model: {model} | {len(drafts)} drafts")
    ok, failed = 0, 0
    for i, post in enumerate(drafts):
        style = STYLES[i % len(STYLES)]
        prompt = (
            f"{post['visual_prompt']} Style: {style}. Premium quality, Dubai context. "
            f"Absolutely no text, no words, no letters, no numbers anywhere in the image."
        )
        print(f"[{i+1}/{len(drafts)}] {post['hook'][:60]}")
        try:
            result = higgsfield_client.subscribe(
                model, arguments={"prompt": prompt, "aspect_ratio": "9:16"},
            )
            url = result["images"][0]["url"]
            save(post["id"], url)
            log_usage(credits_per_image, model, post["id"])
            ok += 1
            print("  OK:", url)
        except Exception as e:
            failed += 1
            print("  FAILED:", e)
        time.sleep(2)
    summary = f"Poster (API): {ok} visuals ready for review, {failed} failed."
    print(summary)
    telegram(summary + " Review in the CRM Marketing page.")

if __name__ == "__main__":
    main()
