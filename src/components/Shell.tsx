import { Fragment, useState } from "react";
import type { ReactNode } from "react";
import type { AppState, Action } from "../store";
import { openTasks, archiveForOutcome } from "../store";
import type { RoleId, NavKey } from "../lib/roles";
import { ROLES, visibleNav } from "../lib/roles";
import type { NavNode, Stage, OutcomeType } from "../lib/stages";
import { NAV_TREE, queueTaskType } from "../lib/stages";

interface ShellProps {
  state: AppState;
  route: string;
  onNavigate: (key: string) => void;
  onDispatch: (action: Action) => void;
  children?: ReactNode;
}

function titleFor(route: string): string {
  for (const node of NAV_TREE) {
    if (node.kind === "link" && node.key === route) return node.label;
    if (node.kind === "group") {
      const child = node.children?.find((c) => c.key === route);
      if (child) return child.label;
    }
  }
  return route || "Dashboard";
}

function childCount(state: AppState, child: { key: string; kind: "queue" | "archive" }): number {
  if (child.kind === "queue") {
    const tt = queueTaskType(child.key as Stage);
    return tt ? openTasks(state, tt).length : 0;
  }
  return archiveForOutcome(state, child.key as OutcomeType).length;
}

function isGroupActive(node: NavNode, route: string): boolean {
  return !!node.children?.some((c) => c.key === route);
}

function primaryFlow(state: AppState): { key: string; label: string } {
  const visible = visibleNav(state.currentRole);
  const groupKey = visible.find((k) => k === "retraction" || k === "media" || k === "publishing");
  const group = NAV_TREE.find((n) => n.key === groupKey);
  const firstQueue = group?.children?.find((c) => c.kind === "queue");
  return { key: firstQueue?.key ?? "dashboard", label: group?.label ?? "Dashboard" };
}

function sidebarUser(state: AppState): { name: string; roleLabel: string; initials: string } {
  const role = state.currentRole;
  const roleLabel = ROLES.find((r) => r.id === role)?.label ?? role;
  const user = state.users.find((u) => u.roles.includes(role));
  const name = user?.name ?? roleLabel;
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return { name, roleLabel, initials };
}

export function Shell({ state, route, onNavigate, onDispatch, children }: ShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const role = state.currentRole;
  const nodes = NAV_TREE.filter((n) => visibleNav(role).includes(n.key as NavKey));
  const title = titleFor(route);
  const flow = primaryFlow(state);
  const user = sidebarUser(state);

  const navigate = (key: string) => {
    onNavigate(key);
    setMenuOpen(false);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`.trim()}>
        <div className="brand-row">
          <div className="brand-mark">M</div>
          <div style={{ display: "grid", gap: "2px" }}>
            <strong>MaidMatch</strong>
            <span>ERP</span>
          </div>
          <button
            type="button"
            className="sidebar-close icon-button"
            style={{ marginLeft: "auto" }}
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            &times;
          </button>
        </div>
        <nav className="primary-nav">
          {nodes.map((node) => (
            <Fragment key={node.key}>
              {node.key === "dashboard" && <div className="nav-kicker">Workspace</div>}
              {node.key === "users" && <div className="nav-kicker">Configuration</div>}
              {node.kind === "link" ? (
                <button
                  type="button"
                  className={route === node.key ? "active" : ""}
                  onClick={() => navigate(node.key)}
                >
                  <span>{node.label}</span>
                </button>
              ) : (
                <details className="stage-nav" open={isGroupActive(node, route)}>
                  <summary>
                    <span>
                      <i />
                      {node.label}
                    </span>
                  </summary>
                  <div>
                    {node.children?.map((child) => {
                      const count = childCount(state, child);
                      return (
                        <button
                          key={child.key}
                          type="button"
                          className={route === child.key ? "active" : ""}
                          onClick={() => navigate(child.key)}
                        >
                          <span>{child.label}</span>
                          {count > 0 && <b>{count}</b>}
                        </button>
                      );
                    })}
                  </div>
                </details>
              )}
            </Fragment>
          ))}
        </nav>
        <button type="button" className="sidebar-user">
          <span className="user-avatar">{user.initials}</span>
          <span style={{ display: "grid", gap: "2px", minWidth: 0 }}>
            <strong>{user.name}</strong>
            <small>{user.roleLabel}</small>
          </span>
          <span aria-hidden>&rsaquo;</span>
        </button>
      </aside>

      {menuOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        />
      )}

      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="menu-button icon-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            &#9776;
          </button>
          <h1>{title}</h1>
          <div className="topbar-actions">
            <div className="role-preview">
              <span>Viewing as</span>
              <select
                value={role}
                onChange={(e) => onDispatch({ type: "SET_ROLE", role: e.target.value as RoleId })}
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="icon-button" aria-label="Notifications">
              &#128276;
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
        <nav className="mobile-erp-dock">
          <button
            type="button"
            className={route === "dashboard" ? "active" : ""}
            onClick={() => navigate("dashboard")}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={route === "teamwork" ? "active" : ""}
            onClick={() => navigate("teamwork")}
          >
            My Team&rsquo;s Work
          </button>
          <button
            type="button"
            className={route === flow.key ? "active" : ""}
            onClick={() => navigate(flow.key)}
          >
            {flow.label}
          </button>
        </nav>
      </div>
    </div>
  );
}
