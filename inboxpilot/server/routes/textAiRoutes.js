const express = require("express");
const authenticate = require("../middleware/auth");
const {
  summarizeTextHandler,
  extractTasksFromText,
  simplifyTextHandler,
  suggestReplyFromText,
} = require("../controllers/textAiController");

const router = express.Router();

// Text AI routes require authentication. This is inherited from aiRoutes.js
// (which mounts this router after its own router.use(authenticate)), but we
// apply it defensively here in case this router is ever mounted elsewhere.
router.use(authenticate);

// POST /api/ai/text/summarize
router.post("/summarize", summarizeTextHandler);

// POST /api/ai/text/extract-tasks
router.post("/extract-tasks", extractTasksFromText);

// POST /api/ai/text/simplify
router.post("/simplify", simplifyTextHandler);

// POST /api/ai/text/suggest-reply
router.post("/suggest-reply", suggestReplyFromText);

module.exports = router;
