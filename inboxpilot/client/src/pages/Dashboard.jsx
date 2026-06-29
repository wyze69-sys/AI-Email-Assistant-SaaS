import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCurrentUser, logout, getGoogleLoginURL } from "../services/auth.js";
import { fetchEmails } from "../services/emails.js";
import { friendlyError } from "../services/ui.js";
import EmailList from "../components/EmailList.jsx";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [emails, setEmails] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  useEffect(() => {
    // Token capture already handled at module level in App.jsx
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const data = await fetchCurrentUser();
      setUser(data);
      if (data.gmailConnected) {
        await loadEmails();
      }
    } catch (err) {
      setError(friendlyError(err, "We couldn't load your account. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function loadEmails(pageToken = null, query = activeQuery) {
    const isMore = Boolean(pageToken);
    if (isMore) {
      setLoadingMore(true);
    } else {
      setEmailsLoading(true);
    }
    try {
      const params = { maxResults: 20 };
      if (query) params.q = query;
      if (pageToken) params.pageToken = pageToken;

      const data = await fetchEmails(params);
      if (isMore) {
        setEmails((prev) => [...prev, ...data.messages]);
      } else {
        setEmails(data.messages);
      }
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError(friendlyError(err, "We couldn't load your emails. Please try again."));
    } finally {
      setEmailsLoading(false);
      setLoadingMore(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    if (emailsLoading) return; // prevent duplicate submits while loading
    setEmails([]);
    setNextPageToken(null);
    setActiveQuery(searchQuery.trim());
    loadEmails(null, searchQuery.trim());
  }

  function handleClearSearch() {
    if (emailsLoading) return;
    setSearchQuery("");
    setActiveQuery("");
    setEmails([]);
    setNextPageToken(null);
    loadEmails(null, "");
  }

  function handleLoadMore() {
    if (nextPageToken && !loadingMore) {
      loadEmails(nextPageToken);
    }
  }

  function handleEmailClick(emailId) {
    navigate(`/emails/${emailId}`);
  }

  if (loading) {
    return (
      <div className="page-state">
        <span className="spinner" />
        <p>Loading your workspace…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-state">
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <button
          className="btn-secondary"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase();
  const gmailConnected = Boolean(user?.gmailConnected);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <span className="brand-mark" aria-hidden="true">
            IP
          </span>
          <h1>InboxPilot</h1>
        </div>
        <div className="header-right">
          {user && (
            <div className="user-info">
              {user.picture ? (
                <img src={user.picture} alt="" className="avatar" />
              ) : (
                <span className="avatar-fallback" aria-hidden="true">
                  {initial}
                </span>
              )}
              <span className="user-name">{user.name || user.email}</span>
            </div>
          )}
          <button className="btn-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-intro">
          <h2>Inbox</h2>
          <p>Pick an email to summarize it, extract tasks, or draft a reply.</p>
        </div>

        {/* Gmail connection status */}
        <div className="gmail-status">
          {gmailConnected ? (
            <div className="status-connected">
              <span className="status-dot green" />
              <span>
                Gmail connected ·{" "}
                <span className="status-email">{user.email}</span> · read-only
              </span>
            </div>
          ) : (
            <div className="status-disconnected">
              <span className="status-dot red" />
              <span>Gmail not connected</span>
            </div>
          )}
        </div>

        {/* Disconnected: dedicated empty state with one clear action */}
        {!gmailConnected && (
          <div className="empty-state connect-state">
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
            <h3>Connect Gmail to get started</h3>
            <p>
              InboxPilot needs read-only access to your Gmail so it can show your
              emails and help you summarize them, extract tasks, and draft
              replies. It never sends or deletes anything.
            </p>
            <a href={getGoogleLoginURL()} className="btn-primary">
              Connect Gmail
            </a>
          </div>
        )}

        {/* Email section */}
        {gmailConnected && (
          <section className="emails-section">
            <form className="search-bar" onSubmit={handleSearch}>
              <div className="search-input-wrap">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search your inbox…"
                  aria-label="Search emails"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={emailsLoading}
                />
              </div>
              <button type="submit" disabled={emailsLoading}>
                {emailsLoading ? "Searching…" : "Search"}
              </button>
            </form>

            <div className="list-meta">
              <span className="list-count">
                {emailsLoading && emails.length === 0
                  ? "Loading emails…"
                  : emails.length > 0
                  ? `Showing ${emails.length} email${
                      emails.length === 1 ? "" : "s"
                    }${activeQuery ? ` for “${activeQuery}”` : ""}`
                  : ""}
              </span>
              {activeQuery && !emailsLoading && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={handleClearSearch}
                >
                  Clear search
                </button>
              )}
            </div>

            <EmailList
              emails={emails}
              loading={emailsLoading}
              onEmailClick={handleEmailClick}
              activeQuery={activeQuery}
              onClearSearch={handleClearSearch}
            />

            {nextPageToken && (
              <button
                className="btn-load-more"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <span className="spinner" /> Loading…
                  </>
                ) : (
                  "Load more"
                )}
              </button>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
