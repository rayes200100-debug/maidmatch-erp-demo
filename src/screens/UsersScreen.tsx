import { useState } from "react";
import { Search, ShieldCheck, Trash2, X } from "lucide-react";
import type { AppState, Action } from "../store";
import { ROLES, ROLE_ACCESS } from "../lib/roles";
import type { RoleId, NavKey } from "../lib/roles";
import { TASK_TYPE_LABEL } from "../lib/stages";
import type { TaskType } from "../lib/stages";
import { DataTable, Modal, Panel, StatusPill, Toast } from "../components/primitives";

interface UsersProps {
  state: AppState;
  dispatch: (a: Action) => void;
  route: string;
}

const ROLE_DESCRIPTIONS: Record<RoleId, string> = {
  sysadmin: "Full access to system settings, users and configuration.",
  superadmin: "Oversees every team and workflow end-to-end.",
  retractor: "Routes maids out of reception and through retraction.",
  media: "Shoots and edits each maid's profile media.",
  sales: "Publishes maids and manages trials.",
};

const NAV_LABELS: Record<NavKey, string> = {
  dashboard: "Dashboard",
  teamwork: "My Team's Work",
  reception: "Reception",
  directory: "Directory",
  retraction: "Retraction",
  media: "Media & Production",
  publishing: "Publishing",
  users: "Users & permissions",
  config: "System Configuration",
};

const SCREEN_DESCRIPTIONS: Record<NavKey, string> = {
  dashboard: "KPIs and pipeline overview.",
  teamwork: "Tasks assigned to this role.",
  reception: "Search and route incoming maids.",
  directory: "Browse and search every housemaid.",
  retraction: "Process and archive retractions.",
  media: "Shoot and edit profile media.",
  publishing: "Publish and manage trials.",
  users: "Manage team access and permissions.",
  config: "Change system parameters.",
};

const TASK_TYPES: TaskType[] = ["retraction", "shooting", "editing", "publishing", "available", "trial"];

function roleLabel(id: RoleId): string {
  return ROLES.find((r) => r.id === id)?.label ?? id;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function isAdminRole(id: RoleId): boolean {
  return id === "sysadmin" || id === "superadmin";
}

export default function UsersScreen({ state, dispatch }: UsersProps) {
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [selectedRole, setSelectedRole] = useState<RoleId>("sysadmin");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleId | "all">("all");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<RoleId[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2600);
  };

  const openInvite = () => {
    setName("");
    setEmail("");
    setRoles([]);
    setError(null);
    setOpen(true);
  };

  const toggleRole = (role: RoleId) => {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const submit = () => {
    if (!name.trim()) return setError("Name is required.");
    if (!email.trim()) return setError("Email is required.");
    dispatch({ type: "ADD_USER", user: { name: name.trim(), email: email.trim(), roles } });
    setOpen(false);
    showToast("User invited");
  };

  const deactivate = (userId: string) => {
    dispatch({ type: "DEACTIVATE_USER", userId });
    showToast("User deactivated");
  };

  const adminCount = state.users.filter((u) => u.roles.some(isAdminRole)).length;

  const filteredUsers = state.users.filter((u) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchesRole = roleFilter === "all" || u.roles.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  const userColumns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "roles", label: "Roles" },
    { key: "status", label: "Status" },
    { key: "actions", label: "" },
  ];

  const userRows = filteredUsers.map((user) => {
    const isLastAdmin = user.roles.some(isAdminRole) && adminCount <= 1;
    return (
      <div className="table-row" key={user.id}>
        <span className="person-cell">
          <span className="avatar avatar-sm">{initials(user.name)}</span>
          <span style={{ minWidth: 0 }}>
            <strong>{user.name}</strong>
          </span>
        </span>
        <span>
          <strong>{user.email}</strong>
        </span>
        <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {user.roles.map((role) => (
            <StatusPill key={role}>{roleLabel(role)}</StatusPill>
          ))}
        </span>
        <span>
          <StatusPill tone="success">Active</StatusPill>
        </span>
        <span style={{ display: "flex", justifyContent: "flex-end" }}>
          {isLastAdmin ? (
            <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--muted)", fontSize: 12 }}>
              <ShieldCheck size={14} /> Protected
            </span>
          ) : (
            <button type="button" className="danger-text-button" onClick={() => deactivate(user.id)} aria-label={`Deactivate ${user.name}`}>
              <Trash2 size={14} /> Deactivate
            </button>
          )}
        </span>
      </div>
    );
  });

  const roleDetail = ROLES.find((r) => r.id === selectedRole)!;
  const roleMembers = state.users.filter((u) => u.roles.includes(selectedRole));
  const screenAccess = ROLE_ACCESS[selectedRole];

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Users &amp; permissions</h1>
          <p>Who has access to the ERP, and what each role can do.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="primary-button" onClick={openInvite}>
            Invite user
          </button>
        </div>
      </header>

      <div className="tabs-row" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "users"} className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>
          Users <b>{state.users.length}</b>
        </button>
        <button type="button" role="tab" aria-selected={tab === "roles"} className={tab === "roles" ? "active" : ""} onClick={() => setTab("roles")}>
          Roles &amp; permissions <b>{ROLES.length}</b>
        </button>
      </div>

      {tab === "users" ? (
        <Panel className="flush">
          <div style={{ display: "flex", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--line)", alignItems: "center" }}>
            <div className="inline-search" style={{ flex: 1 }}>
              <Search size={16} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users" aria-label="Search users" />
              {search && (
                <button type="button" className="text-button" onClick={() => setSearch("")} aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleId | "all")}
              aria-label="Filter by role"
              style={{ height: 42, padding: "0 10px", border: "1px solid var(--line-strong)", borderRadius: 10, background: "#fff", fontSize: 13, color: "var(--ink-soft)" }}
            >
              <option value="all">All roles</option>
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <span style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>
              {filteredUsers.length} of {state.users.length}
            </span>
          </div>
          <div className="users-table">
            <DataTable columns={userColumns} rows={userRows} />
          </div>
        </Panel>
      ) : (
        <div className="roles-layout">
          <Panel className="flush">
            <div className="roles-rail" style={{ padding: 8 }}>
              {ROLES.map((role) => {
                const count = state.users.filter((u) => u.roles.includes(role.id)).length;
                return (
                  <button
                    key={role.id}
                    type="button"
                    className={selectedRole === role.id ? "active" : ""}
                    onClick={() => setSelectedRole(role.id)}
                  >
                    <span>
                      {role.label}
                      <small>
                        {isAdminRole(role.id) ? "Preset · admin" : "Preset"} · {count} {count === 1 ? "member" : "members"}
                      </small>
                    </span>
                    <b>{count}</b>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <div className="roles-detail">
              <div className="role-detail-head">
                <div>
                  <h2>{roleDetail.label}</h2>
                  <p>{ROLE_DESCRIPTIONS[selectedRole]}</p>
                </div>
                <StatusPill tone={isAdminRole(selectedRole) ? "warning" : "neutral"}>
                  {isAdminRole(selectedRole) ? "Admin" : "Team"}
                </StatusPill>
              </div>

              <div>
                <div className="panel-header" style={{ marginBottom: 10 }}>
                  <div>
                    <h2 style={{ fontSize: 14 }}>Screen access</h2>
                    <p>What this role can see and open.</p>
                  </div>
                </div>
                <div className="screen-access-grid">
                  {screenAccess.map((key) => (
                    <div className="access-card" key={key}>
                      <strong>{NAV_LABELS[key]}</strong>
                      <small>{SCREEN_DESCRIPTIONS[key]}</small>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="panel-header" style={{ marginBottom: 4 }}>
                  <div>
                    <h2 style={{ fontSize: 14 }}>Task ownership</h2>
                    <p>Queues this role receives by default.</p>
                  </div>
                </div>
                {TASK_TYPES.map((tt) => {
                  const owner = state.config.defaultRolePerTask[tt];
                  const isOwner = owner === selectedRole;
                  return (
                    <div className="task-owner-row" key={tt}>
                      <span>{TASK_TYPE_LABEL[tt]}</span>
                      <StatusPill tone={isOwner ? "success" : "neutral"}>{owner === "None" ? "None" : roleLabel(owner)}</StatusPill>
                    </div>
                  );
                })}
              </div>

              <div>
                <div className="panel-header" style={{ marginBottom: 10 }}>
                  <div>
                    <h2 style={{ fontSize: 14 }}>Members</h2>
                    <p>{roleMembers.length} user{roleMembers.length === 1 ? "" : "s"} hold this role.</p>
                  </div>
                </div>
                {roleMembers.length === 0 ? (
                  <small style={{ color: "var(--muted)" }}>No members yet.</small>
                ) : (
                  <div className="member-list">
                    {roleMembers.map((u) => (
                      <span className="member-chip" key={u.id}>
                        <span className="avatar avatar-sm">{initials(u.name)}</span>
                        {u.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </div>
      )}

      <Modal
        open={open}
        title="Invite user"
        subtitle="Invited via Google SSO — no password needed."
        onClose={() => setOpen(false)}
        actions={
          <>
            <button type="button" className="secondary-button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="primary-button" onClick={submit}>
              Invite
            </button>
          </>
        }
      >
        <div className="task-dynamic-fields">
          <label className="task-input-field">
            <span>
              Name <b>Required</b>
            </span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </label>
          <label className="task-input-field">
            <span>
              Email <b>Required</b>
            </span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@maidmatch.ae" />
          </label>
        </div>

        <div style={{ marginTop: 16 }}>
          <span style={{ display: "block", marginBottom: 10, color: "var(--ink-soft)", fontSize: 12, fontWeight: 800 }}>Roles</span>
          {ROLES.map((role) => (
            <label key={role.id} className="check-row" style={{ marginBottom: 8 }}>
              <input type="checkbox" checked={roles.includes(role.id)} onChange={() => toggleRole(role.id)} />
              <span>&#10003;</span>
              {role.label}
            </label>
          ))}
        </div>

        {error && (
          <div className="validation-summary" role="alert">
            {error}
          </div>
        )}
      </Modal>

      <Toast message={toast} tone="success" />
    </div>
  );
}
