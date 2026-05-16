const { google } = require("googleapis");

/**
 * Creates an authenticated OAuth2 client from stored user tokens.
 * Handles token refresh automatically via googleapis library.
 */
function createAuthenticatedClient(decryptedTokens) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: decryptedTokens.access_token,
    refresh_token: decryptedTokens.refresh_token,
    expiry_date: decryptedTokens.expiry_date,
  });

  return oauth2Client;
}

/**
 * Fetch a list of emails from the user's Gmail inbox.
 * @param {Object} user - Mongoose User document
 * @param {Object} options - { maxResults, query, pageToken, labelIds }
 * @returns {Object} { messages, nextPageToken, resultSizeEstimate }
 */
async function fetchEmails(user, options = {}) {
  const { maxResults = 20, query = "", pageToken = null, labelIds = ["INBOX"] } = options;

  const tokens = user.getDecryptedTokens();
  if (!tokens.access_token) {
    throw new Error("Gmail not connected. No access token found.");
  }

  const oauth2Client = createAuthenticatedClient(tokens);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // List message IDs
  const listParams = {
    userId: "me",
    maxResults,
    labelIds,
  };
  if (query) listParams.q = query;
  if (pageToken) listParams.pageToken = pageToken;

  const listRes = await gmail.users.messages.list(listParams);

  if (!listRes.data.messages || listRes.data.messages.length === 0) {
    return { messages: [], nextPageToken: null, resultSizeEstimate: 0 };
  }

  // Fetch full message details in parallel
  const messageDetails = await Promise.all(
    listRes.data.messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date"],
      });
      return parseMessage(detail.data);
    })
  );

  return {
    messages: messageDetails,
    nextPageToken: listRes.data.nextPageToken || null,
    resultSizeEstimate: listRes.data.resultSizeEstimate || 0,
  };
}

/**
 * Fetch a single email by ID with full body content.
 * @param {Object} user - Mongoose User document
 * @param {String} messageId - Gmail message ID
 * @returns {Object} Parsed email with body
 */
async function fetchEmailById(user, messageId) {
  const tokens = user.getDecryptedTokens();
  if (!tokens.access_token) {
    throw new Error("Gmail not connected. No access token found.");
  }

  const oauth2Client = createAuthenticatedClient(tokens);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  return parseFullMessage(res.data);
}

/**
 * Parse message metadata from Gmail API response.
 */
function parseMessage(message) {
  const headers = message.payload?.headers || [];
  const getHeader = (name) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  return {
    id: message.id,
    threadId: message.threadId,
    snippet: message.snippet,
    from: getHeader("From"),
    to: getHeader("To"),
    subject: getHeader("Subject"),
    date: getHeader("Date"),
    labelIds: message.labelIds || [],
    isUnread: (message.labelIds || []).includes("UNREAD"),
  };
}

/**
 * Parse full message including body content.
 */
function parseFullMessage(message) {
  const base = parseMessage(message);
  base.body = extractBody(message.payload);
  return base;
}

/**
 * Extract email body text from message payload.
 * Prefers text/plain, falls back to text/html.
 */
function extractBody(payload) {
  if (!payload) return "";

  // Direct body on payload
  if (payload.body && payload.body.data) {
    return decodeBody(payload.body.data, payload.mimeType);
  }

  // Multipart - search parts recursively
  if (payload.parts) {
    // Prefer plain text
    const plainPart = findPart(payload.parts, "text/plain");
    if (plainPart && plainPart.body && plainPart.body.data) {
      return decodeBody(plainPart.body.data, plainPart.mimeType);
    }

    // Fallback to HTML
    const htmlPart = findPart(payload.parts, "text/html");
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      return decodeBody(htmlPart.body.data, htmlPart.mimeType);
    }

    // Check nested parts
    for (const part of payload.parts) {
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }

  return "";
}

function findPart(parts, mimeType) {
  for (const part of parts) {
    if (part.mimeType === mimeType) return part;
    if (part.parts) {
      const nested = findPart(part.parts, mimeType);
      if (nested) return nested;
    }
  }
  return null;
}

function decodeBody(data, mimeType = "") {
  const decoded = Buffer.from(data, "base64url").toString("utf8");
  if (mimeType.toLowerCase() === "text/html") {
    return htmlToText(decoded);
  }
  return decoded.trim();
}

function htmlToText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

module.exports = { fetchEmails, fetchEmailById };
