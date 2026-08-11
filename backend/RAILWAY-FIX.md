# Railway deploy — fix healthcheck failure

## Your setup looks correct

- Root directory: **`backend`** (with or without leading `/` is fine)
- Postgres: **Online** with volume — good, you don't need a volume on the API service

## Why the deploy failed (most likely)

The app **crashes before it can respond** to the healthcheck. Usually one of these:

### 1. `DATABASE_URL` not linked to the API service

Postgres is a separate service. The API does not get `DATABASE_URL` automatically unless you reference it.

**Fix:**
1. Click your **proresume-ai** (API) service → **Variables**
2. **+ New Variable** → **Add Reference**
3. Select **Postgres** → choose **`DATABASE_URL`**
4. Redeploy

### 2. `JWT_SECRET` missing

**Fix:**
1. API service → **Variables** → **+ New Variable**
2. Name: `JWT_SECRET`
3. Value: any long random string (e.g. 64 chars)
4. Redeploy

### 3. Optional but recommended now

| Variable | Value |
|----------|--------|
| `FRONTEND_URL` | Your Netlify URL |
| `CORS_ORIGINS` | Same Netlify URL |

---

## After fixing variables

1. **Redeploy** the API service (Deployments → Redeploy)
2. Open: `https://YOUR-API.up.railway.app/health`  
   Should show: `{"ok":true,"service":"proresume-api","database":"connected"}`
3. If `database` says `"connecting"` wait 10s and refresh — first boot runs migrations

---

## Check deploy logs

API service → **Deployments** → failed deploy → **View logs**

Look for:
- `FATAL: Missing required environment variables` → add JWT_SECRET + DATABASE_URL reference
- `Migration attempt failed` → DATABASE_URL wrong or Postgres not reachable
- `ProResume API listening on port` → app is up; healthcheck should pass after the fix in this PR

---

## Baby steps from here

```
✓ Postgres online
→ Link DATABASE_URL + add JWT_SECRET  (do this now)
→ Redeploy → /health returns ok
→ Update js/config.js with Railway URL
→ Test signup on Netlify
→ Stripe later
```

No volume needed on the API service for resume saves — Postgres handles that.
