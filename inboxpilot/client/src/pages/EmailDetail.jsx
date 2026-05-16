import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEmailById } from "../services/emails.js";
import { summarizeEmail, extractTasks, suggestReply } from "../services/ai.js";

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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSummarize() {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await summarizeEmail(id);
      setSummary(data);
    } catch (err) {
      setSummaryError(err.message);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleExtractTasks() {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const data = await extractTasks(id);
      setTasks(data);
    } catch (err) {
      setTasksError(err.message);
    } finally {
      setTasksLoading(false);
    }
  }

  async function handleSuggestReply() {
    setReplyLoading(true);
    setReplyError(null);
    try {
      const data = await suggestReply(id);
      setReply(data.reply);
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setReplyLoading(false);
    }
  }

  if (loading) {
    return <div className="email-detail-loading">Loading email...</div>;
  }

  if (error) {
    return (
      <div className="email-detail-error">
        <p>Error: {error}</p>
        <button onClick={() => navigate("/dashboard")}>Back to Inbox</button>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="email-detail-error">
        <p>Email not found.</p>
        <button onClick={() => navigate("/dashboard")}>Back to Inbox</button>
      </div>
    );
  }

  return (
    <div className="email-detail">
      <header className="email-detail-header">
        <button className="btn-back" onClick={() => navigate("/dashboard")}>
          &larr; Back to Inbox
        </button>
      </header>

      <article className="email-content">
        <h2 className="email-detail-subject">
          {email.subject || "(no subject)"}
        </h2>

        <div className="email-meta">
          <div className="meta-row">
            <strong>From:</strong> <span>{email.from}</span>
          </div>
          <div className="meta-row">
            <strong>To:</strong> <span>{email.to}</span>
          </div>
          <div className="meta-row">
            <strong>Date:</strong> <span>{email.date}</span>
          </div>
          {email.labelIds && email.labelIds.length > 0 && (
            <div className="meta-row">
              <strong>Labels:</strong>{" "}
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

        {/* AI Action Buttons */}
        <div className="ai-actions">
          <button
            className="btn-ai"
            onClick={handleSummarize}
            disabled={summaryLoading}
          >
            {summaryLoading ? "Summarizing..." : "Summarize"}
          </button>
          <button
            className="btn-ai"
            onClick={handleExtractTasks}
            disabled={tasksLoading}
          >
            {tasksLoading ? "Extracting..." : "Extract Tasks"}
          </button>
          <button
            className="btn-ai btn-ai-reply"
            onClick={handleSuggestReply}
            disabled={replyLoading}
          >
            {replyLoading ? "Generating..." : "AI Suggested Reply"}
          </button>
        </div>

        {/* Summary Section */}
        {summaryError && (
          <div className="ai-error">
            <p>Summarize failed: {summaryError}</p>
          </div>
        )}
        {summary && (
          <div className="ai-result-section">
            <h3>Summary</h3>
            <p className="ai-summary-text">{summary.summary}</p>
            {summary.keyPoints && summary.keyPoints.length > 0 && (
              <>
                <h4>Key Points</h4>
                <ul className="ai-key-points">
                  {summary.keyPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </>
            )}
            {summary.sentiment && (
              <p className="ai-sentiment">
                <strong>Sentiment:</strong>{" "}
                <span className={`sentiment-badge sentiment-${summary.sentiment}`}>
                  {summary.sentiment}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Extracted Tasks Section */}
        {tasksError && (
          <div className="ai-error">
            <p>Extract tasks failed: {tasksError}</p>
          </div>
        )}
        {tasks && (
          <div className="ai-result-section">
            <h3>Extracted Tasks</h3>
            {tasks.tasks && tasks.tasks.length > 0 ? (
              <table className="ai-tasks-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Deadline</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.tasks.map((t, i) => (
                    <tr key={i}>
                      <td>{t.task}</td>
                      <td>{t.deadline || "—"}</td>
                      <td>
                        <span className={`priority-badge priority-${t.priority}`}>
                          {t.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="ai-no-tasks">No actionable tasks found in this email.</p>
            )}
          </div>
        )}

        {/* AI Suggested Reply Section */}
        {replyError && (
          <div className="ai-error">
            <p>AI suggested reply failed: {replyError}</p>
          </div>
        )}
        {reply && (
          <div className="ai-result-section ai-reply-section">
            <h3>AI Suggested Reply</h3>
            <p className="ai-reply-note">
              This is a suggestion only. Review and edit before using. No email
              will be sent automatically.
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
