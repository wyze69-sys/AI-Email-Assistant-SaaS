import { useState, useEffect } from "react";
import WorkspaceShell from "../components/WorkspaceShell.jsx";
import { listTasks, updateTask, removeTask } from "../services/store.js";

const COLUMNS = [
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
];

const PRIORITIES = ["high", "medium", "low"];

function sourceLabel(source) {
  if (!source) return null;
  if (source.type === "email") return "from email";
  if (source.type === "text") return "from text";
  return null;
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ text: "", deadline: "", priority: "" });

  useEffect(() => {
    setTasks(listTasks());
  }, []);

  function refresh() {
    setTasks(listTasks());
  }

  function moveTask(id, status) {
    updateTask(id, { status });
    refresh();
  }

  function handleDelete(id) {
    removeTask(id);
    if (editingId === id) setEditingId(null);
    refresh();
  }

  function startEdit(task) {
    setEditingId(task.id);
    setDraft({
      text: task.text || "",
      deadline: task.deadline || "",
      priority: task.priority || "",
    });
  }

  function saveEdit(id) {
    updateTask(id, {
      text: draft.text.trim(),
      deadline: draft.deadline,
      priority: draft.priority || null,
    });
    setEditingId(null);
    refresh();
  }

  const isEmpty = tasks.length === 0;

  return (
    <WorkspaceShell
      title="Task board"
      subtitle="Action items extracted from your emails, organized into columns."
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
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </span>
          <h3>No tasks yet</h3>
          <p>Extract tasks from an email to start your board.</p>
        </div>
      ) : (
        <div className="board">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <section className="board-column" key={col.id}>
                <div className="board-column-head">
                  <h3>{col.label}</h3>
                  <span className="board-count">{colTasks.length}</span>
                </div>
                <div className="board-column-body">
                  {colTasks.length === 0 ? (
                    <p className="board-column-empty">Nothing here.</p>
                  ) : (
                    colTasks.map((task) => (
                      <article className="task-card" key={task.id}>
                        {editingId === task.id ? (
                          <div className="task-edit">
                            <textarea
                              className="task-edit-text"
                              value={draft.text}
                              onChange={(e) =>
                                setDraft((d) => ({ ...d, text: e.target.value }))
                              }
                              rows={2}
                              aria-label="Task text"
                            />
                            <div className="task-edit-row">
                              <label>
                                <span>Due</span>
                                <input
                                  type="date"
                                  value={draft.deadline || ""}
                                  onChange={(e) =>
                                    setDraft((d) => ({
                                      ...d,
                                      deadline: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                <span>Priority</span>
                                <select
                                  value={draft.priority || ""}
                                  onChange={(e) =>
                                    setDraft((d) => ({
                                      ...d,
                                      priority: e.target.value,
                                    }))
                                  }
                                >
                                  <option value="">none</option>
                                  {PRIORITIES.map((p) => (
                                    <option key={p} value={p}>
                                      {p}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <div className="task-edit-actions">
                              <button
                                className="btn-chip"
                                onClick={() => saveEdit(task.id)}
                                disabled={!draft.text.trim()}
                              >
                                Save
                              </button>
                              <button
                                className="btn-chip btn-chip-quiet"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="task-card-text">{task.text}</p>
                            <div className="task-card-meta">
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
                            <div className="task-card-actions">
                              <div className="task-move">
                                {COLUMNS.filter((c) => c.id !== task.status).map(
                                  (c) => (
                                    <button
                                      key={c.id}
                                      className="btn-chip"
                                      onClick={() => moveTask(task.id, c.id)}
                                      title={`Move to ${c.label}`}
                                    >
                                      → {c.label}
                                    </button>
                                  )
                                )}
                              </div>
                              <div className="task-edit-tools">
                                <button
                                  className="btn-chip btn-chip-quiet"
                                  onClick={() => startEdit(task)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn-chip btn-chip-quiet"
                                  onClick={() => handleDelete(task.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </WorkspaceShell>
  );
}
