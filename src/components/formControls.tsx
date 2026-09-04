import { useState } from "react";

/** Shared form controls used by the Retract-to-MaidMatch form and the profile page. */

export function TriState({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div className="form-field">
      <span>{label}</span>
      <div className="tristate">
        <button type="button" className={value === true ? "active" : ""} onClick={() => onChange(true)}>Yes</button>
        <button type="button" className={value === false ? "active" : ""} onClick={() => onChange(false)}>No</button>
        {value === null && <small className="unanswered">unanswered</small>}
      </div>
    </div>
  );
}

export function ChipGroup({ options, value, onChange }: { options: string[]; value: string[]; onChange: (next: string[]) => void }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <div className="chip-group">
      {options.map((o) => (
        <button key={o} type="button" className={value.includes(o) ? "active" : ""} onClick={() => toggle(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="form-field">
      <span>{label}</span>
      <div className="stepper">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Decrease ${label}`}>−</button>
        <strong>{value}</strong>
        <button type="button" onClick={() => onChange(value + 1)} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}

export function MediaField({ label, required, value, onChange }: { label: string; required: boolean; value: string; onChange: (v: string) => void }) {
  const [mode, setMode] = useState<"link" | "upload">("link");
  return (
    <div className="task-input-field">
      <span>
        {label}
        {required && <b>Required</b>}
      </span>
      <div className="media-field">
        <select value={mode} onChange={(e) => setMode(e.target.value as "link" | "upload")} aria-label={`${label} mode`}>
          <option value="link">Link</option>
          <option value="upload">Upload</option>
        </select>
        {mode === "link" ? (
          <input value={value.startsWith("http") ? value : ""} onChange={(e) => onChange(e.target.value)} placeholder="https://..." />
        ) : (
          <input type="file" onChange={(e) => onChange(e.target.files?.[0]?.name ?? "")} />
        )}
      </div>
      {mode === "upload" && value && <small className="uploaded-name">{value}</small>}
    </div>
  );
}
