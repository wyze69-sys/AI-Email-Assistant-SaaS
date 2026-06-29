# Requirements Document

## Introduction

Inbox Triage adds lightweight, rule-based labels to inbox emails in InboxPilot, plus an optional, manually-triggered AI priority review on a single email. The goal is to help users quickly identify emails that may need attention, may contain tasks, may need a reply, or may be low priority / spam-like — entirely on the frontend, using email data that is already loaded (subject, from, to, date, labelIds, body, snippet).

Triage is advisory only. It never modifies Gmail in any way: no delete, archive, label, mark-read, modify, or send. The rule-based engine is the must-have core and works fully without AI. The AI priority review is optional and conditional: it may only ship if it can reuse an existing backend AI endpoint with no new environment variables, no new packages, no OAuth scope change, and no Gmail modification; otherwise it is skipped with a documented reason and no broken UI is left behind.

The feature also includes an inspection-only Provider-Switch Report describing how difficult it would be to later switch the backend AI provider to a free OpenAI-compatible/free provider. This feature performs no provider change.

## Glossary

- **Triage_Engine**: A frontend pure function `triageEmail(email)` that classifies a single email into triage categories using deterministic, case-insensitive rules over the email's subject, snippet, from, to, labelIds, and body preview. It returns a result object `{ primary, labels, score, reasons }`.
- **Triage_Result**: The object returned by the Triage_Engine: `primary` (a category id or null), `labels` (an ordered array of category ids, capped at three), `score` (an integer priority score), and `reasons` (an array of short human-readable strings).
- **Triage_Category**: One of the internal category ids: `important`, `needs_reply`, `has_task`, `newsletter`, `promotion`, `receipt`, `notification`, `low_priority`, `possible_spam`.
- **Triage_Label**: The user-facing display text for a Triage_Category (for example, `important` displays as "Important").
- **Triage_Filter**: A client-side filter on the Dashboard that narrows the already-loaded email list by Triage_Category without calling the Gmail backend. Filter set: All, Important, Needs reply, Has task, Low priority, Newsletters, Receipts, Possible spam.
- **Inbox_View**: The Dashboard page (`Dashboard.jsx`) showing the email list.
- **Email_List**: The component (`EmailList.jsx`) rendering each email row/card.
- **Email_Detail**: The single-email page (`EmailDetail.jsx`) showing email content plus the AI assistant panel.
- **AI_Priority_Review**: An optional, manually-triggered review on Email_Detail that requests a priority assessment for the current email and returns `{ priority, category, reason, suggestedAction }`.
- **Gmail_Query_Filter**: The existing Dashboard filter chips (FILTERS array) that map to Gmail search queries and call the backend. These are separate from Triage_Filters.
- **Provider_Switch_Report**: An inspection-only written deliverable describing the effort to switch the backend AI provider later.
- **Read_Only_Guarantee**: The system constraint that Gmail data is only read, never modified.

## Requirements

### Requirement 1: Rule-Based Triage Engine

**User Story:** As a user, I want each email classified by simple content rules, so that I can see at a glance what kind of message it is without any AI.

#### Acceptance Criteria

1. THE Triage_Engine SHALL expose a function `triageEmail(email)` that accepts a single email object and returns a Triage_Result containing `primary`, `labels`, `score`, and `reasons`.
2. THE Triage_Engine SHALL evaluate rules using case-insensitive matching over the email subject, snippet, from, to, labelIds, and body preview.
3. WHEN an email field used by a rule is missing or undefined, THE Triage_Engine SHALL treat that field as empty and continue classification without raising an error.
4. THE Triage_Engine SHALL return `labels` as an array containing at most three Triage_Category ids.
5. THE Triage_Engine SHALL return `score` as an integer.
6. THE Triage_Engine SHALL return `reasons` as an array of strings, where each string explains one matched rule.
7. WHEN no classification rule matches an email, THE Triage_Engine SHALL return `primary` as null and `labels` as an empty array.
8. THE Triage_Engine SHALL be a pure function that returns the same Triage_Result for the same input email without modifying the input email object.

### Requirement 2: Triage Category Rules

**User Story:** As a user, I want emails categorized by recognizable keywords and sender patterns, so that the labels reflect the message content.

#### Acceptance Criteria

1. WHEN an email subject or snippet contains any of "urgent", "important", "action required", "deadline", "due today", "due tomorrow", or mentions "meeting", "interview", "invoice", "payment", or "security", and the sender is not a no-reply address, THE Triage_Engine SHALL assign the `important` category.
2. WHERE the email labelIds include "IMPORTANT", THE Triage_Engine SHALL contribute the `important` category.
3. WHEN an email subject, snippet, or body preview contains "?", "please reply", "let me know", "can you", "could you", "confirm", "available", or "thoughts?", THE Triage_Engine SHALL assign the `needs_reply` category.
4. WHEN an email subject, snippet, or body preview contains "please", "need to", "submit", "review", "complete", "send", "schedule", "prepare", "by friday", "by tomorrow", or "deadline", THE Triage_Engine SHALL assign the `has_task` category.
5. WHEN an email subject, snippet, or body preview contains "unsubscribe", "newsletter", "digest", or "weekly update", THE Triage_Engine SHALL assign the `newsletter` category.
6. WHEN an email subject, snippet, or body preview contains "sale", "discount", "offer", "deal", "coupon", or "limited time", THE Triage_Engine SHALL assign the `promotion` category.
7. WHEN an email subject, snippet, or body preview contains "receipt", "invoice", "order", "payment", "transaction", "subscription", or "paid", THE Triage_Engine SHALL assign the `receipt` category.
8. WHEN the sender address contains "noreply", "no-reply", or "notification", or the subject/snippet contains "alert", "verification code", "security code", or "login attempt", THE Triage_Engine SHALL assign the `notification` category.
9. WHEN an email subject, snippet, or body preview contains "prize", "winner", "free gift", "claim now", "urgent money", or "crypto", THE Triage_Engine SHALL assign the `possible_spam` category.
10. WHEN an email is assigned `newsletter`, `promotion`, or `notification` AND is not assigned `important`, `needs_reply`, or `has_task`, THE Triage_Engine SHALL assign the `low_priority` category.

### Requirement 3: Priority and Label Selection Logic

**User Story:** As a user, I want the most meaningful label shown first and a limited number of labels, so that the inbox stays readable and actionable items stand out.

#### Acceptance Criteria

1. WHEN an email is assigned both an actionable category (`important`, `needs_reply`, or `has_task`) and `low_priority`, THE Triage_Engine SHALL exclude `low_priority` from the returned `labels`.
2. WHEN an email is assigned `possible_spam`, THE Triage_Engine SHALL include `possible_spam` in the returned `labels` without removing the email from any list and without marking it for deletion.
3. WHEN more than three categories match an email, THE Triage_Engine SHALL return the three highest-priority categories ordered with the highest-priority category first.
4. THE Triage_Engine SHALL set `primary` to the first category in the returned `labels` when at least one category matches.
5. THE Triage_Engine SHALL compute `score` such that emails with actionable categories receive a higher score than emails with only `low_priority`, `newsletter`, `promotion`, or `notification` categories.

### Requirement 4: Triage Labels on Inbox Rows

**User Story:** As a user, I want triage labels shown on each email in the inbox, so that I can scan my inbox and spot relevant messages quickly.

#### Acceptance Criteria

1. WHEN the Email_List renders an email, THE Email_List SHALL display the Triage_Labels corresponding to that email's Triage_Result.
2. THE Email_List SHALL display at most three Triage_Labels per email row.
3. THE Email_List SHALL render each Triage_Label using its user-facing display text (for example, `needs_reply` displays as "Needs reply").
4. THE Email_List SHALL render Triage_Labels using a subtle, document-style visual treatment that does not use loud warning colors.
5. WHEN an email is assigned `possible_spam`, THE Email_List SHALL display the "Possible spam" label in a visible but non-alarming style.
6. WHEN an email has no matching Triage_Category, THE Email_List SHALL render the email row without any Triage_Label.

### Requirement 5: Client-Side Triage Filters

**User Story:** As a user, I want to filter my already-loaded inbox by triage type, so that I can focus on one kind of message without re-querying Gmail.

#### Acceptance Criteria

1. THE Inbox_View SHALL display Triage_Filter controls for: All, Important, Needs reply, Has task, Low priority, Newsletters, Receipts, and Possible spam.
2. WHEN a user selects a Triage_Filter other than "All", THE Inbox_View SHALL display only the already-loaded emails whose Triage_Result includes the selected category, without calling the Gmail backend.
3. WHEN a user selects the "All" Triage_Filter, THE Inbox_View SHALL display all currently loaded emails.
4. THE Inbox_View SHALL keep Triage_Filters separate from the existing Gmail_Query_Filter chips so that selecting a Triage_Filter does not trigger a Gmail query.
5. WHERE displaying a per-filter count is straightforward, THE Inbox_View SHALL display the number of loaded emails matching each Triage_Filter.
6. WHEN a selected Triage_Filter matches no loaded emails, THE Inbox_View SHALL display the message "No messages match this filter."

### Requirement 6: Inbox Safety Copy

**User Story:** As a user, I want clear wording that triage is only a suggestion, so that I trust that Gmail is not being changed.

#### Acceptance Criteria

1. THE Inbox_View SHALL display the safety message "Labels are suggestions based on message content. Gmail is not modified."

### Requirement 7: Triage on Email Detail

**User Story:** As a user, I want to see the same triage labels and the reasons behind them when I open an email, so that I understand why an email was categorized.

#### Acceptance Criteria

1. WHEN the Email_Detail renders an email, THE Email_Detail SHALL display the Triage_Labels from that email's Triage_Result near the top of the page.
2. WHEN the Email_Detail renders an email with at least one reason, THE Email_Detail SHALL display the `reasons` from the Triage_Result.
3. THE Email_Detail SHALL display Triage_Labels and reasons without altering or blocking the existing Summarize, Extract tasks, and Suggest reply features.

### Requirement 8: Optional AI Priority Review (Conditional)

**User Story:** As a user, I want to optionally ask AI to review a single email's priority, so that I can get a second opinion on an email I am unsure about, without AI running automatically.

#### Acceptance Criteria

1. WHERE the AI_Priority_Review is shipped, THE Email_Detail SHALL display a "Review priority" control that the user must activate manually.
2. THE system SHALL NOT trigger the AI_Priority_Review automatically for any inbox email.
3. WHEN a user activates the "Review priority" control, THE AI_Priority_Review SHALL send only the current email's subject, sender, snippet, and body to an existing backend AI endpoint, and SHALL NOT introduce a new environment variable, package, OAuth scope, or Gmail modification.
4. WHEN the AI_Priority_Review completes successfully, THE Email_Detail SHALL display a result containing `priority` (one of high, medium, low), `category` (a short label), `reason` (one sentence), and `suggestedAction` (one sentence).
5. WHILE the AI_Priority_Review request is in progress, THE Email_Detail SHALL display a loading state.
6. IF the AI_Priority_Review request fails, THEN THE Email_Detail SHALL display an error state with a retry control and SHALL NOT modify Gmail.
7. WHEN the AI_Priority_Review completes successfully, THE Email_Detail SHALL cache the result in browser local storage under the key `inboxpilot:triage-ai:v1:{emailId}`.
8. WHEN a user revisits an email with a cached AI_Priority_Review result, THE Email_Detail SHALL restore the cached result from local storage.
9. WHERE the AI_Priority_Review is shipped, THE Email_Detail SHALL display the message "AI review is a suggestion. Gmail is not modified."
10. IF reusing an existing backend AI endpoint for the AI_Priority_Review is not obvious and safe, THEN the AI_Priority_Review SHALL be omitted, no "Review priority" control SHALL be rendered, and the rule-based triage SHALL ship without it.

### Requirement 9: Gmail Read-Only and Configuration Safety

**User Story:** As a project owner, I want strict guarantees that this feature does not change Gmail, credentials, dependencies, or deployment, so that the existing app stays safe.

#### Acceptance Criteria

1. THE system SHALL read Gmail data only and SHALL NOT delete, archive, label, mark-read, modify, or send any Gmail message.
2. THE system SHALL keep the existing Gmail OAuth scope unchanged.
3. THE system SHALL leave the `.env` file, environment variable names, and API keys unchanged, and SHALL NOT add new ones.
4. THE system SHALL leave `package.json` and `package-lock.json` unchanged, and SHALL NOT add new packages.
5. THE system SHALL preserve the existing AI summarize, extract-tasks, and suggest-reply features and their existing routes.
6. WHILE AI is unavailable or not invoked, THE rule-based triage SHALL function fully and SHALL NOT be blocked.
7. THE system SHALL keep the existing Vercel deployment configuration safe and functional.

### Requirement 10: Provider-Switch Report

**User Story:** As a project owner, I want a written report on the effort to switch AI providers later, so that I can plan a future migration without making any change now.

#### Acceptance Criteria

1. THE Provider_Switch_Report SHALL document where the current AI provider is configured.
2. THE Provider_Switch_Report SHALL list which files would need changes to switch the AI provider later.
3. THE Provider_Switch_Report SHALL state whether the backend AI code is easy to abstract behind a single service function.
4. THE Provider_Switch_Report SHALL list the environment variables currently used by the AI provider.
5. THE Provider_Switch_Report SHALL describe a safe future plan for swapping to a free OpenAI-compatible or free-tier provider.
6. THE system SHALL NOT change the AI provider or migrate backend AI code as part of this feature.

### Requirement 11: Build, Compatibility, and Verification

**User Story:** As a developer, I want the feature to build cleanly and not regress existing screens, so that I can ship it with confidence.

#### Acceptance Criteria

1. WHEN the client build command `npm run build --prefix inboxpilot/client` is run, THE system SHALL complete the build without errors.
2. WHEN the Inbox_View is rendered at a viewport width of approximately 375 pixels, THE Inbox_View SHALL display triage labels and Triage_Filters in a usable layout.
3. WHEN the Inbox_View and Email_Detail are used, THE system SHALL NOT introduce new browser console errors.
4. WHEN the Email_Detail is used, THE existing Summarize, Extract tasks, and Suggest reply features SHALL continue to function as before.
