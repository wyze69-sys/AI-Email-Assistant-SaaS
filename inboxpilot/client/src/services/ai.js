import apiFetch from "./api.js";
import { triageEmail, DISPLAY_LABELS } from "./triage.js";

/**
 * Summarize an email via AI.
 * Returns: { summary, keyPoints, sentiment }
 */
export async function summarizeEmail(emailId) {
  return apiFetch(`/ai/summarize/${emailId}`, { method: "POST" });
}

/**
 * Extract tasks from an email via AI.
 * Returns: { tasks: [{ task, deadline, priority }] }
 */
export async function extractTasks(emailId) {
  return apiFetch(`/ai/extract-tasks/${emailId}`, { method: "POST" });
}

/**
 * Get AI suggested reply for an email.
 * Returns: { reply: "text" }
 */
export async function suggestReply(emailId) {
  return apiFetch(`/ai/suggest-reply/${emailId}`, { method: "POST" });
}
/**
 * Summarize pasted text via AI.
 * Returns: { summary, keyPoints, sentiment }
 */
export async function summarizeText(text) {
  return apiFetch(`/ai/text/summarize`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

/**
 * Extract tasks from pasted text via AI.
 * Returns: { tasks: [{ task, deadline, priority }] }
 */
export async function extractTasksFromText(text) {
  return apiFetch(`/ai/text/extract-tasks`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

/**
 * Simplify pasted text into plain, clear language via AI.
 * Returns: { simplified }
 */
export async function simplifyText(text) {
  return apiFetch(`/ai/text/simplify`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

/**
 * Get an AI suggested reply for pasted text.
 * Returns: { reply }
 */
export async function suggestReplyFromText(text, tone = "professional") {
  return apiFetch(`/ai/text/suggest-reply`, {
    method: "POST",
    body: JSON.stringify({ text, tone }),
  });
}

// ---------------------------------------------------------------------------
// Optional AI Priority Review (R8) — frontend-only, additive.
//
// Reuses the existing `summarizeText` wrapper (POST /api/ai/text/summarize).
// No backend change, no new env var, package, OAuth scope, route, or Gmail
// write. Composes a compact text from the email and maps the AI summary
// response into an advisory { priority, category, reason, suggestedAction }.
// ---------------------------------------------------------------------------

// Matches backend MAX_TEXT_LENGTH so we never send more than the API accepts.
const TEXT_LIMIT = 12000;

/**
 * Compose a compact text from the current email's fields.
 * Only subject, from, snippet, and body are sent (R8.3); the result is sliced
 * to TEXT_LIMIT. Pure: never mutates `email`.
 *
 * @param {object} email - { subject, from, snippet, body, ... }
 * @returns {string} composed text, capped to TEXT_LIMIT chars
 */
export function composeEmailText(email) {
  const subject = email?.subject || "(no subject)";
  const from = email?.from || "Unknown sender";
  const snippet = email?.snippet || "";
  const body = email?.body || "";
  const composed =
    `Subject: ${subject}\nFrom: ${from}\n` +
    (snippet ? `Snippet: ${snippet}\n` : "") +
    `\n${body}`;
  return composed.slice(0, TEXT_LIMIT);
}

// Sentiment → priority mapping (R8.4). Always resolves to high|medium|low.
const SENTIMENT_TO_PRIORITY = {
  urgent: "high",
  negative: "medium",
  neutral: "low",
  positive: "low",
};

// Suggested action keyed by rule-based primary category id (R8.4).
const SUGGESTED_ACTION = {
  important: "Review this soon — it may need your attention.",
  needs_reply: "Consider replying.",
  has_task: "Add the action item to your tasks.",
  receipt: "File this for your records.",
  notification: "No action needed — informational.",
  promotion: "Optional — read only if interested.",
  newsletter: "Read later when you have time.",
  low_priority: "Low priority — handle later.",
  possible_spam: "Be cautious — this looks spam-like.",
};

/**
 * Map an AI summary response + email into an advisory review result.
 * PURE: no I/O, no mutation. The rule-based primary (from `triageEmail`)
 * informs category and suggested action; sentiment drives priority.
 *
 * @param {{ summary?: string, keyPoints?: string[], sentiment?: string }} summaryResponse
 * @param {object} email - the same email shape consumed by `triageEmail`
 * @returns {{ priority: "high"|"medium"|"low", category: string, reason: string, suggestedAction: string }}
 */
export function mapReview(summaryResponse, email) {
  const res = summaryResponse;

  // Rule-based primary informs category + suggested action.
  const primary = triageEmail(email).primary;

  // priority: prefer sentiment; lift low → medium when the rule-based primary
  // is actionable. Always one of high|medium|low.
  let priority = SENTIMENT_TO_PRIORITY[res?.sentiment] || "low";
  const isActionable =
    primary && ["important", "needs_reply", "has_task"].includes(primary);
  if (isActionable && priority === "low") priority = "medium";

  // category: rule-based primary's display text, else sentiment word, else "General".
  const category = primary ? DISPLAY_LABELS[primary] : res?.sentiment || "General";

  // reason: first sentence of the AI summary, trimmed to <=200 chars.
  const summaryText = (res?.summary || "").trim();
  const reason = summaryText
    ? (summaryText.split(/(?<=[.!?])\s/)[0] || summaryText).slice(0, 200)
    : "No clear priority signal found.";

  // suggestedAction: derived from the rule-based primary category.
  const suggestedAction = primary
    ? SUGGESTED_ACTION[primary] || "Review when convenient."
    : "Review when convenient.";

  return { priority, category, reason, suggestedAction };
}

/**
 * Optional AI priority review for a single email (R8).
 * Reuses summarizeText (POST /api/ai/text/summarize). No backend change.
 *
 * @param {object} email - { subject, from, snippet, body, ... }
 * @returns {Promise<{ priority: "high"|"medium"|"low", category: string, reason: string, suggestedAction: string }>}
 */
export async function reviewEmailPriority(email) {
  const text = composeEmailText(email);
  const res = await summarizeText(text); // { summary, keyPoints, sentiment }
  return mapReview(res, email);
}
