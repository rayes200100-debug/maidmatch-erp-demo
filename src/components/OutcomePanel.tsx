import { useState } from "react";
import {
  ArrowLeftRight,
  Briefcase,
  Camera,
  Check,
  ClipboardCheck,
  Clock,
  Globe,
  Info,
  Scissors,
  Users,
} from "lucide-react";
import type { Housemaid, Task } from "../data";
import { PREFERENCE_DEFS, PREFERENCE_GROUPS, preferenceLabel } from "../data";
import type { Action } from "../store";
import type { RoleId } from "../lib/roles";
import { ROLES } from "../lib/roles";
import { PLATFORMS, TASK_TYPE_LABEL } from "../lib/stages";
import type { Platform, TaskType } from "../lib/stages";
import { StatusPill, Toast } from "./primitives";

export interface OutcomePanelProps {
  task: Task;
  maid: Housemaid;
  onAction: (action: Action) => void;
}

type EffectTone = "positive" | "warning" | "negative" | "neutral";

interface OutcomeDef {
  key: string;
  label: string;
  negative?: boolean;
  effect: { tone: EffectTone; title: string; body: string };
}

const OUTCOMES: Record<TaskType, OutcomeDef[]> = {
  retraction: [
    { key: "retractToCC", label: "Retract to CC", effect: { tone: "neutral", title: "Maid moves to Retracted to CC (terminal).", body: "Closes the retraction task and archives the case." } },
    { key: "moveToOffboard", label: "Move to Offboarding", negative: true, effect: { tone: "negative", title: "Maid moves to Moved to Offboard (terminal).", body: "Closes the retraction task and archives the case." } },
    { key: "retractToMaidMatch", label: "Retract to MaidMatch", effect: { tone: "positive", title: "Opens a Pending Shooting task.", body: "Records the retraction and hands the profile off to Media." } },
  ],
  shooting: [
    { key: "doneShooting", label: "Done shooting", effect: { tone: "positive", title: "Maid moves to Pending Editing.", body: "The stock media URLs carry over to editing." } },
  ],
  editing: [
    { key: "editingDone", label: "Editing done", effect: { tone: "positive", title: "Records Production Done and opens a publishing task.", body: "Maid moves to Available Pending Publishing for Sales." } },
    { key: "sendBackToShooting", label: "Send back to shooting", effect: { tone: "warning", title: "Reopens a shooting task.", body: "Editing work is discarded. Add a note so the shooter knows why." } },
  ],
  publishing: [],
  available: [
    { key: "underTrial", label: "Under trial", effect: { tone: "positive", title: "Maid moves to Under Trial.", body: "Record the employer to track the live trial." } },
  ],
  trial: [
    { key: "hired", label: "Hired", effect: { tone: "positive", title: "Maid moves to Hired (terminal).", body: "Records the successful placement." } },
    { key: "sendBackPublished", label: "Send back to Available & Published", effect: { tone: "warning", title: "Returns to Available & Published.", body: "The trial is reopened and the maid is re-listed." } },
    { key: "sendBackPendingPublishing", label: "Send back to Available & Pending Publishing", effect: { tone: "warning", title: "Returns to Available Pending Publishing.", body: "The maid re-enters the publishing queue." } },
    { key: "cancel", label: "Proceed to cancellation", negative: true, effect: { tone: "negative", title: "Maid moves to Cancelled (terminal).", body: "Records the cancellation with a reason." } },
  ],
};

const TASK_ICON: Record<TaskType, typeof ArrowLeftRight> = {
  retraction: ArrowLeftRight,
  shooting: Camera,
  editing: Scissors,
  publishing: Globe,
  available: Briefcase,
  trial: ClipboardCheck,
};

const DESCRIPTION: Record<TaskType, string> = {
  retraction: "Choose where this maid goes next.",
  shooting: "Confirm the shoot is complete.",
  editing: "Deliver final media or send back for a reshoot.",
  publishing: "Flag each platform to publish. Auto-publishes once all three are green.",
  available: "Move the maid under trial with an employer.",
  trial: "Record the trial outcome.",
};

const PLATFORM_LABEL: Record<Platform, string> = {
  maidmatch: "MaidMatch",
  peekaboo: "Peekaboo",
  yaya: "Yaya",
};

function roleLabel(id: string): string {
  return ROLES.find((r) => r.id === id)?.label ?? id;
}

function duration(ms: number): string {
  const mins = Math.max(1, Math.floor(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function OutcomePanel({ task, maid, onAction }: OutcomePanelProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [stockPhotoUrl, setStockPhotoUrl] = useState("");
  const [stockVideoUrl, setStockVideoUrl] = useState("");
  const [finalPhoto, setFinalPhoto] = useState("");
  const [finalVideo, setFinalVideo] = useState("");
  const [videoMode, setVideoMode] = useState<"link" | "file">("link");
  const [comment, setComment] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [profileLink, setProfileLink] = useState("");
  const [reason, setReason] = useState("");
  const [prefs, setPrefs] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const actor: RoleId = task.assignedRole === "None" ? "sysadmin" : task.assignedRole;
  const outcome = OUTCOMES[task.type].find((o) => o.key === selected);
  const Icon = TASK_ICON[task.type];

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  function currentErrors(): string[] {
    switch (selected) {
      case "retractToMaidMatch":
        return prefs.length === 0 ? ["Select at least one preference"] : [];
      case "editingDone":
        return finalPhoto.trim() ? [] : ["Final photo"];
      case "cancel":
        return reason.trim() ? [] : ["Cancellation reason"];
      default:
        return [];
    }
  }

  function reset() {
    setSelected(null);
    setStockPhotoUrl("");
    setStockVideoUrl("");
    setFinalPhoto("");
    setFinalVideo("");
    setComment("");
    setEmployerName("");
    setProfileLink("");
    setReason("");
    setPrefs([]);
    setTouched(false);
  }

  function select(key: string) {
    setSelected(key);
    setTouched(false);
  }

  function togglePref(value: string, exclusive?: "live") {
    setPrefs((prev) => {
      if (exclusive === "live") {
        const liveValues = PREFERENCE_DEFS.filter((d) => d.exclusive === "live").map((d) => d.value);
        if (prev.includes(value)) return prev.filter((p) => p !== value);
        return [...prev.filter((p) => !liveValues.includes(p)), value];
      }
      return prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value];
    });
  }

  function togglePlatformFlag(platform: Platform) {
    const green = task.metadata?.publishState?.[platform] ?? false;
    onAction({ type: green ? "UNFLAG_PLATFORM" : "FLAG_PLATFORM", housemaidId: maid.id, platform, now: Date.now() });
    showToast(green ? `Unpublished ${PLATFORM_LABEL[platform]}` : `Published to ${PLATFORM_LABEL[platform]}`);
  }

  function handleConfirm() {
    const errors = currentErrors();
    if (errors.length > 0) {
      setTouched(true);
      return;
    }
    const now = Date.now();
    switch (selected) {
      case "retractToCC":
        onAction({ type: "RETRACT_TO_CC", housemaidId: maid.id, actor, now });
        showToast("Retracted to CC");
        break;
      case "moveToOffboard":
        onAction({ type: "MOVE_TO_OFFBOARD", housemaidId: maid.id, actor, now });
        showToast("Moved to Offboarding");
        break;
      case "retractToMaidMatch":
        onAction({ type: "RETRACT_TO_MAIDMATCH", housemaidId: maid.id, actor, now, preferences: prefs });
        showToast("Retracted to MaidMatch");
        break;
      case "doneShooting":
        onAction({ type: "DONE_SHOOTING", housemaidId: maid.id, actor, now, stockPhotoUrl: stockPhotoUrl.trim() || undefined, stockVideoUrl: stockVideoUrl.trim() || undefined });
        showToast("Shooting marked done");
        break;
      case "editingDone":
        onAction({ type: "EDITING_DONE", housemaidId: maid.id, actor, now, finalPhoto: finalPhoto.trim(), finalVideo: finalVideo.trim() || undefined });
        showToast("Editing done");
        break;
      case "sendBackToShooting":
        onAction({ type: "SEND_BACK_TO_SHOOTING", housemaidId: maid.id, actor, now, comment: comment.trim() || undefined });
        showToast("Sent back to shooting");
        break;
      case "underTrial":
        onAction({ type: "UNDER_TRIAL", housemaidId: maid.id, actor, now, employerName: employerName.trim() || undefined, maidsCcProfileLink: profileLink.trim() || undefined });
        showToast("Moved under trial");
        break;
      case "hired":
        onAction({ type: "HIRED", housemaidId: maid.id, actor, now });
        showToast("Hired");
        break;
      case "sendBackPublished":
        onAction({ type: "SEND_BACK_TO_PUBLISHED", housemaidId: maid.id, actor, now });
        showToast("Sent back to Available & Published");
        break;
      case "sendBackPendingPublishing":
        onAction({ type: "SEND_BACK_TO_PENDING_PUBLISHING", housemaidId: maid.id, actor, now });
        showToast("Sent back to Pending Publishing");
        break;
      case "cancel":
        onAction({ type: "CANCEL", housemaidId: maid.id, actor, now, reason: reason.trim() });
        showToast("Cancelled");
        break;
      default:
        return;
    }
    reset();
  }

  function field(label: string, required: boolean, control: React.ReactNode, wide = false) {
    return (
      <label className={`task-input-field${wide ? " wide" : ""}`}>
        <span>
          {label}
          {required && <b>Required</b>}
        </span>
        {control}
      </label>
    );
  }

  function dynamicFields(): React.ReactNode {
    switch (selected) {
      case "retractToMaidMatch": {
        const byGroup = PREFERENCE_GROUPS.map((g) => ({
          group: g,
          defs: PREFERENCE_DEFS.filter((d) => d.group === g),
        }));
        return (
          <div className="pref-groups">
            {byGroup.map(({ group, defs }) => (
              <div className="pref-group" key={group}>
                <strong>{group}</strong>
                <div style={{ display: "grid", gap: 4 }}>
                  {defs.map((def) =>
                    def.exclusive === "live" ? null : (
                      <label key={def.value} className="check-row" title={def.value}>
                        <input type="checkbox" checked={prefs.includes(def.value)} onChange={() => togglePref(def.value)} />
                        <span>&#10003;</span>
                        {def.label}
                      </label>
                    )
                  )}
                  {defs.some((d) => d.exclusive === "live") && (
                    <div className="live-toggle" role="radiogroup" aria-label="Live in or live out">
                      {defs
                        .filter((d) => d.exclusive === "live")
                        .map((def) => (
                          <button
                            key={def.value}
                            type="button"
                            role="radio"
                            aria-checked={prefs.includes(def.value)}
                            className={prefs.includes(def.value) ? "active" : ""}
                            onClick={() => togglePref(def.value, "live")}
                          >
                            {def.label}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <span className="pref-count">{prefs.length} selected</span>
          </div>
        );
      }
      case "doneShooting":
        return (
          <div className="task-dynamic-fields">
            {field("Stock photo URL", false, <input value={stockPhotoUrl} onChange={(e) => setStockPhotoUrl(e.target.value)} placeholder="https://..." />)}
            {field("Stock video URL", false, <input value={stockVideoUrl} onChange={(e) => setStockVideoUrl(e.target.value)} placeholder="https://..." />)}
          </div>
        );
      case "editingDone":
        return (
          <div className="task-dynamic-fields">
            {field("Final photo", true, <input value={finalPhoto} onChange={(e) => setFinalPhoto(e.target.value)} placeholder="https://..." />, true)}
            <div className="task-input-field wide">
              <span>Final video</span>
              <select value={videoMode} onChange={(e) => setVideoMode(e.target.value as "link" | "file")}>
                <option value="link">Link</option>
                <option value="file">File upload</option>
              </select>
              {videoMode === "link" ? (
                <input value={finalVideo} onChange={(e) => setFinalVideo(e.target.value)} placeholder="https://..." />
              ) : (
                <input type="file" onChange={(e) => setFinalVideo(e.target.files?.[0]?.name ?? "")} />
              )}
            </div>
          </div>
        );
      case "sendBackToShooting":
        return (
          <div className="task-dynamic-fields">
            {field("Comment", false, <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What needs reshooting?" />, true)}
          </div>
        );
      case "underTrial":
        return (
          <div className="task-dynamic-fields">
            {field("Employer name", false, <input value={employerName} onChange={(e) => setEmployerName(e.target.value)} placeholder="e.g. Al Habtoor Family" />)}
            {field("maids.cc profile link", false, <input value={profileLink} onChange={(e) => setProfileLink(e.target.value)} placeholder="https://maids.cc/profile/..." />)}
          </div>
        );
      case "cancel":
        return (
          <div className="task-dynamic-fields">
            {field("Reason", true, <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this trial being cancelled?" />, true)}
          </div>
        );
      default:
        return (
          <div className="no-fields-note">
            <Check size={16} />
            <span>
              <strong>No extra data needed</strong>
              <small>Review the result and save when ready.</small>
            </span>
          </div>
        );
    }
  }

  const handoverParts: string[] = [];
  if (task.metadata?.comment) handoverParts.push(`“${task.metadata.comment}”`);
  if (task.metadata?.preferences?.length) handoverParts.push(task.metadata.preferences.map(preferenceLabel).join(" · "));
  if (task.metadata?.employerName) handoverParts.push(`Employer: ${task.metadata.employerName}`);

  const errors = currentErrors();
  const showErrors = touched && errors.length > 0;

  return (
    <>
      <div className="task-heading">
        <div className="task-symbol">
          <Icon size={20} />
        </div>
        <div>
          <h1>{TASK_TYPE_LABEL[task.type]}</h1>
          <p>{DESCRIPTION[task.type]}</p>
          <div className="task-meta">
            <StatusPill>{TASK_TYPE_LABEL[task.type]}</StatusPill>
            <span>
              <Users size={13} />
              {roleLabel(actor)}
            </span>
            <span>
              <Clock size={13} />
              In queue {duration(Date.now() - task.createdAt)}
            </span>
            <span className="task-code">{task.id}</span>
          </div>
        </div>
      </div>

      {handoverParts.length > 0 && (
        <div className="context-note" style={{ marginBottom: 16 }}>
          <Info size={16} />
          <div>
            <strong>Handover</strong>
            <p>{handoverParts.join("  ·  ")}</p>
          </div>
        </div>
      )}

      {task.type === "publishing" ? (
        <div className="task-step-block" style={{ borderBottom: "none" }}>
          <div className="task-step-title">
            <i>1</i>
            <span>
              <strong>Publish to platforms</strong>
              <small>Auto-publishes once all three are green. Tap a platform to toggle it.</small>
            </span>
          </div>
          <div className="task-dynamic-fields" style={{ marginTop: 0 }}>
            {PLATFORMS.map((platform) => {
              const green = task.metadata?.publishState?.[platform] ?? false;
              return (
                <label key={platform} className="check-row">
                  <input type="checkbox" checked={green} onChange={() => togglePlatformFlag(platform)} />
                  <span>&#10003;</span>
                  {PLATFORM_LABEL[platform]}
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="task-step-block">
            <div className="task-step-title">
              <i>1</i>
              <span>
                <strong>Choose the result</strong>
                <small>The fields below adapt to this choice.</small>
              </span>
            </div>
            <div className="outcome-grid">
              {OUTCOMES[task.type].map((o) => {
                const cls = selected === o.key ? "selected" : "";
                const neg = o.negative ? " negative" : "";
                return (
                  <button key={o.key} type="button" className={`${cls}${neg}`.trim()} onClick={() => select(o.key)}>
                    <span className="radio">{selected === o.key && <Check size={13} />}</span>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {outcome && (
            <div className="task-step-block" style={{ borderBottom: "none" }}>
              <div className="task-step-title">
                <i>2</i>
                <span>
                  <strong>Complete required details</strong>
                  <small>Only fields required for this result are shown.</small>
                </span>
              </div>

              <div className={`outcome-effect ${outcome.effect.tone === "neutral" ? "" : outcome.effect.tone}`}>
                <Info size={16} />
                <span>
                  <strong>{outcome.effect.title}</strong>
                  <small>{outcome.effect.body}</small>
                </span>
              </div>

              {dynamicFields()}

              {showErrors && (
                <div className="validation-summary" role="alert">
                  <Info size={16} />
                  <div>
                    <strong>
                      Complete {errors.length} required field{errors.length > 1 ? "s" : ""}
                    </strong>
                    <ul>
                      {errors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {outcome && (
            <div className="task-action-footer">
              <button type="button" className="secondary-button" onClick={reset}>
                Discard
              </button>
              <button
                type="button"
                className={outcome.negative ? "danger-button solid" : "primary-button"}
                disabled={errors.length > 0}
                onClick={handleConfirm}
              >
                Confirm · {outcome.label}
              </button>
            </div>
          )}
        </>
      )}

      <Toast message={toast} tone="success" />
    </>
  );
}
