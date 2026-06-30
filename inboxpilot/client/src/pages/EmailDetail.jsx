import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEmailById } from "../services/emails.js";
import {
  summarizeEmail,
  extractTasks,
  suggestReply,
  reviewEmailPriority,
} from "../services/ai.js";
import { triageEmail, DISPLAY_LABELS } from "../services/triage.js";
import { cleanEmailBody, bodyNeedsCleanup } from "../services/emailDisplay.js";
import {
  friendlyError,
  copyToClipboard,
  summaryToText,
  tasksToText,
  loadAiResults,
  saveAiResult,
  clearAiResult,
  clearAllAiResults,
  savedLocallyLabel,
  loadTriageReview,
  saveTriageReview,
  clearTriageReview,
} from "../services/ui.js";
import { addNote, addTasks } from "../services/store.js";

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

  // Optional AI priority review (manually triggered, never auto-fires).
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  // Tracks which copy button was last clicked, for transient "Copied" feedback
  const [copied, setCopied] = useState("");

  // Timestamps for AI results restored from / saved to localStorage.
  // { summary, tasks, reply } — a value means that tool's result is saved locally.
  const [savedAt, setSavedAt] = useState({});

  // Transient feedback for "save to productivity store" actions.
  // noteSaved: boolean, tasksSaved: message string (added count / already saved).
  const [noteSaved, setNoteSaved] = useState(false);
  const [tasksSavedMsg, setTasksSavedMsg] = useState("");

  // Advisory triage labels for the loaded email (pure, frontend-only).
  // Guarded at the top level so the hook is never called conditionally.
  const triage = useMemo(() => (email ? triageEmail(email) : null), [email]);

  // Display-only body cleanup. Defaults to the cleaned view. The original
  // body is always preserved on `email.body` and is what AI actions use.
  const [showOriginalBody, setShowOriginalBody] = useState(false);

  const canCleanBody = useMemo(
    () => (email ? bodyNeedsCleanup(email.body) : false),
    [email]
  );

  const displayBody = useMemo(() => {
    if (!email) return "";
    if (showOriginalBody || !canCleanBody) return email.body;
    return cleanEmailBody(email.body);
  }, [email, showOriginalBody, canCleanBody]);

  useEffect(() => {
    loadEmail();
  }, [id]);

  // Hydrate AI results from the per-email local history when the email changes.
  useEffect(() => {
    if (!id) return;
    // Reset in-memory AI state so results never bleed between emails.
    setSummary(null);
    setTasks(null);
    setReply(null);
    setSummaryError(null);
    setTasksError(null);
    setReplyError(null);
    setNoteSaved(false);
    setTasksSavedMsg("");
    // Default each newly opened email to the cleaned body view.
    setShowOriginalBody(false);
    // Reset AI priority review state so results never bleed between emails.
    setReview(null);
    setReviewError(null);

    const saved = loadAiResults(id);
    const restored = {};
    if (saved.summary && saved.summary.data) {
      setSummary(saved.summary.data);
      restored.summary = saved.summary.generatedAt;
    }
    if (saved.tasks && saved.tasks.data) {
      setTasks(saved.tasks.data);
      restored.tasks = saved.tasks.generatedAt;
    }
    if (saved.reply && saved.reply.data) {
      setReply(saved.reply.data);
      restored.reply = saved.reply.generatedAt;
    }
    setSavedAt(restored);

    // Restore any cached AI priority review for this email.
    const cachedReview = loadTriageReview(id);
    if (cachedReview && cachedReview.result) {
      setReview(cachedReview.result);
    }
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
      if (saveAiResult(id, "summary", data)) {
        setSavedAt((s) => ({ ...s, summary: Date.now() }));
      }
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
      if (saveAiResult(id, "tasks", data)) {
        setSavedAt((s) => ({ ...s, tasks: Date.now() }));
      }
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
      if (saveAiResult(id, "reply", data.reply)) {
        setSavedAt((s) => ({ ...s, reply: Date.now() }));
      }
    } catch (err) {
      setReplyError(friendlyError(err, "We couldn't draft a reply for this email."));
    } finally {
      setReplyLoading(false);
    }
  }

  async function handleReviewPriority() {
    if (reviewLoading) return;
    setReviewLoading(true);
    setReviewError(null);
    try {
      const result = await reviewEmailPriority(email);
      setReview(result);
      saveTriageReview(id, result);
    } catch (err) {
      setReviewError(
        friendlyError(err, "We couldn't review this email's priority.")
      );
    } finally {
      setReviewLoading(false);
    }
  }

  // Clear the cached AI priority review for this email.
  function handleClearReview() {
    clearTriageReview(id);
    setReview(null);
    setReviewError(null);
  }

  function handleClearSaved(tool) {
    clearAiResult(id, tool);
    setSavedAt((s) => {
      const next = { ...s };
      delete next[tool];
      return next;
    });
    if (tool === "summary") {
      setSummary(null);
      setSummaryError(null);
    } else if (tool === "tasks") {
      setTasks(null);
      setTasksError(null);
    } else if (tool === "reply") {
      setReply(null);
      setReplyError(null);
    }
  }

  function handleClearAllSaved() {
    clearAllAiResults(id);
    setSavedAt({});
    setSummary(null);
    setTasks(null);
    setReply(null);
    setSummaryError(null);
    setTasksError(null);
    setReplyError(null);
  }

  // Save the current summary as a Note in the local productivity store.
  function handleSaveNote() {
    if (!summary) return;
    const note = addNote({
      title: email?.subject || "Email summary",
      body: summary.summary || "",
      keyPoints: Array.isArray(summary.keyPoints) ? summary.keyPoints : [],
      source: { type: "email", id },
    });
    // addNote returns the stored (or existing duplicate) note; treat any
    // non-null return as success. Duplicates simply don't create a repeat.
    if (note) {
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2500);
    }
  }

  // Save the current extracted tasks to the local Task board.
  function handleSaveTasks() {
    if (!hasTasks) return;
    const payload = tasks.tasks.map((t) => ({
      text: t.task,
      deadline: t.deadline || null,
      priority: t.priority || null,
      status: "todo",
      source: { type: "email", id },
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
  const hasAnySaved = Boolean(savedAt.summary || savedAt.tasks || savedAt.reply);

  return (
    <div className="email-detail">
      <header className="email-detail-header">
        <button className="btn-back" onClick={() => navigate("/dashboard")}>
          ← Back to inbox
        </button>
      </header>

      {/* Document header: subject, triage, and metadata read first */}
      <section className="email-headline email-sheet enter-1">
        <h2 className="email-detail-subject">
          {email.subject || "(no subject)"}
        </h2>

        {triage && triage.labels.length > 0 && (
          <div className="triage-detail">
            <div className="triage-detail-chips">
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
      </section>

      <div className="email-detail-layout">
      {/* AI assistant panel — surfaced above the body so the main
          actions are reachable before the long message content. */}
      <aside className="ai-panel enter-2" aria-label="AI assistant">
        <div className="ai-toolbar">
          <p className="ai-toolbar-label">Assistant</p>
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
          {hasAnySaved && (
            <div className="ai-saved-bar">
              <span className="ai-saved-note">Local AI history saved on this device</span>
              <button className="btn-link-quiet" onClick={handleClearAllSaved}>
                Clear all saved
              </button>
            </div>
          )}
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
              {savedAt.summary && (
                <span className="ai-saved-label" title="Stored only in this browser">
                  {savedLocallyLabel(savedAt.summary)}
                </span>
              )}
              <div className="ai-result-tools">
                <button
                  className="btn-chip"
                  onClick={() => handleCopy("summary", summaryToText(summary))}
                >
                  {copied === "summary" ? "Copied" : "Copy"}
                </button>
                <button
                  className="btn-chip"
                  onClick={handleSaveNote}
                >
                  {noteSaved ? "Saved locally" : "Save as note"}
                </button>
                <button
                  className="btn-chip"
                  onClick={handleSummarize}
                  disabled={summaryLoading}
                >
                  Regenerate
                </button>
                {savedAt.summary && (
                  <button
                    className="btn-chip btn-chip-quiet"
                    onClick={() => handleClearSaved("summary")}
                  >
                    Clear saved result
                  </button>
                )}
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
              {savedAt.tasks && (
                <span className="ai-saved-label" title="Stored only in this browser">
                  {savedLocallyLabel(savedAt.tasks)}
                </span>
              )}
              <div className="ai-result-tools">
                {hasTasks && (
                  <button
                    className="btn-chip"
                    onClick={() => handleCopy("tasks", tasksToText(tasks.tasks))}
                  >
                    {copied === "tasks" ? "Copied" : "Copy"}
                  </button>
                )}
                {hasTasks && (
                  <button className="btn-chip" onClick={handleSaveTasks}>
                    {tasksSavedMsg || "Save to board"}
                  </button>
                )}
                <button
                  className="btn-chip"
                  onClick={handleExtractTasks}
                  disabled={tasksLoading}
                >
                  Regenerate
                </button>
                {savedAt.tasks && (
                  <button
                    className="btn-chip btn-chip-quiet"
                    onClick={() => handleClearSaved("tasks")}
                  >
                    Clear saved result
                  </button>
                )}
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
              {savedAt.reply && (
                <span className="ai-saved-label" title="Stored only in this browser">
                  {savedLocallyLabel(savedAt.reply)}
                </span>
              )}
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
                {savedAt.reply && (
                  <button
                    className="btn-chip btn-chip-quiet"
                    onClick={() => handleClearSaved("reply")}
                  >
                    Clear saved result
                  </button>
                )}
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

        {/* AI priority review — separate, manually-triggered subsection */}
        <div className="ai-review-block">
          <div className="ai-toolbar">
            <p className="ai-toolbar-label">AI priority review</p>
            <div className="ai-actions">
              <button
                className="btn-ai"
                onClick={handleReviewPriority}
                disabled={reviewLoading}
              >
                <span className="btn-ai-icon" aria-hidden="true">
                  {reviewLoading ? <span className="spinner" /> : "⚖"}
                </span>
                <span className="btn-ai-text">
                  <span className="btn-ai-title">
                    {reviewLoading ? "Reviewing…" : "Review priority"}
                  </span>
                  <span className="btn-ai-desc">Optional AI second opinion</span>
                </span>
              </button>
            </div>
          </div>

          {reviewLoading && (
            <div className="ai-loading">
              <span className="spinner" /> Reviewing priority…
            </div>
          )}

          {reviewError && !reviewLoading && (
            <div className="ai-error">
              <span>{reviewError}</span>
              <button onClick={handleReviewPriority}>Retry</button>
            </div>
          )}

          {review && !reviewLoading && (
            <div className="ai-result-section">
              <div className="ai-result-head">
                <h3>Priority review</h3>
                <span className="ai-result-badge">AI</span>
                <span
                  className={`ai-priority-badge priority-${review.priority}`}
                >
                  {review.priority}
                </span>
                <div className="ai-result-tools">
                  <button
                    className="btn-chip btn-chip-quiet"
                    onClick={handleClearReview}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="ai-review-fields">
                <p>
                  <strong>Category:</strong> {review.category}
                </p>
                <p>
                  <strong>Reason:</strong> {review.reason}
                </p>
                <p>
                  <strong>Suggested action:</strong> {review.suggestedAction}
                </p>
              </div>
            </div>
          )}

          <p className="ai-review-disclaimer">
            AI review is a suggestion. Gmail is not modified.
          </p>
        </div>
      </aside>

      <article className="email-content email-sheet enter-1">
        {canCleanBody && (
          <div className="email-body-toolbar">
            <p className="email-clean-note">
              Cleaned view hides tracking links and footer clutter. AI tools
              still use the original email.
            </p>
            <button
              type="button"
              className="btn-link-quiet"
              onClick={() => setShowOriginalBody((v) => !v)}
              aria-pressed={showOriginalBody}
            >
              {showOriginalBody ? "Show cleaned" : "Show original"}
            </button>
          </div>
        )}
        <div className="email-body">
          <pre className="email-body-text">{displayBody}</pre>
        </div>
      </article>
      </div>
    </div>
  );
}
