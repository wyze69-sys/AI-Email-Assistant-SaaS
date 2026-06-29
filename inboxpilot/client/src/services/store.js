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
 *   inboxpilot:resources:v1
 */

const TASKS_KEY = "inboxpilot:tasks:v1";
const NOTES_KEY = "inboxpilot:notes:v1";
const STUDY_PLANNER_KEY = "inboxpilot:study-planner:v1";
const RESOURCES_KEY = "inboxpilot:resources:v1";

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
/* Resource Library API (local-only bookmarks / references)            */
/* ------------------------------------------------------------------ */

const VALID_RESOURCE_CATEGORIES = [
  "general",
  "article",
  "document",
  "tool",
  "project",
  "tutorial",
  "meeting",
  "custom",
];

// Schemes we never store as a clickable link.
const UNSAFE_URL_SCHEME = /^(javascript|data|file|vbscript|blob|about|mailto|tel|ftp):/i;

/**
 * Normalize a user-entered resource URL into a safe http(s) link.
 *
 * Returns:
 *   ""    when the input is blank (the resource simply has no link)
 *   null  when the input is present but unsafe / unparseable (reject it)
 *   a normalized "https://…" (or "http://…") string otherwise
 *
 * Rules:
 *   - "example.com"            -> "https://example.com"
 *   - "https://example.com"    -> kept (trailing "/" trimmed for a bare host)
 *   - "http://x"               -> allowed
 *   - "javascript:alert(1)"    -> null (rejected)
 *   - "data:…", "file:…"       -> null (rejected)
 *
 * Never throws.
 */
export function normalizeResourceUrl(url) {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Explicitly reject unsafe / non-web schemes.
  if (UNSAFE_URL_SCHEME.test(trimmed)) return null;

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    // Declares some other scheme with "//" (e.g. ssh://) -> reject.
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) return null;
    // Otherwise assume the user meant a plain web host.
    candidate = `https://${candidate}`;
  }

  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname) return null;
    // Trim a lone trailing slash for a bare host so "example.com" stays tidy.
    if (u.pathname === "/" && !u.search && !u.hash) return u.origin;
    return u.href;
  } catch {
    return null;
  }
}

/**
 * Parse tags from a comma-separated string (or an array). Trims whitespace,
 * drops empty entries, and removes case-insensitive duplicates. Never throws.
 */
export function parseResourceTags(tagsText) {
  const source = Array.isArray(tagsText)
    ? tagsText
    : typeof tagsText === "string"
    ? tagsText.split(",")
    : [];
  const out = [];
  const seen = new Set();
  for (const raw of source) {
    if (typeof raw !== "string") continue;
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

function normalizeResource(input) {
  const now = Date.now();
  const category = VALID_RESOURCE_CATEGORIES.includes(input?.category)
    ? input.category
    : "general";
  const safeUrl = normalizeResourceUrl(
    typeof input?.url === "string" ? input.url : ""
  );
  return {
    id: input?.id ? String(input.id) : makeId(),
    title: typeof input?.title === "string" ? input.title.trim() : "",
    url: safeUrl ? safeUrl : "",
    category,
    notes: typeof input?.notes === "string" ? input.notes : "",
    tags: parseResourceTags(input?.tags),
    createdAt: typeof input?.createdAt === "number" ? input.createdAt : now,
    updatedAt: typeof input?.updatedAt === "number" ? input.updatedAt : now,
  };
}

/**
 * Return all saved resources. Callers can sort. Never throws.
 */
export function listResources() {
  return readArray(RESOURCES_KEY).map(normalizeResource);
}

/**
 * Add a resource. Requires a non-blank title. Returns the stored resource,
 * or null if the title is blank or it couldn't be saved.
 */
export function addResource(resource) {
  const normalized = normalizeResource(resource);
  if (!normalized.title) return null;
  const all = listResources();
  all.push(normalized);
  return writeArray(RESOURCES_KEY, all) ? normalized : null;
}

/**
 * Patch a resource by id. Blank titles in the patch are ignored so a
 * resource is never left untitled. Returns the updated resource or null.
 */
export function updateResource(id, patch) {
  if (!id || !patch || typeof patch !== "object") return null;
  const all = listResources();
  const idx = all.findIndex((r) => r.id === String(id));
  if (idx === -1) return null;

  const next = { ...all[idx] };
  if (typeof patch.title === "string") {
    const t = patch.title.trim();
    if (t) next.title = t;
  }
  if ("url" in patch) {
    const safe = normalizeResourceUrl(
      typeof patch.url === "string" ? patch.url : ""
    );
    next.url = safe ? safe : "";
  }
  if (patch.category && VALID_RESOURCE_CATEGORIES.includes(patch.category)) {
    next.category = patch.category;
  }
  if (typeof patch.notes === "string") next.notes = patch.notes;
  if ("tags" in patch) next.tags = parseResourceTags(patch.tags);
  next.updatedAt = Date.now();

  all[idx] = next;
  return writeArray(RESOURCES_KEY, all) ? next : null;
}

/**
 * Remove a resource by id. Returns true if one was removed and persisted.
 */
export function removeResource(id) {
  if (!id) return false;
  const all = listResources();
  const next = all.filter((r) => r.id !== String(id));
  if (next.length === all.length) return false;
  return writeArray(RESOURCES_KEY, next);
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

/* ------------------------------------------------------------------ */
/* Focus Timer — completed session log (local-only)                    */
/* ------------------------------------------------------------------ */

const FOCUS_SESSIONS_KEY = "inboxpilot:focus-sessions:v1";
const FOCUS_SESSIONS_LIMIT = 20;
const VALID_FOCUS_MODES = ["focus", "short_break", "deep"];

function normalizeSession(input) {
  const now = Date.now();
  const minutes =
    typeof input?.minutes === "number" && input.minutes > 0
      ? Math.round(input.minutes)
      : 0;
  return {
    id: input?.id ? String(input.id) : makeId(),
    taskId: input?.taskId != null ? String(input.taskId) : "",
    taskText: typeof input?.taskText === "string" ? input.taskText : "",
    minutes,
    mode: VALID_FOCUS_MODES.includes(input?.mode) ? input.mode : "focus",
    completedAt: typeof input?.completedAt === "number" ? input.completedAt : now,
  };
}

/**
 * Return completed focus sessions, newest first. Never throws.
 */
export function listFocusSessions() {
  const sessions = readArray(FOCUS_SESSIONS_KEY).map(normalizeSession);
  return sessions.sort((a, b) => b.completedAt - a.completedAt);
}

/**
 * Append a completed focus session. Keeps only the latest
 * FOCUS_SESSIONS_LIMIT (20) entries to avoid unbounded localStorage growth.
 * Returns the stored session, or null if it couldn't be saved.
 */
export function addFocusSession(session) {
  const normalized = normalizeSession(session);
  const existing = readArray(FOCUS_SESSIONS_KEY).map(normalizeSession);
  const next = [normalized, ...existing]
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, FOCUS_SESSIONS_LIMIT);
  return writeArray(FOCUS_SESSIONS_KEY, next) ? normalized : null;
}

/* ------------------------------------------------------------------ */
/* Local Data Manager — summary, backup, import, clear (local-only)    */
/*                                                                     */
/* Operates ONLY on the known InboxPilot productivity keys below. It   */
/* never reads or writes the auth token ("token"), Gmail OAuth tokens, */
/* the Gemini key, or any other key outside this allow-list.           */
/* ------------------------------------------------------------------ */

const AI_RESULTS_PREFIX = "inboxpilot:ai-results:v1:";

/**
 * Remove a single localStorage key. Returns true on success. Never throws.
 */
function removeKey(key) {
  if (!storageAvailable()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * List every saved AI-result key (prefixed with the AI results namespace).
 * Returns the raw localStorage keys. Callers must NOT surface these to the
 * UI as-is — they embed email ids. Never throws.
 */
function listAiResultKeys() {
  if (!storageAvailable()) return [];
  const keys = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(AI_RESULTS_PREFIX)) keys.push(k);
    }
  } catch {
    return [];
  }
  return keys;
}

/**
 * Build a privacy-safe summary of locally stored productivity data.
 * Returns counts only — never raw email ids or stored content. Never throws.
 *
 * Shape:
 *   { tasks, notes, focusSessions, plannerConfigured, plannerStyle, aiResultEntries }
 */
export function getLocalDataSummary() {
  let plannerConfigured = false;
  try {
    plannerConfigured =
      storageAvailable() &&
      window.localStorage.getItem(STUDY_PLANNER_KEY) != null;
  } catch {
    plannerConfigured = false;
  }

  return {
    tasks: listTasks().length,
    notes: listNotes().length,
    resources: listResources().length,
    focusSessions: listFocusSessions().length,
    plannerConfigured,
    plannerStyle: getStudyPlannerPrefs().planStyle,
    aiResultEntries: listAiResultKeys().length,
  };
}

/**
 * Build an exportable backup object of local productivity data ONLY.
 *
 * Includes: version, exportedAt, tasks, notes, plannerPrefs, focusSessions,
 * and aiResults (an object keyed by the known AI-result localStorage key).
 *
 * Deliberately excludes the JWT, Gmail OAuth tokens, the Gemini key, .env
 * values, and any key outside the known productivity allow-list. Never throws.
 */
export function buildBackup() {
  const aiResults = {};
  for (const key of listAiResultKeys()) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) continue;
      aiResults[key] = JSON.parse(raw);
    } catch {
      // Skip a single corrupt entry rather than failing the whole export.
    }
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks: listTasks(),
    notes: listNotes(),
    resources: listResources(),
    plannerPrefs: getStudyPlannerPrefs(),
    focusSessions: listFocusSessions(),
    aiResults,
  };
}

/**
 * Validate and import a parsed backup object.
 *
 * Safety rules:
 *   - Accepts only plain objects with version === 1.
 *   - Writes ONLY the known productivity keys.
 *   - AI results are written only for keys that start with the AI prefix;
 *     all other / unknown keys are ignored.
 *   - Never imports auth tokens or any key outside the allow-list.
 *   - Normalizes records through the same shapers used elsewhere.
 *
 * Returns { ok, message, imported } and never throws.
 */
export function importBackup(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, message: "This file isn't a valid InboxPilot backup." };
  }
  if (parsed.version !== 1) {
    return {
      ok: false,
      message: "Unsupported backup version. Only version 1 backups can be imported.",
    };
  }
  if (!storageAvailable()) {
    return { ok: false, message: "Local storage isn't available in this browser." };
  }

  const imported = {
    tasks: 0,
    notes: 0,
    resources: 0,
    focusSessions: 0,
    planner: false,
    aiResults: 0,
  };

  try {
    if (Array.isArray(parsed.tasks)) {
      const normalized = parsed.tasks.map(normalizeTask);
      if (writeArray(TASKS_KEY, normalized)) imported.tasks = normalized.length;
    }

    if (Array.isArray(parsed.notes)) {
      const normalized = parsed.notes.map(normalizeNote);
      if (writeArray(NOTES_KEY, normalized)) imported.notes = normalized.length;
    }

    if (Array.isArray(parsed.resources)) {
      const normalized = parsed.resources
        .map(normalizeResource)
        .filter((r) => r.title);
      if (writeArray(RESOURCES_KEY, normalized)) {
        imported.resources = normalized.length;
      }
    }

    if (Array.isArray(parsed.focusSessions)) {
      const normalized = parsed.focusSessions
        .map(normalizeSession)
        .sort((a, b) => b.completedAt - a.completedAt)
        .slice(0, FOCUS_SESSIONS_LIMIT);
      if (writeArray(FOCUS_SESSIONS_KEY, normalized)) {
        imported.focusSessions = normalized.length;
      }
    }

    if (parsed.plannerPrefs && typeof parsed.plannerPrefs === "object") {
      setStudyPlannerPrefs({ planStyle: parsed.plannerPrefs.planStyle });
      imported.planner = true;
    }

    if (
      parsed.aiResults &&
      typeof parsed.aiResults === "object" &&
      !Array.isArray(parsed.aiResults)
    ) {
      for (const key of Object.keys(parsed.aiResults)) {
        // Ignore any key outside the known AI-results namespace.
        if (typeof key !== "string" || !key.startsWith(AI_RESULTS_PREFIX)) continue;
        const value = parsed.aiResults[key];
        if (!value || typeof value !== "object") continue;
        try {
          window.localStorage.setItem(key, JSON.stringify(value));
          imported.aiResults += 1;
        } catch {
          // Skip a single bad entry.
        }
      }
    }
  } catch {
    return { ok: false, message: "We couldn't read that backup file." };
  }

  return { ok: true, message: "Backup imported.", imported };
}

/* Clear actions — each touches a single known productivity key only. */

export function clearTasks() {
  return removeKey(TASKS_KEY);
}

export function clearNotes() {
  return removeKey(NOTES_KEY);
}

export function clearResources() {
  return removeKey(RESOURCES_KEY);
}

export function clearFocusSessions() {
  return removeKey(FOCUS_SESSIONS_KEY);
}

export function clearPlannerPrefs() {
  return removeKey(STUDY_PLANNER_KEY);
}

/**
 * Remove every saved AI-result entry (all keys under the AI prefix).
 * Returns true if all removals succeeded. Never throws.
 */
export function clearAiResults() {
  if (!storageAvailable()) return false;
  let ok = true;
  for (const key of listAiResultKeys()) {
    if (!removeKey(key)) ok = false;
  }
  return ok;
}

/**
 * Clear ALL productivity data at once. Only touches the known productivity
 * keys — it never removes the auth token or any session/auth key. Never throws.
 */
export function clearAllProductivityData() {
  const results = [
    clearTasks(),
    clearNotes(),
    clearResources(),
    clearFocusSessions(),
    clearPlannerPrefs(),
    clearAiResults(),
  ];
  return results.every(Boolean);
}
