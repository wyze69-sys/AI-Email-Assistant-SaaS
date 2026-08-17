const {
  summarizeEmail,
  extractTasks,
  suggestReply,
  simplifyText,
} = require("../services/geminiService");

const MAX_TEXT_LENGTH = 12000;
const ALLOWED_TONES = ["professional", "friendly", "short", "apology", "thank_you", "follow_up"];

/**
 * Validate the pasted text from a request body.
 * Returns { ok: true, text } when text is a non-empty string (after trim) within the limit.
 * Returns { ok: false, status, error } with a friendly message otherwise.
 * Never calls Gemini.
 */
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

/**
 * Normalize a requested reply tone, falling back to "professional" for unknown values.
 */
function normalizeTone(tone) {
  return ALLOWED_TONES.includes(tone) ? tone : "professional";
}

/**
 * POST /api/ai/text/summarize
 * Summarize arbitrary pasted text.
 */
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

/**
 * POST /api/ai/text/extract-tasks
 * Extract tasks from arbitrary pasted text.
 */
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

/**
 * POST /api/ai/text/simplify
 * Rewrite arbitrary pasted text in plain language.
 */
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

/**
 * POST /api/ai/text/suggest-reply
 * Generate a review-only reply draft for arbitrary pasted text, with an optional tone.
 */
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

/**
 * Friendly error handler for text AI endpoints.
 * No Gmail-specific branches and no stack traces are exposed.
 */
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
