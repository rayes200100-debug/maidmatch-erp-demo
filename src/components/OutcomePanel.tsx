import { useState } from "react";
import {
  ArrowLeftRight,
  AlertTriangle,
  Briefcase,
  Camera,
  Check,
  ClipboardCheck,
  Clock,
  FileText,
  Globe,
  Image,
  Info,
  Scissors,
  Users,
  Video,
} from "lucide-react";
import type { Housemaid, Task, MaidMatchProfile } from "../data";
import {
  TERMINATION_REASONS,
  SOURCE_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  CITY_OPTIONS,
  EXPERIENCE_OPTIONS,
  CHILDCARE_AGE_BANDS,
  PETS_TYPES,
  LANGUAGE_OPTIONS,
  CERTIFICATION_TYPES,
  EDUCATION_OPTIONS,
  TASKS_SKILLS,
} from "../data";
import type { Action } from "../store";
import type { RoleId } from "../lib/roles";
import { ROLES } from "../lib/roles";
import { PLATFORMS, TASK_TYPE_LABEL } from "../lib/stages";
import type { Platform, TaskType } from "../lib/stages";
import { StatusPill, Toast } from "./primitives";
import { TriState, ChipGroup, Stepper, MediaField } from "./formControls";

export interface OutcomePanelProps {
  task: Task;
  maid: Housemaid;
  onAction: (action: Action) => void;
  terminationReasons?: string[];
}

type EffectTone = "positive" | "warning" | "negative" | "neutral";

interface OutcomeDef {
  key: string;
  label: string;
  negative?: boolean;
  mvOnly?: boolean;
  effect: { tone: EffectTone; title: string; body: string };
}

const OUTCOMES: Record<TaskType, OutcomeDef[]> = {
  retraction: [
    { key: "terminate", label: "Terminate (move to offboarding)", negative: true, effect: { tone: "negative", title: "Closes the case at the retraction desk.", body: "She does not enter the unassigned queue. A maid-termination complaint is created in maids.cc." } },
    { key: "retractToCC", label: "Retract to CC", mvOnly: true, effect: { tone: "neutral", title: "Switches her back to CC.", body: "Creates a payroll complaint (if a salary/bonus was granted) and switches her to CC in maids.cc." } },
    { key: "retractToMaidMatch", label: "Retract to MaidMatch", effect: { tone: "positive", title: "Puts her into the MaidMatch pipeline.", body: "She agrees to the Malaya package; her stage is set to Retracted, her real unpaid-leave-due date is computed and stored, and she is handed on for Collect Documents." } },
  ],
  documents: [],
  shooting: [
    { key: "doneShooting", label: "Done shooting", effect: { tone: "positive", title: "Maid moves to the Editors queue.", body: "The raw photo and video (both required) carry over to the editor." } },
  ],
  editing: [
    { key: "editingDone", label: "Editing done", effect: { tone: "positive", title: "Records Production Done and opens a publishing task.", body: "The final photo and video trigger posting — nothing else to press." } },
    { key: "sendBackToShooting", label: "Send back to shooting", effect: { tone: "warning", title: "Returns to the Videographers queue.", body: "Your comment is shown prominently on the reshoot task so the shooter knows what to redo." } },
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
  documents: FileText,
  shooting: Camera,
  editing: Scissors,
  publishing: Globe,
  available: Briefcase,
  trial: ClipboardCheck,
};

const DESCRIPTION: Record<TaskType, string> = {
  retraction: "Choose where this maid goes next.",
  documents: "Collect passport, visa and any required documents before handoff to Media.",
  shooting: "Capture the raw photo and video — both are required before the editor can start.",
  editing: "Review the raw media in place, then deliver the final photo and video or send back to shooting.",
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

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function duration(ms: number): string {
  const mins = Math.max(1, Math.floor(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

interface RetractFormState {
  hasClient: boolean | null;
  disclosedClient: boolean | null;
  prospectName: string;
  prospectPhone: string;
  spouseName: string;
  spousePhone: string;
  source: string;
  maritalStatus: string;
  kids: number;
  birthday: string;
  salaryMin: string;
  salaryMax: string;
  livingArrangement: "Live-in" | "Live-out" | "";
  daysOff: number;
  cities: string[];
  email: string;
  yearsExperience: string;
  childcare: boolean | null;
  childcareAgeBands: string[];
  cook: boolean | null;
  pets: boolean | null;
  petsTypes: string[];
  smoker: boolean | null;
  languages: string[];
  languageOther: string;
  certifications: boolean | null;
  certificationTypes: string[];
  certificationOther: string;
  education: string;
  tasksSkills: string[];
}

const EMPTY_FORM: RetractFormState = {
  hasClient: null,
  disclosedClient: null,
  prospectName: "",
  prospectPhone: "",
  spouseName: "",
  spousePhone: "",
  source: "",
  maritalStatus: "",
  kids: 0,
  birthday: "",
  salaryMin: "",
  salaryMax: "",
  livingArrangement: "",
  daysOff: 0,
  cities: [],
  email: "",
  yearsExperience: "",
  childcare: null,
  childcareAgeBands: [],
  cook: null,
  pets: null,
  petsTypes: [],
  smoker: null,
  languages: [],
  languageOther: "",
  certifications: null,
  certificationTypes: [],
  certificationOther: "",
  education: "",
  tasksSkills: [],
};

export function OutcomePanel({ task, maid, onAction, terminationReasons }: OutcomePanelProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [stockPhotoUrl, setStockPhotoUrl] = useState("");
  const [stockVideoUrl, setStockVideoUrl] = useState("");
  const [editorNote, setEditorNote] = useState("");
  const [finalPhoto, setFinalPhoto] = useState("");
  const [finalVideo, setFinalVideo] = useState("");
  const [comment, setComment] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [profileLink, setProfileLink] = useState("");
  const [reason, setReason] = useState("");
  const [terminationReason, setTerminationReason] = useState("");
  const [handNote, setHandNote] = useState("");
  const [grantedAmount, setGrantedAmount] = useState("");
  const [form, setForm] = useState<RetractFormState>(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const actor: RoleId = task.assignedRole === "None" ? "sysadmin" : task.assignedRole;
  const outcome = OUTCOMES[task.type].find((o) => o.key === selected);
  const Icon = TASK_ICON[task.type];

  const visibleOutcomes = OUTCOMES[task.type].filter((o) => !o.mvOnly || maid.housemaidType === "MV");

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  function patchForm(patch: Partial<RetractFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function currentErrors(): string[] {
    switch (selected) {
      case "terminate":
        return terminationReason ? [] : ["Termination reason"];
      case "doneShooting": {
        const errs: string[] = [];
        if (!stockPhotoUrl.trim()) errs.push("Raw photo");
        if (!stockVideoUrl.trim()) errs.push("Raw video");
        return errs;
      }
      case "retractToMaidMatch": {
        const errs: string[] = [];
        if (form.hasClient === null) errs.push("Does she already have a client?");
        if (form.hasClient === true) {
          if (form.disclosedClient === null) errs.push("Did she disclose him?");
          if (!form.prospectName.trim()) errs.push("Prospect name");
          if (form.disclosedClient === true && !form.prospectPhone.trim()) errs.push("Phone");
          if (!form.source) errs.push("Source");
        }
        return errs;
      }
      case "editingDone": {
        const errs: string[] = [];
        if (!finalPhoto.trim()) errs.push("Final photo");
        if (!finalVideo.trim()) errs.push("Final video");
        return errs;
      }
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
    setEditorNote("");
    setFinalPhoto("");
    setFinalVideo("");
    setComment("");
    setEmployerName("");
    setProfileLink("");
    setReason("");
    setTerminationReason("");
    setHandNote("");
    setGrantedAmount("");
    setForm(EMPTY_FORM);
    setTouched(false);
  }

  function select(key: string) {
    setSelected(key);
    setTouched(false);
  }

  function togglePlatformFlag(platform: Platform) {
    onAction({ type: "MANUAL_MARK_POSTED", housemaidId: maid.id, platform, now: Date.now() });
    showToast(`Marked ${PLATFORM_LABEL[platform]} as posted`);
  }

  function buildProfile(): MaidMatchProfile {
    return {
      hasClient: form.hasClient,
      disclosedClient: form.disclosedClient,
      prospectName: form.prospectName.trim() || undefined,
      prospectPhone: form.prospectPhone.trim() || undefined,
      spouseName: form.spouseName.trim() || undefined,
      spousePhone: form.spousePhone.trim() || undefined,
      source: form.source || undefined,
      maritalStatus: form.maritalStatus || undefined,
      kids: form.kids,
      birthday: form.birthday || undefined,
      expectedSalaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      expectedSalaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      livingArrangement: form.livingArrangement || undefined,
      daysOffPerWeek: form.daysOff,
      cities: form.cities,
      email: form.email.trim() || undefined,
      yearsExperience: form.yearsExperience || undefined,
      childcare: form.childcare,
      childcareAgeBands: form.childcareAgeBands,
      cook: form.cook,
      pets: form.pets,
      petsTypes: form.petsTypes,
      smoker: form.smoker,
      languages: form.languages,
      languageOther: form.languageOther.trim() || undefined,
      certifications: form.certifications,
      certificationTypes: form.certificationTypes,
      certificationOther: form.certificationOther.trim() || undefined,
      education: form.education || undefined,
      tasksSkills: form.tasksSkills,
    };
  }

  function handleConfirm() {
    const errors = currentErrors();
    if (errors.length > 0) {
      setTouched(true);
      return;
    }
    const now = Date.now();
    switch (selected) {
      case "terminate":
        onAction({ type: "MOVE_TO_OFFBOARD", housemaidId: maid.id, actor, now, reason: terminationReason, handNote: handNote.trim() || undefined });
        showToast("Moved to Offboarding");
        break;
      case "retractToCC":
        onAction({ type: "RETRACT_TO_CC", housemaidId: maid.id, actor, now, grantedAmount: grantedAmount ? Number(grantedAmount) : undefined });
        showToast("Retracted to CC");
        break;
      case "retractToMaidMatch":
        onAction({ type: "RETRACT_TO_MAIDMATCH", housemaidId: maid.id, actor, now, profile: buildProfile() });
        showToast("Retracted to MaidMatch");
        break;
      case "doneShooting":
        onAction({ type: "DONE_SHOOTING", housemaidId: maid.id, actor, now, stockPhotoUrl: stockPhotoUrl.trim(), stockVideoUrl: stockVideoUrl.trim(), editorNote: editorNote.trim() || undefined });
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

  function renderRetractForm(): React.ReactNode {
    const setHasClient = (v: boolean | null) => patchForm({ hasClient: v, ...(v === false ? { disclosedClient: null, prospectName: "", prospectPhone: "", spouseName: "", spousePhone: "", source: "" } : {}) });
    return (
      <div className="retract-form">
        <div className="form-block">
          <div className="form-block-title"><i>1</i><strong>Does she already have a client?</strong></div>
          <div className="form-grid">
            <TriState label="Does she already have a client?" value={form.hasClient} onChange={setHasClient} />
            {form.hasClient === true && (
              <>
                <TriState label="Did she disclose him?" value={form.disclosedClient} onChange={(v) => patchForm({ disclosedClient: v })} />
                <div className="form-field"><span>Prospect name</span><input value={form.prospectName} onChange={(e) => patchForm({ prospectName: e.target.value })} placeholder="Prospect name" /></div>
                {form.disclosedClient === true && (
                  <div className="form-field"><span>Phone (required)</span><input value={form.prospectPhone} onChange={(e) => patchForm({ prospectPhone: e.target.value })} placeholder="Phone" /></div>
                )}
                <div className="form-field"><span>Spouse name</span><input value={form.spouseName} onChange={(e) => patchForm({ spouseName: e.target.value })} placeholder="Spouse name (optional)" /></div>
                <div className="form-field"><span>Spouse phone</span><input value={form.spousePhone} onChange={(e) => patchForm({ spousePhone: e.target.value })} placeholder="Spouse phone (optional)" /></div>
                <div className="form-field"><span>Source</span>
                  <select value={form.source} onChange={(e) => patchForm({ source: e.target.value })}>
                    <option value="">Select source…</option>
                    {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="form-block">
          <div className="form-block-title"><i>2</i><strong>Her details</strong></div>
          <div className="form-grid">
            <div className="form-field"><span>Marital status</span>
              <select value={form.maritalStatus} onChange={(e) => patchForm({ maritalStatus: e.target.value })}>
                <option value="">Select…</option>
                {MARITAL_STATUS_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <Stepper label="Number of kids" value={form.kids} onChange={(n) => patchForm({ kids: n })} />
            <div className="form-field"><span>Birthday</span><input type="date" value={form.birthday} onChange={(e) => patchForm({ birthday: e.target.value })} /></div>
          </div>
        </div>

        <div className="form-block">
          <div className="form-block-title"><i>3</i><strong>Key info</strong></div>
          <div className="form-grid">
            <div className="form-field"><span>Expected salary — min (AED)</span><input type="number" value={form.salaryMin} onChange={(e) => patchForm({ salaryMin: e.target.value })} placeholder="1500" /></div>
            <div className="form-field"><span>Expected salary — max (AED)</span><input type="number" value={form.salaryMax} onChange={(e) => patchForm({ salaryMax: e.target.value })} placeholder="2200" /></div>
            <div className="form-field"><span>Live-in or live-out</span>
              <select value={form.livingArrangement} onChange={(e) => patchForm({ livingArrangement: e.target.value as RetractFormState["livingArrangement"] })}>
                <option value="">Select…</option>
                <option value="Live-in">Live-in</option>
                <option value="Live-out">Live-out</option>
              </select>
            </div>
            <Stepper label="Days off per week" value={form.daysOff} onChange={(n) => patchForm({ daysOff: n })} />
            <div className="form-field full"><span>City she wants to work in</span><ChipGroup options={CITY_OPTIONS} value={form.cities} onChange={(cities) => patchForm({ cities })} /></div>
            <div className="form-field full"><span>Email (optional)</span><input value={form.email} onChange={(e) => patchForm({ email: e.target.value })} placeholder="email" /></div>
          </div>
        </div>

        <div className="form-block">
          <div className="form-block-title"><i>4</i><strong>Experience &amp; attributes</strong></div>
          <div className="form-grid">
            <div className="form-field"><span>Years of experience</span>
              <select value={form.yearsExperience} onChange={(e) => patchForm({ yearsExperience: e.target.value })}>
                <option value="">Select…</option>
                {EXPERIENCE_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <TriState label="Childcare" value={form.childcare} onChange={(v) => patchForm({ childcare: v, childcareAgeBands: v === true ? form.childcareAgeBands : [] })} />
            {form.childcare === true && (
              <div className="form-field full"><span>Childcare age bands</span><ChipGroup options={CHILDCARE_AGE_BANDS} value={form.childcareAgeBands} onChange={(childcareAgeBands) => patchForm({ childcareAgeBands })} /></div>
            )}
            <TriState label="Cook experience" value={form.cook} onChange={(v) => patchForm({ cook: v })} />
            <TriState label="Pets experience" value={form.pets} onChange={(v) => patchForm({ pets: v, petsTypes: v === true ? form.petsTypes : [] })} />
            {form.pets === true && (
              <div className="form-field full"><span>Pets</span><ChipGroup options={PETS_TYPES} value={form.petsTypes} onChange={(petsTypes) => patchForm({ petsTypes })} /></div>
            )}
            <TriState label="Smoker" value={form.smoker} onChange={(v) => patchForm({ smoker: v })} />
            <div className="form-field full"><span>Languages</span><ChipGroup options={LANGUAGE_OPTIONS} value={form.languages} onChange={(languages) => patchForm({ languages })} /></div>
            {form.languages.includes("Other") && (
              <div className="form-field full"><span>Other language</span><input value={form.languageOther} onChange={(e) => patchForm({ languageOther: e.target.value })} placeholder="Language" /></div>
            )}
            <TriState label="Certifications" value={form.certifications} onChange={(v) => patchForm({ certifications: v, certificationTypes: v === true ? form.certificationTypes : [], certificationOther: v === true ? form.certificationOther : "" })} />
            {form.certifications === true && (
              <>
                <div className="form-field full"><span>Certifications</span><ChipGroup options={CERTIFICATION_TYPES} value={form.certificationTypes} onChange={(certificationTypes) => patchForm({ certificationTypes })} /></div>
                {form.certificationTypes.includes("Other") && (
                  <div className="form-field full"><span>Describe certification</span><input value={form.certificationOther} onChange={(e) => patchForm({ certificationOther: e.target.value })} placeholder="Certification" /></div>
                )}
              </>
            )}
            <div className="form-field full"><span>Education level</span>
              <select value={form.education} onChange={(e) => patchForm({ education: e.target.value })}>
                <option value="">Select…</option>
                {EDUCATION_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div className="form-field full"><span>Tasks and skills</span><ChipGroup options={TASKS_SKILLS} value={form.tasksSkills} onChange={(tasksSkills) => patchForm({ tasksSkills })} /></div>
          </div>
        </div>
      </div>
    );
  }

  function dynamicFields(): React.ReactNode {
    switch (selected) {
      case "terminate":
        return (
          <div className="task-dynamic-fields">
            {field("Termination reason", true, (
              <select value={terminationReason} onChange={(e) => setTerminationReason(e.target.value)}>
                <option value="">Select reason…</option>
                {(terminationReasons ?? TERMINATION_REASONS).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            ))}
            {field("Hand note", false, <textarea value={handNote} onChange={(e) => setHandNote(e.target.value)} placeholder="Optional note for the offboarding team" />, true)}
          </div>
        );
      case "retractToCC":
        return (
          <div className="task-dynamic-fields">
            {field("Granted salary / bonus (AED)", false, <input type="number" value={grantedAmount} onChange={(e) => setGrantedAmount(e.target.value)} placeholder="Optional — e.g. 2500" />, true)}
          </div>
        );
      case "retractToMaidMatch":
        return renderRetractForm();
      case "doneShooting":
        return (
          <div className="task-dynamic-fields media-stack">
            <MediaField label="Raw video" required value={stockVideoUrl} onChange={setStockVideoUrl} />
            <MediaField label="Raw photo" required value={stockPhotoUrl} onChange={setStockPhotoUrl} />
            {field("Note for the editor", false, <textarea value={editorNote} onChange={(e) => setEditorNote(e.target.value)} placeholder="Better takes, background noise, what to cut…" />, true)}
          </div>
        );
      case "editingDone":
        return (
          <div className="task-dynamic-fields media-stack">
            <MediaField label="Final video" required value={finalVideo} onChange={setFinalVideo} />
            <MediaField label="Final photo" required value={finalPhoto} onChange={setFinalPhoto} />
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
  if (task.metadata?.employerName) handoverParts.push(`Employer: ${task.metadata.employerName}`);

  const reshootComment = task.type === "shooting" ? task.metadata?.comment : undefined;
  const rawPhoto = task.type === "editing" ? task.metadata?.stockPhotoUrl : undefined;
  const rawVideo = task.type === "editing" ? task.metadata?.stockVideoUrl : undefined;
  const videographerNote = task.type === "editing" ? task.metadata?.editorNote : undefined;
  const pub = task.type === "publishing" ? task.metadata?.publish : undefined;

  const errors = currentErrors();
  const showErrors = touched && errors.length > 0;

  const discard = () => {
    if (selected === "retractToMaidMatch" && !window.confirm("Discard your changes?")) return;
    reset();
  };

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

      {reshootComment && (
        <div className="reshoot-banner" role="alert" style={{ marginBottom: 16 }}>
          <AlertTriangle size={18} />
          <div>
            <strong>Note from Editors:</strong>
            <p>{reshootComment}</p>
          </div>
        </div>
      )}

      {(rawPhoto || rawVideo || videographerNote) && (
        <div className="raw-media" style={{ marginBottom: 16 }}>
          <div className="task-step-title">
            <i>0</i>
            <span>
              <strong>Raw media</strong>
              <small>From the shoot — review in place before editing.</small>
            </span>
          </div>
          {videographerNote && (
            <div className="context-note" style={{ marginTop: 10 }}>
              <Info size={16} />
              <div>
                <strong>Videographer&rsquo;s note</strong>
                <p>{videographerNote}</p>
              </div>
            </div>
          )}
          <div className="raw-media-grid">
            {rawPhoto && (isUrl(rawPhoto) ? <img src={rawPhoto} alt="Raw photo" /> : <div className="media-file"><Image size={18} /> {rawPhoto}</div>)}
            {rawVideo && (isUrl(rawVideo) ? <video src={rawVideo} controls /> : <div className="media-file"><Video size={18} /> {rawVideo}</div>)}
          </div>
        </div>
      )}

      {task.type === "publishing" ? (
        <div className="task-step-block" style={{ borderBottom: "none" }}>
          <div className="task-step-title">
            <i>1</i>
            <span>
              <strong>Publish to platforms</strong>
              <small>The system posts the final photo + video and her retraction details to all three platforms. Nothing to press once all three are green.</small>
            </span>
          </div>

          {pub?.heldReason && (
            <div className="reshoot-banner" role="alert">
              <AlertTriangle size={18} />
              <div>
                <strong>Held — {pub.heldReason}</strong>
                <p>This profile is held, not posted. Fix the missing information before the system can publish it.</p>
              </div>
            </div>
          )}

          {pub?.lastFailedAt && (
            <div className="outcome-effect negative" style={{ marginTop: 12 }}>
              <Info size={16} />
              <span>
                <strong>Last failed {new Date(pub.lastFailedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
                <small>The job retries automatically. Use “Run now” below to trigger it again.</small>
              </span>
            </div>
          )}

          <div className="publish-platforms">
            {PLATFORMS.map((platform) => {
              const state = pub?.platforms[platform];
              const status = state?.status ?? "pending";
              return (
                <div key={platform} className={`publish-platform ${status === "failed" ? "failed" : ""}`}>
                  <div className="publish-platform-head">
                    <strong>{PLATFORM_LABEL[platform]}</strong>
                    <StatusPill tone={status === "posted" ? "success" : status === "failed" ? "danger" : "warning"}>
                      {status === "posted" ? "Posted" : status === "failed" ? "Failed" : "Pending"}
                    </StatusPill>
                  </div>
                  {status === "failed" && state?.failureReason && (
                    <small className="publish-failure">Failure reason: {state.failureReason}</small>
                  )}
                  {status === "posted" && state?.source === "manual" && (
                    <small className="publish-failure">Marked posted manually</small>
                  )}
                  {status !== "posted" && !pub?.heldReason && (
                    <button type="button" className="text-button" onClick={() => togglePlatformFlag(platform)}>
                      Mark as posted
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {!pub?.heldReason && (
            <div className="task-action-footer">
              <span style={{ color: "var(--muted)", fontSize: 12 }}>
                Escape hatch: mark a platform posted only when an automatic post cannot be verified.
              </span>
              <button type="button" className="secondary-button" onClick={() => onAction({ type: "RUN_PUBLISH_JOB", now: Date.now() })}>
                Run publish job now
              </button>
            </div>
          )}
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
              {visibleOutcomes.map((o) => {
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
              <button type="button" className="secondary-button" onClick={discard}>
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
