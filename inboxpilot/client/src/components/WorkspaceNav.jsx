import { NavLink } from "react-router-dom";

/**
 * Lightweight paper-style workspace navigation.
 * Styled as tab dividers across the top of a sheet, not a heavy sidebar,
 * so it stays clean down to ~375px width.
 */
const LINKS = [
  { to: "/workspace", label: "Workspace" },
  { to: "/dashboard", label: "Inbox" },
  { to: "/capture", label: "Capture" },
  { to: "/search", label: "Search" },
  { to: "/text", label: "Text" },
  { to: "/study-planner", label: "Plan" },
  { to: "/focus", label: "Focus" },
  { to: "/resources", label: "Resources" },
  { to: "/tasks", label: "Tasks" },
  { to: "/notes", label: "Notes" },
  { to: "/deadlines", label: "Deadlines" },
  { to: "/settings", label: "Settings" },
];

export default function WorkspaceNav() {
  return (
    <nav className="workspace-nav" aria-label="Workspace sections">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `workspace-nav-tab ${isActive ? "active" : ""}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
