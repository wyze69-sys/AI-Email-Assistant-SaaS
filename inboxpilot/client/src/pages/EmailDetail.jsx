import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEmailById } from "../services/emails.js";

export default function EmailDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          ← Back to Inbox
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

        {/* AI suggested reply placeholder */}
        <div className="ai-reply-section">
          <h3>AI Suggested Reply</h3>
          <p className="ai-reply-placeholder">
            AI suggested reply will appear here once the AI integration is
            configured. This is a read-only suggestion — no emails will be sent
            automatically.
          </p>
        </div>
      </article>
    </div>
  );
}
