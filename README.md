# InboxPilot: AI Email Assistant SaaS

InboxPilot is a full-stack university SaaS project for helping users manage Gmail messages with AI. Users can register, log in, connect Gmail through Google OAuth, view recent emails, summarize selected messages, extract tasks and deadlines, and generate AI suggested replies.

The safety boundary is important: InboxPilot does not automatically send emails. AI replies are shown as AI suggested replies so the user can review, edit, copy, or delete them.

## Tech Stack

- Frontend: React.js (Vite) with plain CSS
- Backend: Node.js with Express.js
- Database: MongoDB (Mongoose)
- Authentication: JWT and Google OAuth 2.0
- Email API: Gmail API with read-only access
- AI API: Gemini API
- Language: JavaScript

## Project Structure

```text
.
├── .kiro/
│   └── steering/             # Kiro AI project context
├── inboxpilot/
│   ├── client/
│   │   └── src/
│   │       ├── components/   # Reusable React UI components
│   │       ├── pages/        # App screens such as login, dashboard, email detail
│   │       └── services/     # API client and frontend service helpers
│   └── server/
│       ├── config/           # Database, OAuth, and app configuration
│       ├── controllers/      # Express request handlers
│       ├── middleware/       # Auth, error handling, validation
│       ├── models/           # MongoDB/Mongoose schemas
│       ├── routes/           # Express route definitions
│       └── services/         # Gmail, Gemini, auth, and business logic
├── .env.example              # Safe environment variable template
├── .gitignore
└── InboxPilot_University_Project_Document_Improved.md
```

## Features

### Implemented

- Google OAuth sign-in (no separate email/password registration)
- JWT-protected app routes with automatic redirect to login on expiry
- Gmail connection via Google OAuth (read-only scope)
- Gmail recent email listing with search and pagination
- Email detail view
- AI email summarization (summary, key points, tone)
- AI task, deadline, and priority extraction
- AI suggested reply generation (review-only; copy and regenerate, never auto-sent)
- Profile display (name/avatar) and Gmail connection status on the dashboard

### Planned / not yet implemented

These appear in the project specification but are not part of the current build:

- Email/password registration
- Persisting tasks and suggested replies to the database (currently shown in the
  UI only and not saved)
- User-selected reply tone
- Dedicated dashboard summary cards
- A separate settings page (Gmail status currently lives on the dashboard)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB running locally or a MongoDB Atlas connection string
- Google Cloud project with OAuth 2.0 credentials (Gmail API enabled, read-only scope)
- Gemini API key (for AI features)

### Environment Setup

Copy `.env.example` to `.env` and fill in local development values.

```bash
cp .env.example .env
```

Never commit real API keys, OAuth secrets, JWT secrets, MongoDB credentials, or generated tokens.

### Run the Backend

```bash
cd inboxpilot/server
npm install
node index.js
```

The backend starts on `http://localhost:5000` by default.

### Run the Frontend

```bash
cd inboxpilot/client
npm install
npm run dev
```

The frontend starts on `http://localhost:5173` and proxies `/api` requests to the backend.

### Quick Start (both together)

Open two terminals:

```bash
# Terminal 1 — Backend
cd inboxpilot/server && npm install && node index.js

# Terminal 2 — Frontend
cd inboxpilot/client && npm install && npm run dev
```

Then open `http://localhost:5173` in your browser.

## Deployment (Testers — 3-5 people)

This setup uses Vercel (frontend), Render (backend), and MongoDB Atlas (database). Google OAuth stays in Testing mode so only approved Gmail accounts can log in.

### Step 1: MongoDB Atlas

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create a free M0 cluster.
2. Create a database user (username + password).
3. Under Network Access, add `0.0.0.0/0` (allow from anywhere) so Render can connect.
4. Copy the connection string. It looks like:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/inboxpilot?retryWrites=true&w=majority
   ```

### Step 2: Deploy Backend to Render

1. Go to [render.com](https://render.com), sign in, click **New > Web Service**.
2. Connect your GitHub repo (`wyze69-sys/AI-Email-Assistant-SaaS`).
3. Set these:
   - **Root Directory:** `inboxpilot/server`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Instance Type:** Free
4. Add these **Environment Variables** in the Render dashboard:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | A random 64+ character string |
| `JWT_EXPIRES_IN` | `7d` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | `https://YOUR-RENDER-APP.onrender.com/api/auth/google/callback` |
| `GMAIL_SCOPES` | `https://www.googleapis.com/auth/gmail.readonly` |
| `GEMINI_API_KEY` | From Google AI Studio |
| `GEMINI_MODEL` | `gemini-1.5-flash` |
| `TOKEN_ENCRYPTION_KEY` | A random 64-character hex string |
| `CLIENT_URL` | `https://YOUR-VERCEL-APP.vercel.app` |

5. Deploy. Note the Render URL (e.g. `https://inboxpilot-api.onrender.com`).

### Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com), import the same GitHub repo.
2. Set these:
   - **Root Directory:** `inboxpilot/client`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add this **Environment Variable** in the Vercel dashboard:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://YOUR-RENDER-APP.onrender.com/api` |

4. Deploy. Note the Vercel URL (e.g. `https://inboxpilot.vercel.app`).

### Step 4: Update Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com) > APIs & Services > Credentials.
2. Edit your OAuth 2.0 Client ID.
3. Under **Authorized redirect URIs**, add:
   ```
   https://YOUR-RENDER-APP.onrender.com/api/auth/google/callback
   ```
4. Under **Authorized JavaScript origins**, add:
   ```
   https://YOUR-VERCEL-APP.vercel.app
   ```
5. Save.

### Step 5: Add Tester Gmail Accounts

Since the app is in **Testing** mode (not published), only approved accounts can log in.

1. Go to Google Cloud Console > APIs & Services > **OAuth consent screen**.
2. Under **Test users**, click **Add Users**.
3. Add the Gmail addresses of your 3-5 testers.
4. Save. Each tester can now complete the OAuth flow.

**Note:** In Testing mode, Google shows a "This app isn't verified" warning. Testers click "Continue" to proceed. This is normal.

### Step 6: Cross-check values

After both are deployed, confirm these match:

| Where | Variable | Must equal |
|-------|----------|------------|
| Render env | `CLIENT_URL` | Your Vercel URL (e.g. `https://inboxpilot.vercel.app`) |
| Render env | `GOOGLE_CALLBACK_URL` | `https://YOUR-RENDER-APP.onrender.com/api/auth/google/callback` |
| Vercel env | `VITE_API_BASE_URL` | `https://YOUR-RENDER-APP.onrender.com/api` |
| Google Console | Redirect URI | Same as `GOOGLE_CALLBACK_URL` above |

### Generate secrets quickly

```bash
# JWT_SECRET (64 random chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# TOKEN_ENCRYPTION_KEY (64-char hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Render free tier note

Render free instances spin down after 15 minutes of inactivity. First request after spin-down takes ~30 seconds. This is fine for testing.

---

## Development Notes

- Keep Gmail scope read-only unless the project requirements change.
- Keep AI reply generation manual-review only; do not add automatic sending.
- Put frontend code under `inboxpilot/client`.
- Put backend code under `inboxpilot/server`.
- Keep integration logic inside `server/services` so controllers stay simple.
- Update `.kiro/steering/project-context.md` when major architecture decisions change.

## Reference Document

The full project specification is in:

`InboxPilot_University_Project_Document_Improved.md`
