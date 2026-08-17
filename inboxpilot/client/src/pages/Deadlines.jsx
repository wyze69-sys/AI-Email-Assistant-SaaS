import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import WorkspaceShell from "../components/WorkspaceShell.jsx";
import { listTasks, updateTask, deriveDeadlineGroups } from "../services/store.js";

const GROUPS = [
  { id: "today", label: "Today", hint: "Due today or overdue" },
  { id: "thisWeek", label: "This week", hint: "Within the next 7 days" },
  { id: "later", label: "Later", hint: "Further out" },
  { id: "noDate", label: "No date", hint: "No deadline set" },
];

function sourceLabel(source) {
  if (!source) return null;
  if (source.type === "email") return "from email";
  if (source.type === "text") return "from text";
  return null;
}

export default function Deadlines() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    setTasks(listTasks());
  }, []);

  function refresh() {
    setTasks(listTasks());
  }

  function markDone(id) {
    updateTask(id, { status: "done" });
    refresh();
  }

  // Only show tasks that aren't already done in the deadline view.
  const openTasks = tasks.filter((t) => t.status !== "done");
  const groups = deriveDeadlineGroups(openTasks);
  const isEmpty = openTasks.length === 0;

  return (
    <WorkspaceShell
      title="Deadline center"
      subtitle="Every task with a date, grouped by how soon it's due."
    >
      {isEmpty ? (
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
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <h3>Nothing scheduled</h3>
          <p>Tasks with dates will appear here.</p>
        </div>
      ) : (
        <div className="deadline-groups">
          {GROUPS.map((group) => {
            const items = groups[group.id] || [];
            return (
              <section className="deadline-group" key={group.id}>
                <div className="deadline-group-head">
                  <h3>{group.label}</h3>
                  <span className="board-count">{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <p className="board-column-empty">{group.hint}.</p>
                ) : (
                  <ul className="deadline-list">
                    {items.map((task) => (
                      <li className="deadline-item" key={task.id}>
                        <div className="deadline-item-main">
                          <span className="deadline-item-text">{task.text}</span>
                          <div className="deadline-item-meta">
                            {task.deadline && (
                              <span className="task-deadline">
                                Due {task.deadline}
                              </span>
                            )}
                            {task.priority && (
                              <span
                                className={`priority-badge priority-${task.priority}`}
                              >
                                <span
                                  className="priority-dot"
                                  aria-hidden="true"
                                />
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
                        <div className="deadline-item-actions">
                          <button
                            className="btn-chip"
                            onClick={() => markDone(task.id)}
                          >
                            Mark done
                          </button>
                          <button
                            className="btn-chip btn-chip-quiet"
                            onClick={() => navigate("/tasks")}
                          >
                            Open board
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </WorkspaceShell>
  );
}
