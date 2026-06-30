/**
 * Smart Action Queue — pure, frontend-only builder.
 *
 * `buildActionQueue({ emails, tasks, captures }, limit)` folds the user's
 * existing data into a single, urgency-sorted list that answers "what should I
 * handle next?". It is a pure function: it reads only what the caller passes
 * in, never mutates those inputs, and performs no network or storage access.
 *
 * Data sources (all already in the app — nothing new is fetched here):
 *   - emails:   inbox list items (same shape Dashboard loads via fetchEmails),
 *               classified with the existing `triageEmail` helper.
 *   - tasks:    inboxpilot:tasks:v1  (via store.listTasks)
 *   - captures: inboxpilot:capture:v1 (via store.listCaptures)
 *
 * Gmail is never modified and email bodies are never fetched here — only the
 * already-loaded inbox list rows are read.
 */

import { triageEmail } from "./triage.js";

// Filter tabs shown above the queue.
export const ACTION_FILTERS = [
  { id: "all", label: "All" },
  { id: "inbox", label: "Inbox" },
  { id: "tasks", label: "Tasks" },
  { id: "captures", label: "Captures" },
  { id: "deadlines", label: "Deadlines" },
];

export const ACTION_EMPTY_TEXT =
  "Nothing urgent right now. Capture an idea, review your inbox, or plan the day.";

export const ACTION_QUEUE_LIMIT = 20;

// Urgency rank — lower sorts first (more urgent).
const URGENCY = {
  OVERDUE_TASK: 1,
  DUE_TODAY_TASK: 2,
  IMPORTANT_EMAIL: 3,
  NEEDS_REPLY_EMAIL: 4,
  HAS_TASK_EMAIL: 5,
  OPEN_CAPTURE: 6,
  UPCOMING_DEADLINE: 7,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Local date helpers (mirror the store's local-midnight convention)   */
/* ------------------------------------------------------------------ */

function parseDeadline(deadline) {
  if (!deadline || typeof deadline !== "string") return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function formatShortDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function formatEmailDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function emailTimestamp(dateStr) {
  if (!dateStr) return 0;
  const t = new Date(dateStr).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Strip "Name <email>" down to a readable sender label. */
function senderName(from) {
  if (!from || typeof from !== "string") return "";
  const match = from.match(/^(.+?)\s*<.+>$/);
  return (match ? match[1] : from).replace(/^"|"$/g, "").trim();
}

/* ------------------------------------------------------------------ */
/* Item builders                                                       */
/* ------------------------------------------------------------------ */

function buildTaskItem(task, mode, urgency) {
  const isOverdue = mode === "overdue";
  return {
    id: `task-${task.id}`,
    kind: "task",
    filter: "tasks",
    typeLabel: "Task",
    title: task.text || "Untitled task",
    reason: isOverdue ? "Overdue" : "Due today",
    date: task.deadline || "",
    urgency,
    isOverdue,
    taskId: task.id,
    primary: { label: "Open tasks", route: "/tasks" },
    canMarkDone: true,
    canStartFocus: true,
    // tie-break: earliest deadline first within the same urgency band.
    tieBreak: parseDeadline(task.deadline)?.getTime() ?? 0,
  };
}

function buildDeadlineItem(task, urgency) {
  return {
    id: `deadline-${task.id}`,
    kind: "deadline",
    filter: "deadlines",
    typeLabel: "Deadline",
    title: task.text || "Untitled task",
    reason: "Due soon",
    date: task.deadline || "",
    urgency,
    isOverdue: false,
    taskId: task.id,
    primary: { label: "Open deadlines", route: "/deadlines" },
    canMarkDone: true,
    canStartFocus: false,
    tieBreak: parseDeadline(task.deadline)?.getTime() ?? 0,
  };
}

function buildEmailItem(email, reason, urgency) {
  const sender = senderName(email.from);
  return {
    id: `email-${email.id}`,
    kind: "inbox",
    filter: "inbox",
    typeLabel: "Inbox",
    title: email.subject || "(no subject)",
    meta: sender,
    reason,
    date: formatEmailDate(email.date),
    urgency,
    isOverdue: false,
    primary: { label: "Open email", route: `/emails/${email.id}` },
    canMarkDone: false,
    canStartFocus: false,
    // tie-break: newest email first within the same urgency band.
    tieBreak: -emailTimestamp(email.date),
  };
}

/**
 * Pick the single most urgent actionable reason for an email so a message
 * appears once in the queue rather than repeating per matched label.
 */
function emailReason(labels) {
  if (labels.includes("important")) {
    return { reason: "Likely important", urgency: URGENCY.IMPORTANT_EMAIL };
  }
  if (labels.includes("needs_reply")) {
    return { reason: "Needs reply", urgency: URGENCY.NEEDS_REPLY_EMAIL };
  }
  if (labels.includes("has_task")) {
    return { reason: "Has task", urgency: URGENCY.HAS_TASK_EMAIL };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Public builder                                                      */
/* ------------------------------------------------------------------ */

/**
 * Combine real existing data into one urgency-sorted action queue.
 *
 * @param {object} sources
 * @param {Array}  [sources.emails]   inbox list rows (already loaded)
 * @param {Array}  [sources.tasks]    tasks from store.listTasks()
 * @param {Array}  [sources.captures] captures from store.listCaptures()
 * @param {number} [limit]            max items returned (default 20)
 * @returns {Array} sorted action items
 */
export function buildActionQueue(sources, limit = ACTION_QUEUE_LIMIT) {
  // Null-safe entry: accept undefined / null / non-object without throwing.
  // (A default param only guards `undefined`, so an explicit `null` — e.g. a
  // failed fetch handed straight in — would otherwise crash on destructuring.)
  const safe = sources && typeof sources === "object" ? sources : {};
  const emails = Array.isArray(safe.emails) ? safe.emails : [];
  const tasks = Array.isArray(safe.tasks) ? safe.tasks : [];
  const captures = Array.isArray(safe.captures) ? safe.captures : [];

  const items = [];
  const today = startOfToday().getTime();

  // --- Tasks: due/overdue (now) and upcoming deadlines (next 7 days) --------
  // Each iteration is isolated so one malformed/legacy task can never abort
  // the whole queue — bad items are skipped, not fatal.
  for (const task of tasks) {
    try {
      if (!task || task.status === "done") continue;
      const due = parseDeadline(task.deadline);
      if (due === null) continue;
      const dueTs = due.getTime();
      const diffDays = Math.round((dueTs - today) / MS_PER_DAY);

      if (dueTs < today) {
        items.push(buildTaskItem(task, "overdue", URGENCY.OVERDUE_TASK));
      } else if (dueTs === today) {
        items.push(buildTaskItem(task, "today", URGENCY.DUE_TODAY_TASK));
      } else if (diffDays <= 7) {
        items.push(buildDeadlineItem(task, URGENCY.UPCOMING_DEADLINE));
      }
      // Tasks dated beyond 7 days are not surfaced as urgent.
    } catch {
      // Skip a single bad task rather than crashing the page.
    }
  }

  // --- Emails: classified with the existing triage helper -------------------
  for (const email of emails) {
    try {
      if (!email || !email.id) continue;
      const { labels = [] } = triageEmail(email);
      const match = emailReason(Array.isArray(labels) ? labels : []);
      if (!match) continue;
      items.push(buildEmailItem(email, match.reason, match.urgency));
    } catch {
      // Skip a single bad email rather than crashing the page.
    }
  }

  // --- Captures: not yet converted ------------------------------------------
  for (const capture of captures) {
    try {
      if (!capture || capture.convertedTo) continue;
      const text = (capture.text || "").trim();
      if (!text) continue;
      items.push({
        id: `capture-${capture.id}`,
        kind: "capture",
        filter: "captures",
        typeLabel: "Capture",
        title: text,
        reason: "Not converted yet",
        date: formatShortDate(capture.createdAt),
        urgency: URGENCY.OPEN_CAPTURE,
        isOverdue: false,
        primary: { label: "Open capture", route: "/capture" },
        canMarkDone: false,
        canStartFocus: false,
        tieBreak: -(capture.createdAt || 0), // newest capture first
      });
    } catch {
      // Skip a single bad capture rather than crashing the page.
    }
  }

  // Sort by urgency band, then the per-item tie-break.
  items.sort((a, b) => {
    if (a.urgency !== b.urgency) return a.urgency - b.urgency;
    return a.tieBreak - b.tieBreak;
  });

  // Never surface an item without a usable primary action. The list renders
  // `item.primary.route` / `item.primary.label` directly, so a missing primary
  // would crash the whole page — drop those items instead.
  const usable = items.filter(
    (it) => it && it.primary && it.primary.route && it.primary.label
  );

  const max = Number.isFinite(limit) && limit > 0 ? limit : ACTION_QUEUE_LIMIT;
  return usable.slice(0, max);
}

/**
 * Count items per filter tab for the queue's tab badges.
 * Returns { all, inbox, tasks, captures, deadlines }.
 */
export function countByFilter(items) {
  const counts = { all: 0, inbox: 0, tasks: 0, captures: 0, deadlines: 0 };
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item !== "object") continue; // skip malformed entries
    counts.all += 1;
    if (counts[item.filter] != null) counts[item.filter] += 1;
  }
  return counts;
}
