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
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send("Missing Google authorization code");
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
      console.warn("Could not fetch user info:", err.message);
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

    console.log("User saved/updated:", user.email);

    // Issue JWT for frontend authentication
    const jwtPayload = {
      userId: user._id,
      email: user.email,
    };

    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    // Redirect to frontend with JWT token
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}/dashboard?token=${token}&gmail=connected`);
  } catch (error) {
    console.error("Google OAuth callback error:", error.message);
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}/login?error=oauth_failed`);
  }
});

module.exports = router;
