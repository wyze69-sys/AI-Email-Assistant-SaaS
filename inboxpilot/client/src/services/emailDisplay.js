// emailDisplay.js
// Display-only cleanup for plain-text email bodies.
//
// IMPORTANT: This module never mutates the original email. It returns a
// cleaned *copy* of the body purely for rendering. AI actions (summarize,
// extract tasks, suggested reply, priority review) must keep using the
// original `email.body` / backend-fetched content, never this output.
//
// The cleanup is conservative: it hides standalone tracking/marketing URLs
// and tidies whitespace, but keeps human-readable text. It does not parse or
// render HTML — input is treated as plain text only, so no scripts or markup
// are ever executed.

// URL matcher used to detect and strip links. Intentionally simple and
// scoped to http/https so we never touch ordinary words.
const URL_REGEX = /https?:\/\/[^\s<>"')]+/gi;

// Fragments that strongly indicate a tracking / marketing redirect link.
// Matched case-insensitively against the full URL.
const TRACKING_HINTS = [
  "click.sfmc",
  "sfmc.edx.org",
  "utm_",
  "?qs=",
  "&qs=",
  "/trk",
  "list-manage.com",
  "mailchi.mp",
  "sendgrid.net",
  "mandrillapp.com",
  "doubleclick.net",
  "/wf/click",
  "/CL0/",
  "email.",
  "links.",
  "click.",
  "track.",
];

// A URL is considered "trackingy" if it matches any known hint. Plain links
// that look like normal destinations are left intact so we don't hide useful
// human-shared URLs.
function isTrackingUrl(url) {
  const lower = url.toLowerCase();
  return TRACKING_HINTS.some((hint) => lower.includes(hint));
}

// True when, after removing all URLs, a line has no meaningful text left.
// Such a line was effectively just a link (optionally with bullets/brackets).
function isUrlOnlyLine(line) {
  const withoutUrls = line.replace(URL_REGEX, "");
  // Strip common decoration left around bare links.
  const residue = withoutUrls.replace(/[\s\-•·*>|()<>\[\]]/g, "");
  return residue.length === 0;
}

/**
 * Produce a display-friendly version of a plain-text email body.
 *
 * Rules:
 *  - Standalone URL-only lines are dropped. If the URL looks like tracking,
 *    a small "[link hidden]" placeholder is left so the layout reads cleanly;
 *    otherwise the whole empty line is removed.
 *  - Lines with human text + a tracking URL keep the text; the tracking URL
 *    is removed. Non-tracking URLs inside text lines are preserved.
 *  - Repeated blank lines are collapsed to a single blank line.
 *  - Trailing whitespace on each line is trimmed; leading/trailing blank
 *    lines are removed.
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

    if (isUrlOnlyLine(line) && URL_REGEX.test(line)) {
      // Reset lastIndex because URL_REGEX is global and stateful.
      URL_REGEX.lastIndex = 0;
      const urls = line.match(URL_REGEX) || [];
      const allTracking = urls.length > 0 && urls.every(isTrackingUrl);
      if (allTracking) {
        out.push("[link hidden]");
      }
      // Non-tracking URL-only lines (and the tracking case above) collapse
      // the rest of the original line away.
      URL_REGEX.lastIndex = 0;
      continue;
    }
    URL_REGEX.lastIndex = 0;

    // Mixed line: keep human text, strip only tracking URLs inline.
    line = line.replace(URL_REGEX, (match) =>
      isTrackingUrl(match) ? "" : match
    );
    URL_REGEX.lastIndex = 0;

    // Tidy any double spaces left where a URL was removed.
    line = line.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+$/g, "");

    out.push(line);
  }

  // Collapse 2+ consecutive blank lines into one, and trim edges.
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

  return collapsed.join("\n");
}

/**
 * Heuristic: does this body actually benefit from cleaning?
 * Used so we don't show the toggle / "cleaned" messaging for already-tidy
 * emails, and so cleaned output never silently differs by a trivial amount.
 *
 * @param {string} body raw plain-text email body
 * @returns {boolean}
 */
export function bodyNeedsCleanup(body) {
  if (typeof body !== "string" || body.length === 0) return false;
  const cleaned = cleanEmailBody(body);
  // Only worth offering if cleaning meaningfully changed the text.
  return cleaned !== body.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "");
}
