const express = require("express");
const { google } = require("googleapis");

const router = express.Router();

function createOAuthClient() {
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI;

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !callbackUrl) {
    throw new Error("Google OAuth environment variables are missing.");
  }

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl
  );
}

router.get("/google", (req, res) => {
  try {
    const oauth2Client = createOAuthClient();
    const scopes = [process.env.GMAIL_SCOPES || "https://www.googleapis.com/auth/gmail.readonly"];

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes,
    });

    res.redirect(url);
  } catch (error) {
    console.error("Google OAuth start error:", error.message);
    res.status(500).send("Google OAuth is not configured correctly.");
  }
});

router.get("/google/callback", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send("Missing Google authorization code");
    }

    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    const profile = await gmail.users.getProfile({
      userId: "me",
    });

    console.log("Gmail connected:", profile.data.emailAddress);
    console.log("Google OAuth token status:", {
      hasAccessToken: Boolean(tokens.access_token),
      hasRefreshToken: Boolean(tokens.refresh_token),
      expiryDate: tokens.expiry_date,
      scope: tokens.scope,
    });

    res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard?gmail=connected`);
  } catch (error) {
    console.error("Google OAuth callback error:", error.message);
    res.status(500).send("Google OAuth failed");
  }
});

module.exports = router;
