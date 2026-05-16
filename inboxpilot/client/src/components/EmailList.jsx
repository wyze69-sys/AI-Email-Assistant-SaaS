export default function EmailList({ emails, loading, onEmailClick }) {
  if (loading && emails.length === 0) {
    return <div className="email-list-loading">Fetching emails...</div>;
  }

  if (!emails || emails.length === 0) {
    return <div className="email-list-empty">No emails found.</div>;
  }

  return (
    <ul className="email-list">
      {emails.map((email) => (
        <li
          key={email.id}
          className={`email-item ${email.isUnread ? "unread" : ""}`}
          onClick={() => onEmailClick(email.id)}
        >
          <div className="email-item-header">
            <span className="email-from">{formatFrom(email.from)}</span>
            <span className="email-date">{formatDate(email.date)}</span>
          </div>
          <div className="email-subject">{email.subject || "(no subject)"}</div>
          <div className="email-snippet">{email.snippet}</div>
        </li>
      ))}
    </ul>
  );
}

function formatFrom(from) {
  if (!from) return "Unknown";
  // Extract name or email from "Name <email@example.com>"
  const match = from.match(/^(.+?)\s*<.+>$/);
  return match ? match[1] : from;
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
