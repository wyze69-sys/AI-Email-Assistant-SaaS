const express = require("express");
const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

function createOAuthClient() {
  const callbackUrl =
    process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI;

  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !callbackUrl
  ) {
    throw new Error("Google OAuth environment variables are missing.");
  }

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl
  );
}

// Redirect user to Google consent screen
router.get("/google", (req, res) => {
  try {
    const oauth2Client = createOAuthClient();
    const scopes = [
      process.env.GMAIL_SCOPES ||
        "https://www.googleapis.com/auth/gmail.readonly",
    ];

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

// Google OAuth callback - exchange code, save user & tokens, issue JWT
router.get("/google/callback", async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(`${clientUrl}/login?error=oauth_failed`);
    }

    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch Gmail profile
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });

    // Fetch Google user info for name/picture
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    let userInfo = {};
    try {
      const infoRes = await oauth2.userinfo.get();
      userInfo = infoRes.data;
    } catch (err) {
      // Non-fatal: profile name/picture are optional.
      console.warn("[OAuth] Could not fetch Google user info");
    }

    // Save or update user in MongoDB
    const user = await User.findOrCreateFromGoogle(
      {
        emailAddress: profile.data.emailAddress,
        name: userInfo.name || null,
        picture: userInfo.picture || null,
      },
      tokens
    );

    // Issue JWT for frontend authentication
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const jwtPayload = {
      userId: user._id,
      email: user.email,
    };

    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    // Redirect to frontend with JWT token
    const redirectUrl = `${clientUrl}/dashboard?token=${token}&gmail=connected`;
    res.redirect(redirectUrl);
  } catch (error) {
    // Log a non-sensitive message only — never the code, tokens, or user data.
    console.error("[OAuth] Callback failed:", error.message);
    res.redirect(`${clientUrl}/login?error=oauth_failed`);
  }
});

module.exports = router;
