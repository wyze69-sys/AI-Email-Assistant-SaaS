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
