import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import WorkspaceShell from "../components/WorkspaceShell.jsx";
import {
  listTasks,
  listNotes,
  listResources,
  listCaptures,
  listFocusSessions,
  updateTask,
  deriveFocusTasks,
} from "../services/store.js";

/**
 * Workspace Overview (frontend-only).
 *
 * One calm home view that reads ONLY existing localStorage productivity data
 * (tasks, notes, resources, captures, focus sessions). No network calls, no
 * backend changes, no fake data — every count and list is derived from what
 * the user has already saved on this device.
 */

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
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function sourceLabel(source) {
  if (!source) return null;
  if (source.type === "email") return "from email";
  if (source.type === "text") return "from text";
  if (source.type === "capture") return "from capture";
  return null;
}

const CONVERTED_LABEL = {
  task: "Converted to task",
  note: "Converted to note",
  resource: "Converted to resource",
};

export default function Workspace() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [resources, setResources] = useState([]);
  const [captures, setCaptures] = useState([]);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setTasks(listTasks());
    setNotes(listNotes());
    setResources(listResources());
    setCaptures(listCaptures());
    setSessions(listFocusSessions());
  }

  function markDone(id) {
    updateTask(id, { status: "done" });
    refresh();
  }

  /* ---------------- Derived data (memoized) ---------------- */

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== "done"),
    [tasks]
  );

  const dueTodayCount = useMemo(() => {
    const today = startOfToday().getTime();
    return activeTasks.filter((t) => {
      const due = parseDeadline(t.deadline);
      // Due today OR overdue — both need attention now.
      return due !== null && due.getTime() <= today;
    }).length;
  }, [activeTasks]);

  const openCaptures = useMemo(
    () => captures.filter((c) => !c.convertedTo),
    [captures]
  );

  const focusMinutes = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.minutes || 0), 0),
    [sessions]
  );

  const focusTasks = useMemo(() => deriveFocusTasks(activeTasks, 5), [activeTasks]);

  const upcomingDeadlines = useMemo(() => {
    // Active tasks that have a parseable date, soonest first (overdue/today
    // naturally sort to the top since their dates are earliest).
    return activeTasks
      .filter((t) => parseDeadline(t.deadline) !== null)
      .sort(
        (a, b) =>
          parseDeadline(a.deadline).getTime() - parseDeadline(b.deadline).getTime()
      )
      .slice(0, 5);
  }, [activeTasks]);

  const recentCaptures = useMemo(
    () => [...captures].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    [captures]
  );

  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3),
    [notes]
  );

  const recentResources = useMemo(
    () => [...resources].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3),
    [resources]
  );

  const recentSessions = useMemo(
    () => sessions.slice(0, 3), // listFocusSessions() is already newest-first
    [sessions]
  );

  const isOverdueOrToday = (deadline) => {
    const due = parseDeadline(deadline);
    return due !== null && due.getTime() <= startOfToday().getTime();
  };

  const summaryCards = [
    { id: "tasks", label: "Active tasks", value: activeTasks.length, to: "/tasks" },
    { id: "due", label: "Due today / overdue", value: dueTodayCount, to: "/deadlines" },
    { id: "notes", label: "Notes", value: notes.length, to: "/notes" },
    { id: "resources", label: "Resources", value: resources.length, to: "/resources" },
    { id: "captures", label: "Open captures", value: openCaptures.length, to: "/capture" },
    { id: "focus", label: "Focus minutes", value: focusMinutes, to: "/focus" },
  ];

  const hasAnyData =
    tasks.length > 0 ||
    notes.length > 0 ||
    resources.length > 0 ||
    captures.length > 0 ||
    sessions.length > 0;

  const quickActions = [
    { label: "Capture idea", to: "/capture" },
    { label: "Message Assistant", to: "/text" },
    { label: "Search workspace", to: "/search" },
    { label: "Add / view tasks", to: "/tasks" },
    { label: "Focus timer", to: "/focus" },
    { label: "Settings", to: "/settings" },
  ];

  return (
    <WorkspaceShell
      title="Workspace"
      subtitle="One calm home view of everything you've saved on this device."
    >
      {!hasAnyData ? (
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
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </span>
          <h3>Your workspace is ready</h3>
          <p>
            Capture an idea, summarize a message, or save your first task to
            begin.
          </p>
          <div className="workspace-empty-actions">
            <button className="btn-primary" onClick={() => navigate("/capture")}>
              Capture an idea
            </button>
            <button className="btn-secondary" onClick={() => navigate("/dashboard")}>
              Go to inbox
            </button>
          </div>
        </div>
      ) : (
        <div className="workspace-overview">
          {/* 1. Overview cards */}
          <section className="ws-section">
            <div className="ws-summary-grid">
              {summaryCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className="ws-summary-card"
                  onClick={() => navigate(card.to)}
                >
                  <span className="ws-summary-value">{card.value}</span>
                  <span className="ws-summary-label">{card.label}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="ws-columns">
            {/* 2. Today's Focus */}
            <section className="ws-panel">
              <div className="ws-panel-head">
                <h3>Today's focus</h3>
                {focusTasks.length > 0 && (
                  <span className="board-count">{focusTasks.length}</span>
                )}
              </div>
              {focusTasks.length === 0 ? (
                <p className="board-column-empty">
                  No active tasks to focus on yet.
                </p>
              ) : (
                <ul className="ws-list">
                  {focusTasks.map((task) => (
                    <li className="ws-list-item" key={task.id}>
                      <span className="ws-list-text">{task.text}</span>
                      <div className="ws-list-meta">
                        {task.deadline && (
                          <span
                            className={`task-deadline ${
                              isOverdueOrToday(task.deadline) ? "is-urgent" : ""
                            }`}
                          >
                            Due {task.deadline}
                          </span>
                        )}
                        {task.priority && (
                          <span className={`priority-badge priority-${task.priority}`}>
                            <span className="priority-dot" aria-hidden="true" />
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="ws-panel-actions">
                <button
                  className="btn-chip"
                  onClick={() => navigate("/daily-planner")}
                >
                  Open Daily Planner
                </button>
                <button className="btn-chip" onClick={() => navigate("/tasks")}>
                  Open Task Board
                </button>
              </div>
            </section>

            {/* 3. Upcoming Deadlines */}
            <section className="ws-panel">
              <div className="ws-panel-head">
                <h3>Upcoming deadlines</h3>
                {upcomingDeadlines.length > 0 && (
                  <span className="board-count">{upcomingDeadlines.length}</span>
                )}
              </div>
              {upcomingDeadlines.length === 0 ? (
                <p className="board-column-empty">No dated tasks yet.</p>
              ) : (
                <ul className="ws-list">
                  {upcomingDeadlines.map((task) => (
                    <li className="ws-list-item" key={task.id}>
                      <span className="ws-list-text">{task.text}</span>
                      <div className="ws-list-meta">
                        <span
                          className={`task-deadline ${
                            isOverdueOrToday(task.deadline) ? "is-urgent" : ""
                          }`}
                        >
                          Due {task.deadline}
                        </span>
                        <button
                          className="btn-chip"
                          onClick={() => markDone(task.id)}
                        >
                          Mark done
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="ws-panel-actions">
                <button className="btn-chip" onClick={() => navigate("/deadlines")}>
                  Open Deadlines
                </button>
              </div>
            </section>

            {/* 4. Recent Captures */}
            <section className="ws-panel">
              <div className="ws-panel-head">
                <h3>Recent captures</h3>
                {recentCaptures.length > 0 && (
                  <span className="board-count">{recentCaptures.length}</span>
                )}
              </div>
              {recentCaptures.length === 0 ? (
                <p className="board-column-empty">No captures yet.</p>
              ) : (
                <ul className="ws-list">
                  {recentCaptures.map((capture) => (
                    <li className="ws-list-item" key={capture.id}>
                      <span className="ws-list-text">{capture.text}</span>
                      <div className="ws-list-meta">
                        <span className="ws-muted">
                          {formatShortDate(capture.createdAt)}
                        </span>
                        {capture.convertedTo ? (
                          <span className="source-badge">
                            {CONVERTED_LABEL[capture.convertedTo]}
                          </span>
                        ) : (
                          <span className="source-badge ws-open-badge">Open</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="ws-panel-actions">
                <button className="btn-chip" onClick={() => navigate("/capture")}>
                  Open Quick Capture
                </button>
              </div>
            </section>

            {/* 5. Recent Notes and Resources */}
            <section className="ws-panel">
              <div className="ws-panel-head">
                <h3>Notes &amp; resources</h3>
              </div>

              <h4 className="ws-subhead">Recent notes</h4>
              {recentNotes.length === 0 ? (
                <p className="board-column-empty">No notes yet.</p>
              ) : (
                <ul className="ws-list">
                  {recentNotes.map((note) => (
                    <li className="ws-list-item" key={note.id}>
                      <span className="ws-list-text">
                        {note.title || "Untitled note"}
                      </span>
                      <div className="ws-list-meta">
                        <span className="ws-muted">
                          {formatShortDate(note.createdAt)}
                        </span>
                        {sourceLabel(note.source) && (
                          <span className="source-badge">
                            {sourceLabel(note.source)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <h4 className="ws-subhead">Recent resources</h4>
              {recentResources.length === 0 ? (
                <p className="board-column-empty">No resources yet.</p>
              ) : (
                <ul className="ws-list">
                  {recentResources.map((resource) => (
                    <li className="ws-list-item" key={resource.id}>
                      <span className="ws-list-text">
                        {resource.title || "Untitled resource"}
                      </span>
                      <div className="ws-list-meta">
                        <span className="ws-muted">
                          {formatShortDate(resource.createdAt)}
                        </span>
                        {resource.category && (
                          <span className="source-badge">{resource.category}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="ws-panel-actions">
                <button className="btn-chip" onClick={() => navigate("/notes")}>
                  Open Notes
                </button>
                <button className="btn-chip" onClick={() => navigate("/resources")}>
                  Open Resources
                </button>
              </div>
            </section>

            {/* 6. Recent Focus */}
            <section className="ws-panel">
              <div className="ws-panel-head">
                <h3>Recent focus</h3>
                <span className="board-count">{focusMinutes} min</span>
              </div>
              {recentSessions.length === 0 ? (
                <p className="board-column-empty">
                  Completed focus sessions will appear here.
                </p>
              ) : (
                <ul className="ws-list">
                  {recentSessions.map((s) => (
                    <li className="ws-list-item" key={s.id}>
                      <span className="ws-list-text">
                        {s.taskText || "Untitled focus session"}
                      </span>
                      <div className="ws-list-meta">
                        <span className="ws-muted">
                          {formatShortDate(s.completedAt)}
                        </span>
                        <span className="focus-session-min">{s.minutes} min</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="ws-panel-actions">
                <button className="btn-chip" onClick={() => navigate("/focus")}>
                  Open Focus Timer
                </button>
              </div>
            </section>
          </div>

          {/* 7. Quick Actions */}
          <section className="ws-section">
            <div className="ws-panel-head">
              <h3>Quick actions</h3>
            </div>
            <div className="ws-quick-actions">
              {quickActions.map((action) => (
                <button
                  key={action.to + action.label}
                  type="button"
                  className="btn-secondary ws-quick-action"
                  onClick={() => navigate(action.to)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </WorkspaceShell>
  );
}
