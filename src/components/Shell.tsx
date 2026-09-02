import { Fragment, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Bell, Search } from "lucide-react";
import type { AppState, Action } from "../store";
import { openTasks, archiveForOutcome } from "../store";
import type { RoleId, NavKey } from "../lib/roles";
import { ROLES, visibleNav } from "../lib/roles";
import type { NavNode, Stage, OutcomeType, TaskType } from "../lib/stages";
import { NAV_TREE, queueTaskType, TASK_TYPE_LABEL } from "../lib/stages";
import { StatusPill } from "./primitives";

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
  return { name, roleLabel, initials: initials(name) };
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const TASK_TYPE_ROUTE: Record<TaskType, string> = {
  retraction: "PendingRetraction",
  shooting: "PendingShooting",
  editing: "PendingEditing",
  publishing: "AvailablePendingPublishing",
  available: "AvailablePublished",
  trial: "UnderTrial",
};

const STAGE_LABELS: Record<Stage, string> = {
  Reception: "Reception",
  PendingRetraction: "Pending Retraction",
  PendingShooting: "Pending Shooting",
  PendingEditing: "Pending Editing",
  AvailablePendingPublishing: "Available Pending Publishing",
  AvailablePublished: "Available & Published",
  UnderTrial: "Under Trial",
  RetractedToCC: "Retracted to CC",
  MovedToOffboard: "Moved to Offboard",
  Hired: "Hired",
  Cancelled: "Cancelled",
};

function stageRoute(stage: Stage): string {
  return stage === "Reception" ? "reception" : stage;
}

export function Shell({ state, route, onNavigate, onDispatch, children }: ShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const node of NAV_TREE) {
      if (node.kind === "group" && isGroupActive(node, route)) initial.add(node.key);
    }
    return initial;
  });
  const role = state.currentRole;
  const nodes = NAV_TREE.filter((n) => visibleNav(role).includes(n.key as NavKey));
  const title = titleFor(route);
  const flow = primaryFlow(state);
  const user = sidebarUser(state);
  const openByType = (Object.keys(TASK_TYPE_ROUTE) as TaskType[])
    .map((tt) => ({ type: tt, count: openTasks(state, tt).length }))
    .filter((x) => x.count > 0);
  const totalOpen = openByType.reduce((acc, x) => acc + x.count, 0);

  const q = query.trim().toLowerCase();
  const searchMatches = q
    ? state.housemaids
        .filter(
          (h) =>
            h.name.toLowerCase().includes(q) ||
            h.nationality.toLowerCase().includes(q) ||
            h.mobile.toLowerCase().includes(q) ||
            h.whatsapp.toLowerCase().includes(q) ||
            h.maidsCcId.toLowerCase().includes(q)
        )
        .slice(0, 8)
    : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
                <details
                  className="stage-nav"
                  open={openGroups.has(node.key)}
                  onToggle={(e) => {
                    const open = e.currentTarget.open;
                    setOpenGroups((prev) => {
                      const next = new Set(prev);
                      if (open) next.add(node.key);
                      else next.delete(node.key);
                      return next;
                    });
                  }}
                >
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
        <div className="sidebar-user">
          <span className="user-avatar">{user.initials}</span>
          <span style={{ display: "grid", gap: "2px", minWidth: 0 }}>
            <strong>{user.name}</strong>
            <small>{user.roleLabel}</small>
          </span>
        </div>
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
          <div className="global-search">
            <Search size={15} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder="Search maids…"
              aria-label="Global search"
            />
            {!query && <kbd>⌘K</kbd>}
            {query && searchOpen && (
              <div className="global-search-results">
                <header>
                  Housemaids <span>{searchMatches.length}</span>
                </header>
                {searchMatches.length === 0 ? (
                  <div className="global-search-empty">No maids match “{query}”.</div>
                ) : (
                  searchMatches.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      className="global-search-result"
                      onMouseDown={() => {
                        setQuery("");
                        setSearchOpen(false);
                        navigate(stageRoute(h.currentStage));
                      }}
                    >
                      <span className="avatar avatar-sm">{initials(h.name)}</span>
                      <span className="gs-main">
                        <strong>{h.name}</strong>
                        <small>
                          {h.nationality} · {STAGE_LABELS[h.currentStage]}
                        </small>
                      </span>
                      <StatusPill tone="neutral">{STAGE_LABELS[h.currentStage]}</StatusPill>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
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
            <div className="notification-wrap">
              <button
                type="button"
                className="icon-button"
                aria-label="Notifications"
                aria-expanded={notifOpen}
                onClick={() => setNotifOpen((o) => !o)}
              >
                <Bell size={18} />
                {totalOpen > 0 && <i className="unread-dot" />}
              </button>
              {notifOpen && (
                <div className="notif-panel" role="menu">
                  <header>Open work</header>
                  {openByType.length === 0 ? (
                    <p>No open tasks.</p>
                  ) : (
                    openByType.map((x) => (
                      <button
                        key={x.type}
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          navigate(TASK_TYPE_ROUTE[x.type]);
                        }}
                      >
                        <span>{TASK_TYPE_LABEL[x.type]}</span>
                        <b>{x.count}</b>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
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
