import { useState, useEffect, useMemo } from "react";
import WorkspaceShell from "../components/WorkspaceShell.jsx";
import {
  listCaptures,
  addCapture,
  updateCapture,
  removeCapture,
  addTask,
  addNote,
  addResource,
  normalizeResourceUrl,
} from "../services/store.js";

/**
 * Action Inbox (frontend-only).
 *
 * A fast capture space for messages, links, notes, and reminders before they
 * get lost. Each item is saved locally under "inboxpilot:capture:v1" via the
 * guarded store helpers — no backend calls, no email sending. Items can later
 * be turned into a dated task/deadline, a plain task, a note, or a resource
 * using the existing local stores.
 */

const TYPES = ["idea", "reminder", "task", "note", "link", "general"];

const TYPE_LABEL = {
  idea: "Idea",
  reminder: "Reminder",
  task: "Task",
  note: "Note",
  link: "Link",
  general: "General",
};

const CONVERTED_LABEL = {
  task: "Converted to task",
  note: "Converted to note",
  resource: "Converted to resource",
};

// Find the first http(s):// URL, or a bare "something.tld/…" token, in text.
const URL_RE =
  /(https?:\/\/[^\s]+)|((?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?)/i;

function detectUrl(text) {
  if (typeof text !== "string") return "";
  const match = text.match(URL_RE);
  if (!match) return "";
  // Trim trailing punctuation that often clings to a pasted link.
  return match[0].replace(/[.,;:!?)\]]+$/, "");
}

function firstChars(text, n) {
  const t = (text || "").trim();
  return t.length > n ? t.slice(0, n) : t;
}

function formatDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function Capture() {
  const [captures, setCaptures] = useState([]);
  const [text, setText] = useState("");
  const [type, setType] = useState("general");
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState(null); // { kind: "ok" | "error", text }

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Inline "Create deadline" form state. `deadlineFor` holds the capture id
  // whose form is open (or null when closed). Fields are local to that form.
  const [deadlineFor, setDeadlineFor] = useState(null);
  const [dlText, setDlText] = useState("");
  const [dlDate, setDlDate] = useState("");
  const [dlPriority, setDlPriority] = useState("none");
  const [dlError, setDlError] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    // Newest first.
    setCaptures(listCaptures().sort((a, b) => b.createdAt - a.createdAt));
  }

  function announce(kind, message) {
    setStatus({ kind, text: message });
  }

  function handleAdd(event) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setFormError("Type something to capture first.");
      return;
    }
    const saved = addCapture({ text: trimmed, type });
    if (!saved) {
      setFormError("We couldn't save that. Local storage may be unavailable.");
      return;
    }
    setText("");
    setType("general");
    setFormError("");
    setStatus(null);
    refresh();
  }

  function handleConvertToTask(capture) {
    if (capture.convertedTo === "task") {
      announce("ok", "This was already converted to a task.");
      return;
    }
    const created = addTask({
      text: capture.text,
      status: "todo",
      priority: null,
      deadline: null,
      source: { type: "capture", id: capture.id },
    });
    if (!created) {
      announce("error", "We couldn't create that task.");
      return;
    }
    updateCapture(capture.id, { convertedTo: "task" });
    refresh();
    announce("ok", "Added to Tasks.");
  }

  // Open the inline "Create deadline" form for a capture, prefilling the
  // task text from the capture and resetting the date/priority fields.
  function openDeadlineForm(capture) {
    setDeadlineFor(capture.id);
    setDlText(capture.text || "");
    setDlDate("");
    setDlPriority("none");
    setDlError("");
  }

  function closeDeadlineForm() {
    setDeadlineFor(null);
    setDlText("");
    setDlDate("");
    setDlPriority("none");
    setDlError("");
  }

  // Create a dated task (deadline) from a capture. Requires task text and a
  // date. Marks the capture converted only after a successful save, and never
  // duplicates an already-converted item.
  function handleSaveDeadline(capture) {
    if (capture.convertedTo === "task") {
      setDlError("");
      closeDeadlineForm();
      announce("ok", "This was already converted to a task.");
      return;
    }
    const taskText = dlText.trim();
    if (!taskText) {
      setDlError("Add the task text before saving.");
      return;
    }
    if (!dlDate) {
      setDlError("Pick a deadline date before saving.");
      return;
    }
    const priority = dlPriority === "none" ? null : dlPriority;
    const created = addTask({
      text: taskText,
      status: "todo",
      priority,
      deadline: dlDate,
      source: { type: "capture", id: capture.id },
    });
    if (!created) {
      setDlError("We couldn't create that deadline. Local storage may be unavailable.");
      return;
    }
    updateCapture(capture.id, { convertedTo: "task" });
    closeDeadlineForm();
    refresh();
    announce("ok", "Added to Tasks and Deadlines.");
  }

  function handleConvertToNote(capture) {
    if (capture.convertedTo === "note") {
      announce("ok", "This was already converted to a note.");
      return;
    }
    const created = addNote({
      title: firstChars(capture.text, 60),
      body: capture.text,
      keyPoints: [],
      source: { type: "capture", id: capture.id },
    });
    if (!created) {
      announce("error", "We couldn't create that note.");
      return;
    }
    updateCapture(capture.id, { convertedTo: "note" });
    refresh();
    announce("ok", "Added to Notes.");
  }

  function handleConvertToResource(capture) {
    if (capture.convertedTo === "resource") {
      announce("ok", "This was already converted to a resource.");
      return;
    }
    const detected = detectUrl(capture.text);
    if (!detected) {
      announce("error", "Add a link before saving this as a resource.");
      return;
    }
    const safeUrl = normalizeResourceUrl(detected);
    if (!safeUrl) {
      announce("error", "That link isn't a safe web address.");
      return;
    }
    let domain = "";
    try {
      domain = new URL(safeUrl).hostname.replace(/^www\./, "");
    } catch {
      domain = "";
    }
    const created = addResource({
      title: firstChars(capture.text, 60) || domain,
      url: safeUrl,
      category: "general",
      notes: capture.text,
      tags: [],
    });
    if (!created) {
      announce("error", "We couldn't create that resource.");
      return;
    }
    updateCapture(capture.id, { convertedTo: "resource" });
    refresh();
    announce("ok", "Added to Resources.");
  }

  function handleDelete(capture) {
    const ok = window.confirm("Delete this capture? This can't be undone.");
    if (!ok) return;
    removeCapture(capture.id);
    refresh();
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return captures.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (!q) return true;
      const convertedText = c.convertedTo
        ? `${c.convertedTo} ${CONVERTED_LABEL[c.convertedTo] || ""}`
        : "not converted";
      const haystack = [
        c.text,
        c.type,
        TYPE_LABEL[c.type] || "",
        convertedText,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [captures, query, typeFilter]);

  const hasCaptures = captures.length > 0;
  const hasResults = filtered.length > 0;
  const isFiltering = query.trim() !== "" || typeFilter !== "all";

  return (
    <WorkspaceShell
      title="Action Inbox"
      subtitle="Capture messages, links, notes, and reminders before they get lost. Turn them into tasks, notes, resources, and deadlines."
    >
      <div className="capture-page">
        <form className="capture-box" onSubmit={handleAdd}>
          <label className="capture-field">
            <span className="sr-only">Capture text</span>
            <textarea
              className="capture-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Paste a message, meeting note, link, reminder, or idea..."
              aria-label="Capture text"
            />
          </label>

          <div className="capture-box-actions">
            <label className="capture-type-select">
              <span className="capture-type-label">Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                aria-label="Capture type"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="btn-primary capture-add-btn">
              Add capture
            </button>
          </div>

          {formError && (
            <p className="capture-form-error" role="alert">
              {formError}
            </p>
          )}
        </form>

        {status && (
          <div
            className={`capture-status ${status.kind === "ok" ? "is-ok" : "is-error"}`}
            role="status"
            aria-live="polite"
          >
            {status.text}
          </div>
        )}

        {hasCaptures && (
          <div className="capture-toolbar">
            <div className="capture-search">
              <span className="capture-search-icon" aria-hidden="true">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="search"
                className="capture-search-input"
                placeholder="Search captures"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search captures"
              />
            </div>

            <label className="capture-filter">
              <span className="capture-filter-label">Type</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by type"
              >
                <option value="all">All</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {!hasCaptures ? (
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </span>
            <h3>No captures yet</h3>
            <p>Save a quick idea, reminder, or link.</p>
          </div>
        ) : !hasResults && isFiltering ? (
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <h3>Nothing found</h3>
            <p>No captures match this search.</p>
          </div>
        ) : (
          <ul className="capture-list">
            {filtered.map((capture) => (
              <li className="capture-card" key={capture.id}>
                <div className="capture-card-main">
                  <div className="capture-card-head">
                    <span className={`capture-type capture-type-${capture.type}`}>
                      {TYPE_LABEL[capture.type] || capture.type}
                    </span>
                    {capture.convertedTo && (
                      <span className="capture-converted">
                        {CONVERTED_LABEL[capture.convertedTo]}
                      </span>
                    )}
                  </div>

                  <p className="capture-card-text">{capture.text}</p>

                  <span className="capture-card-date">
                    Captured {formatDate(capture.createdAt)}
                  </span>

                  {deadlineFor === capture.id && (
                    <div className="capture-deadline-form">
                      <label className="capture-deadline-field">
                        <span className="capture-deadline-label">Task</span>
                        <textarea
                          className="capture-input"
                          rows={2}
                          value={dlText}
                          onChange={(e) => setDlText(e.target.value)}
                          placeholder="What needs to be done?"
                          aria-label="Task text"
                        />
                      </label>

                      <div className="capture-deadline-row">
                        <label className="capture-deadline-field">
                          <span className="capture-deadline-label">Deadline</span>
                          <input
                            type="date"
                            value={dlDate}
                            onChange={(e) => setDlDate(e.target.value)}
                            aria-label="Deadline date"
                          />
                        </label>

                        <label className="capture-deadline-field">
                          <span className="capture-deadline-label">Priority</span>
                          <select
                            value={dlPriority}
                            onChange={(e) => setDlPriority(e.target.value)}
                            aria-label="Priority"
                          >
                            <option value="none">None</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </label>
                      </div>

                      {dlError && (
                        <p className="capture-form-error" role="alert">
                          {dlError}
                        </p>
                      )}

                      <div className="capture-deadline-actions">
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => handleSaveDeadline(capture)}
                        >
                          Save deadline
                        </button>
                        <button
                          className="btn-chip btn-chip-quiet"
                          onClick={closeDeadlineForm}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="capture-card-tools">
                  <button
                    className="btn-chip"
                    onClick={() =>
                      deadlineFor === capture.id
                        ? closeDeadlineForm()
                        : openDeadlineForm(capture)
                    }
                    disabled={capture.convertedTo === "task"}
                  >
                    Create deadline
                  </button>
                  <button
                    className="btn-chip"
                    onClick={() => handleConvertToTask(capture)}
                    disabled={capture.convertedTo === "task"}
                  >
                    To task
                  </button>
                  <button
                    className="btn-chip"
                    onClick={() => handleConvertToNote(capture)}
                    disabled={capture.convertedTo === "note"}
                  >
                    To note
                  </button>
                  <button
                    className="btn-chip"
                    onClick={() => handleConvertToResource(capture)}
                    disabled={capture.convertedTo === "resource"}
                  >
                    To resource
                  </button>
                  <button
                    className="btn-chip btn-chip-quiet"
                    onClick={() => handleDelete(capture)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WorkspaceShell>
  );
}
