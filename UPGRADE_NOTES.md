# SRankIQ — Security & Real-Data Upgrade

## What changed

### 1. API routes now require authentication ✅
Every route in `pages/api/` is wrapped with `withApiAuth` (`lib/serverAuth.ts`),
which verifies the caller's Firebase ID token using the Firebase Admin SDK.
Unauthenticated calls get `401` — nobody can burn your Gemini/YouTube quota anymore.

**Setup required:**
1. Firebase Console → Project Settings → **Service Accounts** → Generate new private key
2. Copy `project_id`, `client_email`, `private_key` from the downloaded JSON
   into `.env.local` as `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`,
   `FIREBASE_ADMIN_PRIVATE_KEY`
3. `npm install` (adds `firebase-admin`)

Client side: all pages now call APIs through `lib/api.ts` (`apiPost`/`apiGet`),
which automatically attaches the signed-in user's ID token. No page-level
changes needed when you add new API calls — just use the helper.

### 2. Real data instead of Gemini guesses (YouTube) ✅
| Feature | Before | Now |
|---|---|---|
| Trends | Gemini hallucinating "what's trending" | Real `mostPopular` chart from YouTube Data API, ranked by view velocity, region-aware (`?region=NG` supported) |
| Keywords | Gemini guessing volume/competition | Real search-result counts, avg views of top 10 results, recency analysis, real autocomplete suggestions. **Zero Gemini cost** |
| Competitors | Gemini inventing subscriber counts | Real channel stats + last 15 videos via public Data API (no OAuth needed). Computed avg views, engagement rate, posting frequency. Gemini only writes the qualitative strategy insights from the real numbers |

Every response now includes `dataSource: 'youtube-api'` (real) or
`'ai-estimate'` (Gemini fallback for platforms without connected APIs).
You can show a "Live data" vs "AI estimate" badge in the UI off this field.

**Quota notes:** YouTube Data API gives 10,000 units/day free.
`search` costs 100 units/call — keyword analysis is capped at 5 keywords
per request to protect this. Trends/competitor lookups are cheap (1–3 units).

### 3. Production Firestore rules ✅
`firestore.rules` — deploy via Firebase Console → Firestore → Rules (paste),
or `firebase deploy --only firestore:rules`. Includes:
- Default deny-all
- Users can only read/write their own data
- **Clients cannot change their own `plan` field** — plan upgrades must go
  through your payment webhook using the Admin SDK (which bypasses rules).
  This matters before you wire up Stripe/Paystack.

### 4. Instagram / TikTok / X real analytics — not a code fix ⚠️
These need developer app approval before any code can fetch real data:
- **Meta (IG/FB):** create app at developers.facebook.com, request
  `instagram_basic` + `instagram_manage_insights`, pass App Review (weeks)
- **TikTok:** developers.tiktok.com, apply for Login Kit + Data/Display API
- **X:** paid API tier required for meaningful analytics

The `dataSource: 'ai-estimate'` label keeps you honest with users until then.
Recommended order: launch YouTube-only as "real", apply for Meta review now.
