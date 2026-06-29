import { useState } from "react";
import WorkspaceNav from "../components/WorkspaceNav.jsx";
import {
  summarizeText,
  extractTasksFromText,
  simplifyText,
  suggestReplyFromText,
} from "../services/ai.js";
import {
  friendlyError,
  copyToClipboard,
  summaryToText,
  tasksToText,
} from "../services/ui.js";
import { addNote, addTasks } from "../services/store.js";

const CHAR_LIMIT = 12000;

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "short", label: "Short" },
  { value: "apology", label: "Apology" },
  { value: "thank_you", label: "Thank you" },
  { value: "follow_up", label: "Follow up" },
];

// Calm inline labels shown on the active action while it runs.
const LOADING_LABEL = {
  summary: "Summarizing…",
  tasks: "Extracting…",
  simplified: "Simplifying…",
  reply: "Drafting…",
};

export default function TextAssistant() {
  const [text, setText] = useState("");
  const [tone, setTone] = useState("professional");

  // Results (null when not yet generated or cleared).
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [simplified, setSimplified] = useState(null);
  const [reply, setReply] = useState(null);

  // Single in-flight action: "summary" | "tasks" | "simplified" | "reply" | null.
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Transient feedback.
  const [copied, setCopied] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [simplifiedNoteSaved, setSimplifiedNoteSaved] = useState(false);
  const [tasksSavedMsg, setTasksSavedMsg] = useState("");

  const overLimit = text.length > CHAR_LIMIT;

  async function runAction(kind) {
    // Prevent duplicate / concurrent requests.
    if (loading) return;

    const trimmed = text.trim();
    if (!trimmed) {
      setValidationError("Please paste some text first.");
      return;
    }
    if (text.length > CHAR_LIMIT) {
      setValidationError(
        `That text is too long. Please keep it under ${CHAR_LIMIT.toLocaleString()} characters.`
      );
      return;
    }

    setLoading(kind);
    setError(null);
    setValidationError(null);

    try {
      if (kind === "summary") {
        const data = await summarizeText(trimmed);
        setSummary(data);
      } else if (kind === "tasks") {
        const data = await extractTasksFromText(trimmed);
        setTasks(data);
      } else if (kind === "simplified") {
        const { simplified: result } = await simplifyText(trimmed);
        setSimplified(result);
      } else if (kind === "reply") {
        const { reply: result } = await suggestReplyFromText(trimmed, tone);
        setReply(result);
      }
    } catch (err) {
      const fallback = {
        summary: "We couldn't summarize this text.",
        tasks: "We couldn't extract tasks from this text.",
        simplified: "We couldn't simplify this text.",
        reply: "We couldn't draft a reply for this text.",
      }[kind];
      setError(friendlyError(err, fallback));
    } finally {
      setLoading(null);
    }
  }

  async function handleCopy(key, value) {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? "" : c)), 2000);
    }
  }

  function handleSaveSummaryNote() {
    if (!summary) return;
    const note = addNote({
      title: "Pasted text summary",
      body: summary.summary || "",
      keyPoints: Array.isArray(summary.keyPoints) ? summary.keyPoints : [],
      source: { type: "text" },
    });
    if (note) {
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2500);
    }
  }

  function handleSaveSimplifiedNote() {
    if (!simplified) return;
    const note = addNote({
      title: "Simplified text",
      body: simplified,
      source: { type: "text" },
    });
    if (note) {
      setSimplifiedNoteSaved(true);
      setTimeout(() => setSimplifiedNoteSaved(false), 2500);
    }
  }

  function handleSaveTasks() {
    if (!hasTasks) return;
    const payload = tasks.tasks.map((t) => ({
      text: t.task,
      deadline: t.deadline || null,
      priority: t.priority || null,
      status: "todo",
      source: { type: "text" },
    }));
    const added = addTasks(payload);
    if (added.length === 0) {
      setTasksSavedMsg("Already on your board");
    } else if (added.length === payload.length) {
      setTasksSavedMsg(
        `Saved ${added.length} task${added.length === 1 ? "" : "s"} locally`
      );
    } else {
      setTasksSavedMsg(`Saved ${added.length} new locally`);
    }
    setTimeout(() => setTasksSavedMsg(""), 3000);
  }

  const hasTasks = tasks && Array.isArray(tasks.tasks) && tasks.tasks.length > 0;
  const isBusy = Boolean(loading);

  return (
    <div className="text-assistant-page">
      <WorkspaceNav />

      <header className="text-assistant-header">
        <h1>Message Assistant</h1>
        <p className="text-assistant-subtitle">
          Paste a message, announcement, meeting note, or document text. Turn it
          into a summary, tasks, simplified notes, or a reply draft.
        </p>
      </header>

      <section className="text-assistant-input" aria-label="Paste your text">
        <textarea
          className="text-assistant-sheet"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste an email, message, announcement, meeting note, or document text here..."
          rows={12}
          aria-label="Text to process"
        />
        <div
          className={`text-assistant-counter ${
            overLimit ? "text-assistant-counter-warn" : ""
          }`}
          aria-live="polite"
        >
          {text.length.toLocaleString()} / {CHAR_LIMIT.toLocaleString()}
        </div>

        <div className="text-assistant-controls">
          <label className="text-assistant-tone">
            <span className="text-assistant-tone-label">Reply tone</span>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              disabled={isBusy}
              aria-label="Reply tone"
            >
              {TONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="text-assistant-actions">
            <button
              type="button"
              className="btn-ai-action"
              onClick={() => runAction("summary")}
              disabled={isBusy}
            >
              {loading === "summary" ? (
                <>
                  <span className="spinner" /> {LOADING_LABEL.summary}
                </>
              ) : (
                "Summarize"
              )}
            </button>
            <button
              type="button"
              className="btn-ai-action"
              onClick={() => runAction("tasks")}
              disabled={isBusy}
            >
              {loading === "tasks" ? (
                <>
                  <span className="spinner" /> {LOADING_LABEL.tasks}
                </>
              ) : (
                "Extract tasks"
              )}
            </button>
            <button
              type="button"
              className="btn-ai-action"
              onClick={() => runAction("simplified")}
              disabled={isBusy}
            >
              {loading === "simplified" ? (
                <>
                  <span className="spinner" /> {LOADING_LABEL.simplified}
                </>
              ) : (
                "Simplify"
              )}
            </button>
            <button
              type="button"
              className="btn-ai-action"
              onClick={() => runAction("reply")}
              disabled={isBusy}
            >
              {loading === "reply" ? (
                <>
                  <span className="spinner" /> {LOADING_LABEL.reply}
                </>
              ) : (
                "Draft reply"
              )}
            </button>
          </div>
        </div>

        {validationError && (
          <div className="text-assistant-validation" role="alert">
            {validationError}
          </div>
        )}
        {error && (
          <div className="ai-error" role="alert">
            <span>{error}</span>
          </div>
        )}
      </section>

      <div className="text-assistant-results">
        {/* Summary panel */}
        {summary && (
          <div className="ai-result-section">
            <div className="ai-result-head">
              <h3>Summary</h3>
              <span className="ai-result-badge">AI</span>
              <div className="ai-result-tools">
                <button
                  type="button"
                  className="btn-chip"
                  onClick={() => handleCopy("summary", summaryToText(summary))}
                >
                  {copied === "summary" ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  className="btn-chip"
                  onClick={handleSaveSummaryNote}
                >
                  {noteSaved ? "Saved locally" : "Save as note"}
                </button>
                <button
                  type="button"
                  className="btn-chip btn-chip-quiet"
                  onClick={() => setSummary(null)}
                >
                  Clear
                </button>
              </div>
            </div>
            <p className="ai-summary-text">{summary.summary}</p>
            {summary.keyPoints && summary.keyPoints.length > 0 && (
              <>
                <h4>Key points</h4>
                <ul className="ai-key-points">
                  {summary.keyPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </>
            )}
            {summary.sentiment && (
              <p className="ai-sentiment">
                <strong>Tone:</strong>{" "}
                <span className={`sentiment-badge sentiment-${summary.sentiment}`}>
                  {summary.sentiment}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Tasks panel */}
        {tasks && (
          <div className="ai-result-section">
            <div className="ai-result-head">
              <h3>Extracted tasks</h3>
              <span className="ai-result-badge">AI</span>
              <div className="ai-result-tools">
                {hasTasks && (
                  <button
                    type="button"
                    className="btn-chip"
                    onClick={() => handleCopy("tasks", tasksToText(tasks.tasks))}
                  >
                    {copied === "tasks" ? "Copied" : "Copy"}
                  </button>
                )}
                {hasTasks && (
                  <button
                    type="button"
                    className="btn-chip"
                    onClick={handleSaveTasks}
                  >
                    {tasksSavedMsg || "Save to board"}
                  </button>
                )}
                <button
                  type="button"
                  className="btn-chip btn-chip-quiet"
                  onClick={() => setTasks(null)}
                >
                  Clear
                </button>
              </div>
            </div>
            {hasTasks ? (
              <div className="ai-tasks">
                {tasks.tasks.map((t, i) => (
                  <div className="task-row" key={i}>
                    <div className="task-main">
                      <span className="task-text">{t.task}</span>
                      {t.deadline && (
                        <span className="task-deadline">Due {t.deadline}</span>
                      )}
                    </div>
                    {t.priority && (
                      <span className={`priority-badge priority-${t.priority}`}>
                        <span className="priority-dot" aria-hidden="true" />
                        {t.priority}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="ai-no-tasks">No tasks found in this text.</p>
            )}
          </div>
        )}

        {/* Simplified panel */}
        {simplified && (
          <div className="ai-result-section">
            <div className="ai-result-head">
              <h3>Simplified text</h3>
              <span className="ai-result-badge">AI</span>
              <div className="ai-result-tools">
                <button
                  type="button"
                  className="btn-chip"
                  onClick={() => handleCopy("simplified", simplified)}
                >
                  {copied === "simplified" ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  className="btn-chip"
                  onClick={handleSaveSimplifiedNote}
                >
                  {simplifiedNoteSaved ? "Saved locally" : "Save as note"}
                </button>
                <button
                  type="button"
                  className="btn-chip btn-chip-quiet"
                  onClick={() => setSimplified(null)}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="text-assistant-paper">
              <pre className="text-assistant-paper-text">{simplified}</pre>
            </div>
          </div>
        )}

        {/* Reply panel — review only, no Send */}
        {reply && (
          <div className="ai-result-section">
            <div className="ai-result-head">
              <h3>Draft reply</h3>
              <span className="ai-result-badge">AI</span>
              <div className="ai-result-tools">
                <button
                  type="button"
                  className="btn-chip"
                  onClick={() => handleCopy("reply", reply)}
                >
                  {copied === "reply" ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  className="btn-chip btn-chip-quiet"
                  onClick={() => setReply(null)}
                >
                  Clear
                </button>
              </div>
            </div>
            <p className="ai-reply-note">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
              <span>This is a draft suggestion. Review before sending.</span>
            </p>
            <div className="text-assistant-paper">
              <pre className="text-assistant-paper-text">{reply}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
