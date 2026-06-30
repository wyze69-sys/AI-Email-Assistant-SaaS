import { useState, useEffect, useMemo } from "react";
import { fetchEmailById } from "../services/emails.js";
import { summarizeEmail, extractTasks, suggestReply } from "../services/ai.js";
import { triageEmail, DISPLAY_LABELS } from "../services/triage.js";
import { prepareEmailReadingView, intentLabel } from "../services/emailDisplay.js";
import { friendlyError } from "../services/ui.js";

/**
 * Right-hand reading/action panel for the split-pane inbox.
 *
 * Read-only and additive: it lazily fetches the selected email's full body
 * (only when an email is selected) and reuses the existing AI handlers, which
 * operate on the email id server-side. Gmail is never modified and nothing is
 * sent — AI replies are drafts the user reviews.
 *
 * @param {{ emailItem: object|null, onOpenFull: (id: string) => void }} props
 */
export default function EmailPreview({ emailItem, onOpenFull }) {
  const emailId = emailItem?.id || null;

  // Lazily-fetched full email (with body). Falls back to the list row data.
  const [full, setFull] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // AI states — kept local to the preview and reset whenever the selection
  // changes so results never bleed between emails.
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const [tasks, setTasks] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState(null);

  const [reply, setReply] = useState(null);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState(null);

  // Reset everything and fetch the full body whenever the selected id changes.
  useEffect(() => {
    setFull(null);
    setError(null);
    setSummary(null);
    setSummaryError(null);
    setTasks(null);
    setTasksError(null);
    setReply(null);
    setReplyError(null);

    if (!emailId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchEmailById(emailId)
      .then((data) => {
        if (!cancelled) setFull(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(friendlyError(err, "We couldn't open this email preview."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [emailId]);

  // Best available email object for display: full body when loaded, else row.
  const display = full || emailItem;

  // Advisory triage labels/reasons (pure, frontend-only).
  const triage = useMemo(
    () => (display ? triageEmail(display) : null),
    [display]
  );

  // Light cleaned preview: reuse the reading helper for a clutter-free text
  // snippet. Display-only — AI actions still use the original email body.
  const previewText = useMemo(() => {
    if (!full) return emailItem?.snippet || "";
    try {
      const view = prepareEmailReadingView(full);
      const text = (view.cleanedText || full.body || "").trim();
      return text || full.snippet || "";
    } catch {
      return (full.body || full.snippet || "").trim();
    }
  }, [full, emailItem]);

  const intent = useMemo(() => {
    if (!full) return null;
    try {
      return prepareEmailReadingView(full).intent;
    } catch {
      return null;
    }
  }, [full]);

  const PREVIEW_LIMIT = 700;
  const truncated = previewText.length > PREVIEW_LIMIT;
  const shownText = truncated
    ? previewText.slice(0, PREVIEW_LIMIT).trimEnd() + "…"
    : previewText;

  async function handleSummarize() {
    if (!emailId || summaryLoading) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      setSummary(await summarizeEmail(emailId));
    } catch (err) {
      setSummaryError(friendlyError(err, "We couldn't summarize this email."));
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleExtractTasks() {
    if (!emailId || tasksLoading) return;
    setTasksLoading(true);
    setTasksError(null);
    try {
      setTasks(await extractTasks(emailId));
    } catch (err) {
      setTasksError(
        friendlyError(err, "We couldn't extract tasks from this email.")
      );
    } finally {
      setTasksLoading(false);
    }
  }

  async function handleSuggestReply() {
    if (!emailId || replyLoading) return;
    setReplyLoading(true);
    setReplyError(null);
    try {
      const data = await suggestReply(emailId);
      setReply(data.reply);
    } catch (err) {
      setReplyError(friendlyError(err, "We couldn't draft a reply."));
    } finally {
      setReplyLoading(false);
    }
  }

  // Empty state — before any email is selected.
  if (!emailId) {
    return (
      <aside className="inbox-preview inbox-preview-empty" aria-label="Email preview">
        <div className="inbox-preview-empty-inner">
          <span className="inbox-preview-empty-icon" aria-hidden="true">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </span>
          <p>Select an email to read and act on it.</p>
        </div>
      </aside>
    );
  }

  const hasTasks = tasks && tasks.tasks && tasks.tasks.length > 0;

  return (
    <aside className="inbox-preview" aria-label="Email preview">
      {/* Quick info: sender, subject, date, triage */}
      <div className="inbox-preview-head">
        <div className="inbox-preview-meta">
          <span className="inbox-preview-from">
            {display?.from || "Unknown sender"}
          </span>
          {display?.date && (
            <span className="inbox-preview-date">{display.date}</span>
          )}
        </div>
        <h3 className="inbox-preview-subject">
          {display?.subject || "(no subject)"}
          {intent && intentLabel(intent) && (
            <span className={`email-type-chip email-type-${intent}`}>
              {intentLabel(intent)}
            </span>
          )}
        </h3>

        {triage && triage.labels.length > 0 && (
          <div className="inbox-preview-triage">
            <div className="triage-chips">
              {triage.labels.map((cat) => (
                <span key={cat} className={`triage-chip triage-${cat}`}>
                  {DISPLAY_LABELS[cat]}
                </span>
              ))}
            </div>
            {triage.reasons.length > 0 && (
              <ul className="triage-reasons">
                {triage.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="inbox-preview-actions">
          <button
            className="btn-primary btn-sm"
            onClick={() => onOpenFull(emailId)}
          >
            Open full email
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={handleSummarize}
            disabled={summaryLoading}
          >
            {summaryLoading ? "Summarizing…" : "Summarize"}
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={handleExtractTasks}
            disabled={tasksLoading}
          >
            {tasksLoading ? "Extracting…" : "Extract tasks"}
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={handleSuggestReply}
            disabled={replyLoading}
          >
            {replyLoading ? "Drafting…" : "Suggested reply"}
          </button>
        </div>
      </div>

      {/* Body preview */}
      <div className="inbox-preview-body">
        {loading ? (
          <div className="ai-loading">
            <span className="spinner" /> Loading preview…
          </div>
        ) : error ? (
          <div className="ai-error">
            <span>{error}</span>
            <button className="btn-secondary btn-sm" onClick={() => onOpenFull(emailId)}>
              Open full email
            </button>
          </div>
        ) : shownText ? (
          <>
            <p className="inbox-preview-text">{shownText}</p>
            {truncated && (
              <button
                className="btn-link"
                onClick={() => onOpenFull(emailId)}
              >
                Read full email →
              </button>
            )}
          </>
        ) : (
          <p className="inbox-preview-text inbox-preview-muted">
            No preview text available. Open the full email to read it.
          </p>
        )}
      </div>

      {/* AI results */}
      {(summary || summaryError) && (
        <div className="inbox-preview-ai">
          {summaryError ? (
            <div className="ai-error">
              <span>{summaryError}</span>
              <button onClick={handleSummarize}>Retry</button>
            </div>
          ) : (
            <div className="ai-result-section">
              <div className="ai-result-head">
                <h4>Summary</h4>
                <span className="ai-result-badge">AI</span>
              </div>
              <p className="ai-summary-text">{summary.summary}</p>
              {summary.keyPoints && summary.keyPoints.length > 0 && (
                <ul className="ai-key-points">
                  {summary.keyPoints.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {(tasks || tasksError) && (
        <div className="inbox-preview-ai">
          {tasksError ? (
            <div className="ai-error">
              <span>{tasksError}</span>
              <button onClick={handleExtractTasks}>Retry</button>
            </div>
          ) : (
            <div className="ai-result-section">
              <div className="ai-result-head">
                <h4>Extracted tasks</h4>
                <span className="ai-result-badge">AI</span>
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
                  No action items or deadlines were found in this email.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {(reply || replyError) && (
        <div className="inbox-preview-ai">
          {replyError ? (
            <div className="ai-error">
              <span>{replyError}</span>
              <button onClick={handleSuggestReply}>Retry</button>
            </div>
          ) : (
            <div className="ai-result-section">
              <div className="ai-result-head">
                <h4>Suggested reply</h4>
                <span className="ai-result-badge">AI</span>
              </div>
              <p className="ai-reply-note">
                This is a draft suggestion. Review before sending.
              </p>
              <div className="ai-reply-box">
                <pre className="ai-reply-text">{reply}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
