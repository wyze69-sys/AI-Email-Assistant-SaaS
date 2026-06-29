import apiFetch from "./api.js";

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
