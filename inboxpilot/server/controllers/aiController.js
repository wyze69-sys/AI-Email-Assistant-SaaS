const { fetchEmailById } = require("../services/gmailService");
const { summarizeEmail, extractTasks, suggestReply } = require("../services/geminiService");

/**
 * POST /api/ai/summarize/:emailId
 * Fetches the email from Gmail using stored tokens, sends body to Gemini for summarization.
 */
async function summarize(req, res) {
  try {
    const { emailId } = req.params;
    const email = await fetchEmailById(req.user, emailId);

    if (!email || !email.body) {
      return res.status(400).json({ error: "Email has no body content to summarize." });
    }

    const result = await summarizeEmail(email.body, email.subject);
    res.json(result);
  } catch (error) {
    console.error("AI summarize error:", error.message);
    handleAIError(error, res);
  }
}

/**
 * POST /api/ai/extract-tasks/:emailId
 * Fetches the email from Gmail using stored tokens, sends body to Gemini for task extraction.
 */
async function extractTasksFromEmail(req, res) {
  try {
    const { emailId } = req.params;
    const email = await fetchEmailById(req.user, emailId);

    if (!email || !email.body) {
      return res.status(400).json({ error: "Email has no body content to extract tasks from." });
    }

    const result = await extractTasks(email.body, email.subject);
    res.json(result);
  } catch (error) {
    console.error("AI extract-tasks error:", error.message);
    handleAIError(error, res);
  }
}

/**
 * POST /api/ai/suggest-reply/:emailId
 * Fetches the email from Gmail using stored tokens, sends body to Gemini for reply suggestion.
 * Returns plain text suggestion — user must review before using.
 */
async function suggestReplyForEmail(req, res) {
  try {
    const { emailId } = req.params;
    const email = await fetchEmailById(req.user, emailId);

    if (!email || !email.body) {
      return res.status(400).json({ error: "Email has no body content to generate a reply for." });
    }

    // Extract sender name from "Name <email>" format
    let senderName = email.from || "";
    const nameMatch = senderName.match(/^(.+?)\s*<.+>$/);
    if (nameMatch) senderName = nameMatch[1];

    const replyText = await suggestReply(email.body, email.subject, senderName);
    res.json({ reply: replyText });
  } catch (error) {
    console.error("AI suggest-reply error:", error.message);
    handleAIError(error, res);
  }
}

/**
 * Common error handler for AI endpoints.
 */
function handleAIError(error, res) {
  if (error.message.includes("Gmail not connected")) {
    return res.status(403).json({ error: "Gmail not connected. Please reconnect." });
  }
  if (error.message.includes("GEMINI_API_KEY")) {
    return res.status(503).json({ error: "AI service is not configured." });
  }
  if (error.message.includes("Failed to parse AI response")) {
    return res.status(502).json({ error: "AI returned an unexpected format. Please try again." });
  }
  if (error.code === 401 || error.message.includes("invalid_grant")) {
    return res.status(401).json({ error: "Gmail token expired. Please reconnect." });
  }
  return res.status(500).json({ error: "AI processing failed. Please try again." });
}

module.exports = { summarize, extractTasksFromEmail, suggestReplyForEmail };
