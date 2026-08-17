# Requirements — Text Assistant

## Introduction

Text Assistant expands InboxPilot beyond Gmail. It adds a protected `/text` page where a
user can paste any text — a message, class announcement, assignment instruction, or
document excerpt — and use AI to summarize it, extract tasks, simplify it, or draft a
review-only reply.

The Gemini API key must stay server-side, so this feature adds a small set of
authenticated backend routes under `/api/ai/text` that reuse the existing
`geminiService` functions. The frontend reuses the existing local task/note stores
(`source: { type: "text" }`), the existing `apiFetch` client, and the established
paper/inbox/document visual identity.

This feature must not change the Google OAuth flow, the Gmail read-only scope, the
existing email AI endpoints, or any existing route behavior. No email is ever sent;
reply drafts remain copy/review only.

### Non-Goals / Out of Scope

- No automatic or manual email sending from this feature.
- No new VITE_* Gemini variable and no exposure of `.env` values to the browser.
- No changes to Google OAuth, Gmail scope, or existing `/api/ai/*` email endpoints.
- No new third-party packages unless strictly required (none are expected; `@google/generative-ai` already exists).
- No server-side persistence of pasted text or AI output (results stay in-page / local browser stores).

---

## Requirement 1 — Protected Text Assistant route

**User Story:** As a signed-in student, I want a dedicated `/text` page, so that I can use
AI tools on arbitrary pasted text without it being tied to a Gmail message.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to `/text` THEN the system SHALL render the Text Assistant page.
2. IF an unauthenticated user navigates to `/text` THEN the system SHALL redirect to `/login` using the existing `ProtectedRoute` pattern.
3. WHEN the Text Assistant page renders THEN the system SHALL show the workspace navigation with links in order: Inbox, Text, Tasks, Notes, Deadlines.
4. WHEN the user is on `/text` THEN the system SHALL mark the "Text" nav link as active.
5. WHEN routes `/login`, `/dashboard`, `/emails/:id`, `/tasks`, `/notes`, and `/deadlines` are visited THEN the system SHALL preserve their existing behavior unchanged.

---

## Requirement 2 — Paste and run AI actions

**User Story:** As a student, I want to paste text and run one of four AI actions, so that I
can quickly understand or act on the content.

#### Acceptance Criteria

1. WHEN the page renders THEN the system SHALL display a paper-style textarea with the placeholder "Paste an email, message, announcement, or assignment instructions here...".
2. WHEN the page renders THEN the system SHALL display the action buttons: Summarize, Extract tasks, Simplify, Draft reply.
3. WHEN the user clicks Summarize with valid text THEN the system SHALL call `POST /api/ai/text/summarize` and display the summary result.
4. WHEN the user clicks Extract tasks with valid text THEN the system SHALL call `POST /api/ai/text/extract-tasks` and display the extracted tasks.
5. WHEN the user clicks Simplify with valid text THEN the system SHALL call `POST /api/ai/text/simplify` and display the simplified text.
6. WHEN the user clicks Draft reply with valid text THEN the system SHALL call `POST /api/ai/text/suggest-reply` with a `tone` and display the draft reply.
7. WHEN the Draft reply action is available THEN the system SHALL let the user choose a tone from: professional, friendly, short, apology, thank_you, follow_up, defaulting to professional.
8. WHEN an AI result is returned THEN the system SHALL present it in a document-style panel (not a chat bubble interface).

---

## Requirement 3 — Backend text AI endpoints (server-side key)

**User Story:** As the system owner, I want the text AI endpoints to run server-side and
reuse existing services, so that the Gemini key never reaches the browser and existing
email behavior is untouched.

#### Acceptance Criteria

1. WHEN any `/api/ai/text/*` route is called THEN the system SHALL require the existing JWT `authenticate` middleware.
2. WHEN a request body is received THEN the system SHALL validate that `text` is present and is a non-empty string after trimming.
3. IF `text` is missing or empty THEN the system SHALL return HTTP 400 with a friendly JSON error and SHALL NOT call Gemini.
4. IF `text` exceeds 12000 characters THEN the system SHALL return HTTP 400 with a friendly JSON error and SHALL NOT call Gemini.
5. WHEN `POST /api/ai/text/summarize` succeeds THEN the system SHALL return `{ summary, keyPoints, sentiment }` (same shape as the email summary).
6. WHEN `POST /api/ai/text/extract-tasks` succeeds THEN the system SHALL return `{ tasks: [{ task, deadline, priority }] }` (same shape as email extract-tasks).
7. WHEN `POST /api/ai/text/simplify` succeeds THEN the system SHALL return a JSON body containing the simplified text in a documented field (e.g. `{ simplified }`).
8. WHEN `POST /api/ai/text/suggest-reply` succeeds THEN the system SHALL return `{ reply }` as plain text for review only.
9. IF `tone` is provided to suggest-reply AND is not one of the allowed tones THEN the system SHALL fall back to `professional` rather than erroring.
10. WHEN an endpoint reuses Gemini THEN the system SHALL call existing `geminiService` functions where possible and SHALL NOT modify the existing email AI endpoints, routes, or controllers' behavior.
11. WHEN the Gemini key is read THEN the system SHALL read it only from server-side `process.env` and SHALL NOT return it or any `.env` value in any response.

---

## Requirement 4 — Gemini service simplify helper

**User Story:** As a developer, I want a server-side simplify helper, so that the simplify
action has a dedicated Gemini function consistent with the existing service.

#### Acceptance Criteria

1. IF `geminiService.js` does not already export a simplify helper THEN the system SHALL add one server-side function for it.
2. WHEN the simplify helper runs THEN the system SHALL instruct the model to rephrase the input in plainer language without inventing facts not present in the input.
3. WHEN the simplify helper is added THEN the system SHALL keep all existing exported functions (`summarizeEmail`, `extractTasks`, `suggestReply`) and their behavior unchanged.
4. WHEN a text suggest-reply uses tone THEN the system MAY extend reply generation to accept an optional tone parameter without breaking the existing email `suggestReply` callers.

---

## Requirement 5 — Result actions: copy, save, clear

**User Story:** As a student, I want to copy, save, or clear results, so that I can keep the
output I find useful in my existing Task Board and Notes.

#### Acceptance Criteria

1. WHEN any result is shown THEN the system SHALL provide a Copy action that copies the result as plain text using the existing `copyToClipboard` helper.
2. WHEN a summary or simplified result is shown THEN the system SHALL provide a "Save as note" action that saves to the local notes store via `addNote` with `source: { type: "text" }`.
3. WHEN an extracted-tasks result is shown AND tasks exist THEN the system SHALL provide a "Save to board" action that saves to the local task store via `addTasks` with `source: { type: "text" }` and `status: "todo"`.
4. WHEN tasks are saved to the board THEN the system SHALL map each Gemini task into the store shape `{ text, deadline, priority, status, source }` (mapping `task` -> `text`).
5. WHEN any result is shown THEN the system SHALL provide a Clear action that removes the displayed result from the page.
6. WHEN dated tasks saved from Text Assistant exist THEN the Deadline Center SHALL display them automatically because it derives from the task store (no extra wiring required).
7. WHEN saving notes or tasks THEN the system SHALL NOT persist any token, JWT, Gemini key, or `.env` value (consistent with the existing store guarantees).

---

## Requirement 6 — Reply draft safety

**User Story:** As a student, I want reply drafts to be clearly review-only, so that I never
accidentally treat a draft as a sent message.

#### Acceptance Criteria

1. WHEN a draft reply result is shown THEN the system SHALL display the safety note "This is a draft suggestion. Review before sending."
2. WHEN a draft reply result is shown THEN the system SHALL provide only Copy (and Clear) actions and SHALL NOT provide any Send action.
3. WHEN the feature is used THEN the system SHALL NOT send any email through any path.

---

## Requirement 7 — Validation, errors, and loading

**User Story:** As a student, I want clear feedback and protection from mistakes, so that the
page feels calm and never shows raw technical errors.

#### Acceptance Criteria

1. IF the user runs an action with empty or whitespace-only text THEN the system SHALL show a friendly inline validation message and SHALL NOT make a network request.
2. IF the pasted text exceeds the 12000-character limit THEN the system SHALL show a friendly message (and SHALL indicate the limit to the user) and SHALL NOT make a network request.
3. WHEN a backend or network error occurs THEN the system SHALL show a friendly message via the existing `friendlyError` helper and SHALL NOT expose raw stack traces or status codes.
4. WHILE an action request is running THEN the system SHALL disable the action buttons and show a calm loading state.
5. WHILE an action request is running THEN the system SHALL prevent duplicate requests for the same action.
6. WHEN the layout is viewed at ~375px width THEN the system SHALL remain usable and readable without horizontal overflow.

---

## Requirement 8 — Privacy, deployment, and scope safety

**User Story:** As the project maintainer, I want the change to be small, reviewable, and
deploy-safe, so that it doesn't risk the existing Vercel/Render setup.

#### Acceptance Criteria

1. WHEN the feature is implemented THEN the system SHALL NOT add any `VITE_*` Gemini variable or move the Gemini key to the frontend.
2. WHEN the feature is implemented THEN the system SHALL NOT modify `package.json` or `package-lock.json` unless a new dependency is strictly required, and any such change SHALL be explained.
3. WHEN the feature is implemented THEN the system SHALL NOT change the Google OAuth flow, the Gmail scope, or existing Gmail email routes.
4. WHEN the frontend build `npm run build --prefix inboxpilot/client` runs THEN it SHALL complete successfully.
5. WHEN `node --check` runs on each changed backend file THEN it SHALL pass with no syntax errors.
6. WHEN the new route is added to the SPA THEN the system SHALL rely on the existing Vercel rewrite/`vercel.json` behavior so a direct visit to `/text` resolves to the SPA (no new server route needed on the static host).
