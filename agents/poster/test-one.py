import os, requests, higgsfield_client
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/agents/poster/.env"))

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY  = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
os.environ["HF_API_KEY"]    = os.environ["HIGGSFIELD_API_KEY"]
os.environ["HF_API_SECRET"] = os.environ["HIGGSFIELD_API_SECRET"]

HEAD = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}

def get_config(key):
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/agent_config",
        headers=HEAD,
        params={"key": f"eq.{key}", "select": "value"},
    )
    return r.json()[0]["value"]

model = get_config("poster_image_model")
brand = get_config("poster_brand_style")
print("Model:", model)

# 1. get ONE draft post
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/marketing_posts",
    headers=HEAD,
    params={"status": "eq.draft", "limit": "1", "select": "id,hook,visual_prompt"},
)
posts = r.json()
if not posts:
    print("No draft posts found.")
    raise SystemExit

post = posts[0]
print("Post:", post["hook"])

# 2. generate the image with the brand style attached
prompt = post["visual_prompt"] + " Style: " + brand
result = higgsfield_client.subscribe(
    model,
    arguments={"prompt": prompt, "aspect_ratio": "9:16"},
)
url = result["images"][0]["url"]
print("Image generated:", url)

# 3. save it back on the row
requests.patch(
    f"{SUPABASE_URL}/rest/v1/marketing_posts",
    headers={**HEAD, "Content-Type": "application/json"},
    params={"id": f"eq.{post['id']}"},
    json={"media_url": url, "status": "ready_for_review"},
)
print("Saved. Status -> ready_for_review")
