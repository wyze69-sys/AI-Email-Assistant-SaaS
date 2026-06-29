import { useState, useEffect } from "react";
import WorkspaceShell from "../components/WorkspaceShell.jsx";
import { listNotes, removeNote } from "../services/store.js";
import { copyToClipboard } from "../services/ui.js";

function formatDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function noteToText(note) {
  const lines = [];
  if (note.title) lines.push(note.title, "");
  if (note.body) lines.push(note.body);
  if (note.keyPoints && note.keyPoints.length > 0) {
    lines.push("", "Key points:");
    note.keyPoints.forEach((p) => lines.push(`- ${p}`));
  }
  return lines.join("\n");
}

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState("");

  useEffect(() => {
    // Newest first.
    setNotes(listNotes().sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  function refresh() {
    setNotes(listNotes().sort((a, b) => b.createdAt - a.createdAt));
  }

  function handleDelete(id) {
    removeNote(id);
    if (expandedId === id) setExpandedId(null);
    refresh();
  }

  async function handleCopy(note) {
    const ok = await copyToClipboard(noteToText(note));
    if (ok) {
      setCopiedId(note.id);
      setTimeout(() => setCopiedId((c) => (c === note.id ? "" : c)), 2000);
    }
  }

  const isEmpty = notes.length === 0;

  return (
    <WorkspaceShell
      title="Notes"
      subtitle="Summaries you've saved from your emails, kept on this device."
    >
      {isEmpty ? (
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="13" y2="17" />
            </svg>
          </span>
          <h3>No notes yet</h3>
          <p>Save an email summary to build your notes.</p>
        </div>
      ) : (
        <div className="notes-list">
          {notes.map((note) => {
            const expanded = expandedId === note.id;
            const snippet =
              note.body.length > 160 ? `${note.body.slice(0, 160)}…` : note.body;
            return (
              <article
                className={`note-card ${expanded ? "expanded" : ""}`}
                key={note.id}
              >
                <button
                  className="note-card-head"
                  onClick={() => setExpandedId(expanded ? null : note.id)}
                  aria-expanded={expanded}
                >
                  <span className="note-card-title">
                    {note.title || "Untitled note"}
                  </span>
                  <span className="note-card-date">
                    {formatDate(note.createdAt)}
                  </span>
                </button>

                {!expanded && <p className="note-card-snippet">{snippet}</p>}

                {expanded && (
                  <div className="note-card-body">
                    <p className="note-card-text">{note.body}</p>
                    {note.keyPoints && note.keyPoints.length > 0 && (
                      <>
                        <h4>Key points</h4>
                        <ul className="ai-key-points">
                          {note.keyPoints.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}

                <div className="note-card-foot">
                  {note.source && note.source.type === "email" && (
                    <span className="source-badge">from email</span>
                  )}
                  {note.source && note.source.type === "text" && (
                    <span className="source-badge">from text</span>
                  )}
                  <div className="note-card-tools">
                    <button className="btn-chip" onClick={() => handleCopy(note)}>
                      {copiedId === note.id ? "Copied" : "Copy"}
                    </button>
                    <button
                      className="btn-chip btn-chip-quiet"
                      onClick={() => handleDelete(note.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </WorkspaceShell>
  );
}
