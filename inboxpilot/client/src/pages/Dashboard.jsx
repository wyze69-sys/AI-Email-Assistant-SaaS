import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCurrentUser, logout, getGoogleLoginURL } from "../services/auth.js";
import { fetchEmails } from "../services/emails.js";
import { friendlyError } from "../services/ui.js";
import { triageEmail, TRIAGE_FILTERS } from "../services/triage.js";
import EmailList from "../components/EmailList.jsx";
import EmailPreview from "../components/EmailPreview.jsx";
import WorkspaceNav from "../components/WorkspaceNav.jsx";

// Quick inbox filters — map to Gmail search operators the existing
// fetchEmails `q` param already understands. No backend changes needed.
const FILTERS = [
  { id: "all", label: "All", query: "" },
  { id: "unread", label: "Unread", query: "is:unread" },
  { id: "today", label: "Today", query: "newer_than:1d" },
  { id: "attachments", label: "Attachments", query: "has:attachment" },
  { id: "important", label: "Important", query: "is:important" },
];

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
  // null = manual/custom search active, otherwise the active filter chip id.
  const [activeFilter, setActiveFilter] = useState("all");
  // Client-side triage filter — completely separate from the Gmail-query
  // FILTERS above. Selecting one never re-queries Gmail (no loadEmails call).
  const [activeTriageFilter, setActiveTriageFilter] = useState("all");

  // Split-pane selection: the email id shown in the right reading panel.
  // null = nothing selected yet (right panel shows its empty state).
  const [selectedId, setSelectedId] = useState(null);

  // Compute triage once per loaded email; recompute only when `emails` change.
  const triageMap = useMemo(() => {
    const map = {};
    for (const e of emails) map[e.id] = triageEmail(e);
    return map;
  }, [emails]);

  // Client-side filtered list (in-memory only, no fetch). "all" returns every
  // loaded email; any other filter keeps emails whose triage labels include it.
  const filteredEmails = useMemo(() => {
    if (activeTriageFilter === "all") return emails;
    return emails.filter((e) =>
      triageMap[e.id]?.labels.includes(activeTriageFilter)
    );
  }, [emails, triageMap, activeTriageFilter]);

  // Per-filter counts (R5.5): "all" = total loaded; others = matching count.
  const triageCounts = useMemo(() => {
    const counts = {};
    for (const f of TRIAGE_FILTERS) {
      counts[f.id] =
        f.id === "all"
          ? emails.length
          : emails.filter((e) => triageMap[e.id]?.labels.includes(f.category))
              .length;
    }
    return counts;
  }, [emails, triageMap]);

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
      // Defensive: API may return a missing/non-array `messages` (e.g. error
      // shape or empty body). Normalize so state stays a valid array and the
      // triage/render loops never crash.
      const messages = Array.isArray(data?.messages) ? data.messages : [];
      const next = data?.nextPageToken || null;
      if (isMore) {
        setEmails((prev) => [...prev, ...messages]);
      } else {
        setEmails(messages);
      }
      setNextPageToken(next);
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
    setActiveFilter(null); // manual search → no chip is active
    setSelectedId(null); // new result set → clear stale preview selection
    setEmails([]);
    setNextPageToken(null);
    setActiveQuery(searchQuery.trim());
    loadEmails(null, searchQuery.trim());
  }

  function handleClearSearch() {
    if (emailsLoading) return;
    setSearchQuery("");
    setActiveQuery("");
    setActiveFilter("all"); // clearing returns to the default inbox view
    setSelectedId(null);
    setEmails([]);
    setNextPageToken(null);
    loadEmails(null, "");
  }

  function handleSelectFilter(filter) {
    // Prevent duplicate requests while any load is in progress.
    if (emailsLoading || loadingMore) return;
    if (filter.id === activeFilter) return; // already showing this view
    setSearchQuery(""); // chips drive the view, so clear the typed query
    setActiveFilter(filter.id);
    setActiveQuery(filter.query);
    setSelectedId(null);
    setEmails([]);
    setNextPageToken(null);
    loadEmails(null, filter.query);
  }

  function handleLoadMore() {
    if (nextPageToken && !loadingMore) {
      loadEmails(nextPageToken);
    }
  }

  function handleEmailClick(emailId) {
    setSelectedId(emailId);
    // On narrow screens the preview renders below the list — bring it into
    // view so the selection feels responsive without manual scrolling.
    if (typeof window !== "undefined" && window.innerWidth <= 920) {
      requestAnimationFrame(() => {
        document
          .querySelector(".inbox-preview")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function handleOpenFull(emailId) {
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
  // The list row backing the current selection (instant header for the
  // preview before the full body finishes loading). Looked up from the full
  // loaded set so it survives triage-filter changes.
  const selectedItem = selectedId
    ? emails.find((e) => e.id === selectedId) || null
    : null;

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
        <WorkspaceNav />
        <div className="dashboard-intro enter-1">
          <h2>Inbox</h2>
          <p>
            Review Gmail messages, summarize long threads, extract tasks, and
            draft replies.
          </p>
          <p className="inbox-safety-note">
            Gmail stays read-only. Replies are drafts until you copy them.
          </p>
        </div>

        {/* Gmail connection status */}
        <div className="gmail-status enter-2">
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
          <div className="empty-state connect-state enter-3">
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
          <section className="emails-section enter-3">
            <div className="inbox-split">
            <div className="inbox-list-pane">
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

            <div
              className="filter-chips"
              role="group"
              aria-label="Quick inbox filters"
            >
              {FILTERS.map((f) => {
                const isActive = activeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`filter-chip ${isActive ? "active" : ""}`}
                    aria-pressed={isActive}
                    onClick={() => handleSelectFilter(f)}
                    disabled={emailsLoading || loadingMore}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Triage filters — a completely separate control group from the
                Gmail-query `.filter-chips` above. Selecting one only updates
                `activeTriageFilter` and re-derives `filteredEmails` in memory;
                it never calls loadEmails or touches activeQuery/activeFilter. */}
            <div
              className="triage-filter-bar"
              role="group"
              aria-label="Triage filters"
            >
              <span className="triage-filter-label">Triage</span>
              {TRIAGE_FILTERS.map((f) => {
                const isActive = activeTriageFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`triage-filter-chip ${isActive ? "active" : ""}`}
                    aria-pressed={isActive}
                    onClick={() => setActiveTriageFilter(f.id)}
                  >
                    {f.label}
                    <span className="triage-filter-count">
                      {triageCounts[f.id]}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="inbox-safety-note">
              Labels are suggestions based on message content. Gmail is not
              modified.
            </p>

            <div className="list-meta">
              <span className="list-count">
                {emailsLoading && emails.length === 0
                  ? "Loading emails…"
                  : emails.length > 0
                  ? `Showing ${emails.length} email${
                      emails.length === 1 ? "" : "s"
                    }${
                      !activeFilter && activeQuery
                        ? ` for “${activeQuery}”`
                        : ""
                    }`
                  : ""}
              </span>
              {!activeFilter && activeQuery && !emailsLoading && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={handleClearSearch}
                >
                  Clear search
                </button>
              )}
            </div>

            {activeTriageFilter !== "all" &&
            !emailsLoading &&
            emails.length > 0 &&
            filteredEmails.length === 0 ? (
              <p className="triage-empty">No messages match this filter.</p>
            ) : (
              <EmailList
                emails={filteredEmails}
                loading={emailsLoading}
                onEmailClick={handleEmailClick}
                activeQuery={activeFilter ? "" : activeQuery}
                onClearSearch={handleClearSearch}
                triageMap={triageMap}
                selectedId={selectedId}
              />
            )}

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
            </div>
            <EmailPreview emailItem={selectedItem} onOpenFull={handleOpenFull} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
