/**
 * Inbox Triage — pure, frontend-only rule engine.
 *
 * `triageEmail(email)` classifies a single email into advisory triage
 * categories using deterministic, case-insensitive rules over the email's
 * subject, snippet, from, to, labelIds, and body preview. It is a pure
 * function: it never mutates the input email and returns the same
 * Triage_Result for the same input.
 *
 * Triage is advisory only — it never modifies Gmail in any way.
 */

// Internal category ids (R2 / Glossary)
export const CATEGORY = {
  IMPORTANT: "important",
  NEEDS_REPLY: "needs_reply",
  HAS_TASK: "has_task",
  NEWSLETTER: "newsletter",
  PROMOTION: "promotion",
  RECEIPT: "receipt",
  NOTIFICATION: "notification",
  LOW_PRIORITY: "low_priority",
  POSSIBLE_SPAM: "possible_spam",
};

// User-facing display text (R4.3, Glossary "Triage_Label")
export const DISPLAY_LABELS = {
  important: "Important",
  needs_reply: "Needs reply",
  has_task: "Has task",
  newsletter: "Newsletter",
  promotion: "Promotion",
  receipt: "Receipt",
  notification: "Notification",
  low_priority: "Low priority",
  possible_spam: "Possible spam",
};

// Priority order, highest first (R3.3). Index = rank.
export const PRIORITY_ORDER = [
  "important",
  "needs_reply",
  "has_task",
  "receipt",
  "possible_spam",
  "notification",
  "promotion",
  "newsletter",
  "low_priority",
];

// Actionable categories (R3.1, R3.5)
export const ACTIONABLE = ["important", "needs_reply", "has_task"];

// Per-category score weights (R1.5, R3.5). The smallest actionable weight (60)
// exceeds the maximum achievable passive sum (20+15+8+5+4+1 = 53), so any email
// with an actionable category always outranks a passive-only email.
const WEIGHTS = {
  important: 100,
  needs_reply: 80,
  has_task: 60,
  receipt: 20,
  possible_spam: 15,
  notification: 8,
  promotion: 5,
  newsletter: 4,
  low_priority: 1,
};

// Dashboard triage filter set (R5.1). id maps to a category, except "all".
export const TRIAGE_FILTERS = [
  { id: "all", label: "All", category: null },
  { id: "important", label: "Important", category: "important" },
  { id: "needs_reply", label: "Needs reply", category: "needs_reply" },
  { id: "has_task", label: "Has task", category: "has_task" },
  { id: "low_priority", label: "Low priority", category: "low_priority" },
  { id: "newsletter", label: "Newsletters", category: "newsletter" },
  { id: "receipt", label: "Receipts", category: "receipt" },
  { id: "possible_spam", label: "Possible spam", category: "possible_spam" },
];

// ---------------------------------------------------------------------------
// Rule keyword / phrase sets (R2). All entries are lowercase so they can be
// matched directly against the lowercased `haystack` / `subjSnippet`. Multi-word
// phrases (e.g. "action required") match as plain substrings.
// ---------------------------------------------------------------------------

// R2.1 — scoped to subject + snippet (subjSnippet).
const IMPORTANT_KEYWORDS = [
  "urgent",
  "important",
  "action required",
  "deadline",
  "due today",
  "due tomorrow",
  "meeting",
  "interview",
  "invoice",
  "payment",
  "security",
];

// R2.3 — scoped to subject + snippet + body preview (haystack).
const NEEDS_REPLY_KEYWORDS = [
  "?",
  "please reply",
  "let me know",
  "can you",
  "could you",
  "confirm",
  "available",
  "thoughts?",
];

// R2.4 — scoped to haystack.
const HAS_TASK_KEYWORDS = [
  "please",
  "need to",
  "submit",
  "review",
  "complete",
  "send",
  "schedule",
  "prepare",
  "by friday",
  "by tomorrow",
  "deadline",
];

// R2.5 — scoped to haystack.
const NEWSLETTER_KEYWORDS = ["unsubscribe", "newsletter", "digest", "weekly update"];

// R2.6 — scoped to haystack.
const PROMOTION_KEYWORDS = ["sale", "discount", "offer", "deal", "coupon", "limited time"];

// R2.7 — scoped to haystack.
const RECEIPT_KEYWORDS = [
  "receipt",
  "invoice",
  "order",
  "payment",
  "transaction",
  "subscription",
  "paid",
];

// R2.8 — subject/snippet portion of the notification rule.
const NOTIFICATION_SUBJ_KEYWORDS = [
  "alert",
  "verification code",
  "security code",
  "login attempt",
];

// R2.9 — scoped to haystack.
const POSSIBLE_SPAM_KEYWORDS = [
  "prize",
  "winner",
  "free gift",
  "claim now",
  "urgent money",
  "crypto",
];

// Optional deterministic possible_spam heuristic (pure counts). Disabling this
// flag removes only the heuristic, never the R2.9 keyword rule.
const ENABLE_SPAM_HEURISTIC = true;

/**
 * Return the first keyword from `keywords` found as a substring of `text`,
 * or null when none match. Pure; performs no mutation.
 */
function findKeyword(text, keywords) {
  for (const kw of keywords) {
    if (text.includes(kw)) return kw;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Normalization helpers (R1.2, R1.3, R1.8)
// All field access is null-safe (treat missing/undefined as empty string or
// empty array). None of these helpers mutate the input.
// ---------------------------------------------------------------------------

/** Coerce any value to a string, treating non-strings as empty. */
const str = (v) => (typeof v === "string" ? v : "");

/** Coerce any value to an array, treating non-arrays as empty. */
const arr = (v) => (Array.isArray(v) ? v : []);

// Body preview cap: matching is constrained to the first 2000 chars to keep
// classification cheap and deterministic.
const BODY_PREVIEW_LIMIT = 2000;

/**
 * Build a null-safe, normalized view of an email for rule evaluation.
 * Produces lowercased haystacks and sender flags without mutating `email`.
 */
function normalize(email) {
  const subject = str(email?.subject);
  const snippet = str(email?.snippet);
  const body = str(email?.body);
  const from = str(email?.from).toLowerCase();
  const to = str(email?.to).toLowerCase();
  const labelIds = arr(email?.labelIds);

  // Cap body to keep matching cheap & deterministic.
  const bodyPreview = body.slice(0, BODY_PREVIEW_LIMIT);

  // Combined lowercase haystack for keyword rules over subject + snippet + body preview.
  const haystack = `${subject}\n${snippet}\n${bodyPreview}`.toLowerCase();

  // Subject + snippet only (some R2 rules are scoped to subject/snippet).
  const subjSnippet = `${subject}\n${snippet}`.toLowerCase();

  // Sender classification.
  const isNoReply = /no-?reply|notification/.test(from);
  const hasImportantLabel = labelIds.some(
    (l) => str(l).toUpperCase() === "IMPORTANT"
  );

  return {
    subject,
    snippet,
    body,
    from,
    to,
    labelIds,
    bodyPreview,
    haystack,
    subjSnippet,
    isNoReply,
    hasImportantLabel,
  };
}

/**
 * Classify a single email. Pure: never mutates `email`; same input -> same output.
 *
 * @param {object} email - { subject, from, to, date, labelIds, body, snippet }
 * @returns {{ primary: string|null, labels: string[], score: number, reasons: string[] }}
 */
export function triageEmail(email) {
  // Null-safe normalization. The normalized view is what every rule reads from,
  // so the rule logic (added in task 2) never touches the raw `email` object.
  const view = normalize(email);

  // Matched categories and per-rule reasons are collected during evaluation.
  // Label selection, priority ordering, and the score formula are implemented
  // in tasks 2.2 / 2.3. This task (2.1) populates `matched` and `reasons` by
  // evaluating every R2 category rule against the normalized `view`.
  const matched = new Set();
  const reasons = [];

  // --- R2.1 important (subject + snippet, gated by non-no-reply sender) ------
  if (!view.isNoReply) {
    const kw = findKeyword(view.subjSnippet, IMPORTANT_KEYWORDS);
    if (kw) {
      matched.add(CATEGORY.IMPORTANT);
      reasons.push(`Subject mentions '${kw}'`);
    }
  }

  // --- R2.2 important (Gmail IMPORTANT label, ungated by sender) -------------
  if (view.hasImportantLabel) {
    matched.add(CATEGORY.IMPORTANT);
    reasons.push("Gmail marked this Important");
  }

  // --- R2.3 needs_reply (subject + snippet + body preview) -------------------
  {
    const kw = findKeyword(view.haystack, NEEDS_REPLY_KEYWORDS);
    if (kw) {
      matched.add(CATEGORY.NEEDS_REPLY);
      reasons.push(
        kw === "?"
          ? "Contains a question — may need a reply"
          : `Mentions '${kw}' — may need a reply`
      );
    }
  }

  // --- R2.4 has_task (subject + snippet + body preview) ----------------------
  {
    const kw = findKeyword(view.haystack, HAS_TASK_KEYWORDS);
    if (kw) {
      matched.add(CATEGORY.HAS_TASK);
      reasons.push(`Mentions '${kw}' — may contain a task`);
    }
  }

  // --- R2.5 newsletter (subject + snippet + body preview) --------------------
  {
    const kw = findKeyword(view.haystack, NEWSLETTER_KEYWORDS);
    if (kw) {
      matched.add(CATEGORY.NEWSLETTER);
      reasons.push(`Mentions '${kw}' — looks like a newsletter`);
    }
  }

  // --- R2.6 promotion (subject + snippet + body preview) ---------------------
  {
    const kw = findKeyword(view.haystack, PROMOTION_KEYWORDS);
    if (kw) {
      matched.add(CATEGORY.PROMOTION);
      reasons.push(`Mentions '${kw}' — looks promotional`);
    }
  }

  // --- R2.7 receipt (subject + snippet + body preview) -----------------------
  {
    const kw = findKeyword(view.haystack, RECEIPT_KEYWORDS);
    if (kw) {
      matched.add(CATEGORY.RECEIPT);
      reasons.push(`Mentions '${kw}' — looks like a receipt`);
    }
  }

  // --- R2.8 notification (automated sender OR subject/snippet keyword) -------
  {
    const senderLooksAutomated = /no-?reply|notification/.test(view.from);
    if (senderLooksAutomated) {
      matched.add(CATEGORY.NOTIFICATION);
      reasons.push("Sender looks automated (no-reply)");
    }
    const kw = findKeyword(view.subjSnippet, NOTIFICATION_SUBJ_KEYWORDS);
    if (kw) {
      matched.add(CATEGORY.NOTIFICATION);
      reasons.push(`Mentions '${kw}' — looks like a notification`);
    }
  }

  // --- R2.9 possible_spam (keyword rule) -------------------------------------
  {
    const kw = findKeyword(view.haystack, POSSIBLE_SPAM_KEYWORDS);
    if (kw) {
      matched.add(CATEGORY.POSSIBLE_SPAM);
      reasons.push(`Mentions '${kw}' — looks spam-like`);
    }
  }

  // --- Optional deterministic possible_spam heuristic (pure counts) ----------
  if (ENABLE_SPAM_HEURISTIC) {
    // Excessive exclamation marks over raw (pre-lowercase) subject + snippet.
    const rawSubjSnippet = `${view.subject}\n${view.snippet}`;
    const exclamCount = (rawSubjSnippet.match(/!/g) || []).length;
    if (exclamCount >= 3) {
      matched.add(CATEGORY.POSSIBLE_SPAM);
      reasons.push("Looks spam-like: many exclamation marks");
    }

    // Excessive links over the haystack.
    const httpCount = (view.haystack.match(/http/g) || []).length;
    if (httpCount >= 4) {
      matched.add(CATEGORY.POSSIBLE_SPAM);
      reasons.push("Looks spam-like: many links");
    }

    // Shouting caps: uppercase ratio of alphabetic chars in subject >= 0.7
    // with subject length >= 10.
    const subjectLetters = (view.subject.match(/[a-zA-Z]/g) || []).length;
    const upperCount = (view.subject.match(/[A-Z]/g) || []).length;
    const upperRatio = subjectLetters > 0 ? upperCount / subjectLetters : 0;
    if (view.subject.length >= 10 && upperRatio >= 0.7) {
      matched.add(CATEGORY.POSSIBLE_SPAM);
      reasons.push("Looks spam-like: mostly uppercase");
    }
  }

  // --- R2.10 low_priority (derived) ------------------------------------------
  // Assigned when newsletter/promotion/notification matched AND no actionable
  // category (important/needs_reply/has_task) matched.
  {
    const hasPassiveBucket =
      matched.has(CATEGORY.NEWSLETTER) ||
      matched.has(CATEGORY.PROMOTION) ||
      matched.has(CATEGORY.NOTIFICATION);
    const hasActionable =
      matched.has(CATEGORY.IMPORTANT) ||
      matched.has(CATEGORY.NEEDS_REPLY) ||
      matched.has(CATEGORY.HAS_TASK);
    if (hasPassiveBucket && !hasActionable) {
      matched.add(CATEGORY.LOW_PRIORITY);
      reasons.push("Low priority — no action needed");
    }
  }

  // --- Label selection & priority (R3) ---------------------------------------
  // 1. Drop `low_priority` when any actionable category is present (R3.1).
  //    The R2.10 rule above already avoids adding low_priority alongside an
  //    actionable category, but enforce it defensively at selection time too so
  //    the final `labels` can never contain low_priority with an actionable one.
  const hasActionableMatch = ACTIONABLE.some((c) => matched.has(c));
  if (hasActionableMatch) {
    matched.delete(CATEGORY.LOW_PRIORITY);
  }

  // 2. Order matched categories by PRIORITY_ORDER (lower index = higher
  //    priority, listed first). `possible_spam` participates normally and is
  //    never removed or used to drop the email (R3.2).
  const ordered = [...matched].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a) - PRIORITY_ORDER.indexOf(b)
  );

  // 3. Cap to the top three (R1.4, R3.3, R4.2).
  const labels = ordered.slice(0, 3);

  // 4. Primary is the first (highest-priority) label, or null when nothing
  //    matched (R3.4, R1.7).
  const primary = labels.length > 0 ? labels[0] : null;

  // Integer score (R1.5, R3.5): sum of per-category weights over the full
  // matched set (after the defensive low_priority drop, consistent with what
  // determines labels) — computed before the 3-label cap so the score reflects
  // all signal, not just the displayed labels.
  let score = 0;
  for (const category of matched) {
    score += WEIGHTS[category] || 0;
  }

  return { primary, labels, score, reasons };
}
