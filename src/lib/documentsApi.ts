import type { Housemaid } from "../data";

/**
 * Mock of the maids.cc "check document status / retrieve files" API (30-minute poll).
 * Returns whether each of the two collected papers has been uploaded to the ERP yet.
 * The real ERP stores them as document types `Unpaid_Leave` and `MMR_cancelation_consent`
 * — note the trailing space and the single-L "cancelation"; matching must tolerate both.
 *
 * The mock is time-based (the physical papers reach the ERP some minutes after the maid
 * was retracted) so the auto-flag-on-upload behaviour is observable without a real API.
 */
export interface ErpDocumentCheck {
  unpaidLeaveUploaded: boolean;
  mmrConsentUploaded: boolean;
  unpaidLeaveUploadedAt?: string;
  mmrConsentUploadedAt?: string;
}

const UNPAID_DELAY_MS = 2 * 60_000; // unpaid-leave paper lands ~2 min after retraction
const CONSENT_DELAY_MS = 5 * 60_000; // consent paper lands ~5 min after retraction

export function checkDocumentsInErp(maid: Housemaid, retractedAt: number, now: number): ErpDocumentCheck {
  void maid;
  const unpaid = now - retractedAt >= UNPAID_DELAY_MS;
  const consent = now - retractedAt >= CONSENT_DELAY_MS;
  return {
    unpaidLeaveUploaded: unpaid,
    mmrConsentUploaded: consent,
    unpaidLeaveUploadedAt: unpaid ? new Date(retractedAt + UNPAID_DELAY_MS).toISOString() : undefined,
    mmrConsentUploadedAt: consent ? new Date(retractedAt + CONSENT_DELAY_MS).toISOString() : undefined,
  };
}
