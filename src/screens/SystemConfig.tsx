import type { AppState, Action } from "../store";
import { makeSeedState } from "../store";
import { HOUSEMAID_TYPE_OPTIONS, NATIONALITY_OPTIONS } from "../data";
import { ROLES } from "../lib/roles";
import type { RoleId } from "../lib/roles";
import { TASK_TYPE_LABEL } from "../lib/stages";
import type { TaskType } from "../lib/stages";
import type { PriorityAlgorithm } from "../lib/priority";
import { Panel } from "../components/primitives";

interface SystemConfigProps {
  state: AppState;
  dispatch: (a: Action) => void;
  route: string;
}

const PRIORITY_OPTIONS: { id: PriorityAlgorithm; label: string }[] = [
  { id: "FIFO", label: "FIFO" },
  { id: "LIFO", label: "LIFO" },
  { id: "FILIPINA", label: "Filipina" },
  { id: "GOLDEN", label: "Golden" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TASK_TYPE_ENTRIES = Object.entries(TASK_TYPE_LABEL) as [TaskType, string][];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toggleValue<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

const sectionLabel = {
  display: "block",
  marginBottom: 10,
  color: "var(--ink-soft)",
  fontSize: 12,
  fontWeight: 800,
} as const;

export default function SystemConfig({ state, dispatch }: SystemConfigProps) {
  const config = state.config;
  const gp = config.goldenProfile;
  const wh = config.workingHours;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>System Configuration</h1>
          <p>Global settings that shape retraction routing, golden profiles, and default task ownership.</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => dispatch({ type: "RESET", state: makeSeedState() })}
          >
            Reset demo data
          </button>
        </div>
      </header>

      <Panel>
          <div className="panel-header">
            <div>
              <h2>Breaks</h2>
              <p>How long a break lasts and how many per day.</p>
            </div>
          </div>
          <div className="task-dynamic-fields" style={{ marginTop: 16 }}>
            <label className="task-input-field">
              <span>Break duration (minutes)</span>
              <input
                type="number"
                value={config.breakDurationMinutes}
                onChange={(e) =>
                  dispatch({ type: "SET_CONFIG", patch: { breakDurationMinutes: Number(e.target.value) } })
                }
              />
            </label>
            <label className="task-input-field">
              <span>Max breaks per day</span>
              <input
                type="number"
                value={config.maxBreaksPerDay}
                onChange={(e) =>
                  dispatch({ type: "SET_CONFIG", patch: { maxBreaksPerDay: Number(e.target.value) } })
                }
              />
            </label>
          </div>
      </Panel>

      <Panel>
          <div className="panel-header">
            <div>
              <h2>Retraction Profile Priority Algorithm</h2>
              <p>How maids are ordered in the retraction queue.</p>
            </div>
          </div>
          <label className="task-input-field" style={{ marginTop: 16, maxWidth: 320 }}>
            <span>Priority algorithm</span>
            <select
              value={config.priorityAlgorithm}
              onChange={(e) =>
                dispatch({ type: "SET_CONFIG", patch: { priorityAlgorithm: e.target.value as PriorityAlgorithm } })
              }
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
      </Panel>

      <Panel>
          <div className="panel-header">
            <div>
              <h2>Golden Profile Definition</h2>
              <p>Criteria that mark a maid as a golden profile.</p>
            </div>
          </div>

          <div className="task-dynamic-fields" style={{ marginTop: 16 }}>
            <label className="task-input-field">
              <span>Age min</span>
              <input
                type="number"
                value={gp.ageMin}
                onChange={(e) =>
                  dispatch({ type: "SET_CONFIG", patch: { goldenProfile: { ...gp, ageMin: Number(e.target.value) } } })
                }
              />
            </label>
            <label className="task-input-field">
              <span>Age max</span>
              <input
                type="number"
                value={gp.ageMax}
                onChange={(e) =>
                  dispatch({ type: "SET_CONFIG", patch: { goldenProfile: { ...gp, ageMax: Number(e.target.value) } } })
                }
              />
            </label>
            <label className="task-input-field">
              <span>Visa expiry (min months)</span>
              <input
                type="number"
                value={gp.visaExpiryMonthsMin}
                onChange={(e) =>
                  dispatch({
                    type: "SET_CONFIG",
                    patch: { goldenProfile: { ...gp, visaExpiryMonthsMin: Number(e.target.value) } },
                  })
                }
              />
            </label>
            <label className="task-input-field">
              <span>Visa expiry (max months)</span>
              <input
                type="number"
                value={gp.visaExpiryMonthsMax}
                onChange={(e) =>
                  dispatch({
                    type: "SET_CONFIG",
                    patch: { goldenProfile: { ...gp, visaExpiryMonthsMax: Number(e.target.value) } },
                  })
                }
              />
            </label>
          </div>

          <div style={{ marginTop: 18 }}>
            <span style={sectionLabel}>Nationalities</span>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {NATIONALITY_OPTIONS.map((n) => (
                <label key={n} className="check-row" style={{ marginRight: 16, marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={gp.nationalities.includes(n)}
                    onChange={() =>
                      dispatch({
                        type: "SET_CONFIG",
                        patch: { goldenProfile: { ...gp, nationalities: toggleValue(gp.nationalities, n) } },
                      })
                    }
                  />
                  <span>&#10003;</span>
                  {n}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <span style={sectionLabel}>Housemaid type</span>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {HOUSEMAID_TYPE_OPTIONS.map((t) => (
                <label key={t} className="check-row" style={{ marginRight: 16, marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={gp.housemaidTypes.includes(t)}
                    onChange={() =>
                      dispatch({
                        type: "SET_CONFIG",
                        patch: { goldenProfile: { ...gp, housemaidTypes: toggleValue(gp.housemaidTypes, t) } },
                      })
                    }
                  />
                  <span>&#10003;</span>
                  {t}
                </label>
              ))}
            </div>
          </div>
      </Panel>

      <Panel>
          <div className="panel-header">
            <div>
              <h2>Working hours</h2>
              <p>Active hours and days off used to compute time-in-step.</p>
            </div>
          </div>

          <div className="task-dynamic-fields" style={{ marginTop: 16 }}>
            <label className="task-input-field">
              <span>Start hour</span>
              <select
                value={wh.startHour}
                onChange={(e) =>
                  dispatch({
                    type: "SET_CONFIG",
                    patch: { workingHours: { ...wh, startHour: Number(e.target.value) } },
                  })
                }
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {pad(h)}:00
                  </option>
                ))}
              </select>
            </label>
            <label className="task-input-field">
              <span>End hour</span>
              <select
                value={wh.endHour}
                onChange={(e) =>
                  dispatch({
                    type: "SET_CONFIG",
                    patch: { workingHours: { ...wh, endHour: Number(e.target.value) } },
                  })
                }
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {pad(h)}:00
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ marginTop: 18 }}>
            <span style={sectionLabel}>Days off</span>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {DAY_LABELS.map((label, i) => (
                <label key={label} className="check-row" style={{ marginRight: 16, marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={config.daysOff.includes(i)}
                    onChange={() =>
                      dispatch({ type: "SET_CONFIG", patch: { daysOff: toggleValue(config.daysOff, i) } })
                    }
                  />
                  <span>&#10003;</span>
                  {label}
                </label>
              ))}
            </div>
          </div>
      </Panel>

      <Panel>
          <div className="panel-header">
            <div>
              <h2>Default Assigned Role per Task</h2>
              <p>The role a new task is assigned to by default. Choose None to leave tasks unassigned.</p>
            </div>
          </div>
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {TASK_TYPE_ENTRIES.map(([taskType, label]) => (
              <div
                key={taskType}
                style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 260px", gap: 14, alignItems: "center" }}
              >
                <span style={{ color: "var(--ink-soft)", fontSize: 12, fontWeight: 700 }}>{label}</span>
                <select
                  value={config.defaultRolePerTask[taskType]}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_CONFIG",
                      patch: {
                        defaultRolePerTask: {
                          ...config.defaultRolePerTask,
                          [taskType]: e.target.value as RoleId | "None",
                        },
                      },
                    })
                  }
                  style={{
                    width: "100%",
                    minHeight: 43,
                    padding: "0 11px",
                    border: "1px solid var(--line-strong)",
                    borderRadius: 10,
                    color: "var(--ink)",
                    background: "#fff",
                    fontSize: 12,
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                  <option value="None">None</option>
                </select>
              </div>
            ))}
          </div>
      </Panel>
    </div>
  );
}
