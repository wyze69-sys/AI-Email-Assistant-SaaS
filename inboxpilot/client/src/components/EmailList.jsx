import { DISPLAY_LABELS } from "../services/triage.js";

export default function EmailList({
  emails,
  loading,
  onEmailClick,
  activeQuery = "",
  onClearSearch,
  triageMap = {},
}) {
  // Initial load — show skeleton placeholders
  if (loading && emails.length === 0) {
    return (
      <ul className="email-list" aria-busy="true" aria-label="Loading emails">
        {Array.from({ length: 6 }).map((_, i) => (
          <li className="email-skeleton" key={i}>
            <div className="skeleton-line w-30" />
            <div className="skeleton-line w-60" />
            <div className="skeleton-line w-90" />
          </li>
        ))}
      </ul>
    );
  }

  // Empty state with a useful next action
  if (!emails || emails.length === 0) {
    return (
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
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </span>
        {activeQuery ? (
          <>
            <h3>No emails match “{activeQuery}”</h3>
            <p>Try a different search term, or clear the search to see your inbox.</p>
            {onClearSearch && (
              <button className="btn-secondary" onClick={onClearSearch}>
                Clear search
              </button>
            )}
          </>
        ) : (
          <>
            <h3>Your inbox looks empty</h3>
            <p>
              No emails to show right now. New messages will appear here once
              they arrive in Gmail.
            </p>
          </>
        )}
      </div>
    );
  }

  function handleKeyDown(e, id) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEmailClick(id);
    }
  }

  return (
    <ul className="email-list">
      {emails.map((email) => {
        const triage = triageMap[email.id];
        return (
          <li
            key={email.id}
            className={`email-item ${email.isUnread ? "unread" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={`Open email from ${formatFrom(email.from)}: ${
              email.subject || "no subject"
            }${email.isUnread ? " (unread)" : ""}`}
            onClick={() => onEmailClick(email.id)}
            onKeyDown={(e) => handleKeyDown(e, email.id)}
          >
            <span className="email-unread-dot" aria-hidden="true" />
            <span className="email-from">{formatFrom(email.from)}</span>
            <span className="email-date">{formatDate(email.date)}</span>
            <span className="email-subject">
              {email.subject || "(no subject)"}
            </span>
            <span className="email-snippet">{email.snippet}</span>
            {triage && triage.labels.length > 0 && (
              <span className="triage-chips" aria-label="Triage labels">
                {triage.labels.map((cat) => (
                  <span key={cat} className={`triage-chip triage-${cat}`}>
                    {DISPLAY_LABELS[cat]}
                  </span>
                ))}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function formatFrom(from) {
  if (!from) return "Unknown";
  // Extract name or email from "Name <email@example.com>"
  const match = from.match(/^(.+?)\s*<.+>$/);
  return match ? match[1].replace(/^"|"$/g, "") : from;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    // Same day — show time
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    // Same year — show month/day
    if (d.getFullYear() === now.getFullYear()) {
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
    return d.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}
