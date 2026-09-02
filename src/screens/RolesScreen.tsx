import type { AppState, Action } from "../store";
import { ROLES } from "../lib/roles";
import type { RoleId } from "../lib/roles";
import { Panel } from "../components/primitives";

interface RolesProps {
  state: AppState;
  dispatch: (a: Action) => void;
  route: string;
}

const ROLE_DESCRIPTIONS: Record<RoleId, string> = {
  sysadmin: "Full access to system settings and configuration.",
  superadmin: "Oversees every team and workflow end-to-end.",
  retractor: "Routes maids out of reception and retraction.",
  media: "Shoots and edits each maid's profile media.",
  sales: "Publishes maids and manages trials.",
};

export default function RolesScreen({ state }: RolesProps) {
  return (
    <div className="page-stack">
      <style>{`
        .roles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
        .role-card { display: flex; flex-direction: column; gap: 8px; padding: 18px; border: 1px solid var(--line); border-radius: 14px; background: #fff; }
        .role-card h3 { margin: 0; font-size: 15px; letter-spacing: -.01em; }
        .role-card p { margin: 0; color: var(--muted); font-size: 12px; }
        .role-card .role-members { margin-top: 4px; }
      `}</style>

      <header className="page-header">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Roles</h1>
          <p>The five roles in MaidMatch and how many users hold each one.</p>
        </div>
      </header>

      <Panel>
        <div className="roles-grid">
          {ROLES.map((role) => {
            const count = state.users.filter((u) => u.roles.includes(role.id)).length;
            return (
              <div className="role-card" key={role.id}>
                <h3>{role.label}</h3>
                <p>{ROLE_DESCRIPTIONS[role.id]}</p>
                <span className="role-members">
                  <strong>{count}</strong> {count === 1 ? "member" : "members"}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
