import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import WorkspaceShell from "../components/WorkspaceShell.jsx";
import { fetchEmails } from "../services/emails.js";
import { listTasks, listCaptures, updateTask } from "../services/store.js";
import {
  buildActionQueue,
  countByFilter,
  ACTION_FILTERS,
  ACTION_EMPTY_TEXT,
  ACTION_QUEUE_LIMIT,
} from "../services/actionsQueue.js";

/**
 * Smart Action Queue (/actions) — frontend-only.
 *
 * One command list that answers "what should I handle next?" by folding the
 * user's real, already-existing data into a single urgency-sorted queue:
 *   - inbox triage labels from the same emails Dashboard loads
 *   - due / overdue tasks and upcoming deadlines (inboxpilot:tasks:v1)
 *   - open captures (inboxpilot:capture:v1)
 *
 * Gmail stays read-only — we only read the inbox list rows (no body fetch,
 * no extra scope) and never send, label, or delete anything.
 */
export default function Actions() {
  const navigate = useNavigate();

  const [emails, setEmails] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [captures, setCaptures] = useState([]);
  const [emailsLoading, setEmailsLoading] = useState(true);
  // Inbox signals are optional — if Gmail isn't connected the queue still
  // works from local tasks/captures. We surface a quiet note, never a blocker.
  const [inboxUnavailable, setInboxUnavailable] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    refreshLocal();
    loadInbox();
  }, []);

  function refreshLocal() {
    setTasks(listTasks());
    setCaptures(listCaptures());
  }

  async function loadInbox() {
    setEmailsLoading(true);
    try {
      // Same helper Dashboard uses — list rows only, no per-email body fetch.
      const data = await fetchEmails({ maxResults: 20 });
      setEmails(Array.isArray(data?.messages) ? data.messages : []);
      setInboxUnavailable(false);
    } catch {
      // Gmail not connected or fetch failed — degrade gracefully.
      setEmails([]);
      setInboxUnavailable(true);
    } finally {
      setEmailsLoading(false);
    }
  }

  function handleMarkDone(taskId) {
    if (!taskId) return;
    updateTask(taskId, { status: "done" });
    refreshLocal();
  }

  const allItems = useMemo(
    () => buildActionQueue({ emails, tasks, captures }, ACTION_QUEUE_LIMIT),
    [emails, tasks, captures]
  );

  const counts = useMemo(() => countByFilter(allItems), [allItems]);

  const visibleItems = useMemo(() => {
    if (activeFilter === "all") return allItems;
    return allItems.filter((item) => item.filter === activeFilter);
  }, [allItems, activeFilter]);

  return (
    <WorkspaceShell
      title="Action Queue"
      subtitle="A single list of what needs you next — across inbox, tasks, deadlines, and captures."
    >
      <p className="inbox-safety-note">
        Built from your tasks, captures, and inbox triage. Gmail stays
        read-only — nothing is sent, labeled, or deleted.
      </p>

      <div
        className="filter-chips action-filter-bar"
        role="group"
        aria-label="Action queue filters"
      >
        {ACTION_FILTERS.map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              className={`filter-chip ${isActive ? "active" : ""}`}
              aria-pressed={isActive}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
              <span className="action-filter-count">{counts[f.id] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {inboxUnavailable && (
        <p className="action-inbox-note">
          Inbox signals are unavailable right now. Showing tasks, deadlines, and
          captures.
        </p>
      )}

      {emailsLoading && allItems.length === 0 ? (
        <div className="page-state">
          <span className="spinner" />
          <p>Gathering what needs your attention…</p>
        </div>
      ) : visibleItems.length === 0 ? (
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
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </span>
          <h3>You're clear</h3>
          <p>{ACTION_EMPTY_TEXT}</p>
          <div className="workspace-empty-actions">
            <button className="btn-primary" onClick={() => navigate("/capture")}>
              Capture an idea
            </button>
            <button
              className="btn-secondary"
              onClick={() => navigate("/dashboard")}
            >
              Review inbox
            </button>
          </div>
        </div>
      ) : (
        <ul className="action-queue" aria-label="Action queue">
          {visibleItems.map((item) => (
            <li
              key={item.id}
              className={`action-item ${item.isOverdue ? "is-overdue" : ""}`}
            >
              <div className="action-item-body">
                <div className="action-item-head">
                  <span className={`action-type-label type-${item.kind}`}>
                    {item.typeLabel}
                  </span>
                  <span
                    className={`action-reason ${
                      item.isOverdue ? "is-overdue" : ""
                    }`}
                  >
                    {item.reason}
                  </span>
                  {item.date && (
                    <span className="action-date">{item.date}</span>
                  )}
                </div>
                <p className="action-title">{item.title}</p>
                {item.meta && <p className="action-meta">{item.meta}</p>}
              </div>

              <div className="action-item-actions">
                {item.primary && item.primary.route && item.primary.label && (
                  <button
                    type="button"
                    className="btn-secondary action-primary-btn"
                    onClick={() => navigate(item.primary.route)}
                  >
                    {item.primary.label}
                  </button>
                )}
                {item.canMarkDone && (
                  <button
                    type="button"
                    className="btn-chip"
                    onClick={() => handleMarkDone(item.taskId)}
                  >
                    Mark done
                  </button>
                )}
                {item.canStartFocus && (
                  <button
                    type="button"
                    className="btn-chip"
                    onClick={() => navigate("/focus")}
                  >
                    Start focus
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </WorkspaceShell>
  );
}
