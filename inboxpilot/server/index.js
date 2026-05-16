const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/database");
const googleAuthRoutes = require("./routes/googleAuthRoutes");
const emailRoutes = require("./routes/emailRoutes");
const authenticate = require("./middleware/auth");
const { getMe } = require("./controllers/authController");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const port = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", googleAuthRoutes);
app.get("/api/auth/me", authenticate, getMe);
app.use("/api/emails", emailRoutes);

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
