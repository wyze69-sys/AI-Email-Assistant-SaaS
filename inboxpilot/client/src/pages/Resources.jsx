import { useState, useEffect, useMemo } from "react";
import WorkspaceShell from "../components/WorkspaceShell.jsx";
import {
  listResources,
  addResource,
  updateResource,
  removeResource,
  normalizeResourceUrl,
  parseResourceTags,
} from "../services/store.js";
import { copyToClipboard } from "../services/ui.js";

/**
 * Resource Library (frontend-only).
 *
 * A calm place to keep useful links, documents, and references for general
 * productivity. All data lives in this browser under "inboxpilot:resources:v1"
 * via the guarded store helpers — no backend calls, no email sending.
 */

const CATEGORIES = [
  "general",
  "article",
  "document",
  "tool",
  "project",
  "tutorial",
  "meeting",
  "custom",
];

const CATEGORY_LABEL = {
  general: "General",
  article: "Article",
  document: "Document",
  tool: "Tool",
  project: "Project",
  tutorial: "Tutorial",
  meeting: "Meeting",
  custom: "Custom",
};

const EMPTY_DRAFT = {
  title: "",
  url: "",
  category: "general",
  notes: "",
  tags: "",
};

function domainOf(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function formatDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // editingId: null = form closed, "new" = adding, otherwise a resource id.
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [formError, setFormError] = useState("");
  const [copiedId, setCopiedId] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    // Newest activity first.
    setResources(listResources().sort((a, b) => b.updatedAt - a.updatedAt));
  }

  function openNew() {
    setEditingId("new");
    setDraft(EMPTY_DRAFT);
    setFormError("");
  }

  function openEdit(resource) {
    setEditingId(resource.id);
    setDraft({
      title: resource.title || "",
      url: resource.url || "",
      category: resource.category || "general",
      notes: resource.notes || "",
      tags: (resource.tags || []).join(", "),
    });
    setFormError("");
  }

  function closeForm() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFormError("");
  }

  function handleSave(event) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      setFormError("Give this resource a title.");
      return;
    }

    // Validate the URL only when one was entered.
    const rawUrl = draft.url.trim();
    if (rawUrl) {
      const safe = normalizeResourceUrl(rawUrl);
      if (safe === null) {
        setFormError("That link isn't a valid http(s) web address.");
        return;
      }
    }

    const payload = {
      title,
      url: rawUrl,
      category: draft.category,
      notes: draft.notes,
      tags: parseResourceTags(draft.tags),
    };

    if (editingId === "new") {
      addResource(payload);
    } else if (editingId) {
      updateResource(editingId, payload);
    }
    closeForm();
    refresh();
  }

  function handleDelete(resource) {
    const ok = window.confirm(
      `Delete "${resource.title || "this resource"}"? This can't be undone.`
    );
    if (!ok) return;
    removeResource(resource.id);
    if (editingId === resource.id) closeForm();
    refresh();
  }

  function handleOpen(resource) {
    if (!resource.url) return;
    window.open(resource.url, "_blank", "noopener,noreferrer");
  }

  async function handleCopy(resource) {
    if (!resource.url) return;
    const ok = await copyToClipboard(resource.url);
    if (ok) {
      setCopiedId(resource.id);
      setTimeout(() => setCopiedId((c) => (c === resource.id ? "" : c)), 2000);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        r.title,
        r.url,
        domainOf(r.url),
        r.notes,
        r.category,
        CATEGORY_LABEL[r.category] || "",
        (r.tags || []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [resources, query, categoryFilter]);

  const hasResources = resources.length > 0;
  const hasResults = filtered.length > 0;
  const isFiltering = query.trim() !== "" || categoryFilter !== "all";

  return (
    <WorkspaceShell
      title="Resource library"
      subtitle="Save useful links, documents, and references, kept on this device."
    >
      <div className="resource-page">
        <div className="resource-toolbar">
          <div className="resource-search">
            <span className="resource-search-icon" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="search"
              className="resource-search-input"
              placeholder="Search resources"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search resources"
            />
          </div>

          <label className="resource-filter">
            <span className="resource-filter-label">Category</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="all">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </label>

          {editingId === null && (
            <button className="btn-primary resource-add-btn" onClick={openNew}>
              Add resource
            </button>
          )}
        </div>

        {editingId !== null && (
          <form className="resource-form" onSubmit={handleSave}>
            <div className="resource-form-head">
              <h3>{editingId === "new" ? "New resource" : "Edit resource"}</h3>
            </div>

            <label className="resource-field">
              <span>
                Title <span className="resource-req">required</span>
              </span>
              <input
                type="text"
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
                placeholder="Project documentation"
                autoFocus
              />
            </label>

            <div className="resource-field-row">
              <label className="resource-field resource-field-grow">
                <span>Link</span>
                <input
                  type="text"
                  value={draft.url}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, url: e.target.value }))
                  }
                  placeholder="example.com"
                  inputMode="url"
                />
              </label>

              <label className="resource-field">
                <span>Category</span>
                <select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, category: e.target.value }))
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="resource-field">
              <span>Notes</span>
              <textarea
                value={draft.notes}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, notes: e.target.value }))
                }
                rows={3}
                placeholder="Why this is worth keeping."
              />
            </label>

            <label className="resource-field">
              <span>Tags</span>
              <input
                type="text"
                value={draft.tags}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, tags: e.target.value }))
                }
                placeholder="project, docs (comma separated)"
              />
            </label>

            {formError && (
              <p className="resource-form-error" role="alert">
                {formError}
              </p>
            )}

            <div className="resource-form-actions">
              <button type="submit" className="btn-primary">
                {editingId === "new" ? "Save resource" : "Save changes"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={closeForm}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!hasResources && editingId === null ? (
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
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </span>
            <h3>No resources yet</h3>
            <p>Save useful links, documents, and references here.</p>
          </div>
        ) : !hasResults && isFiltering ? (
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
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <h3>Nothing found</h3>
            <p>No resources match this search.</p>
          </div>
        ) : (
          <ul className="resource-list">
            {filtered.map((resource) => {
              const domain = domainOf(resource.url);
              return (
                <li className="resource-card" key={resource.id}>
                  <div className="resource-card-main">
                    <div className="resource-card-head">
                      <h3 className="resource-card-title">{resource.title}</h3>
                      <span
                        className={`resource-cat resource-cat-${resource.category}`}
                      >
                        {CATEGORY_LABEL[resource.category] || resource.category}
                      </span>
                    </div>

                    {resource.url && (
                      <a
                        className="resource-card-url"
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={resource.url}
                      >
                        {domain || resource.url}
                      </a>
                    )}

                    {resource.notes && (
                      <p className="resource-card-notes">{resource.notes}</p>
                    )}

                    {resource.tags && resource.tags.length > 0 && (
                      <div className="resource-tags">
                        {resource.tags.map((tag) => (
                          <span className="resource-tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <span className="resource-card-date">
                      Updated {formatDate(resource.updatedAt)}
                    </span>
                  </div>

                  <div className="resource-card-tools">
                    {resource.url && (
                      <>
                        <button
                          className="btn-chip"
                          onClick={() => handleOpen(resource)}
                        >
                          Open
                        </button>
                        <button
                          className="btn-chip"
                          onClick={() => handleCopy(resource)}
                        >
                          {copiedId === resource.id ? "Copied" : "Copy link"}
                        </button>
                      </>
                    )}
                    <button
                      className="btn-chip btn-chip-quiet"
                      onClick={() => openEdit(resource)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-chip btn-chip-quiet"
                      onClick={() => handleDelete(resource)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </WorkspaceShell>
  );
}
