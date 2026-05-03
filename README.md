# SRankIQ — Social Media Ranking Intelligence

> The only tool that ranks you on every platform.

**AI-powered social media SEO, analytics, and content optimization SaaS built with Next.js, Firebase, and Google Gemini AI.**

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS (custom SRankIQ theme) |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| AI Engine | Google Gemini 1.5 Flash |
| Analytics | YouTube Data API v3 |
| Charts | Recharts |
| Animations | Framer Motion |
| State | React Context + Zustand |

---

## 📁 Project Structure

```
srankiq-nextjs/
├── pages/                  # All app pages (Next.js routing)
│   ├── index.tsx           # Landing page
│   ├── login.tsx           # Login
│   ├── signup.tsx          # Signup
│   ├── dashboard.tsx       # Main dashboard
│   ├── analytics.tsx       # Analytics
│   ├── keywords.tsx        # Keyword research
│   ├── trends.tsx          # Trend discovery
│   ├── competitors.tsx     # Competitor analysis
│   ├── ai-tools.tsx        # AI content tools
│   ├── upload.tsx          # Smart upload wizard
│   ├── reports.tsx         # Saved reports
│   ├── settings.tsx        # Settings & connections
│   ├── billing.tsx         # Plans & billing
│   ├── forgot-password.tsx # Password reset
│   └── api/                # Backend API routes (SECURE)
│       ├── ai/             # Gemini AI endpoints
│       ├── analytics/      # Platform analytics
│       ├── keywords/       # Keyword analysis
│       ├── competitors/    # Competitor analysis
│       └── trends/         # Trend discovery
├── components/
│   ├── layout/             # DashboardLayout (sidebar + topbar)
│   ├── ui/                 # StatCard, ScoreRing, TabBar, etc.
│   └── charts/             # Recharts wrappers
├── contexts/
│   ├── AuthContext.tsx      # Firebase auth + user profile
│   └── PlatformContext.tsx  # Connected social accounts
├── firebase/
│   └── config.ts           # Firebase SDK init
├── services/
│   ├── gemini.ts           # Gemini AI functions (server-side)
│   ├── youtube.ts          # YouTube Data API (server-side)
│   └── firestore.ts        # All Firestore DB operations
├── lib/
│   └── withAuth.tsx        # Protected route HOC
└── styles/
    └── globals.css         # Tailwind + custom CSS
```

---

## ⚡ Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your real API keys (see "Getting API Keys" below).

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 Getting API Keys

### Firebase (Required — for Auth + Database)
1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Create new project → "SRankIQ"
3. Enable **Authentication** → Sign-in methods → Email/Password + Google
4. Enable **Firestore Database** → Start in test mode
5. Go to Project Settings → Your apps → Web app → Copy config values
6. Paste into `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### Gemini AI (Required — for all AI features)
1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Paste into `.env.local`:
```
GEMINI_API_KEY=AIza...
```

### YouTube Data API (Required — for real YouTube analytics)
1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Select your project → APIs & Services → Library
3. Enable **YouTube Data API v3**
4. Go to Credentials → Create API Key
5. Also add your domain to **OAuth 2.0 Client IDs** → Authorized JavaScript origins:
   - `http://localhost:3000` (for dev)
   - `https://yourdomain.com` (for production)
6. Paste into `.env.local`:
```
YOUTUBE_API_KEY=AIza...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=504253358880-...  (already filled)
```

### Other Platforms (Optional — add as you grow)
- **Meta (Instagram + Facebook):** [developers.facebook.com](https://developers.facebook.com)
- **TikTok:** [developers.tiktok.com](https://developers.tiktok.com)
- **X/Twitter:** [developer.twitter.com](https://developer.twitter.com)
- **LinkedIn:** [linkedin.com/developers](https://linkedin.com/developers)
- **Pinterest:** [developers.pinterest.com](https://developers.pinterest.com)

---

## 🌐 Deploy to Vercel (Recommended — Free)

### Option A: GitHub → Vercel (Easiest)
1. Push this project to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add all your environment variables in Vercel dashboard
4. Deploy!

### Option B: Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option C: Build for cPanel/Traditional Hosting
```bash
npm run build
```
Then upload the `.next/` folder + `package.json` + other files to your server.
Run `npm start` on the server (requires Node.js 18+).

---

## 🔥 Firebase Firestore Rules (Set in Firebase Console)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /{subcollection}/{document} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 📱 Features

| Feature | Status |
|---|---|
| Firebase Email Auth | ✅ Ready |
| Google OAuth Sign-In | ✅ Ready |
| Email Verification | ✅ Ready |
| Password Reset | ✅ Ready |
| Multi-platform Dashboard | ✅ Ready |
| Real YouTube Analytics | ✅ Ready (with API key) |
| Gemini AI Title Generator | ✅ Ready |
| Gemini AI Description Generator | ✅ Ready |
| Gemini AI Hashtag Generator | ✅ Ready |
| SEO Scan & Scoring | ✅ Ready |
| Keyword Research | ✅ Ready |
| Competitor Analysis | ✅ Ready |
| Trend Discovery | ✅ Ready |
| Smart Upload Wizard | ✅ Ready |
| Saved Reports (Firestore) | ✅ Ready |
| Analytics Charts | ✅ Ready |
| Dark Cyberpunk UI | ✅ Ready |
| Mobile Responsive | ✅ Ready |
| Stripe Billing | 🚧 Add Stripe |
| Instagram Analytics | 🚧 Add Meta keys |
| TikTok Analytics | 🚧 Add TikTok keys |

---

## 🛡️ Security Notes

- ✅ All AI and API keys are **server-side only** (in `pages/api/`)
- ✅ No secret keys are exposed to the browser
- ✅ Firebase auth protects all dashboard routes
- ✅ Firestore rules ensure users can only access their own data
- ⚠️ Before production: update Firestore rules from test mode

---

## 💬 Support

Built for SRankIQ by Claude (Anthropic).
Questions? Email: support@srankiq.com

---

*© 2026 SRankIQ — Social Media Ranking Intelligence*
