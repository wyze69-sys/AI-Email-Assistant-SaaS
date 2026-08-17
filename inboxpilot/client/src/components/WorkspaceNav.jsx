import { useState } from "react";
import { NavLink } from "react-router-dom";

const NAV_GROUPS = [
  {
    label: "Command",
    links: [
      { to: "/workspace", label: "Overview", icon: "overview" },
      { to: "/actions", label: "Action queue", icon: "queue" },
      { to: "/dashboard", label: "Inbox", icon: "inbox" },
    ],
  },
  {
    label: "Workbench",
    links: [
      { to: "/capture", label: "Quick capture", icon: "capture" },
      { to: "/search", label: "Search", icon: "search" },
      { to: "/text", label: "Message assistant", icon: "message" },
    ],
  },
  {
    label: "Plan",
    links: [
      { to: "/study-planner", label: "Daily plan", icon: "plan" },
      { to: "/focus", label: "Focus", icon: "focus" },
      { to: "/tasks", label: "Tasks", icon: "tasks" },
      { to: "/deadlines", label: "Deadlines", icon: "deadline" },
    ],
  },
  {
    label: "Library",
    links: [
      { to: "/notes", label: "Notes", icon: "notes" },
      { to: "/resources", label: "Resources", icon: "resources" },
    ],
  },
];

const ICON_PATHS = {
  overview: <><path d="M4 5.5h6v6H4zM14 5.5h6v3h-6zM14 12.5h6v6H14zM4 15.5h6v3H4z" /></>,
  queue: <><path d="M5 7h14M5 12h10M5 17h7" /><path d="m16 15 2 2 3-4" /></>,
  inbox: <><path d="M4 5.5h16v13H4z" /><path d="M4 13h4l2 2h4l2-2h4" /></>,
  capture: <><path d="M12 4v16M4 12h16" /><path d="M6 6h12v12H6z" opacity=".35" /></>,
  search: <><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 5 5" /></>,
  message: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>,
  plan: <><path d="M5 6h14v14H5zM8 3v5M16 3v5M5 10h14" /></>,
  focus: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  tasks: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="m4 6 1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /></>,
  deadline: <><circle cx="12" cy="13" r="7" /><path d="M12 9v4l3 2M9 3h6" /></>,
  notes: <><path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" /></>,
  resources: <><path d="M5 5h6v14H5zM13 5h6v14h-6z" /><path d="M8 8h1M16 8h1" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
};

function NavIcon({ name }) {
  return (
    <svg className="workspace-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}

export default function WorkspaceNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside className={`workspace-sidebar ${isOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className="workspace-nav-toggle"
        aria-expanded={isOpen}
        aria-controls="workspace-navigation"
        onClick={() => setIsOpen((value) => !value)}
      >
        <span>Navigate workspace</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <nav id="workspace-navigation" className="workspace-nav" aria-label="Workspace sections">
        {NAV_GROUPS.map((group) => (
          <div className="workspace-nav-group" key={group.label}>
            <p className="workspace-nav-label">{group.label}</p>
            {group.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `workspace-nav-tab ${isActive ? "active" : ""}`}
              >
                <NavIcon name={link.icon} />
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>
        ))}

        <div className="workspace-nav-group workspace-nav-settings">
          <NavLink
            to="/settings"
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => `workspace-nav-tab ${isActive ? "active" : ""}`}
          >
            <NavIcon name="settings" />
            <span>Settings</span>
          </NavLink>
        </div>
      </nav>

      <div className="workspace-trust-note">
        <span className="status-dot green" aria-hidden="true" />
        <span><strong>Read-only Gmail</strong>No messages are sent or changed.</span>
      </div>
    </aside>
  );
}
