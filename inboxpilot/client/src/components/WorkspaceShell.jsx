import { logout } from "../services/auth.js";
import WorkspaceNav from "./WorkspaceNav.jsx";

/**
 * Shared page shell for the productivity pages (Tasks, Notes, Deadlines).
 * Reuses the dashboard header identity and adds the paper-style nav so the
 * whole app feels like one workspace.
 */
export default function WorkspaceShell({ title, subtitle, children }) {
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
          <button className="btn-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <WorkspaceNav />
        <div className="dashboard-intro enter-1">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="enter-2">{children}</div>
      </main>
    </div>
  );
}
