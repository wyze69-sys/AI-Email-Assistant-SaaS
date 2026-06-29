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
