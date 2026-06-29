/**
 * Shared localStorage data layer for InboxPilot productivity features.
 *
 * Frontend-only. No backend calls. Stores ONLY user-organized productivity
 * data (tasks, notes) that originate from AI results the app already produces.
 *
 * It NEVER stores Gmail OAuth tokens, the JWT, the Gemini key, .env values,
 * or raw full email bodies. Note/task content is limited to AI output and
 * short user-editable text.
 *
 * All access is guarded: storage availability is probed and every read/write
 * is wrapped in try/catch so the app never crashes when localStorage is
 * unavailable (private mode, disabled storage) or holds corrupt JSON.
 *
 * Versioned keys:
 *   inboxpilot:tasks:v1
 *   inboxpilot:notes:v1
 */

const TASKS_KEY = "inboxpilot:tasks:v1";
const NOTES_KEY = "inboxpilot:notes:v1";
const STUDY_PLANNER_KEY = "inboxpilot:study-planner:v1";

const VALID_STATUS = ["todo", "in_progress", "done"];
const VALID_PRIORITY = ["high", "medium", "low"];

/**
 * True when localStorage can actually be read/written in this context.
 * Some browsers throw on access, so we probe rather than assume.
 */
function storageAvailable() {
  try {
    const probe = "__inboxpilot_store_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a JSON array stored under `key`. Returns [] on any error or if the
 * stored value isn't an array. Never throws.
 */
function readArray(key) {
  if (!storageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt JSON or read error — degrade to empty list.
    return [];
  }
}

/**
 * Write a JSON array under `key`. Returns true on success. Never throws.
 */
function writeArray(key, value) {
  if (!storageAvailable()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Quota exceeded or serialization error — fail quietly.
    return false;
  }
}

/**
 * Generate a reasonably unique id without adding any dependency.
 */
function makeId() {
  try {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ------------------------------------------------------------------ */
/* Normalizers — keep stored shapes consistent and safe               */
/* ------------------------------------------------------------------ */

function normalizeSource(source) {
  if (!source || typeof source !== "object") return null;
  const type = source.type === "email" || source.type === "text" ? source.type : null;
  if (!type) return null;
  const out = { type };
  // Only persist an id — never tokens or bodies.
  if (source.id != null) out.id = String(source.id);
  return out;
}

function normalizeTask(input) {
  const now = Date.now();
  const status = VALID_STATUS.includes(input?.status) ? input.status : "todo";
  const priority = VALID_PRIORITY.includes(input?.priority) ? input.priority : null;
  return {
    id: input?.id ? String(input.id) : makeId(),
    text: typeof input?.text === "string" ? input.text : "",
    deadline: typeof input?.deadline === "string" && input.deadline ? input.deadline : null,
    priority,
    status,
    source: normalizeSource(input?.source),
    createdAt: typeof input?.createdAt === "number" ? input.createdAt : now,
    updatedAt: typeof input?.updatedAt === "number" ? input.updatedAt : now,
  };
}

function normalizeNote(input) {
  const now = Date.now();
  return {
    id: input?.id ? String(input.id) : makeId(),
    title: typeof input?.title === "string" ? input.title : "",
    body: typeof input?.body === "string" ? input.body : "",
    keyPoints: Array.isArray(input?.keyPoints)
      ? input.keyPoints.filter((p) => typeof p === "string")
      : [],
    source: normalizeSource(input?.source),
    createdAt: typeof input?.createdAt === "number" ? input.createdAt : now,
  };
}

/* ------------------------------------------------------------------ */
/* Tasks API                                                           */
/* ------------------------------------------------------------------ */

/**
 * Return all saved tasks (array, newest stored first is not guaranteed —
 * callers can sort). Never throws.
 */
export function listTasks() {
  return readArray(TASKS_KEY).map(normalizeTask);
}

/**
 * Add a task. Accepts a partial task; missing fields are defaulted.
 * Returns the stored task object, or null if it couldn't be saved.
 */
export function addTask(task) {
  const tasks = listTasks();
  const normalized = normalizeTask(task);
  tasks.push(normalized);
  return writeArray(TASKS_KEY, tasks) ? normalized : null;
}

/**
 * Add multiple tasks at once (e.g. from one extract-tasks result).
 * Returns the list of stored tasks. Skips duplicates per `isDuplicateTask`.
 */
export function addTasks(taskList) {
  if (!Array.isArray(taskList) || taskList.length === 0) return [];
  const tasks = listTasks();
  const added = [];
  for (const t of taskList) {
    const normalized = normalizeTask(t);
    const dup = tasks.some(
      (existing) =>
        sameSource(existing.source, normalized.source) &&
        normalizeText(existing.text) === normalizeText(normalized.text)
    );
    if (dup) continue;
    tasks.push(normalized);
    added.push(normalized);
  }
  if (added.length === 0) return [];
  return writeArray(TASKS_KEY, tasks) ? added : [];
}

/**
 * Patch a task by id. Returns the updated task or null if not found/failed.
 * Status and priority are validated; invalid values are ignored.
 */
export function updateTask(id, patch) {
  if (!id || !patch || typeof patch !== "object") return null;
  const tasks = listTasks();
  const idx = tasks.findIndex((t) => t.id === String(id));
  if (idx === -1) return null;

  const current = tasks[idx];
  const next = { ...current };

  if (typeof patch.text === "string") next.text = patch.text;
  if ("deadline" in patch) {
    next.deadline =
      typeof patch.deadline === "string" && patch.deadline ? patch.deadline : null;
  }
  if ("priority" in patch) {
    next.priority = VALID_PRIORITY.includes(patch.priority) ? patch.priority : null;
  }
  if (patch.status && VALID_STATUS.includes(patch.status)) next.status = patch.status;
  next.updatedAt = Date.now();

  tasks[idx] = next;
  return writeArray(TASKS_KEY, tasks) ? next : null;
}

/**
 * Remove a task by id. Returns true if a task was removed and persisted.
 */
export function removeTask(id) {
  if (!id) return false;
  const tasks = listTasks();
  const next = tasks.filter((t) => t.id !== String(id));
  if (next.length === tasks.length) return false;
  return writeArray(TASKS_KEY, next);
}

/* ------------------------------------------------------------------ */
/* Notes API                                                           */
/* ------------------------------------------------------------------ */

/**
 * Return all saved notes. Never throws.
 */
export function listNotes() {
  return readArray(NOTES_KEY).map(normalizeNote);
}

/**
 * Add a note. Returns the stored note, or null if it couldn't be saved.
 * Skips an exact duplicate (same source + same body) to avoid repeats.
 */
export function addNote(note) {
  const notes = listNotes();
  const normalized = normalizeNote(note);
  const dup = notes.some(
    (existing) =>
      sameSource(existing.source, normalized.source) &&
      normalizeText(existing.body) === normalizeText(normalized.body)
  );
  if (dup) {
    return notes.find(
      (existing) =>
        sameSource(existing.source, normalized.source) &&
        normalizeText(existing.body) === normalizeText(normalized.body)
    );
  }
  notes.push(normalized);
  return writeArray(NOTES_KEY, notes) ? normalized : null;
}

/**
 * Remove a note by id. Returns true if a note was removed and persisted.
 */
export function removeNote(id) {
  if (!id) return false;
  const notes = listNotes();
  const next = notes.filter((n) => n.id !== String(id));
  if (next.length === notes.length) return false;
  return writeArray(NOTES_KEY, next);
}

/* ------------------------------------------------------------------ */
/* Duplicate helpers                                                   */
/* ------------------------------------------------------------------ */

function normalizeText(text) {
  return (text || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function sameSource(a, b) {
  const at = a?.type || "";
  const bt = b?.type || "";
  const ai = a?.id || "";
  const bi = b?.id || "";
  return at === bt && ai === bi;
}

/**
 * Check whether a task with the same source + text already exists.
 * Useful for callers that want to warn before saving. Never throws.
 */
export function isDuplicateTask(source, text) {
  const normalizedSource = normalizeSource(source);
  const t = normalizeText(text);
  return listTasks().some(
    (existing) =>
      sameSource(existing.source, normalizedSource) &&
      normalizeText(existing.text) === t
  );
}

/* ------------------------------------------------------------------ */
/* Deadline grouping                                                   */
/* ------------------------------------------------------------------ */

/**
 * Parse a deadline string into a Date at local midnight, or null if invalid.
 * Accepts ISO dates like "2026-07-02" and other Date-parseable strings.
 */
function parseDeadline(deadline) {
  if (!deadline || typeof deadline !== "string") return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Group tasks by deadline proximity for the Deadline Center.
 *
 * Returns: { today, thisWeek, later, noDate } — each an array of tasks.
 * - today:     due today, or overdue (surfaced as needing attention now)
 * - thisWeek:  due within the next 7 days (after today)
 * - later:     due beyond 7 days
 * - noDate:    no parseable deadline
 *
 * Never throws.
 */
export function deriveDeadlineGroups(tasks) {
  const groups = { today: [], thisWeek: [], later: [], noDate: [] };
  const list = Array.isArray(tasks) ? tasks : [];

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const msPerDay = 24 * 60 * 60 * 1000;

  for (const task of list) {
    const due = parseDeadline(task?.deadline);
    if (!due) {
      groups.noDate.push(task);
      continue;
    }
    const diffDays = Math.round((due.getTime() - now.getTime()) / msPerDay);
    if (diffDays <= 0) {
      // today or overdue
      groups.today.push(task);
    } else if (diffDays <= 7) {
      groups.thisWeek.push(task);
    } else {
      groups.later.push(task);
    }
  }

  return groups;
}

/* ------------------------------------------------------------------ */
/* Study Planner — local-only focus derivation + preference            */
/* ------------------------------------------------------------------ */

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

/**
 * Order active tasks into a prioritized "Today's Focus" list.
 *
 * Frontend-only. Reads nothing new — callers pass tasks from `listTasks()`.
 *
 * Rules (in order):
 *   1. Exclude done tasks.
 *   2. Tasks due today or overdue first.
 *   3. Then high priority (without a near deadline).
 *   4. Then due this week.
 *   5. Then tasks without a date.
 *   6. Any remaining dated tasks (later) fill the tail.
 * A task only appears once, in its highest-ranked bucket.
 *
 * Returns at most `limit` tasks (default 5). Never throws.
 */
export function deriveFocusTasks(tasks, limit = 5) {
  const list = Array.isArray(tasks) ? tasks : [];
  const active = list.filter((t) => t && t.status !== "done");

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const msPerDay = 24 * 60 * 60 * 1000;

  const dueToday = [];
  const highPriority = [];
  const thisWeek = [];
  const noDate = [];
  const later = [];

  for (const task of active) {
    const due = parseDeadline(task.deadline);
    const diffDays =
      due === null
        ? null
        : Math.round((due.getTime() - now.getTime()) / msPerDay);

    if (diffDays !== null && diffDays <= 0) {
      dueToday.push(task);
    } else if (task.priority === "high") {
      highPriority.push(task);
    } else if (diffDays !== null && diffDays <= 7) {
      thisWeek.push(task);
    } else if (diffDays === null) {
      noDate.push(task);
    } else {
      later.push(task);
    }
  }

  // Within each bucket, sort by soonest deadline then priority for stability.
  const byUrgency = (a, b) => {
    const da = parseDeadline(a.deadline);
    const db = parseDeadline(b.deadline);
    if (da && db && da.getTime() !== db.getTime()) return da.getTime() - db.getTime();
    if (da && !db) return -1;
    if (!da && db) return 1;
    const pa = PRIORITY_RANK[a.priority] ?? 3;
    const pb = PRIORITY_RANK[b.priority] ?? 3;
    return pa - pb;
  };

  dueToday.sort(byUrgency);
  highPriority.sort(byUrgency);
  thisWeek.sort(byUrgency);
  later.sort(byUrgency);

  const ordered = [
    ...dueToday,
    ...highPriority,
    ...thisWeek,
    ...noDate,
    ...later,
  ];

  const max = Number.isFinite(limit) && limit > 0 ? limit : 5;
  return ordered.slice(0, max);
}

const VALID_PLAN_STYLES = ["light", "balanced", "deep"];

/**
 * Read the saved Study Planner preference. Returns a normalized object,
 * defaulting to "balanced" when nothing valid is stored. Never throws.
 */
export function getStudyPlannerPrefs() {
  const fallback = { planStyle: "balanced" };
  if (!storageAvailable()) return fallback;
  try {
    const raw = window.localStorage.getItem(STUDY_PLANNER_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const planStyle = VALID_PLAN_STYLES.includes(parsed?.planStyle)
      ? parsed.planStyle
      : "balanced";
    return { planStyle };
  } catch {
    return fallback;
  }
}

/**
 * Persist the Study Planner preference. Validates `planStyle`.
 * Returns the saved object, or the current value if it couldn't be saved.
 */
export function setStudyPlannerPrefs(patch) {
  const current = getStudyPlannerPrefs();
  const next = { ...current };
  if (patch && VALID_PLAN_STYLES.includes(patch.planStyle)) {
    next.planStyle = patch.planStyle;
  }
  if (!storageAvailable()) return next;
  try {
    window.localStorage.setItem(STUDY_PLANNER_KEY, JSON.stringify(next));
  } catch {
    // Quota/serialization error — keep returning intended value.
  }
  return next;
}

/**
 * Build a simple, local-only study plan from a list of focus tasks.
 *
 * No AI, no network, no real scheduling — just calm suggested blocks sized
 * by the chosen style. Deep-work blocks are attached to high-priority tasks.
 *
 * Returns an array of { id, kind, label, minutes, taskText? }. Never throws.
 */
export function buildStudyPlan(focusTasks, planStyle = "balanced") {
  const tasks = Array.isArray(focusTasks) ? focusTasks : [];
  if (tasks.length === 0) return [];

  const style = VALID_PLAN_STYLES.includes(planStyle) ? planStyle : "balanced";
  // How many focus blocks to lay out for this style.
  const focusBlockCount = style === "light" ? 2 : style === "deep" ? 4 : 3;
  // Length of a standard focus block.
  const focusMinutes = style === "deep" ? 50 : 25;
  const deepMinutes = style === "deep" ? 60 : 45;

  const blocks = [];
  let counter = 0;
  const push = (kind, label, minutes, taskText) => {
    blocks.push({ id: `block-${counter++}`, kind, label, minutes, taskText });
  };

  for (let i = 0; i < focusBlockCount; i++) {
    const task = tasks[i];
    if (!task) break;

    if (task.priority === "high") {
      push("deep", "Deep work block", deepMinutes, task.text);
    } else {
      push("focus", "Focus block", focusMinutes, task.text);
    }

    // A short break between blocks, but not after the last one.
    if (i < focusBlockCount - 1 && tasks[i + 1]) {
      push("break", "Break", 5);
    }
  }

  // Close out with a short review block.
  push("review", "Review block", 10);
  return blocks;
}
