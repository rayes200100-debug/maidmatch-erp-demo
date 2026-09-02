import { useState } from "react";
import type { Housemaid, Task } from "../data";
import { PREFERENCE_OPTIONS } from "../data";
import type { Action } from "../store";
import type { RoleId } from "../lib/roles";
import { PLATFORMS, TASK_TYPE_LABEL } from "../lib/stages";
import type { Platform, TaskType } from "../lib/stages";
import { Modal, Toast } from "./primitives";

export interface OutcomePanelProps {
  task: Task;
  maid: Housemaid;
  onAction: (action: Action) => void;
}

interface OutcomeDef {
  key: string;
  label: string;
}

const OUTCOMES: Record<TaskType, OutcomeDef[]> = {
  retraction: [
    { key: "retractToCC", label: "Retract to CC" },
    { key: "moveToOffboard", label: "Move to Offboarding" },
    { key: "retractToMaidMatch", label: "Retract to MaidMatch" },
  ],
  shooting: [{ key: "doneShooting", label: "Done shooting" }],
  editing: [
    { key: "editingDone", label: "Editing done" },
    { key: "sendBackToShooting", label: "Send back to shooting" },
  ],
  publishing: [],
  available: [{ key: "underTrial", label: "Under trial" }],
  trial: [
    { key: "hired", label: "Hired" },
    { key: "sendBackPublished", label: "Send back to Available & Published" },
    { key: "sendBackPendingPublishing", label: "Send back to Available & Pending Publishing" },
    { key: "cancel", label: "Proceed to cancellation" },
  ],
};

const SYMBOL: Record<TaskType, string> = {
  retraction: "R",
  shooting: "S",
  editing: "E",
  publishing: "P",
  available: "A",
  trial: "T",
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
  const [validation, setValidation] = useState<string | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState<string[]>([]);
  const [prefError, setPrefError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const actor: RoleId = task.assignedRole === "None" ? "sysadmin" : task.assignedRole;

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
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
    setValidation(null);
  }

  function select(key: string) {
    setSelected(key);
    setValidation(null);
  }

  function openPrefs() {
    setPrefs([]);
    setPrefError(false);
    setPrefsOpen(true);
  }

  function togglePref(option: string) {
    setPrefs((prev) => (prev.includes(option) ? prev.filter((p) => p !== option) : [...prev, option]));
    setPrefError(false);
  }

  function confirmPrefs() {
    if (prefs.length === 0) {
      setPrefError(true);
      return;
    }
    onAction({ type: "RETRACT_TO_MAIDMATCH", housemaidId: maid.id, actor, now: Date.now(), preferences: prefs });
    setPrefsOpen(false);
    setPrefs([]);
    showToast("Retracted to MaidMatch");
  }

  function flag(platform: Platform) {
    onAction({ type: "FLAG_PLATFORM", housemaidId: maid.id, platform, now: Date.now() });
    showToast(`Flagged ${PLATFORM_LABEL[platform]}`);
  }

  function handleConfirm() {
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
      case "doneShooting":
        onAction({
          type: "DONE_SHOOTING",
          housemaidId: maid.id,
          actor,
          now,
          stockPhotoUrl: stockPhotoUrl.trim() || undefined,
          stockVideoUrl: stockVideoUrl.trim() || undefined,
        });
        showToast("Shooting marked done");
        break;
      case "editingDone":
        if (!finalPhoto.trim()) {
          setValidation("A final photo is required.");
          return;
        }
        onAction({
          type: "EDITING_DONE",
          housemaidId: maid.id,
          actor,
          now,
          finalPhoto: finalPhoto.trim(),
          finalVideo: finalVideo.trim() || undefined,
        });
        showToast("Editing done");
        break;
      case "sendBackToShooting":
        onAction({
          type: "SEND_BACK_TO_SHOOTING",
          housemaidId: maid.id,
          actor,
          now,
          comment: comment.trim() || undefined,
        });
        showToast("Sent back to shooting");
        break;
      case "underTrial":
        onAction({
          type: "UNDER_TRIAL",
          housemaidId: maid.id,
          actor,
          now,
          employerName: employerName.trim() || undefined,
          maidsCcProfileLink: profileLink.trim() || undefined,
        });
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
        if (!reason.trim()) {
          setValidation("A cancellation reason is required.");
          return;
        }
        onAction({ type: "CANCEL", housemaidId: maid.id, actor, now, reason: reason.trim() });
        showToast("Cancelled");
        break;
      default:
        return;
    }
    reset();
  }

  function dynamicFields() {
    switch (selected) {
      case "doneShooting":
        return (
          <div className="task-dynamic-fields">
            <label className="task-input-field">
              <span>Stock photo URL (optional)</span>
              <input value={stockPhotoUrl} onChange={(e) => setStockPhotoUrl(e.target.value)} placeholder="https://..." />
            </label>
            <label className="task-input-field">
              <span>Stock video URL (optional)</span>
              <input value={stockVideoUrl} onChange={(e) => setStockVideoUrl(e.target.value)} placeholder="https://..." />
            </label>
          </div>
        );
      case "editingDone":
        return (
          <div className="task-dynamic-fields">
            <label className="task-input-field wide">
              <span>Final photo (required)</span>
              <input value={finalPhoto} onChange={(e) => setFinalPhoto(e.target.value)} placeholder="https://..." />
            </label>
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
            <label className="task-input-field wide">
              <span>Comment (optional)</span>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What needs reshooting?" />
            </label>
          </div>
        );
      case "underTrial":
        return (
          <div className="task-dynamic-fields">
            <label className="task-input-field">
              <span>Employer name (optional)</span>
              <input value={employerName} onChange={(e) => setEmployerName(e.target.value)} placeholder="e.g. Al Habtoor Family" />
            </label>
            <label className="task-input-field">
              <span>maids.cc profile link (optional)</span>
              <input value={profileLink} onChange={(e) => setProfileLink(e.target.value)} placeholder="https://maids.cc/profile/..." />
            </label>
          </div>
        );
      case "cancel":
        return (
          <div className="task-dynamic-fields">
            <label className="task-input-field wide">
              <span>Reason (required)</span>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this trial being cancelled?" />
            </label>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <>
      <div className="task-heading">
        <div className="task-symbol">{SYMBOL[task.type]}</div>
        <div>
          <h1>{maid.name}</h1>
          <p>
            {TASK_TYPE_LABEL[task.type]} &middot; {DESCRIPTION[task.type]}
          </p>
        </div>
      </div>

      {task.type === "publishing" ? (
        <div>
          {PLATFORMS.map((platform) => (
            <label key={platform} className="check-row" style={{ marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={task.metadata?.publishState?.[platform] ?? false}
                onChange={() => flag(platform)}
              />
              <span>&#10003;</span>
              {PLATFORM_LABEL[platform]}
            </label>
          ))}
        </div>
      ) : (
        <>
          <div className="outcome-grid">
            {OUTCOMES[task.type].map((outcome) => (
              <button
                key={outcome.key}
                type="button"
                className={selected === outcome.key ? "selected" : ""}
                onClick={() => (outcome.key === "retractToMaidMatch" ? openPrefs() : select(outcome.key))}
              >
                {outcome.label}
              </button>
            ))}
          </div>

          {dynamicFields()}

          {validation && <div className="validation-summary">{validation}</div>}

          {selected && (
            <div className="task-action-footer">
              <button type="button" className="secondary-button" onClick={reset}>
                Cancel
              </button>
              <button type="button" className="primary-button" onClick={handleConfirm}>
                Confirm
              </button>
            </div>
          )}
        </>
      )}

      <Modal
        open={prefsOpen}
        title="Retract to MaidMatch"
        subtitle="Select the maid's preferences (at least one required)."
        onClose={() => setPrefsOpen(false)}
        actions={
          <>
            <button type="button" className="secondary-button" onClick={() => setPrefsOpen(false)}>
              Cancel
            </button>
            <button type="button" className="primary-button" onClick={confirmPrefs}>
              Confirm
            </button>
          </>
        }
      >
        {PREFERENCE_OPTIONS.map((option) => (
          <label key={option} className="check-row" style={{ marginBottom: 8 }}>
            <input type="checkbox" checked={prefs.includes(option)} onChange={() => togglePref(option)} />
            <span>&#10003;</span>
            {option}
          </label>
        ))}
        {prefError && <div className="validation-summary">Select at least one preference.</div>}
      </Modal>

      <Toast message={toast} tone="success" />
    </>
  );
}
