import type { AppState, Action } from "../store";
import { avgTimeByStage, archiveForOutcome } from "../store";
import type { Stage, TaskType } from "../lib/stages";
import { STAGE_TO_TASK, TASK_TYPE_LABEL } from "../lib/stages";
import { MetricCard, Panel } from "../components/primitives";

interface DashboardProps {
  state: AppState;
  dispatch: (a: Action) => void;
  route: string;
}

const STAGE_ENTRIES = Object.entries(STAGE_TO_TASK) as [Stage, TaskType][];

function countInStage(state: AppState, stage: Stage): number {
  return state.housemaids.filter((h) => h.currentStage === stage).length;
}

export default function Dashboard({ state }: DashboardProps) {
  const toCC = archiveForOutcome(state, "RetractedToCC").length;
  const toMaidMatch = archiveForOutcome(state, "RetractedToMaidMatch").length;
  const toOffboard = archiveForOutcome(state, "MovedToOffboard").length;
  const enteredRetraction = toCC + toMaidMatch + toOffboard + countInStage(state, "PendingRetraction");

  const pendingPublishing = countInStage(state, "AvailablePendingPublishing");
  const published = countInStage(state, "AvailablePublished");
  const pendingShooting = countInStage(state, "PendingShooting");
  const pendingEditing = countInStage(state, "PendingEditing");

  const hired = archiveForOutcome(state, "Hired").length;
  const cancelled = archiveForOutcome(state, "Cancelled").length;
  const inPublishing = pendingPublishing + published + countInStage(state, "UnderTrial");
  const reachedPublishing = hired + cancelled + inPublishing;
  const successRatio = reachedPublishing > 0 ? (hired / reachedPublishing) * 100 : null;

  const avgByStage = avgTimeByStage(state);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Overview</span>
          <h1>Dashboard</h1>
          <p>Live KPIs across the retraction, production and publishing pipeline.</p>
        </div>
      </header>

      <div className="metrics-grid">
        <MetricCard label="Entered Retraction" value={enteredRetraction} sub="Routed into the retraction flow" />
        <MetricCard label="Retracted to CC" value={toCC} />
        <MetricCard label="Retracted to MaidMatch" value={toMaidMatch} />
        <MetricCard label="Moved to Offboard" value={toOffboard} />
        <MetricCard label="Available &amp; Pending Publishing" value={pendingPublishing} />
        <MetricCard label="Available &amp; Published" value={published} />
        <MetricCard label="Pending Shooting" value={pendingShooting} />
        <MetricCard label="Pending Editing" value={pendingEditing} />
      </div>

      <Panel>
        <div style={{ padding: "20px 22px" }}>
          <div className="panel-header">
            <div>
              <h2>Time in step</h2>
              <p>Average active hours per stage, measured over closed tasks.</p>
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            {STAGE_ENTRIES.map(([stage, taskType]) => (
              <div
                key={stage}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "11px 0",
                  borderTop: "1px solid var(--line)",
                }}
              >
                <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>
                  {TASK_TYPE_LABEL[taskType]}
                </span>
                <strong style={{ fontSize: 13 }}>{(avgByStage[stage] ?? 0).toFixed(1)}h</strong>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel>
        <div style={{ padding: "20px 22px" }}>
          <div className="panel-header">
            <div>
              <h2>Hiring funnel</h2>
              <p>Hired count and the share of maids that reached publishing.</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 40, marginTop: 16 }}>
            <div>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>Hired</span>
              <strong style={{ display: "block", fontSize: 24 }}>{hired}</strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>Success ratio</span>
              <strong style={{ display: "block", fontSize: 24 }}>
                {successRatio === null ? "—" : `${successRatio.toFixed(0)}%`}
              </strong>
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <div style={{ padding: "20px 22px" }}>
          <div className="panel-header">
            <div>
              <h2>Pipeline</h2>
              <p>Maids currently at each active stage.</p>
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            {STAGE_ENTRIES.map(([stage, taskType]) => (
              <div
                key={stage}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "11px 0",
                  borderTop: "1px solid var(--line)",
                }}
              >
                <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>
                  {TASK_TYPE_LABEL[taskType]}
                </span>
                <strong style={{ fontSize: 13 }}>{countInStage(state, stage)}</strong>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
