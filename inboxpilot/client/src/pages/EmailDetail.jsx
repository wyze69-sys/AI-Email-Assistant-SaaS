import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEmailById } from "../services/emails.js";
import { summarizeEmail, extractTasks, suggestReply } from "../services/ai.js";
import {
  friendlyError,
  copyToClipboard,
  summaryToText,
  tasksToText,
} from "../services/ui.js";

export default function EmailDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // AI states
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const [tasks, setTasks] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState(null);

  const [reply, setReply] = useState(null);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState(null);

  // Tracks which copy button was last clicked, for transient "Copied" feedback
  const [copied, setCopied] = useState("");

  useEffect(() => {
    loadEmail();
  }, [id]);

  async function loadEmail() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEmailById(id);
      setEmail(data);
    } catch (err) {
      setError(friendlyError(err, "We couldn't open this email. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleSummarize() {
    if (summaryLoading) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await summarizeEmail(id);
      setSummary(data);
    } catch (err) {
      setSummaryError(friendlyError(err, "We couldn't summarize this email."));
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleExtractTasks() {
    if (tasksLoading) return;
    setTasksLoading(true);
    setTasksError(null);
    try {
      const data = await extractTasks(id);
      setTasks(data);
    } catch (err) {
      setTasksError(friendlyError(err, "We couldn't extract tasks from this email."));
    } finally {
      setTasksLoading(false);
    }
  }

  async function handleSuggestReply() {
    if (replyLoading) return;
    setReplyLoading(true);
    setReplyError(null);
    try {
      const data = await suggestReply(id);
      setReply(data.reply);
    } catch (err) {
      setReplyError(friendlyError(err, "We couldn't draft a reply for this email."));
    } finally {
      setReplyLoading(false);
    }
  }

  async function handleCopy(key, text) {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? "" : c)), 2000);
    }
  }

  if (loading) {
    return (
      <div className="page-state">
        <span className="spinner" />
        <p>Loading email…</p>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="page-state">
        <h3>{error ? "Couldn't open this email" : "Email not found"}</h3>
        {error && <p>{error}</p>}
        <button className="btn-secondary" onClick={() => navigate("/dashboard")}>
          Back to inbox
        </button>
      </div>
    );
  }

  const hasTasks = tasks && tasks.tasks && tasks.tasks.length > 0;

  return (
    <div className="email-detail">
      <header className="email-detail-header">
        <button className="btn-back" onClick={() => navigate("/dashboard")}>
          ← Back to inbox
        </button>
      </header>

      <article className="email-content">
        <h2 className="email-detail-subject">
          {email.subject || "(no subject)"}
        </h2>

        <div className="email-meta">
          <div className="meta-row">
            <strong>From</strong> <span>{email.from}</span>
          </div>
          <div className="meta-row">
            <strong>To</strong> <span>{email.to}</span>
          </div>
          <div className="meta-row">
            <strong>Date</strong> <span>{email.date}</span>
          </div>
          {email.labelIds && email.labelIds.length > 0 && (
            <div className="meta-row">
              <strong>Labels</strong>{" "}
              <span className="labels">
                {email.labelIds.map((label) => (
                  <span key={label} className="label-tag">
                    {label}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>

        <div className="email-body">
          <pre className="email-body-text">{email.body}</pre>
        </div>

        {/* AI tools */}
        <div className="ai-toolbar">
          <p className="ai-toolbar-label">AI tools</p>
          <div className="ai-actions">
            <button
              className="btn-ai"
              onClick={handleSummarize}
              disabled={summaryLoading}
            >
              <span className="btn-ai-icon" aria-hidden="true">
                {summaryLoading ? <span className="spinner" /> : "✦"}
              </span>
              <span className="btn-ai-text">
                <span className="btn-ai-title">
                  {summaryLoading ? "Summarizing…" : "Summarize"}
                </span>
                <span className="btn-ai-desc">Key points at a glance</span>
              </span>
            </button>

            <button
              className="btn-ai"
              onClick={handleExtractTasks}
              disabled={tasksLoading}
            >
              <span className="btn-ai-icon" aria-hidden="true">
                {tasksLoading ? <span className="spinner" /> : "☑"}
              </span>
              <span className="btn-ai-text">
                <span className="btn-ai-title">
                  {tasksLoading ? "Extracting…" : "Extract tasks"}
                </span>
                <span className="btn-ai-desc">Action items & deadlines</span>
              </span>
            </button>

            <button
              className="btn-ai btn-ai-reply"
              onClick={handleSuggestReply}
              disabled={replyLoading}
            >
              <span className="btn-ai-icon" aria-hidden="true">
                {replyLoading ? <span className="spinner" /> : "✉"}
              </span>
              <span className="btn-ai-text">
                <span className="btn-ai-title">
                  {replyLoading ? "Drafting…" : "Suggest reply"}
                </span>
                <span className="btn-ai-desc">Draft you review first</span>
              </span>
            </button>
          </div>
        </div>

        {/* Summary */}
        {summaryLoading && (
          <div className="ai-loading">
            <span className="spinner" /> Summarizing this email…
          </div>
        )}
        {summaryError && !summaryLoading && (
          <div className="ai-error">
            <span>{summaryError}</span>
            <button onClick={handleSummarize}>Retry</button>
          </div>
        )}
        {summary && !summaryLoading && (
          <div className="ai-result-section">
            <div className="ai-result-head">
              <h3>Summary</h3>
              <span className="ai-result-badge">AI</span>
              <div className="ai-result-tools">
                <button
                  className="btn-chip"
                  onClick={() => handleCopy("summary", summaryToText(summary))}
                >
                  {copied === "summary" ? "Copied" : "Copy"}
                </button>
                <button
                  className="btn-chip"
                  onClick={handleSummarize}
                  disabled={summaryLoading}
                >
                  Regenerate
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
                <span
                  className={`sentiment-badge sentiment-${summary.sentiment}`}
                >
                  {summary.sentiment}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Extracted tasks */}
        {tasksLoading && (
          <div className="ai-loading">
            <span className="spinner" /> Looking for tasks and deadlines…
          </div>
        )}
        {tasksError && !tasksLoading && (
          <div className="ai-error">
            <span>{tasksError}</span>
            <button onClick={handleExtractTasks}>Retry</button>
          </div>
        )}
        {tasks && !tasksLoading && (
          <div className="ai-result-section">
            <div className="ai-result-head">
              <h3>Extracted tasks</h3>
              <span className="ai-result-badge">AI</span>
              <div className="ai-result-tools">
                {hasTasks && (
                  <button
                    className="btn-chip"
                    onClick={() => handleCopy("tasks", tasksToText(tasks.tasks))}
                  >
                    {copied === "tasks" ? "Copied" : "Copy"}
                  </button>
                )}
                <button
                  className="btn-chip"
                  onClick={handleExtractTasks}
                  disabled={tasksLoading}
                >
                  Regenerate
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
              <p className="ai-no-tasks">
                No action items or deadlines were found in this email. Nothing to
                track here.
              </p>
            )}
          </div>
        )}

        {/* AI suggested reply */}
        {replyLoading && (
          <div className="ai-loading">
            <span className="spinner" /> Drafting a suggested reply…
          </div>
        )}
        {replyError && !replyLoading && (
          <div className="ai-error">
            <span>{replyError}</span>
            <button onClick={handleSuggestReply}>Retry</button>
          </div>
        )}
        {reply && !replyLoading && (
          <div className="ai-result-section">
            <div className="ai-result-head">
              <h3>Suggested reply</h3>
              <span className="ai-result-badge">AI</span>
              <div className="ai-result-tools">
                <button
                  className="btn-chip"
                  onClick={() => handleCopy("reply", reply)}
                >
                  {copied === "reply" ? "Copied" : "Copy"}
                </button>
                <button
                  className="btn-chip"
                  onClick={handleSuggestReply}
                  disabled={replyLoading}
                >
                  Regenerate
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
            <div className="ai-reply-box">
              <pre className="ai-reply-text">{reply}</pre>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
