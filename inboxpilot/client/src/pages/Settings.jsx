import { useState, useEffect } from "react";
import WorkspaceShell from "../components/WorkspaceShell.jsx";
import {
  getLocalDataSummary,
  buildBackup,
  importBackup,
  clearTasks,
  clearNotes,
  clearResources,
  clearFocusSessions,
  clearPlannerPrefs,
  clearAiResults,
  clearAllProductivityData,
} from "../services/store.js";

/**
 * Settings & Local Data Manager (frontend-only).
 *
 * Lets the user understand, export, import, and clear the productivity data
 * InboxPilot keeps in this browser's localStorage. It never reads or writes
 * the auth token, Gmail OAuth tokens, the Gemini key, or .env values.
 */

const PLAN_STYLE_LABEL = {
  light: "Light",
  balanced: "Balanced",
  deep: "Deep",
};

export default function Settings() {
  const [summary, setSummary] = useState(() => getLocalDataSummary());
  const [status, setStatus] = useState(null); // { kind: "ok" | "error", text }

  function refresh() {
    setSummary(getLocalDataSummary());
  }

  // Keep the summary fresh when returning to the tab.
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  function announce(kind, text) {
    setStatus({ kind, text });
  }

  function handleExport() {
    try {
      const backup = buildBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "inboxpilot-backup.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      announce("ok", "Backup downloaded as inboxpilot-backup.json.");
    } catch {
      announce("error", "We couldn't create the backup file. Please try again.");
    }
  }

  function handleImport(event) {
    const input = event.target;
    const file = input.files && input.files[0];
    // Reset the input so re-selecting the same file fires change again.
    input.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(String(reader.result || ""));
      } catch {
        announce("error", "That file isn't valid JSON. Please choose a backup file.");
        return;
      }
      const result = importBackup(parsed);
      if (result.ok) {
        const i = result.imported;
        announce(
          "ok",
          `Backup restored — ${i.tasks} tasks, ${i.notes} notes, ${i.resources} resources, ${i.focusSessions} focus sessions, ${i.aiResults} saved AI entries.`
        );
        refresh();
      } else {
        announce("error", result.message);
      }
    };
    reader.onerror = () => {
      announce("error", "We couldn't read that file. Please try again.");
    };
    reader.readAsText(file);
  }

  function confirmClear(message, action, okText) {
    if (!window.confirm(message)) return;
    const ok = action();
    refresh();
    announce(ok ? "ok" : "error", ok ? okText : "Nothing was cleared.");
  }

  return (
    <WorkspaceShell
      title="Settings"
      subtitle="Manage the productivity data InboxPilot keeps in this browser."
    >
      <div className="settings-page">
        {status && (
          <div
            className={`settings-status ${status.kind === "ok" ? "is-ok" : "is-error"}`}
            role="status"
            aria-live="polite"
          >
            {status.text}
          </div>
        )}

        {/* 1. Local data summary */}
        <section className="settings-card" aria-labelledby="settings-summary-h">
          <h3 id="settings-summary-h">Local data summary</h3>
          <p className="settings-card-note">
            What's currently stored on this device.
          </p>
          <dl className="settings-summary-grid">
            <div className="settings-summary-item">
              <dt>Tasks</dt>
              <dd>{summary.tasks}</dd>
            </div>
            <div className="settings-summary-item">
              <dt>Notes</dt>
              <dd>{summary.notes}</dd>
            </div>
            <div className="settings-summary-item">
              <dt>Resources</dt>
              <dd>{summary.resources}</dd>
            </div>
            <div className="settings-summary-item">
              <dt>Focus sessions</dt>
              <dd>{summary.focusSessions}</dd>
            </div>
            <div className="settings-summary-item">
              <dt>Planner preference</dt>
              <dd>
                {summary.plannerConfigured
                  ? `Set · ${PLAN_STYLE_LABEL[summary.plannerStyle] || summary.plannerStyle}`
                  : "Not set"}
              </dd>
            </div>
            <div className="settings-summary-item">
              <dt>Saved AI results</dt>
              <dd>{summary.aiResultEntries}</dd>
            </div>
          </dl>
        </section>

        {/* 2. Privacy explanation */}
        <section className="settings-card settings-card-quiet" aria-labelledby="settings-privacy-h">
          <h3 id="settings-privacy-h">Privacy</h3>
          <p>
            Your productivity data is stored locally in this browser. It is not
            synced across devices. Export a backup if you want to keep a copy
            before clearing browser data.
          </p>
          <p className="settings-warn-text">Do not import backup files you do not trust.</p>
        </section>

        {/* 3 & 4. Backup: export + import */}
        <section className="settings-card" aria-labelledby="settings-backup-h">
          <h3 id="settings-backup-h">Backup</h3>
          <p className="settings-card-note">
            Backups include tasks, notes, resources, planner preference, focus
            sessions, and saved AI results. They never include your login or
            email access.
          </p>
          <div className="settings-actions">
            <button className="btn-secondary" onClick={handleExport}>
              Export local backup
            </button>

            <label className="btn-secondary settings-file-label">
              Import backup JSON
              <input
                type="file"
                accept="application/json,.json"
                onChange={handleImport}
                className="settings-file-input"
              />
            </label>
          </div>
        </section>

        {/* 5. Clear local data */}
        <section className="settings-card settings-card-danger" aria-labelledby="settings-clear-h">
          <h3 id="settings-clear-h">Clear local data</h3>
          <p className="settings-card-note">
            These actions remove data from this browser only and cannot be
            undone. Your login stays active.
          </p>
          <div className="settings-clear-grid">
            <button
              className="btn-quiet-danger"
              onClick={() =>
                confirmClear(
                  "Clear all tasks from this browser? This can't be undone.",
                  clearTasks,
                  "Tasks cleared."
                )
              }
            >
              Clear tasks
            </button>
            <button
              className="btn-quiet-danger"
              onClick={() =>
                confirmClear(
                  "Clear all notes from this browser? This can't be undone.",
                  clearNotes,
                  "Notes cleared."
                )
              }
            >
              Clear notes
            </button>
            <button
              className="btn-quiet-danger"
              onClick={() =>
                confirmClear(
                  "Clear all resources from this browser? This can't be undone.",
                  clearResources,
                  "Resources cleared."
                )
              }
            >
              Clear resources
            </button>
            <button
              className="btn-quiet-danger"
              onClick={() =>
                confirmClear(
                  "Clear all focus sessions from this browser? This can't be undone.",
                  clearFocusSessions,
                  "Focus sessions cleared."
                )
              }
            >
              Clear focus sessions
            </button>
            <button
              className="btn-quiet-danger"
              onClick={() =>
                confirmClear(
                  "Clear your planner preference? This can't be undone.",
                  clearPlannerPrefs,
                  "Planner preference cleared."
                )
              }
            >
              Clear planner preference
            </button>
            <button
              className="btn-quiet-danger"
              onClick={() =>
                confirmClear(
                  "Clear all saved AI results from this browser? This can't be undone.",
                  clearAiResults,
                  "Saved AI results cleared."
                )
              }
            >
              Clear saved AI results
            </button>
          </div>

          <div className="settings-clear-all">
            <button
              className="btn-quiet-danger btn-quiet-danger-strong"
              onClick={() =>
                confirmClear(
                  "Clear ALL productivity data (tasks, notes, resources, focus sessions, planner preference, and saved AI results) from this browser? You'll stay logged in. This can't be undone.",
                  clearAllProductivityData,
                  "All productivity data cleared. You're still logged in."
                )
              }
            >
              Clear all productivity data
            </button>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
