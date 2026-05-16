/**
 * GET /api/auth/me
 * Returns the authenticated user's profile info.
 */
async function getMe(req, res) {
  try {
    const user = req.user;
    res.json({
      id: user._id,
      email: user.email,
      name: user.name || null,
      picture: user.picture || null,
      gmailConnected: Boolean(user.gmail && user.gmail.accessToken),
      gmailConnectedAt: user.gmail?.connectedAt || null,
      lastLogin: user.lastLogin,
    });
  } catch (error) {
    console.error("getMe error:", error.message);
    res.status(500).json({ error: "Failed to fetch user info" });
  }
}

module.exports = { getMe };
