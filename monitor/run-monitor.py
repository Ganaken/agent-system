#!/usr/bin/env python3
# Resource Monitor v3 - Anthropic costs (total + per agent est.), DB size,
# ElevenLabs chars, Higgsfield (MCP manual + API wallet auto from poster logs)
import json, os, urllib.request, datetime

def env(path):
    d = {}
    for line in open(path):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            d[k] = v.strip().strip('"').strip("'")
    return d

E = env("/root/agents/planner/.env")
SB_URL = E["SUPABASE_URL"]
SB_KEY = E["SUPABASE_SERVICE_ROLE_KEY"]
ADMIN_KEY = open("/root/agents/admin-key.txt").read().strip()
AED = 3.6725

def get(url, headers):
    req = urllib.request.Request(url, headers=headers)
    return json.load(urllib.request.urlopen(req))

def sb_get(path):
    req = urllib.request.Request(
        SB_URL + path,
        headers={"apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY})
    return json.load(urllib.request.urlopen(req))

def sb_insert(row):
    req = urllib.request.Request(
        SB_URL + "/rest/v1/agent_resources",
        data=json.dumps(row).encode(),
        headers={"apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY,
                 "Content-Type": "application/json"},
        method="POST")
    urllib.request.urlopen(req).read()

AH = {"anthropic-version": "2023-06-01", "x-api-key": ADMIN_KEY}
now = datetime.datetime.now(datetime.UTC)
start = now.strftime("%Y-%m-01T00:00:00Z")
end = now.strftime("%Y-%m-%dT%H:%M:%SZ")

# 1. Anthropic total cost this month (API returns cents)
total = 0.0
page = ""
while True:
    u = f"https://api.anthropic.com/v1/organizations/cost_report?starting_at={start}&ending_at={end}&bucket_width=1d&limit=31"
    if page: u += "&page=" + page
    r = get(u, AH)
    for b in r["data"]:
        for res in b["results"]:
            total += float(res["amount"]) / 100.0
    if not r.get("has_more"): break
    page = r["next_page"]

# 2. per-key usage -> estimated cost share
keys = {}
page = ""
while True:
    u = f"https://api.anthropic.com/v1/organizations/usage_report/messages?starting_at={start}&ending_at={end}&bucket_width=1d&group_by[]=api_key_id&limit=31"
    if page: u += "&page=" + page
    r = get(u, AH)
    for b in r["data"]:
        for res in b["results"]:
            kid = res.get("api_key_id") or "unknown"
            cc = res.get("cache_creation") or {}
            w = (res.get("uncached_input_tokens", 0)
                 + (cc.get("ephemeral_5m_input_tokens", 0) + cc.get("ephemeral_1h_input_tokens", 0)) * 1.25
                 + res.get("cache_read_input_tokens", 0) * 0.1
                 + res.get("output_tokens", 0) * 5)
            keys[kid] = keys.get(kid, 0) + w
    if not r.get("has_more"): break
    page = r["next_page"]

names = {}
r = get("https://api.anthropic.com/v1/organizations/api_keys?limit=100", AH)
for k in r.get("data", []):
    names[k["id"]] = k.get("name", k["id"])

wsum = sum(keys.values()) or 1
agents = []
for kid, w in sorted(keys.items(), key=lambda x: -x[1]):
    cost = total * w / wsum
    agents.append({"agent": names.get(kid, kid), "usd": round(cost, 2),
                   "aed": round(cost * AED, 2)})

sb_insert({"resource": "anthropic_cost_mtd",
           "label": "Anthropic API spend (this month)",
           "amount": round(total, 2), "unit": "USD",
           "details": {"aed": round(total * AED, 2), "per_agent": agents,
                       "note": "per-agent is estimated from token share"}})
print(f"anthropic mtd: {total:.2f} USD = {total*AED:.2f} AED")
for a in agents:
    print(f"  {a['agent']}: {a['usd']} USD = {a['aed']} AED")

# 3. DB size
req = urllib.request.Request(
    SB_URL + "/rest/v1/rpc/db_size_bytes", data=b"{}",
    headers={"apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY,
             "Content-Type": "application/json"}, method="POST")
db_mb = round(int(urllib.request.urlopen(req).read()) / 1048576, 1)
sb_insert({"resource": "supabase_db_size", "label": "Database size",
           "amount": db_mb, "unit": "MB", "limit_amount": 500})
print(f"db size: {db_mb} MB / 500 MB")

# 4. ElevenLabs usage
try:
    el_key = open("/root/agents/elevenlabs-key.txt").read().strip()
    el = get("https://api.elevenlabs.io/v1/user/subscription", {"xi-api-key": el_key})
    used = el["character_count"]
    limit = el["character_limit"]
    reset_unix = el.get("next_character_count_reset_unix")
    sb_insert({"resource": "elevenlabs_chars", "label": "ElevenLabs characters",
               "amount": used, "unit": "chars", "limit_amount": limit,
               "details": {"tier": el.get("tier"), "left": limit - used,
                           "reset_unix": reset_unix}})
    print(f"elevenlabs: {used} / {limit} chars ({limit-used} left)")
except Exception as e:
    print(f"elevenlabs skipped: {e}")

# 5. Higgsfield MCP plan - manual number from higgsfield.json
try:
    hf = json.load(open("/root/agents/monitor/higgsfield.json"))
    if hf.get("mcp_plan") is not None:
        sb_insert({"resource": "higgsfield_mcp_plan", "label": "Higgsfield MCP plan",
                   "amount": hf.get("mcp_plan"), "unit": "credits",
                   "details": {"note": "manually updated when topped up",
                               "limit": hf.get("mcp_limit", 1200)}})
        print(f"higgsfield mcp: {hf.get('mcp_plan')} / {hf.get('mcp_limit', 1200)}")
except Exception as e:
    print(f"higgsfield mcp skipped: {e}")

# 6. Higgsfield API wallet auto: start credits - logged poster spend
try:
    rows = sb_get("/rest/v1/higgsfield_usage?wallet=eq.api&select=credits")
    used = sum(float(x["credits"]) for x in rows)
    hf = json.load(open("/root/agents/monitor/higgsfield.json"))
    wallet_start = float(hf.get("api_wallet_start", 50))
    live = round(wallet_start - used, 1)
    sb_insert({"resource": "higgsfield_api_wallet", "label": "Higgsfield API wallet",
               "amount": live, "unit": "credits",
               "details": {"note": "auto: start minus logged poster spend",
                           "start": wallet_start, "used": used}})
    print(f"higgsfield api auto: {live} left ({used} used of {wallet_start})")
except Exception as e:
    print(f"higgsfield api skipped: {e}")
