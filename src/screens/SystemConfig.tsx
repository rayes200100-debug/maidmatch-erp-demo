import { useEffect, useRef, useState } from "react";
import type { AppState, Action } from "../store";
import { makeSeedState } from "../store";
import { HOUSEMAID_TYPE_OPTIONS, NATIONALITY_OPTIONS } from "../data";
import { ROLES } from "../lib/roles";
import type { RoleId } from "../lib/roles";
import { TASK_TYPE_LABEL } from "../lib/stages";
import type { TaskType } from "../lib/stages";
import type { PriorityAlgorithm } from "../lib/priority";
import { Panel, Toast } from "../components/primitives";

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
  const [toast, setToast] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [newReason, setNewReason] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const prevConfig = useRef(config);

  useEffect(() => {
    if (prevConfig.current !== config) {
      prevConfig.current = config;
      setToast("Changes saved");
      window.setTimeout(() => setToast(null), 1800);
    }
  }, [config]);

  const resetDemo = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      window.setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    dispatch({ type: "RESET", state: makeSeedState() });
    setConfirmReset(false);
    setToast("Demo data reset");
    window.setTimeout(() => setToast(null), 1800);
  };

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
            className={confirmReset ? "danger-button solid" : "secondary-button"}
            onClick={resetDemo}
          >
            {confirmReset ? "Click again to confirm" : "Reset demo data"}
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
          <div style={{ marginTop: 16 }}>
            <span style={sectionLabel}>Priority rules (layered on the base order)</span>
            <label className="check-row" style={{ marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={config.liveInPriority}
                onChange={() =>
                  dispatch({ type: "SET_CONFIG", patch: { liveInPriority: !config.liveInPriority } })
                }
              />
              <span>&#10003;</span>
              Live-in priority — CC live-in maids jump ahead of the queue
            </label>
            <small style={{ color: "var(--muted)", fontSize: 12 }}>
              The retractor sees only the resulting order, never the algorithm. Other rules (LIFO, Filipina first,
              golden profiles first) live here and can be layered later.
            </small>
          </div>
      </Panel>

      <Panel>
          <div className="panel-header">
            <div>
              <h2>Termination reasons</h2>
              <p>The reasons a retractor can choose at the retraction desk. Rename or retire them without a release.</p>
            </div>
          </div>
          <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
            {config.terminationReasons.map((r) => (
              <div key={r} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 9 }}>
                {renaming === r ? (
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    style={{ flex: 1, minHeight: 36, padding: "0 10px", border: "1px solid var(--line-strong)", borderRadius: 8, fontSize: 13, color: "var(--ink)" }}
                  />
                ) : (
                  <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{r}</span>
                )}
                <span style={{ display: "flex", gap: 8 }}>
                  {renaming === r ? (
                    <>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          const v = renameValue.trim();
                          if (v && v !== r && !config.terminationReasons.includes(v)) {
                            dispatch({ type: "SET_CONFIG", patch: { terminationReasons: config.terminationReasons.map((x) => (x === r ? v : x)) } });
                          }
                          setRenaming(null);
                          setRenameValue("");
                        }}
                      >
                        Save
                      </button>
                      <button type="button" className="text-button" onClick={() => { setRenaming(null); setRenameValue(""); }}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => { setRenaming(r); setRenameValue(r); }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => dispatch({
                          type: "SET_CONFIG",
                          patch: {
                            terminationReasons: config.terminationReasons.filter((x) => x !== r),
                            retiredTerminationReasons: [...config.retiredTerminationReasons, r],
                          },
                        })}
                      >
                        Retire
                      </button>
                    </>
                  )}
                </span>
              </div>
            ))}
            {config.retiredTerminationReasons.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <span style={sectionLabel}>Retired</span>
                {config.retiredTerminationReasons.map((r) => (
                  <div key={r} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "6px 12px", border: "1px dashed var(--line)", borderRadius: 9 }}>
                    <span style={{ fontSize: 13, color: "var(--muted)", textDecoration: "line-through" }}>{r}</span>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => dispatch({
                        type: "SET_CONFIG",
                        patch: {
                          terminationReasons: [...config.terminationReasons, r],
                          retiredTerminationReasons: config.retiredTerminationReasons.filter((x) => x !== r),
                        },
                      })}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Add a reason…"
                style={{ flex: 1, minHeight: 40, padding: "0 11px", border: "1px solid var(--line-strong)", borderRadius: 9, fontSize: 13, color: "var(--ink)" }}
              />
              <button
                type="button"
                className="secondary-button small"
                onClick={() => {
                  const r = newReason.trim();
                  if (!r || config.terminationReasons.includes(r) || config.retiredTerminationReasons.includes(r)) return;
                  dispatch({ type: "SET_CONFIG", patch: { terminationReasons: [...config.terminationReasons, r] } });
                  setNewReason("");
                }}
              >
                Add
              </button>
            </div>
          </div>
      </Panel>

      <Panel>
          <div className="panel-header">
            <div>
              <h2>ERP integration settings</h2>
              <p>The maids.cc complaint type and handling team the system pre-fills per outcome.</p>
            </div>
          </div>
          <div className="task-dynamic-fields" style={{ marginTop: 16 }}>
            <label className="task-input-field">
              <span>Offboarding — complaint type</span>
              <input
                value={config.erpIntegrations.offboarding.complaintType}
                onChange={(e) =>
                  dispatch({ type: "SET_CONFIG", patch: { erpIntegrations: { ...config.erpIntegrations, offboarding: { ...config.erpIntegrations.offboarding, complaintType: e.target.value } } } })
                }
              />
            </label>
            <label className="task-input-field">
              <span>Offboarding — handling team</span>
              <input
                value={config.erpIntegrations.offboarding.handlingTeam}
                onChange={(e) =>
                  dispatch({ type: "SET_CONFIG", patch: { erpIntegrations: { ...config.erpIntegrations, offboarding: { ...config.erpIntegrations.offboarding, handlingTeam: e.target.value } } } })
                }
              />
            </label>
            <label className="task-input-field">
              <span>Payroll — complaint type</span>
              <input
                value={config.erpIntegrations.payroll.complaintType}
                onChange={(e) =>
                  dispatch({ type: "SET_CONFIG", patch: { erpIntegrations: { ...config.erpIntegrations, payroll: { ...config.erpIntegrations.payroll, complaintType: e.target.value } } } })
                }
              />
            </label>
            <label className="task-input-field">
              <span>Payroll — handling team</span>
              <input
                value={config.erpIntegrations.payroll.handlingTeam}
                onChange={(e) =>
                  dispatch({ type: "SET_CONFIG", patch: { erpIntegrations: { ...config.erpIntegrations, payroll: { ...config.erpIntegrations.payroll, handlingTeam: e.target.value } } } })
                }
              />
            </label>
          </div>
      </Panel>

      <Panel>
          <div className="panel-header">
            <div>
              <h2>Golden Profile Definition</h2>
              <p>Criteria that mark a maid as a golden profile — current working definition: Filipina, under 45.</p>
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

      <Toast message={toast} tone="success" />
    </div>
  );
}
