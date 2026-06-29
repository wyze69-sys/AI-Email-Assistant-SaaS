# Design — Text Assistant

## Overview

Text Assistant adds a protected `/text` page and a small set of authenticated backend
routes under `/api/ai/text`. It deliberately mirrors the existing email AI flow so the
codebase stays consistent and reviewable:

- Backend: a new router (`textAiRoutes` or additional handlers in the existing AI area)
  + a new controller that validates input and calls existing `geminiService` functions.
  The Gemini key stays in `process.env` server-side.
- Gemini service: add a `simplifyText` helper and an optional `tone` parameter path for
  reply generation, without changing existing exported behavior.
- Frontend: a new `TextAssistant.jsx` page, four new `ai.js` service helpers, a new nav
  link, and a new SPA route. Result handling reuses `ui.js` (copy/format/friendlyError)
  and `store.js` (`addNote`, `addTasks`) with `source: { type: "text" }`.

No new packages. No `VITE_*` Gemini var. No changes to OAuth, Gmail scope, or existing
email AI endpoints.

### Design decisions (from requirements review)

- Simplify endpoint returns `{ simplified }`.
- Reply tone is a selectable dropdown defaulting to `professional`; invalid/unknown tones
  fall back to `professional` server-side instead of erroring.

---

## Architecture

```
Browser (/text)
  TextAssistant.jsx
    ├─ services/ai.js ─ summarizeText / extractTasksFromText / simplifyText / suggestReplyForText
    │                     └─ services/api.js (apiFetch, injects JWT)
    ├─ services/ui.js  ─ friendlyError, copyToClipboard, summaryToText, tasksToText
    └─ services/store.js ─ addNote / addTasks  (source: { type: "text" })
                                  │
                                  ▼ (HTTP, Authorization: Bearer <jwt>)
Server
  /api/ai/text  (router) ── authenticate middleware (existing)
    └─ textAiController
         ├─ validateText(text)        (present, non-empty, ≤ 12000 chars)
         ├─ geminiService.summarizeEmail(text, subject?)
         ├─ geminiService.extractTasks(text, subject?)
         ├─ geminiService.simplifyText(text)            ← NEW helper
         └─ geminiService.suggestReply(text, ..., tone) ← tone-aware path
              └─ process.env.GEMINI_API_KEY (server-only)
```

### Mounting strategy

The existing `aiRoutes.js` is mounted at `/api/ai` and defines email routes with an
`:emailId` path param. To keep email routes untouched and the diff small, mount the text
sub-router as a nested router:

- In `index.js`, no change is required if we nest inside `aiRoutes.js`.
- `aiRoutes.js` adds: `router.use("/text", textAiRouter)` (and `require` of the new
  router). Because `router.use(authenticate)` already runs first in `aiRoutes.js`, the
  nested text routes inherit authentication automatically. The text router will also call
  `authenticate` defensively in case of future remounting.

This means `index.js` is ideally **unchanged** (the existing `app.use("/api/ai", aiRoutes)`
already covers `/api/ai/text/*`). If a reviewer prefers an explicit top-level mount, an
alternative is `app.use("/api/ai/text", textAiRouter)` in `index.js`; the nested approach
is chosen to minimize the changed-file surface.

---

## Backend Components

### New file: `server/routes/textAiRoutes.js`

Express router exposing the four POST endpoints. Applies `authenticate` defensively, then
maps each route to a controller handler.

```js
const express = require("express");
const authenticate = require("../middleware/auth");
const {
  summarizeTextHandler,
  extractTasksFromText,
  simplifyTextHandler,
  suggestReplyFromText,
} = require("../controllers/textAiController");

const router = express.Router();
router.use(authenticate); // inherited via aiRoutes too; defensive here.

router.post("/summarize", summarizeTextHandler);
router.post("/extract-tasks", extractTasksFromText);
router.post("/simplify", simplifyTextHandler);
router.post("/suggest-reply", suggestReplyFromText);

module.exports = router;
```

### Change: `server/routes/aiRoutes.js`

Add two lines to nest the text router (keeps email routes byte-identical otherwise):

```js
const textAiRoutes = require("./textAiRoutes");
// ...after existing email routes...
router.use("/text", textAiRoutes);
```

### New file: `server/controllers/textAiController.js`

Validates input and delegates to `geminiService`. Reuses an error handler modeled on the
existing `handleAIError` (does not import the email controller's private function; a small
local copy keeps the controllers decoupled and avoids changing the email controller).

```js
const {
  summarizeEmail,
  extractTasks,
  suggestReply,
  simplifyText,
} = require("../services/geminiService");

const MAX_TEXT_LENGTH = 12000;
const ALLOWED_TONES = ["professional", "friendly", "short", "apology", "thank_you", "follow_up"];

// Returns { ok: true, text } or { ok: false, status, error }
function validateText(body) {
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return { ok: false, status: 400, error: "Please paste some text first." };
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `That text is too long. Please keep it under ${MAX_TEXT_LENGTH.toLocaleString()} characters.`,
    };
  }
  return { ok: true, text };
}

function normalizeTone(tone) {
  return ALLOWED_TONES.includes(tone) ? tone : "professional";
}

async function summarizeTextHandler(req, res) {
  const v = validateText(req.body);
  if (!v.ok) return res.status(v.status).json({ error: v.error });
  try {
    const result = await summarizeEmail(v.text, "Pasted text");
    res.json(result);
  } catch (error) {
    console.error("Text summarize error:", error.message);
    handleTextAIError(error, res);
  }
}

async function extractTasksFromText(req, res) {
  const v = validateText(req.body);
  if (!v.ok) return res.status(v.status).json({ error: v.error });
  try {
    const result = await extractTasks(v.text, "Pasted text");
    res.json(result);
  } catch (error) {
    console.error("Text extract-tasks error:", error.message);
    handleTextAIError(error, res);
  }
}

async function simplifyTextHandler(req, res) {
  const v = validateText(req.body);
  if (!v.ok) return res.status(v.status).json({ error: v.error });
  try {
    const simplified = await simplifyText(v.text);
    res.json({ simplified });
  } catch (error) {
    console.error("Text simplify error:", error.message);
    handleTextAIError(error, res);
  }
}

async function suggestReplyFromText(req, res) {
  const v = validateText(req.body);
  if (!v.ok) return res.status(v.status).json({ error: v.error });
  const tone = normalizeTone(req.body?.tone);
  try {
    // No sender/subject for pasted text; pass tone so the reply matches it.
    const reply = await suggestReply(v.text, "Pasted text", "", tone);
    res.json({ reply });
  } catch (error) {
    console.error("Text suggest-reply error:", error.message);
    handleTextAIError(error, res);
  }
}

function handleTextAIError(error, res) {
  if (error.message.includes("GEMINI_API_KEY")) {
    return res.status(503).json({ error: "AI service is not configured." });
  }
  if (error.message.includes("Failed to parse AI response")) {
    return res.status(502).json({ error: "AI returned an unexpected format. Please try again." });
  }
  return res.status(500).json({ error: "AI processing failed. Please try again." });
}

module.exports = {
  summarizeTextHandler,
  extractTasksFromText,
  simplifyTextHandler,
  suggestReplyFromText,
};
```

Notes:
- Subject is passed as the literal "Pasted text" so the existing summarize/extract prompts
  work unchanged without implying a fake email subject.
- `handleTextAIError` omits Gmail-specific branches (no Gmail involved) but keeps the same
  friendly, no-stack-trace contract.

### Change: `server/services/geminiService.js`

Add a `simplifyText` helper and make `suggestReply` tone-aware. The existing email
controller calls `suggestReply(body, subject, senderName)` (three args) — adding an
**optional 4th parameter** `tone` is backward compatible, defaulting to `professional`.

```js
const TONE_GUIDANCE = {
  professional: "Use a professional, courteous tone.",
  friendly: "Use a warm, friendly, approachable tone.",
  short: "Keep it very short and to the point (1-3 sentences).",
  apology: "Use an apologetic, understanding tone that takes responsibility politely.",
  thank_you: "Use a grateful, appreciative thank-you tone.",
  follow_up: "Use a polite follow-up tone that gently checks in on a prior message.",
};

// signature becomes: suggestReply(emailBody, subject, senderName, tone = "professional")
// Inside the prompt, replace the fixed "professional and courteous" line with:
//   const toneLine = TONE_GUIDANCE[tone] || TONE_GUIDANCE.professional;
// and inject `toneLine` into the Rules section.
```

New `simplifyText`:

```js
async function simplifyText(text) {
  const model = getModel();
  const prompt = `You are a text simplification assistant. Rewrite the following text in
plain, clear language that is easy to understand.

Rules:
- Only use information explicitly present in the text. Do not add, invent, or assume any
  details that are not in the original.
- Keep all important facts, names, dates, and numbers exactly as written.
- Prefer short sentences and common words.
- Do not summarize away key details — simplify the wording, keep the meaning.
- Return plain text only (no JSON, no markdown formatting).

Text:
${text}

Write ONLY the simplified version:`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// export it alongside the existing functions:
module.exports = { summarizeEmail, extractTasks, suggestReply, simplifyText };
```

Backward-compatibility guarantee: `summarizeEmail` and `extractTasks` are unchanged.
`suggestReply` keeps the same first three params and behavior when `tone` is omitted
(defaults to professional, matching today's prompt intent).

---

## Frontend Components

### Change: `client/src/services/ai.js`

Add four helpers (existing email helpers untouched):

```js
export async function summarizeText(text) {
  return apiFetch(`/ai/text/summarize`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function extractTasksFromText(text) {
  return apiFetch(`/ai/text/extract-tasks`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function simplifyText(text) {
  return apiFetch(`/ai/text/simplify`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function suggestReplyFromText(text, tone = "professional") {
  return apiFetch(`/ai/text/suggest-reply`, {
    method: "POST",
    body: JSON.stringify({ text, tone }),
  });
}
```

(`apiFetch` already sets `Content-Type: application/json`, injects the JWT, and throws on
non-2xx with `body.error`.)

### Change: `client/src/components/WorkspaceNav.jsx`

Insert the Text link in second position:

```js
const LINKS = [
  { to: "/dashboard", label: "Inbox" },
  { to: "/text", label: "Text" },
  { to: "/tasks", label: "Tasks" },
  { to: "/notes", label: "Notes" },
  { to: "/deadlines", label: "Deadlines" },
];
```

### Change: `client/src/App.jsx`

Import `TextAssistant` and add a protected route before the catch-all:

```jsx
<Route path="/text" element={<ProtectedRoute><TextAssistant /></ProtectedRoute>} />
```

### New file: `client/src/pages/TextAssistant.jsx`

State model (per action, mirroring EmailDetail's discipline of separate loading/error):

```
text                 string   (textarea content)
tone                 string   (reply tone, default "professional")
activeResult         "summary" | "tasks" | "simplified" | "reply" | null
summary/tasks/simplified/reply   result data (null when cleared)
loading              "summary" | "tasks" | "simplified" | "reply" | null  (single in-flight action)
error                friendly string | null
validationError      friendly string | null
copied / noteSaved / tasksSavedMsg   transient UI feedback
CHAR_LIMIT = 12000
```

Behavior:

- `runAction(kind)`:
  1. If `loading` is set, return (prevents duplicate requests).
  2. Trim `text`. If empty → set `validationError` "Please paste some text first.", return
     (no network).
  3. If `text.length > CHAR_LIMIT` → set `validationError` with the limit, return.
  4. Set `loading = kind`, clear `error` and `validationError`.
  5. Call the matching `ai.js` helper; on success store the result and set `activeResult`.
  6. On failure → `setError(friendlyError(err, <action-specific fallback>))`.
  7. Finally `loading = null`.
- All four action buttons get `disabled={Boolean(loading)}`; the active one shows a calm
  inline spinner + label (e.g., "Summarizing…").
- A live character counter under the textarea shows `text.length / 12000`, turning into a
  quiet warning style when over the limit.

Result panels (document-style, not chat):

- **Summary** panel: renders `summary.summary`, `keyPoints` list, `sentiment` badge.
  Actions: Copy (`summaryToText`), Save as note (`addNote({ title: "Pasted text summary",
  body: summary.summary, keyPoints, source: { type: "text" } })`), Clear.
- **Tasks** panel: renders task rows (text, deadline, priority) like EmailDetail.
  Actions: Copy (`tasksToText`), Save to board (`addTasks(payload)` with payload mapping
  `task→text`, `status: "todo"`, `source: { type: "text" }`), Clear. If no tasks: a quiet
  "No tasks found" message and no Save button.
- **Simplified** panel: renders `simplified` text in a `<pre>`/paper block.
  Actions: Copy, Save as note (`addNote({ title: "Simplified text", body: simplified,
  source: { type: "text" } })`), Clear.
- **Reply** panel: renders `reply` in a paper block with the safety note
  "This is a draft suggestion. Review before sending." Actions: Copy, Clear only.
  No Send action anywhere.

Save-to-board mapping (identical contract to EmailDetail, source changed to text):

```js
const payload = tasks.tasks.map((t) => ({
  text: t.task,
  deadline: t.deadline || null,
  priority: t.priority || null,
  status: "todo",
  source: { type: "text" },
}));
addTasks(payload); // dedupes; returns added[]
```

### Styling (`client/src/App.css`)

Reuse existing classes wherever possible: `email-sheet`, `ai-panel`, `ai-result-section`,
`ai-result-head`, `btn-chip`, `ai-reply-note`, `ai-loading`, `spinner`, `priority-badge`,
`workspace-nav`. Add a thin set of `text-assistant-*` classes only as needed for the
paper-style textarea and the page header/subtitle, matching the existing paper/document
palette. The textarea is styled as a paper sheet (cream surface, subtle ruled/inset feel),
results as document panels. No chat bubbles. Responsive down to ~375px (buttons wrap, full
width inputs), consistent with the existing nav's mobile behavior.

Page copy:
- Title: "Text Assistant"
- Subtitle: "Paste a message, class announcement, or assignment instruction. Turn it into a
  summary, tasks, or a reply draft."
- Placeholder: "Paste an email, message, announcement, or assignment instructions here..."

---

## Data Models

No new persisted server models. Reused client store shapes (from `store.js`):

- Task (saved): `{ id, text, deadline, priority, status, source: { type: "text" },
  createdAt, updatedAt }`
- Note (saved): `{ id, title, body, keyPoints, source: { type: "text" }, createdAt }`

API response shapes:

| Endpoint | Response |
|---|---|
| `POST /api/ai/text/summarize` | `{ summary, keyPoints: string[], sentiment }` |
| `POST /api/ai/text/extract-tasks` | `{ tasks: [{ task, deadline, priority }] }` |
| `POST /api/ai/text/simplify` | `{ simplified: string }` |
| `POST /api/ai/text/suggest-reply` | `{ reply: string }` |
| Error (any) | `{ error: string }` with appropriate HTTP status |

---

## Error Handling

- **Client-side validation** (empty / too long) happens before any network call and shows
  an inline friendly message.
- **Server-side validation** mirrors the same checks (400 + friendly `{ error }`), so the
  contract holds even if a request is crafted directly.
- **AI/runtime failures** map through `handleTextAIError` to 503 (key missing), 502 (parse
  failure), or 500 (generic) with friendly JSON — never a stack trace.
- **Client display** routes all caught errors through `friendlyError`, which already
  strips status codes and technical phrasing.
- **Auth failures** (401) are handled by the existing `apiFetch` (clears token, redirects
  to `/login`).

---

## Security & Privacy

- Gemini key read only from `process.env.GEMINI_API_KEY` server-side; never returned, never
  added as a `VITE_*` var.
- All `/api/ai/text/*` routes require the existing JWT `authenticate` middleware.
- Pasted text is sent to the server for the single request and not persisted server-side.
- Local stores persist only AI output / user-organized data with `source: { type: "text" }`
  — no tokens, JWT, key, or `.env` values (guaranteed by `store.js`).
- No email is sent through any path; reply is copy/review only.
- 12000-char cap bounds request size and AI cost.

---

## Testing Strategy

Verification commands (per the feature request):

- Frontend build: `npm run build --prefix inboxpilot/client` → must succeed.
- Backend syntax checks (run on each changed/added backend file):
  - `node --check inboxpilot/server/index.js`
  - `node --check inboxpilot/server/routes/aiRoutes.js`
  - `node --check inboxpilot/server/routes/textAiRoutes.js`
  - `node --check inboxpilot/server/controllers/textAiController.js`
  - `node --check inboxpilot/server/services/geminiService.js`
- Do **not** start the full backend (would connect to real MongoDB credentials).

Manual checks (smoke):
- `/login`, `/dashboard`, `/emails/:id`, `/tasks`, `/notes`, `/deadlines` still work.
- `/text` loads; empty-text validation works; each of the four actions works with pasted
  text; Copy works; Save summary → note; Save tasks → board; saved text tasks appear in
  `/tasks`; dated text tasks appear in `/deadlines`; ~375px layout is usable; no new
  console errors.

---

## Deployment Risk

- **Vercel (client):** new SPA route `/text` relies on the existing rewrite in
  `vercel.json` that serves `index.html` for client routes; no new build config. Verify the
  rewrite catches `/text` (same mechanism as `/tasks`, `/notes`, `/deadlines`).
- **Render (server):** no new env vars, no new dependencies, no new top-level mount required
  (nested under existing `/api/ai`). Existing `GEMINI_API_KEY` already powers the email AI
  endpoints, so the text endpoints work with current config.
- **Low risk:** additive change; existing routes and behavior untouched.

---

## Changed/Added Files Summary

Backend:
- `server/routes/textAiRoutes.js` (new)
- `server/controllers/textAiController.js` (new)
- `server/routes/aiRoutes.js` (change: nest text router)
- `server/services/geminiService.js` (change: add `simplifyText`, tone-aware `suggestReply`)

Frontend:
- `client/src/pages/TextAssistant.jsx` (new)
- `client/src/services/ai.js` (change: add 4 helpers)
- `client/src/components/WorkspaceNav.jsx` (change: add Text link)
- `client/src/App.jsx` (change: add `/text` route)
- `client/src/App.css` (change: add minimal `text-assistant-*` styles)

No changes to `package.json`, `package-lock.json`, `.env`, OAuth, Gmail scope, or existing
email AI endpoints.
