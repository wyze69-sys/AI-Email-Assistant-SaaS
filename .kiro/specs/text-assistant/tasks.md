# Implementation Plan — Text Assistant

- [x] 1. Add server-side Gemini helpers (simplify + tone-aware reply)
  - In `inboxpilot/server/services/geminiService.js`, add a `simplifyText(text)` function that rewrites input in plain language without inventing facts, returning trimmed plain text.
  - Add a `TONE_GUIDANCE` map for tones: professional, friendly, short, apology, thank_you, follow_up.
  - Extend `suggestReply` with an optional 4th param `tone = "professional"`; inject the matching tone guidance line into the prompt, falling back to professional for unknown tones.
  - Keep `summarizeEmail` and `extractTasks` unchanged; export `simplifyText` alongside existing functions.
  - Verify: `node --check inboxpilot/server/services/geminiService.js`.
  - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4_

- [x] 2. Add text AI controller with validation
  - Create `inboxpilot/server/controllers/textAiController.js`.
  - Implement `validateText(body)` (present, non-empty after trim, ≤ 12000 chars) returning friendly 400 `{ error }` and skipping Gemini on failure.
  - Implement `normalizeTone(tone)` falling back to `professional`.
  - Implement handlers: `summarizeTextHandler` (→ `summarizeEmail(text, "Pasted text")`), `extractTasksFromText` (→ `extractTasks(text, "Pasted text")`), `simplifyTextHandler` (→ `{ simplified }`), `suggestReplyFromText` (→ `suggestReply(text, "Pasted text", "", tone)` returning `{ reply }`).
  - Add a local `handleTextAIError` (503 key missing, 502 parse failure, 500 generic) with no Gmail branches and no stack traces.
  - Verify: `node --check inboxpilot/server/controllers/textAiController.js`.
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.11, 6.3, 7.1, 7.2, 7.3, 8.1_

- [x] 3. Add text AI router and nest under existing AI routes
  - Create `inboxpilot/server/routes/textAiRoutes.js` with `router.use(authenticate)` and POST routes: `/summarize`, `/extract-tasks`, `/simplify`, `/suggest-reply` mapped to the controller handlers.
  - In `inboxpilot/server/routes/aiRoutes.js`, require the new router and add `router.use("/text", textAiRoutes)` after the existing email routes; leave existing email routes unchanged and `index.js` untouched.
  - Verify: `node --check inboxpilot/server/routes/textAiRoutes.js` and `node --check inboxpilot/server/routes/aiRoutes.js` (and `node --check inboxpilot/server/index.js`).
  - _Requirements: 3.1, 3.10, 8.3_

- [x] 4. Add frontend AI service helpers for text endpoints
  - In `inboxpilot/client/src/services/ai.js`, add `summarizeText(text)`, `extractTasksFromText(text)`, `simplifyText(text)`, and `suggestReplyFromText(text, tone = "professional")` using `apiFetch` with JSON bodies.
  - Leave existing email helpers untouched.
  - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 8.1_

- [x] 5. Add the `/text` route and nav link
  - In `inboxpilot/client/src/components/WorkspaceNav.jsx`, add `{ to: "/text", label: "Text" }` in second position (Inbox, Text, Tasks, Notes, Deadlines).
  - In `inboxpilot/client/src/App.jsx`, import `TextAssistant` and add a `ProtectedRoute`-wrapped `/text` route before the catch-all.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6. Build the Text Assistant page
  - Create `inboxpilot/client/src/pages/TextAssistant.jsx` with the paper-style textarea (placeholder copy), title, subtitle, char counter (limit 12000), tone dropdown, and four action buttons (Summarize, Extract tasks, Simplify, Draft reply).
  - Implement per-action state and a single `loading` guard that disables all action buttons during a request and prevents duplicate requests; show a calm inline loading label/spinner.
  - Client-side validation: empty/whitespace → inline friendly message, no network; over-limit → friendly message with the limit, no network. Route caught errors through `friendlyError`.
  - Render document-style result panels (not chat): Summary (summary/keyPoints/sentiment), Tasks (rows with deadline/priority), Simplified (paper block), Reply (paper block + safety note "This is a draft suggestion. Review before sending.").
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 7. Wire result actions to local stores
  - Copy on every result via `copyToClipboard` (use `summaryToText`/`tasksToText` for structured results).
  - Save as note for Summary and Simplified via `addNote({ ..., source: { type: "text" } })`.
  - Save to board for Tasks via `addTasks(payload)` mapping `task→text`, `deadline`, `priority`, `status: "todo"`, `source: { type: "text" }`; show added/duplicate feedback.
  - Clear action on every panel removes the displayed result. Reply panel exposes Copy + Clear only (no Send).
  - Confirm no tokens/keys are persisted (rely on existing `store.js` guarantees).
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.2, 8.1_

- [x] 8. Add minimal paper/document styles
  - In `inboxpilot/client/src/App.css`, add minimal `text-assistant-*` classes for the page header, subtitle, paper-style textarea, char counter, tone select, and panel layout, reusing existing classes (`ai-result-section`, `ai-result-head`, `btn-chip`, `ai-reply-note`, `ai-loading`, `spinner`, `priority-badge`, `workspace-nav`) where possible.
  - Ensure the layout is usable at ~375px (buttons wrap, full-width inputs, no horizontal overflow). No chat-bubble styling.
  - _Requirements: 2.1, 2.8, 7.6_

- [x] 9. Verify build, syntax, and scope safety
  - Run `npm run build --prefix inboxpilot/client` and confirm success.
  - Run `node --check` on: `inboxpilot/server/index.js`, `inboxpilot/server/routes/aiRoutes.js`, `inboxpilot/server/routes/textAiRoutes.js`, `inboxpilot/server/controllers/textAiController.js`, `inboxpilot/server/services/geminiService.js`.
  - Confirm no changes to `package.json`, `package-lock.json`, `.env`, OAuth, Gmail scope, or existing email AI endpoints; do not start the full backend.
  - _Requirements: 8.2, 8.4, 8.5, 8.6_
