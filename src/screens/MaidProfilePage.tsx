import { useState } from "react";
import { ArrowLeft, Pencil, Check, X, Upload } from "lucide-react";
import type { AppState, Action } from "../store";
import type { Housemaid, MaidMatchProfile } from "../data";
import {
  SOURCE_OPTIONS, MARITAL_STATUS_OPTIONS, CITY_OPTIONS, EXPERIENCE_OPTIONS,
  CHILDCARE_AGE_BANDS, PETS_TYPES, LANGUAGE_OPTIONS, CERTIFICATION_TYPES, EDUCATION_OPTIONS, TASKS_SKILLS,
  maidTypeLabel,
} from "../data";
import { OUTCOME_LABEL } from "../lib/stages";
import { ROLES } from "../lib/roles";
import { TASK_TYPE_LABEL } from "../lib/stages";
import { unpaidLeaveDueDate } from "../lib/unpaidLeave";
import { Panel, StatusPill, EmptyState } from "../components/primitives";
import { TriState, ChipGroup, Stepper } from "../components/formControls";

interface MaidProfilePageProps {
  maid: Housemaid;
  state: AppState;
  dispatch: (a: Action) => void;
  onNavigate: (key: string) => void;
}

type TabKey = "overview" | "details" | "documents" | "media" | "history";

const DAY_MS = 24 * 60 * 60 * 1000;

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtMonth(month: string): string {
  if (!month) return "—";
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

function roleLabel(id: string): string {
  return ROLES.find((r) => r.id === id)?.label ?? id;
}

function visaTone(visaExpiry: string): "success" | "warning" | "danger" {
  const days = (new Date(`${visaExpiry}T00:00:00`).getTime() - Date.now()) / DAY_MS;
  if (days < 0) return "danger";
  if (days <= 30) return "warning";
  return "success";
}

function emptyProfile(): MaidMatchProfile {
  return {
    hasClient: null, disclosedClient: null, kids: 0, cities: [],
    childcare: null, childcareAgeBands: [], cook: null, pets: null, petsTypes: [],
    smoker: null, languages: [], certifications: null, certificationTypes: [], tasksSkills: [], daysOffPerWeek: 0,
  };
}

function profileDiff(a: MaidMatchProfile, b: MaidMatchProfile): Partial<MaidMatchProfile> {
  const patch: Partial<MaidMatchProfile> = {};
  for (const k of Object.keys(b) as (keyof MaidMatchProfile)[]) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) patch[k] = b[k] as never;
  }
  return patch;
}

export default function MaidProfilePage({ maid, state, dispatch, onNavigate }: MaidProfilePageProps) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<MaidMatchProfile>(() => ({ ...emptyProfile(), ...(maid.maidMatchProfile ?? {}) }));

  const profile = maid.maidMatchProfile;
  const unpaidDue = profile?.unpaidLeaveDueDate ?? (maid.arrivalDate ? unpaidLeaveDueDate(maid.arrivalDate) : undefined);

  const documentsTask = [...state.tasks].reverse().find((t) => t.housemaidId === maid.id && t.type === "documents");
  const docs = documentsTask?.metadata?.documents;

  const productionOutcome = [...state.outcomes].reverse().find((o) => o.housemaidId === maid.id && o.type === "ProductionDone");
  const finalTask = [...state.tasks].reverse().find((t) => t.housemaidId === maid.id && (t.metadata?.finalPhoto || t.metadata?.finalVideo));
  const finalPhoto = (productionOutcome?.metadata?.finalPhoto as string | undefined) ?? finalTask?.metadata?.finalPhoto ?? "";
  const finalVideo = (productionOutcome?.metadata?.finalVideo as string | undefined) ?? finalTask?.metadata?.finalVideo ?? "";

  const openTasks = state.tasks.filter((t) => t.housemaidId === maid.id && t.status === "open");
  const history = state.outcomes.filter((o) => o.housemaidId === maid.id).sort((a, b) => b.timestamp - a.timestamp);

  const saveEdit = () => {
    const patch = profileDiff(profile ?? emptyProfile(), draft);
    dispatch({ type: "EDIT_PROFILE", housemaidId: maid.id, patch, actor: state.currentRole, now: Date.now() });
    setEditing(false);
  };

  const tabDefs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "details", label: "Details" },
    { key: "documents", label: "Documents" },
    { key: "media", label: "Media" },
    { key: "history", label: "History" },
  ];

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <button type="button" className="text-button" onClick={() => onNavigate("directory")}>
            <ArrowLeft size={14} /> Back to Directory
          </button>
          <span className="eyebrow" style={{ marginTop: 10 }}>Housemaid</span>
          <h1>{maid.name}</h1>
          <p>
            {maidTypeLabel(maid)} · {maid.nationality}
            {maid.maidsCcId ? ` · ${maid.maidsCcId}` : ""}
            {profile?.joinedMaidMatchAt ? ` · Joined ${fmtDate(profile.joinedMaidMatchAt.slice(0, 10))}` : ""}
          </p>
        </div>
        <div className="page-actions">
          {maid.isGoldenProfile && <StatusPill tone="gold">Golden Profile</StatusPill>}
          <StatusPill tone={visaTone(maid.visaExpiry)}>
            {visaTone(maid.visaExpiry) === "danger" ? "Visa expired" : visaTone(maid.visaExpiry) === "warning" ? "Visa expiring" : "Visa active"}
          </StatusPill>
        </div>
      </header>

      <div className="profile-tabs" role="tablist" aria-label="Profile sections">
        {tabDefs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="profile-body">
        {tab === "overview" && (
          <>
            <Panel>
              <div className="panel-header">
                <div><h2>Identity</h2><p>Core details, as known to MaidMatch.</p></div>
              </div>
              <div className="profile-fields">
                <div><span>Name</span><strong>{maid.name}</strong></div>
                <div><span>maids.cc ERP ID</span><strong>{maid.maidsCcId || "—"}</strong></div>
                <div><span>Nationality</span><strong>{maid.nationality}</strong></div>
                <div><span>Age</span><strong>{maid.age}</strong></div>
                <div><span>Maid type</span><strong>{maidTypeLabel(maid)}</strong></div>
                <div><span>Mobile</span><strong>{maid.mobile || "—"}</strong></div>
                <div><span>WhatsApp</span><strong>{maid.whatsapp || "—"}</strong></div>
                <div><span>Visa expiry</span><strong>{fmtDate(maid.visaExpiry)}</strong></div>
                <div><span>Current salary</span><strong>AED {maid.salary.toLocaleString()}</strong></div>
                <div><span>Unpaid leave due</span><strong>{fmtDate(unpaidDue)}</strong></div>
              </div>
            </Panel>

            <Panel>
              <div className="panel-header">
                <div><h2>Retraction capture</h2><p>The four blocks recorded at Retract to MaidMatch.</p></div>
              </div>
              {!profile ? (
                <small style={{ color: "var(--muted)" }}>No MaidMatch profile captured yet.</small>
              ) : (
                <div className="profile-fields">
                  <div><span>Has client</span><strong>{profile.hasClient === true ? "Yes" : profile.hasClient === false ? "No" : "—"}</strong></div>
                  <div><span>Disclosed client</span><strong>{profile.disclosedClient === true ? "Yes" : profile.disclosedClient === false ? "No" : "—"}</strong></div>
                  <div><span>Prospect</span><strong>{profile.prospectName || "—"}</strong></div>
                  <div><span>Source</span><strong>{profile.source ?? "—"}</strong></div>
                  <div><span>Marital status</span><strong>{profile.maritalStatus ?? "—"}</strong></div>
                  <div><span>Kids</span><strong>{profile.kids}</strong></div>
                  <div><span>Expected salary</span><strong>{profile.expectedSalaryMin != null ? `AED ${profile.expectedSalaryMin.toLocaleString()} – ${profile.expectedSalaryMax?.toLocaleString() ?? "?"}` : "—"}</strong></div>
                  <div><span>Arrangement</span><strong>{profile.livingArrangement ?? "—"}</strong></div>
                  <div><span>Days off / week</span><strong>{profile.daysOffPerWeek}</strong></div>
                  <div><span>Cities</span><strong>{profile.cities.join(", ") || "—"}</strong></div>
                  <div><span>Languages</span><strong>{profile.languages.join(", ") || "—"}</strong></div>
                  <div><span>Tasks &amp; skills</span><strong>{profile.tasksSkills.join(", ") || "—"}</strong></div>
                </div>
              )}
            </Panel>

            <Panel>
              <div className="panel-header">
                <div><h2>Open tasks</h2><p>Where she is right now.</p></div>
              </div>
              {openTasks.length === 0 ? (
                <small style={{ color: "var(--muted)" }}>No open tasks — she is not in any active queue.</small>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {openTasks.map((t) => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 9 }}>
                      <StatusPill tone="info">{TASK_TYPE_LABEL[t.type]}</StatusPill>
                      <button type="button" className="primary-button small" onClick={() => onNavigate(`task/${t.id}`)}>
                        Open Task
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </>
        )}

        {tab === "details" && (
          <>
            <Panel>
              <div className="panel-header">
                <div><h2>ERP record</h2><p>Read-only — these come from maids.cc and cannot be edited here.</p></div>
              </div>
              <div className="profile-fields">
                <div><span>Name</span><strong>{maid.name}</strong></div>
                <div><span>Nationality</span><strong>{maid.nationality}</strong></div>
                <div><span>Age</span><strong>{maid.age}</strong></div>
                <div><span>Maid type</span><strong>{maidTypeLabel(maid)}</strong></div>
                <div><span>Mobile / WhatsApp</span><strong>{maid.mobile || "—"} / {maid.whatsapp || "—"}</strong></div>
                <div><span>Visa start / expiry</span><strong>{fmtDate(maid.visaStartDate)} → {fmtDate(maid.visaExpiry)}</strong></div>
                <div><span>Passport expiry</span><strong>{fmtDate(maid.passportExpiry)}</strong></div>
                <div><span>Passport number</span><strong>{maid.passportNumber || "—"}</strong></div>
                <div><span>Arrival date</span><strong>{fmtDate(maid.arrivalDate)}</strong></div>
                <div><span>Current salary</span><strong>AED {maid.salary.toLocaleString()}</strong></div>
              </div>
            </Panel>

            <Panel>
              <div className="panel-header">
                <div><h2>WPS — last 3 salaries</h2><p>Paid / pending / not-sent per month.</p></div>
              </div>
              {maid.wpsHistory.length === 0 ? (
                <small style={{ color: "var(--muted)" }}>No WPS records</small>
              ) : (
                <div className="profile-fields">
                  {[...maid.wpsHistory].reverse().slice(0, 3).map((w) => (
                    <div key={w.month}>
                      <span>{fmtMonth(w.month)} · AED {w.amount.toLocaleString()}</span>
                      <strong><StatusPill tone={w.status === "Paid" ? "success" : w.status === "Pending" ? "warning" : "danger"}>{w.status}</StatusPill></strong>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel>
              <div className="panel-header">
                <div><h2>Employment history</h2><p>One row per placement, newest first.</p></div>
              </div>
              {maid.employmentHistory.length === 0 ? (
                <small style={{ color: "var(--muted)" }}>No recorded employment</small>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {[...maid.employmentHistory].reverse().map((e, i) => (
                    <div key={i} style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 9 }}>
                      <strong style={{ fontSize: 13 }}>{e.employerName}</strong>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                        {fmtDate(e.startDate)} → {fmtDate(e.endDate)} · AED {e.salary.toLocaleString()}
                        {e.reason ? ` · ${e.reason}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel>
              <div className="panel-header">
                <div>
                  <h2>MaidMatch profile</h2>
                  <p>Editable — these are our fields, not the ERP's.</p>
                </div>
                {editing ? (
                  <span style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="secondary-button small" onClick={() => { setEditing(false); setDraft({ ...emptyProfile(), ...(profile ?? {}) }); }}>
                      <X size={14} /> Cancel
                    </button>
                    <button type="button" className="primary-button small" onClick={saveEdit}>
                      <Check size={14} /> Save
                    </button>
                  </span>
                ) : (
                  <button type="button" className="secondary-button small" onClick={() => { setEditing(true); setDraft({ ...emptyProfile(), ...(profile ?? {}) }); }}>
                    <Pencil size={14} /> Edit
                  </button>
                )}
              </div>

              {editing ? (
                <div className="retract-form" style={{ marginTop: 14 }}>
                  <div className="form-block">
                    <div className="form-block-title"><i>1</i><strong>Client</strong></div>
                    <div className="form-grid">
                      <TriState label="Does she already have a client?" value={draft.hasClient} onChange={(v) => setDraft({ ...draft, hasClient: v })} />
                      {draft.hasClient === true && (
                        <>
                          <TriState label="Did she disclose him?" value={draft.disclosedClient} onChange={(v) => setDraft({ ...draft, disclosedClient: v })} />
                          <div className="form-field"><span>Prospect name</span><input value={draft.prospectName ?? ""} onChange={(e) => setDraft({ ...draft, prospectName: e.target.value })} /></div>
                          <div className="form-field"><span>Prospect phone</span><input value={draft.prospectPhone ?? ""} onChange={(e) => setDraft({ ...draft, prospectPhone: e.target.value })} /></div>
                          <div className="form-field"><span>Source</span>
                            <select value={draft.source ?? ""} onChange={(e) => setDraft({ ...draft, source: e.target.value || undefined })}>
                              <option value="">Select…</option>
                              {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="form-block">
                    <div className="form-block-title"><i>2</i><strong>Details</strong></div>
                    <div className="form-grid">
                      <div className="form-field"><span>Marital status</span>
                        <select value={draft.maritalStatus ?? ""} onChange={(e) => setDraft({ ...draft, maritalStatus: e.target.value || undefined })}>
                          <option value="">Select…</option>
                          {MARITAL_STATUS_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <Stepper label="Number of kids" value={draft.kids} onChange={(n) => setDraft({ ...draft, kids: n })} />
                      <div className="form-field"><span>Birthday</span><input type="date" value={draft.birthday ?? ""} onChange={(e) => setDraft({ ...draft, birthday: e.target.value || undefined })} /></div>
                    </div>
                  </div>

                  <div className="form-block">
                    <div className="form-block-title"><i>3</i><strong>Key info</strong></div>
                    <div className="form-grid">
                      <div className="form-field"><span>Expected salary min</span><input type="number" value={draft.expectedSalaryMin ?? ""} onChange={(e) => setDraft({ ...draft, expectedSalaryMin: e.target.value ? Number(e.target.value) : undefined })} /></div>
                      <div className="form-field"><span>Expected salary max</span><input type="number" value={draft.expectedSalaryMax ?? ""} onChange={(e) => setDraft({ ...draft, expectedSalaryMax: e.target.value ? Number(e.target.value) : undefined })} /></div>
                      <div className="form-field"><span>Live-in or live-out</span>
                        <select value={draft.livingArrangement ?? ""} onChange={(e) => setDraft({ ...draft, livingArrangement: (e.target.value || undefined) as MaidMatchProfile["livingArrangement"] })}>
                          <option value="">Select…</option>
                          <option value="Live-in">Live-in</option>
                          <option value="Live-out">Live-out</option>
                        </select>
                      </div>
                      <Stepper label="Days off per week" value={draft.daysOffPerWeek} onChange={(n) => setDraft({ ...draft, daysOffPerWeek: n })} />
                      <div className="form-field full"><span>Cities</span><ChipGroup options={CITY_OPTIONS} value={draft.cities} onChange={(cities) => setDraft({ ...draft, cities })} /></div>
                      <div className="form-field full"><span>Email</span><input value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value || undefined })} /></div>
                    </div>
                  </div>

                  <div className="form-block">
                    <div className="form-block-title"><i>4</i><strong>Experience &amp; attributes</strong></div>
                    <div className="form-grid">
                      <div className="form-field"><span>Years of experience</span>
                        <select value={draft.yearsExperience ?? ""} onChange={(e) => setDraft({ ...draft, yearsExperience: e.target.value || undefined })}>
                          <option value="">Select…</option>
                          {EXPERIENCE_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
                        </select>
                      </div>
                      <TriState label="Childcare" value={draft.childcare} onChange={(v) => setDraft({ ...draft, childcare: v, childcareAgeBands: v === true ? draft.childcareAgeBands : [] })} />
                      {draft.childcare === true && <div className="form-field full"><span>Childcare age bands</span><ChipGroup options={CHILDCARE_AGE_BANDS} value={draft.childcareAgeBands} onChange={(childcareAgeBands) => setDraft({ ...draft, childcareAgeBands })} /></div>}
                      <TriState label="Cook experience" value={draft.cook} onChange={(v) => setDraft({ ...draft, cook: v })} />
                      <TriState label="Pets experience" value={draft.pets} onChange={(v) => setDraft({ ...draft, pets: v, petsTypes: v === true ? draft.petsTypes : [] })} />
                      {draft.pets === true && <div className="form-field full"><span>Pets</span><ChipGroup options={PETS_TYPES} value={draft.petsTypes} onChange={(petsTypes) => setDraft({ ...draft, petsTypes })} /></div>}
                      <TriState label="Smoker" value={draft.smoker} onChange={(v) => setDraft({ ...draft, smoker: v })} />
                      <div className="form-field full"><span>Languages</span><ChipGroup options={LANGUAGE_OPTIONS} value={draft.languages} onChange={(languages) => setDraft({ ...draft, languages })} /></div>
                      {draft.languages.includes("Other") && <div className="form-field full"><span>Other language</span><input value={draft.languageOther ?? ""} onChange={(e) => setDraft({ ...draft, languageOther: e.target.value || undefined })} /></div>}
                      <TriState label="Certifications" value={draft.certifications} onChange={(v) => setDraft({ ...draft, certifications: v, certificationTypes: v === true ? draft.certificationTypes : [], certificationOther: v === true ? draft.certificationOther : "" })} />
                      {draft.certifications === true && (
                        <>
                          <div className="form-field full"><span>Certifications</span><ChipGroup options={CERTIFICATION_TYPES} value={draft.certificationTypes} onChange={(certificationTypes) => setDraft({ ...draft, certificationTypes })} /></div>
                          {draft.certificationTypes.includes("Other") && <div className="form-field full"><span>Describe certification</span><input value={draft.certificationOther ?? ""} onChange={(e) => setDraft({ ...draft, certificationOther: e.target.value || undefined })} /></div>}
                        </>
                      )}
                      <div className="form-field full"><span>Education level</span>
                        <select value={draft.education ?? ""} onChange={(e) => setDraft({ ...draft, education: e.target.value || undefined })}>
                          <option value="">Select…</option>
                          {EDUCATION_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
                        </select>
                      </div>
                      <div className="form-field full"><span>Tasks and skills</span><ChipGroup options={TASKS_SKILLS} value={draft.tasksSkills} onChange={(tasksSkills) => setDraft({ ...draft, tasksSkills })} /></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="profile-fields" style={{ marginTop: 14 }}>
                  <div><span>Joined MaidMatch</span><strong>{profile?.joinedMaidMatchAt ? fmtDate(profile.joinedMaidMatchAt.slice(0, 10)) : "—"}</strong></div>
                  <div><span>Unpaid leave due</span><strong>{fmtDate(profile?.unpaidLeaveDueDate)}</strong></div>
                  <div><span>Has client</span><strong>{profile?.hasClient === true ? "Yes" : profile?.hasClient === false ? "No" : "—"}</strong></div>
                  <div><span>Disclosed client</span><strong>{profile?.disclosedClient === true ? "Yes" : profile?.disclosedClient === false ? "No" : "—"}</strong></div>
                  <div><span>Prospect</span><strong>{profile?.prospectName || "—"}</strong></div>
                  <div><span>Source</span><strong>{profile?.source ?? "—"}</strong></div>
                  <div><span>Marital status</span><strong>{profile?.maritalStatus ?? "—"}</strong></div>
                  <div><span>Kids</span><strong>{profile?.kids ?? 0}</strong></div>
                  <div><span>Expected salary</span><strong>{profile?.expectedSalaryMin != null ? `AED ${profile.expectedSalaryMin.toLocaleString()} – ${profile.expectedSalaryMax?.toLocaleString() ?? "?"}` : "—"}</strong></div>
                  <div><span>Arrangement</span><strong>{profile?.livingArrangement ?? "—"}</strong></div>
                  <div><span>Days off / week</span><strong>{profile?.daysOffPerWeek ?? 0}</strong></div>
                  <div><span>Cities</span><strong>{profile?.cities.join(", ") || "—"}</strong></div>
                  <div><span>Languages</span><strong>{profile?.languages.join(", ") || "—"}</strong></div>
                  <div><span>Years experience</span><strong>{profile?.yearsExperience ?? "—"}</strong></div>
                  <div><span>Education</span><strong>{profile?.education ?? "—"}</strong></div>
                  <div><span>Tasks &amp; skills</span><strong>{profile?.tasksSkills.join(", ") || "—"}</strong></div>
                </div>
              )}
            </Panel>
          </>
        )}

        {tab === "documents" && (
          <Panel>
            <div className="panel-header">
              <div><h2>Collect Documents</h2><p>The unpaid-leave and MMR-consent papers.</p></div>
            </div>
            {!documentsTask ? (
              <EmptyState title="No documents step" hint="She has not entered document collection yet." />
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                <div className="doc-card">
                  <div className="doc-card-head">
                    <div>
                      <strong>Unpaid leave paper</strong>
                      <small>Document type · Unpaid_Leave</small>
                    </div>
                    <StatusPill tone={docs?.unpaidLeave?.collected ? "success" : "warning"}>{docs?.unpaidLeave?.collected ? "Collected" : "Not collected"}</StatusPill>
                  </div>
                  <div className="doc-card-body">
                    <span>
                      {docs?.unpaidLeave?.collected ? `Uploaded ${fmtDate(docs.unpaidLeave.uploadedAt?.slice(0, 10))}` : "Paper not in the ERP yet."}
                      {docs?.unpaidLeave?.source === "manual" && <small> · uploaded manually</small>}
                    </span>
                    {documentsTask.status === "open" && !docs?.unpaidLeave?.collected && (
                      <button type="button" className="secondary-button small" onClick={() => dispatch({ type: "UPLOAD_DOCUMENT", housemaidId: maid.id, document: "unpaidLeave", now: Date.now() })}>
                        <Upload size={14} /> Upload manually
                      </button>
                    )}
                  </div>
                  <label className="form-field" style={{ marginTop: 10 }}>
                    <span>Expiry date</span>
                    <input
                      type="date"
                      value={docs?.unpaidLeave?.expiryDate ?? ""}
                      disabled={documentsTask.status !== "open"}
                      onChange={(e) => dispatch({ type: "SET_UNPAID_LEAVE_EXPIRY", housemaidId: maid.id, expiryDate: e.target.value })}
                    />
                  </label>
                </div>

                <div className="doc-card">
                  <div className="doc-card-head">
                    <div>
                      <strong>MMR consent paper</strong>
                      <small>Document type · MMR_cancelation_consent</small>
                    </div>
                    <StatusPill tone={docs?.mmrConsent?.collected ? "success" : "warning"}>{docs?.mmrConsent?.collected ? "Collected" : "Not collected"}</StatusPill>
                  </div>
                  <div className="doc-card-body">
                    <span>
                      {docs?.mmrConsent?.collected ? `Uploaded ${fmtDate(docs.mmrConsent.uploadedAt?.slice(0, 10))}` : "Paper not in the ERP yet."}
                      {docs?.mmrConsent?.source === "manual" && <small> · uploaded manually</small>}
                    </span>
                    {documentsTask.status === "open" && !docs?.mmrConsent?.collected && (
                      <button type="button" className="secondary-button small" onClick={() => dispatch({ type: "UPLOAD_DOCUMENT", housemaidId: maid.id, document: "mmrConsent", now: Date.now() })}>
                        <Upload size={14} /> Upload manually
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Panel>
        )}

        {tab === "media" && (
          <Panel>
            <div className="panel-header">
              <div><h2>Final media</h2><p>The final photo and video delivered at editing.</p></div>
            </div>
            {!finalPhoto && !finalVideo ? (
              <EmptyState title="No final media" hint="Final photo and video appear once editing is done." />
            ) : (
              <div className="raw-media-grid">
                {finalPhoto && (finalPhoto.startsWith("http") ? <img src={finalPhoto} alt="Final photo" /> : <div className="media-file">📷 {finalPhoto}</div>)}
                {finalVideo && (finalVideo.startsWith("http") ? <video src={finalVideo} controls /> : <div className="media-file">🎬 {finalVideo}</div>)}
              </div>
            )}
          </Panel>
        )}

        {tab === "history" && (
          <Panel>
            <div className="panel-header">
              <div><h2>History</h2><p>Every change on this profile, with who and when.</p></div>
            </div>
            {history.length === 0 ? (
              <EmptyState title="No history" hint="Changes to this profile will appear here." />
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {history.map((o) => (
                  <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 9 }}>
                    <div style={{ display: "grid", gap: 2 }}>
                      <strong style={{ fontSize: 12 }}>{OUTCOME_LABEL[o.type]}</strong>
                      {o.note && <small style={{ color: "var(--muted)", fontSize: 12 }}>{o.note}</small>}
                    </div>
                    <span style={{ textAlign: "right", color: "var(--muted)", fontSize: 12 }}>
                      {roleLabel(o.actorRole)} · {fmtDateTime(o.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
