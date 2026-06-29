import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import WorkspaceShell from "../components/WorkspaceShell.jsx";
import {
  listTasks,
  listNotes,
  listFocusSessions,
  updateTask,
} from "../services/store.js";
import { copyToClipboard } from "../services/ui.js";

/* ------------------------------------------------------------------ */
/* Local-only Command Center search.                                   */
/*                                                                     */
/* Reads ONLY data the app already stored on this device (tasks,       */
/* notes, focus sessions). Deadlines are derived from tasks that have  */
/* a deadline value. No network calls, no fake data.                   */
/* ------------------------------------------------------------------ */

const STATUS_LABELS = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const MODE_LABELS = {
  focus: "Focus",
  short_break: "Short break",
  deep: "Deep work",
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status || "";
}

function modeLabel(mode) {
  return MODE_LABELS[mode] || mode || "";
}

function sourceLabel(source) {
  if (!source) return null;
  if (source.type === "email") return "from email";
  if (source.type === "text") return "from text";
  return null;
}

function formatSessionDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Render text with case-insensitive matches of `query` subtly emphasized.
 * Pure string splitting — no dependencies, no regex injection risk because
 * we compare lowercased slices rather than building a RegExp from input.
 */
function Highlight({ text, query }) {
  const value = typeof text === "string" ? text : "";
  const q = query.trim();
  if (!q || !value) return <>{value}</>;

  const lowerValue = value.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const parts = [];
  let from = 0;
  let idx = lowerValue.indexOf(lowerQuery, from);
  let key = 0;

  while (idx !== -1) {
    if (idx > from) parts.push(<span key={key++}>{value.slice(from, idx)}</span>);
    parts.push(
      <mark className="search-hit" key={key++}>
        {value.slice(idx, idx + q.length)}
      </mark>
    );
    from = idx + q.length;
    idx = lowerValue.indexOf(lowerQuery, from);
  }
  if (from < value.length) parts.push(<span key={key++}>{value.slice(from)}</span>);
  return <>{parts}</>;
}

function matches(haystackParts, query) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return haystackParts
    .filter(Boolean)
    .some((part) => String(part).toLowerCase().includes(q));
}

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [copiedId, setCopiedId] = useState("");
  const inputRef = useRef(null);

  function refresh() {
    setTasks(listTasks());
    setNotes(listNotes());
    setSessions(listFocusSessions());
  }

  useEffect(() => {
    refresh();
  }, []);

  // Keyboard shortcut: "/" focuses the search input (this page only).
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== "/") return;
      const el = document.activeElement;
      const tag = el && el.tagName ? el.tagName.toLowerCase() : "";
      const typing =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (el && el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      if (inputRef.current) inputRef.current.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const trimmed = query.trim();
  const hasQuery = trimmed.length >= 1;

  const results = useMemo(() => {
    if (!hasQuery) {
      return { tasks: [], notes: [], deadlines: [], sessions: [] };
    }

    const taskHits = tasks.filter((t) =>
      matches([t.text, t.priority, statusLabel(t.status), t.deadline], trimmed)
    );

    const noteHits = notes.filter((n) =>
      matches([n.title, n.body, ...(n.keyPoints || [])], trimmed)
    );

    // Deadlines derived from tasks that carry a deadline value.
    const deadlineHits = tasks
      .filter((t) => t.deadline)
      .filter((t) => matches([t.text, t.deadline, t.priority], trimmed));

    const sessionHits = sessions.filter((s) =>
      matches(
        [s.taskText, modeLabel(s.mode), formatSessionDate(s.completedAt)],
        trimmed
      )
    );

    return {
      tasks: taskHits,
      notes: noteHits,
      deadlines: deadlineHits,
      sessions: sessionHits,
    };
  }, [hasQuery, trimmed, tasks, notes, sessions]);

  const totalResults =
    results.tasks.length +
    results.notes.length +
    results.deadlines.length +
    results.sessions.length;

  function markTaskDone(id) {
    updateTask(id, { status: "done" });
    refresh();
  }

  async function handleCopyNote(note) {
    const lines = [];
    if (note.title) lines.push(note.title, "");
    if (note.body) lines.push(note.body);
    if (note.keyPoints && note.keyPoints.length > 0) {
      lines.push("", "Key points:");
      note.keyPoints.forEach((p) => lines.push(`- ${p}`));
    }
    const ok = await copyToClipboard(lines.join("\n"));
    if (ok) {
      setCopiedId(note.id);
      setTimeout(() => setCopiedId((c) => (c === note.id ? "" : c)), 2000);
    }
  }

  function clearQuery() {
    setQuery("");
    if (inputRef.current) inputRef.current.focus();
  }

  return (
    <WorkspaceShell
      title="Command center"
      subtitle="Search everything saved on this device — tasks, notes, deadlines, and focus sessions."
    >
      <div className="search-page">
        <div className="search-bar">
          <span className="search-bar-icon" aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search tasks, notes, deadlines, focus sessions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search saved items"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              onClick={clearQuery}
              aria-label="Clear search"
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {!hasQuery ? (
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
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <h3>Search your workspace</h3>
            <p>Search tasks, notes, deadlines, and focus sessions.</p>
          </div>
        ) : totalResults === 0 ? (
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
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <h3>No matches</h3>
            <p>No saved items match this search.</p>
          </div>
        ) : (
          <div className="search-results">
            {results.tasks.length > 0 && (
              <section className="search-group">
                <div className="search-group-head">
                  <h3>Tasks</h3>
                  <span className="board-count">{results.tasks.length}</span>
                </div>
                <ul className="search-list">
                  {results.tasks.map((task) => (
                    <li className="search-row" key={`task-${task.id}`}>
                      <div className="search-row-main">
                        <span className="search-row-text">
                          <Highlight text={task.text} query={trimmed} />
                        </span>
                        <div className="search-row-meta">
                          <span className="search-tag">
                            {statusLabel(task.status)}
                          </span>
                          {task.deadline && (
                            <span className="task-deadline">
                              Due {task.deadline}
                            </span>
                          )}
                          {task.priority && (
                            <span
                              className={`priority-badge priority-${task.priority}`}
                            >
                              <span className="priority-dot" aria-hidden="true" />
                              {task.priority}
                            </span>
                          )}
                          {sourceLabel(task.source) && (
                            <span className="source-badge">
                              {sourceLabel(task.source)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="search-row-actions">
                        <button
                          className="btn-chip btn-chip-quiet"
                          onClick={() => navigate("/tasks")}
                        >
                          Open board
                        </button>
                        {task.status !== "done" && (
                          <button
                            className="btn-chip"
                            onClick={() => markTaskDone(task.id)}
                          >
                            Mark done
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {results.notes.length > 0 && (
              <section className="search-group">
                <div className="search-group-head">
                  <h3>Notes</h3>
                  <span className="board-count">{results.notes.length}</span>
                </div>
                <ul className="search-list">
                  {results.notes.map((note) => {
                    const snippet =
                      note.body && note.body.length > 140
                        ? `${note.body.slice(0, 140)}…`
                        : note.body;
                    return (
                      <li className="search-row" key={`note-${note.id}`}>
                        <div className="search-row-main">
                          <span className="search-row-text">
                            <Highlight
                              text={note.title || "Untitled note"}
                              query={trimmed}
                            />
                          </span>
                          {snippet && (
                            <p className="search-row-snippet">
                              <Highlight text={snippet} query={trimmed} />
                            </p>
                          )}
                          {sourceLabel(note.source) && (
                            <div className="search-row-meta">
                              <span className="source-badge">
                                {sourceLabel(note.source)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="search-row-actions">
                          <button
                            className="btn-chip btn-chip-quiet"
                            onClick={() => navigate("/notes")}
                          >
                            Open notes
                          </button>
                          <button
                            className="btn-chip"
                            onClick={() => handleCopyNote(note)}
                          >
                            {copiedId === note.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {results.deadlines.length > 0 && (
              <section className="search-group">
                <div className="search-group-head">
                  <h3>Deadlines</h3>
                  <span className="board-count">{results.deadlines.length}</span>
                </div>
                <ul className="search-list">
                  {results.deadlines.map((task) => (
                    <li className="search-row" key={`deadline-${task.id}`}>
                      <div className="search-row-main">
                        <span className="search-row-text">
                          <Highlight text={task.text} query={trimmed} />
                        </span>
                        <div className="search-row-meta">
                          <span className="task-deadline">Due {task.deadline}</span>
                          {task.priority && (
                            <span
                              className={`priority-badge priority-${task.priority}`}
                            >
                              <span className="priority-dot" aria-hidden="true" />
                              {task.priority}
                            </span>
                          )}
                          <span className="search-tag">
                            {statusLabel(task.status)}
                          </span>
                        </div>
                      </div>
                      <div className="search-row-actions">
                        <button
                          className="btn-chip btn-chip-quiet"
                          onClick={() => navigate("/deadlines")}
                        >
                          Open deadlines
                        </button>
                        {task.status !== "done" && (
                          <button
                            className="btn-chip"
                            onClick={() => markTaskDone(task.id)}
                          >
                            Mark done
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {results.sessions.length > 0 && (
              <section className="search-group">
                <div className="search-group-head">
                  <h3>Focus sessions</h3>
                  <span className="board-count">{results.sessions.length}</span>
                </div>
                <ul className="search-list">
                  {results.sessions.map((session) => (
                    <li className="search-row" key={`session-${session.id}`}>
                      <div className="search-row-main">
                        <span className="search-row-text">
                          <Highlight
                            text={session.taskText || "Focus session"}
                            query={trimmed}
                          />
                        </span>
                        <div className="search-row-meta">
                          <span className="search-tag">
                            {modeLabel(session.mode)}
                          </span>
                          {session.minutes > 0 && (
                            <span className="search-tag">
                              {session.minutes} min
                            </span>
                          )}
                          {formatSessionDate(session.completedAt) && (
                            <span className="task-deadline">
                              {formatSessionDate(session.completedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="search-row-actions">
                        <button
                          className="btn-chip btn-chip-quiet"
                          onClick={() => navigate("/focus")}
                        >
                          Open focus
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
