import { useState } from "react";
import type { AppState, Action } from "../store";
import { ROLES } from "../lib/roles";
import type { RoleId } from "../lib/roles";
import { DataTable, Modal, Panel, StatusPill, Toast } from "../components/primitives";

interface UsersProps {
  state: AppState;
  dispatch: (a: Action) => void;
  route: string;
}

const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.id, r.label]));

const columns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "roles", label: "Roles" },
];

function roleLabel(id: RoleId): string {
  return ROLE_LABEL[id] ?? id;
}

export default function UsersScreen({ state, dispatch }: UsersProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<RoleId[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const rows = state.users.map((user) => (
    <div className="table-row" key={user.id}>
      <span className="person-cell">
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
    </div>
  ));

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
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    dispatch({ type: "ADD_USER", user: { name: name.trim(), email: email.trim(), roles } });
    setOpen(false);
    setToast("User invited");
    window.setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="page-stack">
      <style>{`
        .users-table .table-row { grid-template-columns: 1.3fr 1.7fr 1.4fr; }
      `}</style>

      <header className="page-header">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Users</h1>
          <p>Everyone with access to the ERP, and the roles they hold.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="primary-button" onClick={openInvite}>
            Invite user
          </button>
        </div>
      </header>

      <Panel>
        <div className="users-table">
          <DataTable columns={columns} rows={rows} />
        </div>
      </Panel>

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
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </label>
          <label className="task-input-field">
            <span>Email (required)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@maidmatch.ae"
            />
          </label>
        </div>

        <div style={{ marginTop: 16 }}>
          <span style={{ display: "block", marginBottom: 10, color: "var(--ink-soft)", fontSize: 12, fontWeight: 800 }}>
            Roles
          </span>
          {ROLES.map((role) => (
            <label key={role.id} className="check-row" style={{ marginBottom: 8 }}>
              <input type="checkbox" checked={roles.includes(role.id)} onChange={() => toggleRole(role.id)} />
              <span>&#10003;</span>
              {role.label}
            </label>
          ))}
        </div>

        {error && <div className="validation-summary">{error}</div>}
      </Modal>

      <Toast message={toast} tone="success" />
    </div>
  );
}
