import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import WorkspaceShell from "../components/WorkspaceShell.jsx";
import {
  listTasks,
  updateTask,
  addFocusSession,
  listFocusSessions,
} from "../services/store.js";

const MODES = [
  { id: "focus", label: "Focus", minutes: 25 },
  { id: "short_break", label: "Short break", minutes: 5 },
  { id: "deep", label: "Deep work", minutes: 45 },
];

const MODE_LABELS = {
  focus: "Focus",
  short_break: "Short break",
  deep: "Deep work",
};

function sourceLabel(source) {
  if (!source) return null;
  if (source.type === "email") return "from email";
  if (source.type === "text") return "from text";
  return null;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${pad(m)}:${pad(s)}`;
}

function formatSessionTime(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** Optional, browser-safe chime. No external assets; silently no-ops if
 *  Web Audio is unavailable or blocked. */
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => {
      try {
        ctx.close();
      } catch {
        /* ignore */
      }
    };
  } catch {
    /* audio not available — silent fallback */
  }
}

export default function FocusTimer() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [mode, setMode] = useState("focus");
  const [customMinutes, setCustomMinutes] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  const intervalRef = useRef(null);
  // Keep a ref to the latest "complete" handler so the interval always
  // calls the current version without re-creating the interval each tick.
  const completeRef = useRef(() => {});

  useEffect(() => {
    setTasks(listTasks());
    setSessions(listFocusSessions());
  }, []);

  function refreshTasks() {
    setTasks(listTasks());
  }

  const activeTasks = tasks.filter((t) => t.status !== "done");
  const selectedTask = activeTasks.find((t) => t.id === selectedId) || null;

  // If the selected task disappears (e.g. marked done), clear selection.
  useEffect(() => {
    if (selectedId && !activeTasks.some((t) => t.id === selectedId)) {
      setSelectedId(null);
    }
  }, [activeTasks, selectedId]);

  function stopInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  // Clean up the interval if the component unmounts (navigating away).
  useEffect(() => stopInterval, []);

  const currentMinutes = Math.round(durationSeconds / 60);

  function applyMode(nextMode) {
    const preset = MODES.find((m) => m.id === nextMode);
    if (!preset) return;
    stopInterval();
    setRunning(false);
    setMode(nextMode);
    setCustomMinutes("");
    setDurationSeconds(preset.minutes * 60);
    setRemaining(preset.minutes * 60);
  }

  function applyCustom(value) {
    setCustomMinutes(value);
    const mins = parseInt(value, 10);
    if (Number.isFinite(mins) && mins > 0) {
      const clamped = Math.min(120, mins);
      stopInterval();
      setRunning(false);
      setMode("focus");
      setDurationSeconds(clamped * 60);
      setRemaining(clamped * 60);
    }
  }

  // Save a completed session + reset the clock.
  const completeSession = useCallback(() => {
    stopInterval();
    setRunning(false);
    setRemaining(durationSeconds);
    playChime();
    const saved = addFocusSession({
      taskId: selectedTask ? selectedTask.id : "",
      taskText: selectedTask ? selectedTask.text : "Untitled focus session",
      minutes: Math.round(durationSeconds / 60),
      mode,
      completedAt: Date.now(),
    });
    if (saved) setSessions(listFocusSessions());
  }, [durationSeconds, mode, selectedTask]);

  // Keep the ref pointing at the freshest completeSession.
  useEffect(() => {
    completeRef.current = completeSession;
  }, [completeSession]);

  function startTimer() {
    if (running) return;
    // Mark the chosen task as in progress when a focus session begins.
    if (selectedTask && mode !== "short_break" && selectedTask.status !== "in_progress") {
      updateTask(selectedTask.id, { status: "in_progress" });
      refreshTasks();
    }
    setRunning(true);
    stopInterval();
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          // Defer completion out of the state updater.
          setTimeout(() => completeRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function pauseTimer() {
    stopInterval();
    setRunning(false);
  }

  function resetTimer() {
    stopInterval();
    setRunning(false);
    setRemaining(durationSeconds);
  }

  function markSelectedDone() {
    if (!selectedTask) return;
    stopInterval();
    setRunning(false);
    updateTask(selectedTask.id, { status: "done" });
    refreshTasks();
    setSelectedId(null);
  }

  const progress =
    durationSeconds > 0 ? 1 - remaining / durationSeconds : 0;
  const isEmpty = activeTasks.length === 0;

  return (
    <WorkspaceShell
      title="Focus timer"
      subtitle="Pick a task and work in calm, timed sessions."
    >
      <div className="focus">
        {/* Task selector */}
        <section className="focus-panel">
          <div className="focus-panel-head">
            <h3>Choose a task</h3>
            {!isEmpty && <span className="board-count">{activeTasks.length}</span>}
          </div>
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
              <h3>No active tasks yet</h3>
              <p>Save tasks from an email or pasted text first.</p>
              <button
                className="btn-secondary"
                onClick={() => navigate("/dashboard")}
              >
                Go to inbox
              </button>
            </div>
          ) : (
            <ul className="focus-task-list">
              {activeTasks.map((task) => {
                const checked = selectedId === task.id;
                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      className={`focus-task ${checked ? "active" : ""}`}
                      aria-pressed={checked}
                      onClick={() => setSelectedId(task.id)}
                    >
                      <span className="focus-task-radio" aria-hidden="true" />
                      <span className="focus-task-main">
                        <span className="focus-task-text">{task.text}</span>
                        <span className="focus-task-meta">
                          {task.deadline && (
                            <span className="task-deadline">Due {task.deadline}</span>
                          )}
                          {task.priority && (
                            <span
                              className={`priority-badge priority-${task.priority}`}
                            >
                              <span className="priority-dot" aria-hidden="true" />
                              {task.priority}
                            </span>
                          )}
                          {task.status === "in_progress" && (
                            <span className="source-badge">in progress</span>
                          )}
                          {sourceLabel(task.source) && (
                            <span className="source-badge">
                              {sourceLabel(task.source)}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Timer */}
        <section className="focus-panel">
          <div className="focus-panel-head">
            <h3>Session</h3>
          </div>

          <div className="focus-modes" role="group" aria-label="Timer mode">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`focus-mode ${mode === m.id && !customMinutes ? "active" : ""}`}
                aria-pressed={mode === m.id && !customMinutes}
                onClick={() => applyMode(m.id)}
              >
                <span className="focus-mode-label">{m.label}</span>
                <span className="focus-mode-min">{m.minutes} min</span>
              </button>
            ))}
            <label className="focus-custom">
              <span className="focus-custom-label">Custom</span>
              <input
                type="number"
                min="1"
                max="120"
                inputMode="numeric"
                placeholder="min"
                value={customMinutes}
                onChange={(e) => applyCustom(e.target.value)}
              />
            </label>
          </div>

          <div className="focus-clock-wrap">
            <div
              className="focus-clock"
              role="timer"
              aria-live="off"
              aria-label={`${formatClock(remaining)} remaining`}
            >
              {formatClock(remaining)}
            </div>
            <div className="focus-progress" aria-hidden="true">
              <span
                className="focus-progress-bar"
                style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
              />
            </div>
            <p className="focus-clock-caption">
              {MODE_LABELS[mode] || "Focus"} · {currentMinutes} min
              {selectedTask ? ` · ${selectedTask.text}` : " · no task selected"}
            </p>
          </div>

          <div className="focus-controls">
            {!running ? (
              <button
                className="btn-primary"
                onClick={startTimer}
                disabled={remaining <= 0}
              >
                {remaining < durationSeconds && remaining > 0 ? "Resume" : "Start"}
              </button>
            ) : (
              <button className="btn-secondary" onClick={pauseTimer}>
                Pause
              </button>
            )}
            <button className="btn-secondary" onClick={resetTimer}>
              Reset
            </button>
            <button
              className="btn-secondary"
              onClick={markSelectedDone}
              disabled={!selectedTask}
            >
              Mark task done
            </button>
          </div>
        </section>

        {/* Session log */}
        <section className="focus-panel">
          <div className="focus-panel-head">
            <h3>Recent sessions</h3>
            {sessions.length > 0 && (
              <span className="board-count">{sessions.length}</span>
            )}
          </div>
          {sessions.length === 0 ? (
            <p className="board-column-empty">
              Completed focus sessions will appear here.
            </p>
          ) : (
            <ul className="focus-session-list">
              {sessions.map((s) => (
                <li className="focus-session" key={s.id}>
                  <div className="focus-session-main">
                    <span className="focus-session-text">
                      {s.taskText || "Untitled focus session"}
                    </span>
                    <span className="focus-session-meta">
                      {formatSessionTime(s.completedAt)}
                    </span>
                  </div>
                  <div className="focus-session-tags">
                    <span className="source-badge">{MODE_LABELS[s.mode] || s.mode}</span>
                    <span className="focus-session-min">{s.minutes} min</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
