import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { captureTokenFromURL, fetchCurrentUser, logout, getGoogleLoginURL } from "../services/auth.js";
import { fetchEmails } from "../services/emails.js";
import EmailList from "../components/EmailList.jsx";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [emails, setEmails] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    captureTokenFromURL();
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadEmails(pageToken = null) {
    setEmailsLoading(true);
    try {
      const params = { maxResults: 20 };
      if (searchQuery) params.q = searchQuery;
      if (pageToken) params.pageToken = pageToken;

      const data = await fetchEmails(params);
      if (pageToken) {
        setEmails((prev) => [...prev, ...data.messages]);
      } else {
        setEmails(data.messages);
      }
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setEmailsLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    setEmails([]);
    setNextPageToken(null);
    loadEmails();
  }

  function handleLoadMore() {
    if (nextPageToken) {
      loadEmails(nextPageToken);
    }
  }

  function handleEmailClick(emailId) {
    navigate(`/emails/${emailId}`);
  }

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>InboxPilot</h1>
        </div>
        <div className="header-right">
          {user && (
            <div className="user-info">
              {user.picture && (
                <img src={user.picture} alt="" className="avatar" />
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
        {/* Gmail connection status */}
        <div className="gmail-status">
          {user?.gmailConnected ? (
            <div className="status-connected">
              <span className="status-dot green" />
              <span>Gmail connected — {user.email}</span>
            </div>
          ) : (
            <div className="status-disconnected">
              <span className="status-dot red" />
              <span>Gmail not connected</span>
              <a href={getGoogleLoginURL()} className="btn-connect">
                Connect Gmail
              </a>
            </div>
          )}
        </div>

        {/* Email section */}
        {user?.gmailConnected && (
          <section className="emails-section">
            <form className="search-bar" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit">Search</button>
            </form>

            <EmailList
              emails={emails}
              loading={emailsLoading}
              onEmailClick={handleEmailClick}
            />

            {nextPageToken && !emailsLoading && (
              <button className="btn-load-more" onClick={handleLoadMore}>
                Load More
              </button>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
