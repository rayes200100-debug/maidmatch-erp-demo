import { FileCheck2, Upload, ExternalLink, AlertTriangle } from "lucide-react";
import type { Task, DocumentKind } from "../data";
import { StatusPill } from "./primitives";

interface DocumentsPanelProps {
  task: Task;
  onUpload: (document: DocumentKind) => void;
  onSetExpiry: (date: string) => void;
}

function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function DocumentsPanel({ task, onUpload, onSetExpiry }: DocumentsPanelProps) {
  const docs = task.metadata?.documents;
  const unpaid = docs?.unpaidLeave;
  const consent = docs?.mmrConsent;
  const error = docs?.lastCheckError;

  const bothIn = !!unpaid?.collected && !!consent?.collected;
  const waitingOnExpiry = bothIn && !unpaid?.expiryDate;

  return (
    <>
      <div className="task-heading">
        <div className="task-symbol">
          <FileCheck2 size={20} />
        </div>
        <div>
          <h1>Collect Documents</h1>
          <p>She is not handed to the media team until both papers are in and the unpaid-leave expiry date is recorded.</p>
          <div className="task-meta">
            <StatusPill tone="neutral">Documents Collection</StatusPill>
            <span className="task-code">{task.id}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="validation-summary" role="alert" style={{ marginBottom: 14 }}>
          <AlertTriangle size={16} />
          <div>
            <strong>Could not reach the ERP</strong>
            <span>{error}. The document is not marked collected.</span>
          </div>
        </div>
      )}

      {waitingOnExpiry && (
        <div className="outcome-effect warning" style={{ marginBottom: 14 }}>
          <AlertTriangle size={16} />
          <span>
            <strong>Both papers are in — the unpaid-leave expiry date is the last step.</strong>
            <small>This task closes itself once that date is saved.</small>
          </span>
        </div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        <div className="doc-card">
          <div className="doc-card-head">
            <div>
              <strong>Unpaid leave paper</strong>
              <small>Document type · Unpaid_Leave</small>
            </div>
            <StatusPill tone={unpaid?.collected ? "success" : "warning"}>{unpaid?.collected ? "Collected" : "Not collected"}</StatusPill>
          </div>
          {unpaid?.collected ? (
            <div className="doc-card-body">
              <span>
                Uploaded {fmtDateTime(unpaid.uploadedAt)}
                <small>{unpaid.source === "manual" ? " · uploaded manually" : " · retrieved from ERP"}</small>
              </span>
              <button type="button" className="text-button" onClick={() => window.open(`erp://documents/Unpaid_Leave`, "_blank")}>
                <ExternalLink size={13} /> View
              </button>
            </div>
          ) : (
            <div className="doc-card-body">
              <span>Paper not in the ERP yet.</span>
              <button type="button" className="secondary-button small" onClick={() => onUpload("unpaidLeave")}>
                <Upload size={14} /> Upload manually
              </button>
            </div>
          )}
          <label className="form-field" style={{ marginTop: 10 }}>
            <span>Expiry date (required — the ERP does not derive it)</span>
            <input
              type="date"
              value={unpaid?.expiryDate ?? ""}
              onChange={(e) => onSetExpiry(e.target.value)}
              aria-label="Unpaid leave expiry date"
            />
          </label>
        </div>

        <div className="doc-card">
          <div className="doc-card-head">
            <div>
              <strong>MMR consent paper</strong>
              <small>Document type · MMR_cancelation_consent</small>
            </div>
            <StatusPill tone={consent?.collected ? "success" : "warning"}>{consent?.collected ? "Collected" : "Not collected"}</StatusPill>
          </div>
          {consent?.collected ? (
            <div className="doc-card-body">
              <span>
                Uploaded {fmtDateTime(consent.uploadedAt)}
                <small>{consent.source === "manual" ? " · uploaded manually" : " · retrieved from ERP"}</small>
              </span>
              <button type="button" className="text-button" onClick={() => window.open(`erp://documents/MMR_cancelation_consent`, "_blank")}>
                <ExternalLink size={13} /> View
              </button>
            </div>
          ) : (
            <div className="doc-card-body">
              <span>Paper not in the ERP yet.</span>
              <button type="button" className="secondary-button small" onClick={() => onUpload("mmrConsent")}>
                <Upload size={14} /> Upload manually
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="no-fields-note" style={{ marginTop: 14 }}>
        <FileCheck2 size={16} />
        <span>
          <strong>Completes by itself</strong>
          <small>No "done" button — this task closes and hands her to Media once both papers are collected and the expiry date is saved.</small>
        </span>
      </div>
    </>
  );
}
