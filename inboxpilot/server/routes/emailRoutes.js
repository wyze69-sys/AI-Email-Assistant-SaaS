const express = require("express");
const authenticate = require("../middleware/auth");
const { getEmails, getEmailById } = require("../controllers/emailController");

const router = express.Router();

// All email routes require authentication
router.use(authenticate);

// GET /api/emails - list emails from inbox
router.get("/", getEmails);

// GET /api/emails/:id - get single email with full body
router.get("/:id", getEmailById);

module.exports = router;
