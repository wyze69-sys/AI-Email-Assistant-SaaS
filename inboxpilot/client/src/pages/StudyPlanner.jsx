import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import WorkspaceShell from "../components/WorkspaceShell.jsx";
import {
  listTasks,
  updateTask,
  deriveFocusTasks,
  buildStudyPlan,
  getStudyPlannerPrefs,
  setStudyPlannerPrefs,
} from "../services/store.js";

const PLAN_STYLES = [
  { id: "light", label: "Light", hint: "2 short focus blocks" },
  { id: "balanced", label: "Balanced", hint: "3 focus blocks" },
  { id: "deep", label: "Deep work", hint: "Longer blocks" },
];

function sourceLabel(source) {
  if (!source) return null;
  if (source.type === "email") return "from email";
  if (source.type === "text") return "from text";
  return null;
}

export default function StudyPlanner() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [planStyle, setPlanStyle] = useState("balanced");

  useEffect(() => {
    setTasks(listTasks());
    setPlanStyle(getStudyPlannerPrefs().planStyle);
  }, []);

  function refresh() {
    setTasks(listTasks());
  }

  function changeStyle(style) {
    const next = setStudyPlannerPrefs({ planStyle: style });
    setPlanStyle(next.planStyle);
  }

  function markDone(id) {
    updateTask(id, { status: "done" });
    refresh();
  }

  function markInProgress(id) {
    updateTask(id, { status: "in_progress" });
    refresh();
  }

  const focusTasks = deriveFocusTasks(tasks, 5);
  const plan = buildStudyPlan(focusTasks, planStyle);
  const totalMinutes = plan.reduce((sum, b) => sum + (b.minutes || 0), 0);
  const isEmpty = focusTasks.length === 0;

  return (
    <WorkspaceShell
      title="Daily Planner"
      subtitle="Turn your saved tasks into a calm plan for what to work on today."
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
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </span>
          <h3>Your planner is clear</h3>
          <p>
            Save tasks from an email or pasted text to build today&rsquo;s plan.
          </p>
          <button className="btn-secondary" onClick={() => navigate("/dashboard")}>
            Go to inbox
          </button>
        </div>
      ) : (
        <div className="planner">
          {/* Preference selector */}
          <section className="planner-panel">
            <div className="planner-panel-head">
              <h3>Plan style</h3>
            </div>
            <div className="planner-style-options" role="group" aria-label="Plan style">
              {PLAN_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`planner-style ${planStyle === style.id ? "active" : ""}`}
                  aria-pressed={planStyle === style.id}
                  onClick={() => changeStyle(style.id)}
                >
                  <span className="planner-style-label">{style.label}</span>
                  <span className="planner-style-hint">{style.hint}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Today's Focus */}
          <section className="planner-panel">
            <div className="planner-panel-head">
              <h3>Today&rsquo;s focus</h3>
              <span className="board-count">{focusTasks.length}</span>
            </div>
            <p className="planner-panel-note">
              Due today and overdue first, then high priority, then this week.
            </p>
            <ul className="planner-focus-list">
              {focusTasks.map((task, index) => (
                <li className="planner-focus-item" key={task.id}>
                  <span className="planner-focus-rank" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="planner-focus-main">
                    <span className="planner-focus-text">{task.text}</span>
                    <div className="planner-focus-meta">
                      {task.deadline && (
                        <span className="task-deadline">Due {task.deadline}</span>
                      )}
                      {task.priority && (
                        <span className={`priority-badge priority-${task.priority}`}>
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
                    <div className="planner-focus-actions">
                      <button
                        className="btn-chip"
                        onClick={() => markDone(task.id)}
                      >
                        Mark done
                      </button>
                      {task.status !== "in_progress" && (
                        <button
                          className="btn-chip btn-chip-quiet"
                          onClick={() => markInProgress(task.id)}
                        >
                          In progress
                        </button>
                      )}
                      <button
                        className="btn-chip btn-chip-quiet"
                        onClick={() => navigate("/tasks")}
                      >
                        Open task board
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Suggested study plan */}
          <section className="planner-panel">
            <div className="planner-panel-head">
              <h3>Daily Focus Plan</h3>
              <span className="board-count">{totalMinutes} min</span>
            </div>
            <p className="planner-panel-note">
              A simple local-only plan. Adjust it however suits you.
            </p>
            <ol className="planner-plan">
              {plan.map((block) => (
                <li className={`planner-block planner-block-${block.kind}`} key={block.id}>
                  <span className="planner-block-time">{block.minutes} min</span>
                  <div className="planner-block-body">
                    <span className="planner-block-label">{block.label}</span>
                    {block.taskText && (
                      <span className="planner-block-task">{block.taskText}</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </WorkspaceShell>
  );
}
