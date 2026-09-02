import {
  ArrowLeftRight,
  Briefcase,
  Camera,
  CheckCircle2,
  Globe,
  LogOut,
  Scissors,
  TrendingUp,
  XCircle,
} from "lucide-react";
import type { AppState, Action } from "../store";
import { avgTimeByStage, archiveForOutcome, openTasks } from "../store";
import type { Stage, TaskType } from "../lib/stages";
import { STAGE_TO_TASK, TASK_TYPE_LABEL } from "../lib/stages";
import { ROLES } from "../lib/roles";
import { MetricCard, Panel } from "../components/primitives";

interface DashboardProps {
  state: AppState;
  dispatch: (a: Action) => void;
  route: string;
  onNavigate: (key: string) => void;
}

const STAGE_ENTRIES = Object.entries(STAGE_TO_TASK) as [Stage, TaskType][];

function countInStage(state: AppState, stage: Stage): number {
  return state.housemaids.filter((h) => h.currentStage === stage).length;
}

export default function Dashboard({ state, onNavigate }: DashboardProps) {
  const toCC = archiveForOutcome(state, "RetractedToCC").length;
  const toMaidMatch = archiveForOutcome(state, "RetractedToMaidMatch").length;
  const toOffboard = archiveForOutcome(state, "MovedToOffboard").length;
  const enteredRetraction = state.housemaids.filter((h) => h.currentStage !== "Reception").length;

  const pendingPublishing = countInStage(state, "AvailablePendingPublishing");
  const published = countInStage(state, "AvailablePublished");
  const pendingShooting = countInStage(state, "PendingShooting");
  const pendingEditing = countInStage(state, "PendingEditing");

  const hired = archiveForOutcome(state, "Hired").length;
  const cancelled = archiveForOutcome(state, "Cancelled").length;
  const underTrial = countInStage(state, "UnderTrial");
  const reachedPublishing = hired + cancelled + pendingPublishing + published + underTrial;
  const successRatio = reachedPublishing > 0 ? (hired / reachedPublishing) * 100 : null;

  const avgByStage = avgTimeByStage(state);
  const hasClosedTasks = state.tasks.some((t) => t.closedAt != null);
  const openTaskCount = openTasks(state).length;

  const roleLabel = ROLES.find((r) => r.id === state.currentRole)?.label ?? state.currentRole;
  const currentUser = state.users.find((u) => u.roles.includes(state.currentRole));
  const displayName = currentUser?.name ?? roleLabel;

  const maxStage = Math.max(1, ...STAGE_ENTRIES.map(([s]) => countInStage(state, s)));

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </span>
          <h1>Good morning, {displayName.split(" ")[0]}</h1>
          <p>Live KPIs across the retraction, production and publishing pipeline.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="primary-button" onClick={() => onNavigate("teamwork")}>
            Open team work
          </button>
        </div>
      </header>

      <div className="attention-strip">
        <span className="pulse-dot" />
        <div>
          <strong>{openTaskCount} open tasks across teams</strong>
          <p>Open tasks need ownership before maids stall in a stage.</p>
        </div>
        <button type="button" className="text-button" onClick={() => onNavigate("teamwork")}>
          Review now &rarr;
        </button>
      </div>

      <div className="metrics-grid">
        <MetricCard label="Entered Retraction" value={enteredRetraction} sub="Routed into the retraction flow" tone="brand" icon={<ArrowLeftRight size={17} />} />
        <MetricCard label="Retracted to CC" value={toCC} sub="Switched back to CC" tone="neutral" icon={<XCircle size={17} />} />
        <MetricCard label="Retracted to MaidMatch" value={toMaidMatch} sub="Handed off to Media" tone="brand" icon={<CheckCircle2 size={17} />} />
        <MetricCard label="Moved to Offboard" value={toOffboard} sub="Removed from the flow" tone="rose" icon={<LogOut size={17} />} />
        <MetricCard label="Pending Publishing" value={pendingPublishing} sub="Awaiting platform uploads" tone="info" icon={<Globe size={17} />} />
        <MetricCard label="Available &amp; Published" value={published} sub="Live and listed" tone="brand" icon={<CheckCircle2 size={17} />} />
        <MetricCard label="Pending Shooting" value={pendingShooting} sub="Awaiting media shoot" tone="amber" icon={<Camera size={17} />} />
        <MetricCard label="Pending Editing" value={pendingEditing} sub="Awaiting final media" tone="amber" icon={<Scissors size={17} />} />
      </div>

      <Panel>
        <div className="panel-header">
          <div>
            <h2>Pipeline</h2>
            <p>Maids currently at each active stage.</p>
          </div>
        </div>
        <div className="pipeline-bars">
          {STAGE_ENTRIES.map(([stage, taskType]) => {
            const count = countInStage(state, stage);
            return (
              <div className="pipeline-row" key={stage}>
                <span>{TASK_TYPE_LABEL[taskType]}</span>
                <div>
                  <i style={{ width: `${Math.round((count / maxStage) * 100)}%` }} />
                </div>
                <strong>{count}</strong>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <div className="panel-header">
          <div>
            <h2>Hiring funnel</h2>
            <p>How trials are resolving.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 32, marginTop: 16, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 32 }}>
            <div>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 12 }}>
                <Briefcase size={14} /> Hired
              </span>
              <strong style={{ display: "block", fontSize: 24 }}>{hired}</strong>
            </div>
            <div>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 12 }}>
                <TrendingUp size={14} /> Success ratio
              </span>
              <strong style={{ display: "block", fontSize: 24 }}>
                {successRatio === null ? "—" : `${successRatio.toFixed(0)}%`}
              </strong>
            </div>
          </div>
          <div style={{ flex: 1, display: "grid", gap: 8, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
              <span>Under trial</span>
              <strong style={{ color: "var(--ink)" }}>{underTrial}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
              <span>Cancelled</span>
              <strong style={{ color: "var(--ink)" }}>{cancelled}</strong>
            </div>
            <div style={{ height: 8, display: "flex", overflow: "hidden", borderRadius: 99, background: "var(--line)" }}>
              <i style={{ width: `${hired ? Math.round((hired / Math.max(1, reachedPublishing)) * 100) : 0}%`, background: "var(--success)" }} />
              <i style={{ width: `${cancelled ? Math.round((cancelled / Math.max(1, reachedPublishing)) * 100) : 0}%`, background: "var(--danger)" }} />
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="panel-header">
          <div>
            <h2>Time in step</h2>
            <p>Average active hours per stage, measured over closed tasks.</p>
          </div>
        </div>
        <div style={{ marginTop: 6 }}>
          {!hasClosedTasks ? (
            <div style={{ padding: "14px 0 4px", color: "var(--muted)", fontSize: 13, lineHeight: 1.55 }}>
              No completed tasks yet — averages appear once the first task closes.
            </div>
          ) : (
            STAGE_ENTRIES.map(([stage, taskType]) => (
              <div key={stage} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderTop: "1px solid var(--line)" }}>
                <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>{TASK_TYPE_LABEL[taskType]}</span>
                <strong style={{ fontSize: 13 }}>{(avgByStage[stage] ?? 0).toFixed(1)}h</strong>
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
