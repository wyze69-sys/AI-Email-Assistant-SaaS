const express = require("express");
const authenticate = require("../middleware/auth");
const { summarize, extractTasksFromEmail, suggestReplyForEmail } = require("../controllers/aiController");
const textAiRoutes = require("./textAiRoutes");

const router = express.Router();

// All AI routes require authentication
router.use(authenticate);

// POST /api/ai/summarize/:emailId
router.post("/summarize/:emailId", summarize);

// POST /api/ai/extract-tasks/:emailId
router.post("/extract-tasks/:emailId", extractTasksFromEmail);

// POST /api/ai/suggest-reply/:emailId
router.post("/suggest-reply/:emailId", suggestReplyForEmail);

// Nested text AI routes -> /api/ai/text/*
router.use("/text", textAiRoutes);

module.exports = router;
