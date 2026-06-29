const { GoogleGenerativeAI } = require("@google/generative-ai");

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-1.5-flash";

/**
 * Initialize the Gemini client.
 */
function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: MODEL_NAME });
}

/**
 * Summarize an email body.
 * Returns structured JSON: { summary, keyPoints, sentiment }
 */
async function summarizeEmail(emailBody, subject) {
  const model = getModel();

  const prompt = `You are an email summarization assistant. Summarize the following email concisely.

Rules:
- Only use information explicitly present in the email. Do not invent or assume details.
- Keep the summary factual and brief (2-4 sentences).
- Identify 1-5 key points as a list.
- Assess the overall sentiment as one of: positive, negative, neutral, urgent.

Email Subject: ${subject || "(no subject)"}

Email Body:
${emailBody}

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{
  "summary": "Brief 2-4 sentence summary",
  "keyPoints": ["point 1", "point 2"],
  "sentiment": "positive|negative|neutral|urgent"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return parseJSON(text);
}

/**
 * Extract tasks, deadlines, and priorities from an email.
 * Returns structured JSON: { tasks: [{ task, deadline, priority }] }
 */
async function extractTasks(emailBody, subject) {
  const model = getModel();

  const prompt = `You are a task extraction assistant. Extract actionable tasks from the following email.

Rules:
- Only extract tasks that are explicitly mentioned or clearly implied in the email.
- Do not invent tasks that are not present in the email content.
- For each task, identify a deadline if one is mentioned (otherwise use null).
- Assign priority: high, medium, or low based on language urgency.
- If no tasks are found, return an empty tasks array.

Email Subject: ${subject || "(no subject)"}

Email Body:
${emailBody}

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{
  "tasks": [
    {
      "task": "Description of the task",
      "deadline": "deadline if mentioned or null",
      "priority": "high|medium|low"
    }
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return parseJSON(text);
}

/**
 * Tone guidance lines for AI suggested replies.
 * Used by suggestReply to adjust the reply's tone. Unknown tones fall back to professional.
 */
const TONE_GUIDANCE = {
  professional: "Use a professional, courteous tone.",
  friendly: "Use a warm, friendly, approachable tone.",
  short: "Keep it very short and to the point (1-3 sentences).",
  apology: "Use an apologetic, understanding tone that takes responsibility politely.",
  thank_you: "Use a grateful, appreciative thank-you tone.",
  follow_up: "Use a polite follow-up tone that gently checks in on a prior message.",
};

/**
 * Generate an AI suggested reply for an email.
 * Returns plain text reply suggestion. User must review before using.
 * The optional `tone` parameter adjusts the reply's tone (defaults to professional);
 * unknown tones fall back to professional. The existing 3-arg callers are unaffected.
 */
async function suggestReply(emailBody, subject, senderName, tone = "professional") {
  const model = getModel();

  const toneLine = TONE_GUIDANCE[tone] || TONE_GUIDANCE.professional;

  const prompt = `You are an email reply assistant. Generate a professional, helpful reply suggestion for the following email.

Rules:
- This is a SUGGESTION only. The user will review, edit, and decide whether to use it.
- Do not include any fake details, names, dates, or information not present in the original email.
- ${toneLine}
- Keep it concise (3-8 sentences).
- Do not add a signature or sign-off name — the user will add their own.
- Do not reference sending the email. This is only a suggested reply text for the user to review.

Original Email From: ${senderName || "the sender"}
Original Subject: ${subject || "(no subject)"}

Original Email Body:
${emailBody}

Write ONLY the suggested reply text (plain text, no JSON, no markdown formatting):`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Simplify arbitrary text into plain, clear language.
 * Returns trimmed plain text (no JSON, no markdown). Does not invent facts.
 */
async function simplifyText(text) {
  const model = getModel();

  const prompt = `You are a text simplification assistant. Rewrite the following text in
plain, clear language that is easy to understand.

Rules:
- Only use information explicitly present in the text. Do not add, invent, or assume any
  details that are not in the original.
- Keep all important facts, names, dates, and numbers exactly as written.
- Prefer short sentences and common words.
- Do not summarize away key details — simplify the wording, keep the meaning.
- Return plain text only (no JSON, no markdown formatting).

Text:
${text}

Write ONLY the simplified version:`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Parse JSON from Gemini response, handling common issues like code fences.
 */
function parseJSON(text) {
  // Strip markdown code fences if present
  let cleaned = text;
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse AI response as JSON: ${err.message}`);
  }
}

module.exports = { summarizeEmail, extractTasks, suggestReply, simplifyText };
