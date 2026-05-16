const { fetchEmails, fetchEmailById } = require("../services/gmailService");

/**
 * GET /api/emails
 * Fetch emails from the authenticated user's Gmail inbox.
 * Query params: maxResults, q (search query), pageToken, label
 */
async function getEmails(req, res) {
  try {
    const { maxResults, q, pageToken, label } = req.query;

    const options = {};
    if (maxResults) options.maxResults = parseInt(maxResults, 10);
    if (q) options.query = q;
    if (pageToken) options.pageToken = pageToken;
    if (label) options.labelIds = [label];

    const result = await fetchEmails(req.user, options);
    res.json(result);
  } catch (error) {
    console.error("getEmails error:", error.message);

    if (error.message.includes("Gmail not connected")) {
      return res.status(403).json({ error: "Gmail not connected" });
    }

    if (error.code === 401 || error.message.includes("invalid_grant")) {
      return res.status(401).json({ error: "Gmail token expired. Please reconnect." });
    }

    res.status(500).json({ error: "Failed to fetch emails" });
  }
}

/**
 * GET /api/emails/:id
 * Fetch a single email by message ID with full body.
 */
async function getEmailById(req, res) {
  try {
    const { id } = req.params;
    const email = await fetchEmailById(req.user, id);
    res.json(email);
  } catch (error) {
    console.error("getEmailById error:", error.message);

    if (error.message.includes("Gmail not connected")) {
      return res.status(403).json({ error: "Gmail not connected" });
    }

    if (error.code === 404) {
      return res.status(404).json({ error: "Email not found" });
    }

    res.status(500).json({ error: "Failed to fetch email" });
  }
}

module.exports = { getEmails, getEmailById };
