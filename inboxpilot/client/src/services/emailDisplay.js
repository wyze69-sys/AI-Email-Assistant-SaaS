// emailDisplay.js
// Display-only readability cleanup for plain-text email bodies.
//
// IMPORTANT: This module never mutates the original email. It returns a
// cleaned *copy* of the body purely for rendering. AI actions (summarize,
// extract tasks, suggested reply, priority review) and "Show original" must
// keep using the untouched `email.body`, never this output.
//
// The cleanup is conservative and provider-agnostic: it hides standalone
// tracking/redirect URLs, browser-view fallback lines, footer clutter
// (unsubscribe / manage preferences / "you received this email…"), and
// wrapped URL fragments, while keeping human-readable text, headings and
// paragraphs. Input is treated strictly as plain text — no HTML is parsed or
// rendered, so no scripts or markup can ever execute.

// http/https URL matcher. Scoped to real links so plain words are untouched.
const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

// Query-param / token fragments that signal a tracking or redirect link.
const NOISY_PARAM_HINTS = [
  "target=",
  "redirect=",
  "redirect_url=",
  "url=",
  "u=",
  "q=",
  "qs=",
  "od=",
  "user_id=",
  "campaign",
  "campaign=",
  "utm_",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref=",
  "source=",
  "email=",
  "mc_cid",
  "mc_eid",
  "sfmc",
  "click_id",
  "click_id=",
  "tracking",
  "tracking=",
];

// Encoded-URL fragments that mark a long redirect/wrapped link.
const ENCODED_HINTS = ["%2f", "%3a", "%3d", "%25", "https%3a"];

// Path / domain fragments common to email tracking platforms.
const PATH_DOMAIN_HINTS = [
  "/click",
  "/email/click",
  "email/click",
  "/track",
  "/tracking",
  "/redirect",
  "click.",
  "track.",
  "link.",
  "links.",
  "list-manage.com",
  "mailchi.mp",
  "sendgrid.net",
  "sfmc",
  "click.sfmc",
  "marketing",
];

// Whole-line phrases that are browser-view fallbacks (no real content).
const BROWSER_FALLBACK_PHRASES = [
  "view this content, open the following url",
  "open the following url in your browser",
  "view this email in your browser",
  "view in browser",
  "view online",
  "open in browser",
  "having trouble viewing",
  "can't see this email",
  "cannot see this email",
  "trouble viewing this email",
];

// Strong footer signals — remove the whole line whenever present.
const FOOTER_PHRASES = [
  "you received this email because",
  "this email was sent to",
  "add us to your address book",
  "manage preferences",
  "manage your preferences",
  "update your preferences",
  "update preferences",
  "email preferences",
  "unsubscribe",
  "no longer wish to receive",
  "opt out",
  "opt-out",
];

// Weaker footer labels — only drop when the line is essentially just the
// label plus a link/separator (so real prose mentioning them is kept).
const WEAK_FOOTER_PHRASES = ["privacy policy", "terms of service", "terms of use"];

function includesAny(haystack, needles) {
  return needles.some((n) => haystack.includes(n));
}

/**
 * Is this URL a tracking / redirect / noisy link?
 * General heuristics — not tied to any single provider.
 */
function isNoisyUrl(url) {
  const lower = url.toLowerCase();
  if (url.length > 120) return true;
  if (includesAny(lower, NOISY_PARAM_HINTS)) return true;
  if (includesAny(lower, ENCODED_HINTS)) return true;
  if (includesAny(lower, PATH_DOMAIN_HINTS)) return true;
  return false;
}

// All URLs in a string (resets the shared global regex each call).
function findUrls(str) {
  URL_REGEX.lastIndex = 0;
  const matches = str.match(URL_REGEX) || [];
  URL_REGEX.lastIndex = 0;
  return matches;
}

// After removing every URL, is there any meaningful text left on the line?
function hasTextBesidesUrls(line) {
  const residue = line.replace(URL_REGEX, "").replace(/[\s\-•·*>|()<>\[\]:]/g, "");
  URL_REGEX.lastIndex = 0;
  return residue.length > 0;
}

// A wrapped fragment of a long URL (continuation noise, encoded chunks, or a
// long token-like string with no real words).
function looksLikeUrlFragment(line) {
  const t = line.trim();
  if (!t) return false;
  // Continuation of a wrapped URL from the previous line.
  if (/^[?&=/]/.test(t) && !/\s/.test(t)) return true;
  // Several percent-encoded sequences.
  if ((t.match(/%[0-9a-fA-F]{2}/g) || []).length >= 3) return true;
  // Long, unbroken token with no spaces.
  if (t.length > 60 && !/\s/.test(t)) return true;
  // Long line that contains almost no real words.
  if (t.length > 60) {
    const words = t.match(/[A-Za-z]{3,}/g) || [];
    if (words.length <= 1) return true;
  }
  return false;
}

// Trailing label punctuation left after stripping a URL ("Help Centre:" → "Help Centre").
function trimLabel(line) {
  return line.replace(/[\s:>\-–—|•·]+$/g, "").replace(/^[\s>|•·]+/g, "");
}

// Count of human-meaningful characters (used for the empty-result fallback).
function meaningfulLength(str) {
  return (str.match(/[A-Za-z0-9]/g) || []).length;
}

/**
 * Produce a display-friendly version of a plain-text email body.
 * Returns the original body unchanged if cleaning would leave too little.
 *
 * @param {string} body raw plain-text email body
 * @returns {string} cleaned text for display only
 */
export function cleanEmailBody(body) {
  if (typeof body !== "string" || body.length === 0) return "";

  const lines = body.split(/\r?\n/);
  const out = [];

  for (const rawLine of lines) {
    let line = rawLine.replace(/[ \t]+$/g, ""); // trim trailing whitespace

    // Strip markdown / bracketed links so the readable label survives:
    //   "plan [https://…utm_…]"      -> "plan"
    //   "[Learn more](https://…)"    -> "Learn more"
    line = line.replace(
      /\[([^\]]+)\]\(\s*https?:\/\/[^)]*\)/gi,
      (_m, label) => label
    );
    line = line.replace(/\[\s*https?:\/\/[^\]]*\]/gi, "");
    line = line.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+$/g, "");

    const lower = line.toLowerCase();
    const trimmed = line.trim();

    if (trimmed === "") {
      out.push("");
      continue;
    }

    // (a) Browser-view fallback lines — drop entirely.
    if (includesAny(lower, BROWSER_FALLBACK_PHRASES)) continue;

    // (b) Strong footer lines — drop entirely.
    if (includesAny(lower, FOOTER_PHRASES)) continue;

    // (c) Weak footer labels — drop only if the line is short / link-like.
    if (
      includesAny(lower, WEAK_FOOTER_PHRASES) &&
      (findUrls(line).length > 0 || trimmed.length < 40)
    ) {
      continue;
    }

    // (d) Wrapped URL fragments / token noise — drop entirely.
    if (looksLikeUrlFragment(line)) continue;

    const urls = findUrls(line);

    if (urls.length > 0) {
      const urlOnly = !hasTextBesidesUrls(line);

      if (urlOnly) {
        // URL-only line: keep only short, clearly non-noisy links; otherwise drop.
        const keep = urls.length === 1 && !isNoisyUrl(urls[0]);
        if (keep) out.push(trimmed);
        continue;
      }

      // Mixed line: strip noisy URLs, keep readable text and any clean URLs.
      line = line.replace(URL_REGEX, (m) => (isNoisyUrl(m) ? "" : m));
      URL_REGEX.lastIndex = 0;
      line = line.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+$/g, "");
      const labelled = trimLabel(line);
      if (labelled.trim() === "") continue; // nothing useful remained
      out.push(labelled);
      continue;
    }

    out.push(line);
  }

  // Collapse 2+ consecutive blank lines into one, then trim edges.
  const collapsed = [];
  let blankRun = 0;
  for (const line of out) {
    if (line.trim() === "") {
      blankRun += 1;
      if (blankRun > 1) continue;
      collapsed.push("");
    } else {
      blankRun = 0;
      collapsed.push(line);
    }
  }
  while (collapsed.length && collapsed[0].trim() === "") collapsed.shift();
  while (collapsed.length && collapsed[collapsed.length - 1].trim() === "")
    collapsed.pop();

  const cleaned = collapsed.join("\n");

  // Empty-result fallback: if cleaning stripped almost everything, the body
  // was probably mostly links/markup — show the original rather than a blank.
  if (meaningfulLength(cleaned) < 20) return body;

  return cleaned;
}

/**
 * Heuristic: does this body actually benefit from cleaning? Used so the
 * toggle / "cleaned" messaging only appear when there's a real difference.
 *
 * @param {string} body raw plain-text email body
 * @returns {boolean}
 */
export function bodyNeedsCleanup(body) {
  if (typeof body !== "string" || body.length === 0) return false;
  const cleaned = cleanEmailBody(body);
  const normalizedOriginal = body
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "");
  return cleaned !== normalizedOriginal;
}

/**
 * Turn cleaned plain-text into display blocks for a readable reading view.
 * Display-only; never used by AI actions.
 *
 * Block shapes:
 *   { type: "paragraph", text: string }
 *   { type: "list", items: string[] }
 *
 * Rules:
 *  - Blank lines separate blocks.
 *  - Consecutive "* ", "- " or "• " lines become one list block.
 *  - Consecutive non-bullet lines in the same block are joined with a space
 *    (fixes awkward hard-wrapped lines). Joining never crosses a blank line
 *    or a bullet boundary.
 *  - Returns [] if there's nothing to show (caller falls back to plain text).
 *
 * @param {string} text cleaned email body
 * @returns {Array<{type:string,text?:string,items?:string[]}>}
 */
export function formatEmailBody(text) {
  if (typeof text !== "string" || text.trim() === "") return [];

  const lines = text.split(/\n/);
  const blocks = [];
  let para = [];
  let list = [];

  const flushPara = () => {
    if (para.length) {
      const joined = para.join(" ").replace(/\s{2,}/g, " ").trim();
      if (joined) blocks.push({ type: "paragraph", text: joined });
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "list", items: list.slice() });
      list = [];
    }
  };

  const bulletRe = /^\s*[*\-•]\s+(.*)$/;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      flushPara();
      flushList();
      continue;
    }
    const m = line.match(bulletRe);
    if (m) {
      flushPara();
      const item = m[1].trim();
      if (item) list.push(item);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();

  return blocks;
}

/* ================================================================== */
/* Universal Email Reading View                                        */
/* ------------------------------------------------------------------ */
/* A display-only pipeline:                                            */
/*   detect intent → classify links → render readable blocks.          */
/*                                                                     */
/* Everything here is read-only and provider-agnostic. It NEVER        */
/* mutates the email and is NEVER used by AI actions or "Show          */
/* original" — those always read the untouched `email.body`. Input is  */
/* treated strictly as plain text, so no HTML/markup is parsed or      */
/* executed. Links are only ever surfaced as data (href + domain) for  */
/* the UI to render with a safe <a target="_blank" rel="noreferrer">.  */
/* ================================================================== */

// --- Intent phrase dictionaries -------------------------------------

// Clearly-transactional action phrases (rare in marketing email).
const STRONG_ACTION_PHRASES = [
  "verify email",
  "verify your email",
  "confirm email",
  "confirm your email",
  "confirm account",
  "confirm your account",
  "activate account",
  "activate your account",
  "create password",
  "set password",
  "set your password",
  "reset password",
  "reset your password",
  "forgot password",
  "accept invitation",
  "join workspace",
  "complete registration",
  "continue registration",
  "account setup",
  "finish setting up",
];

// Weaker action phrases — also appear in marketing, so lower priority.
const WEAK_ACTION_PHRASES = [
  "login",
  "log in",
  "sign in",
  "open document",
  "view document",
  "download file",
  "follow the link below",
  "follow the link",
  "click the link",
  "link expires",
  "expires in",
  "valid for",
];

const SECURITY_PHRASES = [
  "verification code",
  "security code",
  "authentication code",
  "confirmation code",
  "one-time code",
  "one time code",
  "passcode",
  "2fa",
  "two-factor",
  "two factor",
  "login attempt",
  "log-in attempt",
  "new sign-in",
  "new sign in",
  "password changed",
  "password was changed",
  "suspicious activity",
  "unusual activity",
];

const RECEIPT_PHRASES = [
  "receipt",
  "invoice",
  "order confirmation",
  "your order",
  "payment",
  "paid",
  "transaction",
  "shipped",
  "has shipped",
  "delivery",
  "out for delivery",
  "tracking number",
  "track your",
  "booking",
  "reservation",
  "subscription",
];

const MARKETING_PHRASES = [
  "unsubscribe",
  "manage preferences",
  "manage your preferences",
  "update preferences",
  "update your preferences",
  "view this email in your browser",
  "view in browser",
  "newsletter",
  "digest",
  "sale",
  "offer",
  "discount",
  "promotion",
  "promo",
  "utm_",
];

// --- Link classification dictionaries -------------------------------

const ACTION_CONTEXT_PHRASES = [
  "follow the link",
  "click the link",
  "click here",
  "create password",
  "set password",
  "reset password",
  "forgot password",
  "verify",
  "confirm",
  "activate",
  "login",
  "log in",
  "sign in",
  "register",
  "registration",
  "invitation",
  "invite",
  "view order",
  "your order",
  "track package",
  "track your",
  "download invoice",
  "download",
  "open document",
  "view document",
  "join meeting",
  "join workspace",
];

const ACTION_URL_TOKENS = [
  "token",
  "code",
  "reset",
  "verify",
  "verification",
  "auth",
  "oauth",
  "login",
  "signin",
  "invitation",
  "invite",
  "download",
  "invoice",
  "order",
  "tracking",
  "track",
  "checkout",
  "payment",
  "confirm",
  "activate",
];

const TRACKING_URL_TOKENS = [
  "utm_",
  "mc_cid",
  "mc_eid",
  "sfmc",
  "click.sfmc",
  "/email/click",
  "/click",
  "/track",
  "/tracking",
  "/redirect",
  "click.track",
  "list-manage.com",
  "mailchi.mp",
  "sendgrid.net",
  "target=",
  "redirect=",
  "qs=",
  "user_id=",
  "campaign=",
];

const FOOTER_CONTEXT_PHRASES = [
  "unsubscribe",
  "manage preferences",
  "manage your preferences",
  "update preferences",
  "update your preferences",
  "privacy policy",
  "terms of service",
  "terms of use",
  "help center",
  "help centre",
  "contact us",
  "view online",
  "view in browser",
  "view this email in your browser",
];

const USEFUL_CONTEXT_PHRASES = [
  "article",
  "read more",
  "learn more",
  "documentation",
  "docs",
  "resource",
  "document",
  "guide",
  "tutorial",
  "blog",
  "watch",
];

const CODE_PHRASES = [
  "verification code",
  "security code",
  "authentication code",
  "confirmation code",
  "one-time code",
  "one time code",
  "login code",
  "access code",
  "your code",
  "use this code",
  "otp",
  "passcode",
  "2fa",
  "two-factor",
  "two factor",
];

const SIGNOFF_WORDS = [
  "thanks",
  "thank you",
  "regards",
  "best",
  "cheers",
  "sincerely",
  "warmly",
  "yours",
  "best regards",
  "kind regards",
];

// --- Small helpers --------------------------------------------------

/** Hostname without a leading "www.", with a safe fallback parse. */
function getDomain(href) {
  try {
    const u = new URL(href);
    return u.hostname.replace(/^www\./i, "");
  } catch {
    const m = href.match(/^https?:\/\/([^/?#]+)/i);
    return m ? m[1].replace(/^www\./i, "") : href;
  }
}

/** Tracking / redirect link heuristic (intent-aware for the length rule). */
function isTrackingUrl(url, intent) {
  const lower = url.toLowerCase();
  if (TRACKING_URL_TOKENS.some((t) => lower.includes(t))) return true;
  if (url.length > 120 && intent === "marketing") return true;
  return false;
}

/**
 * Detect the email's intent from subject + snippet + body.
 * Precedence is tuned so transactional/security mail is never mistaken
 * for marketing, while heavy newsletter signals still win over weak
 * "sign in" style phrases.
 */
export function detectEmailIntent({ subject = "", snippet = "", body = "" } = {}) {
  const hay = `${subject}\n${snippet}\n${body}`.toLowerCase();
  const has = (arr) => arr.some((p) => hay.includes(p));

  const securityHit = has(SECURITY_PHRASES);
  const strongActionHit = has(STRONG_ACTION_PHRASES);
  const weakActionHit = has(WEAK_ACTION_PHRASES);
  const receiptHit = has(RECEIPT_PHRASES);
  const marketingHit = has(MARKETING_PHRASES);

  const urls = findUrls(body || "");
  const trackingCount = urls.filter((u) => isTrackingUrl(u, "marketing")).length;
  const strongMarketing =
    marketingHit && (hay.includes("unsubscribe") || trackingCount >= 3);

  if (securityHit) return "security";
  if (strongActionHit) return "action";
  if (receiptHit) return "receipt";
  if (strongMarketing) return "marketing";
  if (weakActionHit) return "action";
  if (marketingHit) return "marketing";

  // Personal heuristic: few links, no marketing/footer/tracking signals.
  const linkCount = urls.length;
  const noFooter = !FOOTER_CONTEXT_PHRASES.some((p) => hay.includes(p));
  const noTracking = trackingCount === 0;
  if (linkCount <= 3 && noFooter && noTracking) return "personal";

  return "unknown";
}

/**
 * Extract every link from a single line (markdown, bracketed, standalone)
 * and return the line text with the links removed. Markdown/anchor labels
 * are preserved on the link object so a button can reuse them, but they are
 * stripped from the text to avoid duplicating the button label inline.
 */
function extractLineLinks(line) {
  const links = [];
  let work = line;

  // Markdown links: [label](https://…)
  work = work.replace(
    /\[([^\]]+)\]\(\s*(https?:\/\/[^)\s]+)\s*\)/gi,
    (_m, label, url) => {
      links.push({ href: url, label: label.trim() });
      return " ";
    }
  );

  // Bracketed bare URL: [https://…]
  work = work.replace(/\[\s*(https?:\/\/[^\]\s]+)\s*\]/gi, (_m, url) => {
    links.push({ href: url, label: "" });
    return " ";
  });

  // Standalone URLs
  work = work.replace(URL_REGEX, (m) => {
    links.push({ href: m, label: "" });
    return " ";
  });
  URL_REGEX.lastIndex = 0;

  const text = work.replace(/[ \t]{2,}/g, " ").trim();
  return { text, links };
}

/**
 * Classify a single URL given its surrounding context and the email intent.
 * @returns {"action"|"tracking"|"footer"|"useful"|"unknown"}
 */
function classifyLink(href, context, intent) {
  const ctx = context.toLowerCase();
  const lower = href.toLowerCase();

  const footer = FOOTER_CONTEXT_PHRASES.some((p) => ctx.includes(p));
  const actionCtx = ACTION_CONTEXT_PHRASES.some((p) => ctx.includes(p));
  const actionUrl = ACTION_URL_TOKENS.some((t) => lower.includes(t));
  const tracking = isTrackingUrl(href, intent);

  const actionable =
    intent === "action" || intent === "security" || intent === "receipt";

  if (actionable && !footer && (actionCtx || actionUrl)) return "action";
  if (footer) return "footer";
  if (tracking) return "tracking";

  if (href.length <= 100) {
    if (USEFUL_CONTEXT_PHRASES.some((p) => ctx.includes(p))) return "useful";
    if (href.length <= 60) return "useful";
  }
  return "unknown";
}

/** Choose a human label for an action button from context + URL. */
function deriveActionLabel(href, context) {
  const s = `${context} ${href}`.toLowerCase();
  if (s.includes("reset password") || (s.includes("reset") && s.includes("password")))
    return "Reset password";
  if (s.includes("create password") || s.includes("set password") || s.includes("forgot password") || (s.includes("create") && s.includes("password")) || (s.includes("set") && s.includes("password")))
    return "Create password";
  if (
    s.includes("verify") ||
    s.includes("verification") ||
    s.includes("confirm email") ||
    s.includes("confirm account") ||
    s.includes("activate")
  )
    return "Verify email";
  if (s.includes("invitation") || s.includes("invite") || s.includes("join workspace"))
    return "Accept invitation";
  if (s.includes("track")) return "Track package";
  if (s.includes("invoice")) return "Download invoice";
  if (s.includes("view order") || s.includes("your order") || s.includes("order"))
    return "View order";
  if (s.includes("download")) return "Download file";
  if (s.includes("document")) return "Open document";
  if (s.includes("meeting")) return "Join meeting";
  if (s.includes("login") || s.includes("log in") || s.includes("sign in") || s.includes("register"))
    return "Open secure link";
  return "Open secure link";
}

/** Find a standalone verification-code-like token on a line. */
function findCodeToken(line) {
  const digit = line.match(/(?:^|[^\w])(\d{4,8})(?:[^\w]|$)/);
  if (digit) return digit[1];
  const alnum = line.match(/(?:^|[^\w])([A-Z0-9]{4,8})(?:[^\w]|$)/);
  if (alnum && /\d/.test(alnum[1]) && /[A-Z]/.test(alnum[1])) return alnum[1];
  return null;
}

/**
 * Locate a verification/security code near a code phrase.
 * @returns {{value:string,label:string,lineIndex:number}|null}
 */
function detectVerificationCode(lines, intent) {
  const lowerJoin = lines.join("\n").toLowerCase();
  const hasPhrase = CODE_PHRASES.some((p) => lowerJoin.includes(p));
  if (!hasPhrase && intent !== "security") return null;

  for (let i = 0; i < lines.length; i++) {
    const phraseHere = CODE_PHRASES.some((p) =>
      lines[i].toLowerCase().includes(p)
    );
    for (let j = i; j <= i + 2 && j < lines.length; j++) {
      const candidate = findCodeToken(lines[j]);
      const phraseNear =
        phraseHere || CODE_PHRASES.some((p) => lines[j].toLowerCase().includes(p));
      if (candidate && phraseNear) {
        return { value: candidate, label: "Verification code", lineIndex: j };
      }
    }
  }
  return null;
}

/** Heading heuristic for structured (non-personal) mail only. */
function isHeadingLine(paraLines, intent) {
  if (paraLines.length !== 1) return false;
  if (!["marketing", "receipt", "unknown"].includes(intent)) return false;
  const t = paraLines[0].trim();
  if (t.length === 0 || t.length > 55) return false;
  if (/[.!?,;:]$/.test(t)) return false;
  if (t.split(/\s+/).length > 8) return false;
  const lt = t.toLowerCase();
  if (SIGNOFF_WORDS.some((s) => lt.startsWith(s))) return false;
  return true;
}

/**
 * Build a universal, display-only reading view for an email.
 *
 * @param {object|string} input email object (uses body/subject/snippet) or a
 *                               raw body string.
 * @returns {{
 *   intent: "action"|"marketing"|"receipt"|"security"|"personal"|"unknown",
 *   cleanedText: string,
 *   blocks: Array<object>,
 *   hiddenLinkCount: number,
 *   preservedLinkCount: number
 * }}
 */
export function prepareEmailReadingView(input) {
  const email = typeof input === "string" ? { body: input } : input || {};
  const body = typeof email.body === "string" ? email.body : "";
  const subject = typeof email.subject === "string" ? email.subject : "";
  const snippet = typeof email.snippet === "string" ? email.snippet : "";

  const intent = detectEmailIntent({ subject, snippet, body });

  if (!body) {
    return {
      intent,
      cleanedText: "",
      blocks: [],
      hiddenLinkCount: 0,
      preservedLinkCount: 0,
    };
  }

  const rawLines = body.split(/\r?\n/);
  const codeInfo = detectVerificationCode(rawLines, intent);

  const items = [];
  let hiddenLinkCount = 0;
  let preservedLinkCount = 0;
  const keptHrefs = new Set();
  let marketingUsefulUsed = false;
  const recentText = [];

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i].replace(/[ \t]+$/g, "");
    const trimmedRaw = raw.trim();

    if (trimmedRaw === "") {
      items.push({ t: "blank" });
      continue;
    }
    if (includesAny(raw.toLowerCase(), BROWSER_FALLBACK_PHRASES)) continue;

    const { text, links } = extractLineLinks(raw);
    const context = `${recentText.slice(-2).join(" ")} ${text}`;
    // Tighter context (nearest preceding line only) for choosing a button
    // label, so a previous CTA line ("Track package:") doesn't bleed into the
    // next link's label ("View order details:").
    const nearContext = `${recentText.slice(-1).join(" ")} ${text}`;

    // Classify and surface links for this line.
    for (const link of links) {
      const kind = classifyLink(
        link.href,
        `${context} ${link.label || ""}`,
        intent
      );

      let keep = false;
      let blockKind = null;
      if (kind === "action") {
        keep = true;
        blockKind = "action";
      } else if (kind === "useful") {
        if (intent === "marketing") {
          if (!marketingUsefulUsed) {
            keep = true;
            blockKind = "useful";
            marketingUsefulUsed = true;
          }
        } else {
          keep = true;
          blockKind = "useful";
        }
      } else if (kind === "unknown") {
        if (
          (intent === "personal" || intent === "unknown") &&
          link.href.length <= 70
        ) {
          keep = true;
          blockKind = "useful";
        }
      }

      if (!keep) {
        hiddenLinkCount += 1;
        continue;
      }
      if (keptHrefs.has(link.href)) continue; // dedupe identical URLs
      keptHrefs.add(link.href);
      preservedLinkCount += 1;

      const domain = getDomain(link.href);
      const label =
        blockKind === "action"
          ? deriveActionLabel(link.href, `${nearContext} ${link.label || ""}`)
          : link.label && link.label.length <= 40 && !/^https?:/i.test(link.label)
          ? link.label
          : `Open ${domain}`;
      const reason =
        blockKind === "action" && /expire|expires|valid for/i.test(context)
          ? "This secure link may expire soon."
          : undefined;

      items.push({
        t: "link",
        block: {
          type: "actionLink",
          label,
          href: link.href,
          domain,
          ...(reason ? { reason } : {}),
        },
      });
    }

    // Surface readable text (dropping footer / fragment noise).
    if (text) {
      const lt = text.toLowerCase();
      const isFooter = includesAny(lt, FOOTER_PHRASES);
      const isWeakFooter = includesAny(lt, WEAK_FOOTER_PHRASES) && text.length < 40;
      const isFragment = looksLikeUrlFragment(text);

      if (!isFooter && !isWeakFooter && !isFragment) {
        if (codeInfo && i === codeInfo.lineIndex) {
          const stripped = trimLabel(
            text.replace(codeInfo.value, "").replace(/[ \t]{2,}/g, " ").trim()
          );
          if (stripped && meaningfulLength(stripped) > 2) {
            items.push({ t: "text", text: stripped });
            recentText.push(stripped);
          }
        } else {
          items.push({ t: "text", text });
          recentText.push(text);
        }
      }
    }

    // Emit the detected code block right after its source line.
    if (codeInfo && i === codeInfo.lineIndex) {
      items.push({
        t: "code",
        block: { type: "code", text: codeInfo.value, label: codeInfo.label },
      });
    }
  }

  // Group consecutive text into paragraph / heading / list blocks, keeping
  // link and code blocks in their original position.
  const blocks = [];
  let para = [];
  let list = [];
  const bulletRe = /^\s*(?:[*\-•]|\d+[.)])\s+(.*)$/;

  const flushPara = () => {
    if (para.length) {
      const joined = para.join(" ").replace(/\s{2,}/g, " ").trim();
      if (joined) {
        blocks.push(
          isHeadingLine(para, intent)
            ? { type: "heading", text: joined }
            : { type: "paragraph", text: joined }
        );
      }
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "list", items: list.slice() });
      list = [];
    }
  };

  for (const it of items) {
    if (it.t === "blank") {
      flushPara();
      flushList();
      continue;
    }
    if (it.t === "link" || it.t === "code") {
      flushPara();
      flushList();
      blocks.push(it.block);
      continue;
    }
    const m = it.text.match(bulletRe);
    if (m) {
      flushPara();
      const item = m[1].trim();
      if (item) list.push(item);
    } else {
      flushList();
      para.push(it.text);
    }
  }
  flushPara();
  flushList();

  const cleanedText = blocks
    .map((b) => {
      if (b.type === "heading" || b.type === "paragraph") return b.text;
      if (b.type === "list") return b.items.map((x) => `- ${x}`).join("\n");
      if (b.type === "actionLink") return `${b.label} (${b.domain})`;
      if (b.type === "code") return `${b.label || "Code"}: ${b.text}`;
      return "";
    })
    .filter(Boolean)
    .join("\n\n");

  return { intent, cleanedText, blocks, hiddenLinkCount, preservedLinkCount };
}

/** Friendly label for an intent, or null when not worth showing. */
export function intentLabel(intent) {
  switch (intent) {
    case "action":
      return "Action email";
    case "security":
      return "Security email";
    case "receipt":
      return "Receipt";
    case "marketing":
      return "Newsletter";
    case "personal":
      return "Personal email";
    default:
      return null;
  }
}
