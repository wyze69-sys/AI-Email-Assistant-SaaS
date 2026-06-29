/**
 * Browser-side UI helpers (no backend calls).
 * Keeps user-facing copy friendly and avoids leaking technical wording.
 */

/**
 * Turn an Error / message into user-friendly text.
 * Never exposes raw status codes, stack traces, or "fetch" wording.
 */
export function friendlyError(err, fallback = "Something went wrong. Please try again.") {
  const raw = (err && err.message ? err.message : String(err || "")).trim();
  const lower = raw.toLowerCase();

  // Network / server unreachable
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("load failed")) {
    return "Can't reach the server. Check your connection and try again.";
  }

  // Rate limited (AI provider busy)
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("quota")) {
    return "The AI service is busy right now. Please try again in a moment.";
  }

  // Server-side errors
  if (/\b5\d\d\b/.test(raw) || lower.includes("internal server")) {
    return "Something went wrong on our end. Please try again.";
  }

  // Not found
  if (lower.includes("404") || lower.includes("not found")) {
    return "We couldn't find what you were looking for.";
  }

  // Generic "request failed (NNN)" pattern — strip the technical part
  if (/request failed/.test(lower)) {
    return fallback;
  }

  // If the message looks human-readable (short, no codes/symbols), keep it.
  const looksTechnical =
    raw.length > 140 ||
    /[{}\[\]<>]/.test(raw) ||
    /\b\d{3}\b/.test(raw) ||
    /https?:\/\//.test(raw) ||
    raw.includes("Error:");

  if (raw && !looksTechnical) {
    return raw;
  }

  return fallback;
}

/**
 * Copy text to the clipboard. Returns true on success, false otherwise.
 * Falls back to a hidden textarea when the async Clipboard API is unavailable
 * (e.g. non-secure local contexts).
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Format a summary result as plain text for copying.
 */
export function summaryToText(summary) {
  if (!summary) return "";
  const lines = [];
  if (summary.summary) lines.push(summary.summary);
  if (summary.keyPoints && summary.keyPoints.length > 0) {
    lines.push("", "Key points:");
    summary.keyPoints.forEach((p) => lines.push(`- ${p}`));
  }
  if (summary.sentiment) {
    lines.push("", `Tone: ${summary.sentiment}`);
  }
  return lines.join("\n");
}

/**
 * Format extracted tasks as plain text for copying.
 */
export function tasksToText(tasks) {
  if (!tasks || tasks.length === 0) return "";
  return tasks
    .map((t, i) => {
      const parts = [`${i + 1}. ${t.task}`];
      if (t.deadline) parts.push(`(due ${t.deadline})`);
      if (t.priority) parts.push(`[${t.priority} priority]`);
      return parts.join(" ");
    })
    .join("\n");
}

/**
 * Local AI result history (per email, browser-only).
 *
 * Stores ONLY AI tool output and the timestamp it was generated.
 * It never stores Gmail OAuth tokens, the JWT, or the raw email body.
 * Results are namespaced per email id so returning to an email rehydrates
 * the last AI output the user generated on this device.
 *
 * Key format: inboxpilot:ai-results:v1:{emailId}
 */
const AI_RESULTS_PREFIX = "inboxpilot:ai-results:v1:";

function aiResultsKey(emailId) {
  return `${AI_RESULTS_PREFIX}${emailId}`;
}

/**
 * True when localStorage can actually be read/written in this context.
 * Some browsers throw on access (private mode, disabled storage), so we probe.
 */
function storageAvailable() {
  try {
    const probe = "__inboxpilot_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read all saved AI results for an email id.
 * Returns an object like { summary, tasks, reply } where each value is
 * { data, generatedAt } — or an empty object if nothing is saved / on any error.
 * Never throws.
 */
export function loadAiResults(emailId) {
  if (!emailId || !storageAvailable()) return {};
  try {
    const raw = window.localStorage.getItem(aiResultsKey(emailId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    // Corrupt JSON or read error — degrade silently with no saved results.
    return {};
  }
}

/**
 * Save (or replace) a single AI tool result for an email id.
 * `tool` is one of "summary" | "tasks" | "reply".
 * Stores the result plus a generated timestamp. Returns true on success.
 * Never throws.
 */
export function saveAiResult(emailId, tool, data) {
  if (!emailId || !tool || !storageAvailable()) return false;
  try {
    const current = loadAiResults(emailId);
    current[tool] = { data, generatedAt: Date.now() };
    window.localStorage.setItem(aiResultsKey(emailId), JSON.stringify(current));
    return true;
  } catch {
    // Quota exceeded or serialization error — fail quietly.
    return false;
  }
}

/**
 * Remove a single saved AI tool result for an email id.
 * Cleans up the whole entry when nothing else remains. Never throws.
 */
export function clearAiResult(emailId, tool) {
  if (!emailId || !tool || !storageAvailable()) return;
  try {
    const current = loadAiResults(emailId);
    if (!(tool in current)) return;
    delete current[tool];
    if (Object.keys(current).length === 0) {
      window.localStorage.removeItem(aiResultsKey(emailId));
    } else {
      window.localStorage.setItem(aiResultsKey(emailId), JSON.stringify(current));
    }
  } catch {
    // Ignore — nothing else we can safely do here.
  }
}

/**
 * Remove every saved AI result for an email id. Never throws.
 */
export function clearAllAiResults(emailId) {
  if (!emailId || !storageAvailable()) return;
  try {
    window.localStorage.removeItem(aiResultsKey(emailId));
  } catch {
    // Ignore.
  }
}

/**
 * Format a stored timestamp into a short, friendly "saved locally" label.
 * Falls back to a plain label if the timestamp is missing or invalid.
 */
export function savedLocallyLabel(generatedAt) {
  if (!generatedAt) return "Saved locally";
  try {
    const when = new Date(generatedAt);
    if (Number.isNaN(when.getTime())) return "Saved locally";
    const time = when.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return `Saved locally · ${time}`;
  } catch {
    return "Saved locally";
  }
}
