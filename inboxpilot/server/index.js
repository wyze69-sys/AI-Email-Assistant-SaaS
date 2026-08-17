const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load .env for local dev. On Render, env vars are set via dashboard.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectDB = require("./config/database");
const googleAuthRoutes = require("./routes/googleAuthRoutes");
const emailRoutes = require("./routes/emailRoutes");
const aiRoutes = require("./routes/aiRoutes");
const authenticate = require("./middleware/auth");
const { getMe } = require("./controllers/authController");

const app = express();
const port = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

// CORS: allow CLIENT_URL. Supports comma-separated origins for multiple testers.
const allowedOrigins = clientUrl
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (curl, Render health checks, same-origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Reject without throwing a stack-trace 500: deny CORS cleanly.
      const err = new Error("Not allowed by CORS");
      err.status = 403;
      return callback(err);
    },
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", googleAuthRoutes);
app.get("/api/auth/me", authenticate, getMe);
app.use("/api/emails", emailRoutes);
app.use("/api/ai", aiRoutes);

app.get("/", (req, res) => {
  res.json({
    name: "InboxPilot API",
    status: "running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "inboxpilot-server",
  });
});

// Centralized error handler — returns clean JSON, never leaks stack traces.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Origin not allowed" });
  }
  console.error("Unhandled error:", err && err.message);
  res.status(err.status || 500).json({ error: "Something went wrong" });
});

async function startServer() {
  try {
    await connectDB();

    app.listen(port, () => {
      console.log(`InboxPilot server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
