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
