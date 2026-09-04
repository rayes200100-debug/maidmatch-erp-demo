import type { Housemaid, PublishState, PlatformPublish } from "../data";
import type { Task } from "../data";
import type { Platform } from "../lib/stages";
import { PLATFORMS } from "../lib/stages";

export function emptyPlatforms(): Record<Platform, PlatformPublish> {
  return {
    maidmatch: { status: "pending" },
    peekaboo: { status: "pending" },
    yaya: { status: "pending" },
  };
}

/**
 * Whether a profile can be published, or the reason it is held. The payload is the
 * final photo + video plus the retraction form's maid information — a missing
 * required field or asset holds the profile rather than posting it incomplete.
 */
export function publishHoldReason(maid: Housemaid, metadata?: Task["metadata"]): string | null {
  if (!metadata?.finalPhoto) return "Final photo missing";
  if (!metadata?.finalVideo) return "Final video missing";
  const p = maid.maidMatchProfile;
  if (!p || !p.livingArrangement || p.expectedSalaryMin == null || p.expectedSalaryMax == null) {
    return "Profile information incomplete";
  }
  return null;
}

/** The publish state a task starts with — held if required data is missing, else all pending. */
export function initialPublishState(maid: Housemaid, metadata?: Task["metadata"]): PublishState {
  const heldReason = publishHoldReason(maid, metadata) ?? undefined;
  return { heldReason, platforms: emptyPlatforms() };
}

/**
 * Mock of the three publishing APIs (maidmatch.ae, Peekaboo, Yaya Middle East — PB-*).
 * A held profile is never posted. Deterministic failure so the failed/retry states are
 * observable without a real API.
 */
export function attemptPost(maid: Housemaid, metadata: Task["metadata"], platform: Platform): { ok: boolean; reason?: string } {
  const hold = publishHoldReason(maid, metadata);
  if (hold) return { ok: false, reason: hold };
  if (maid.id === "h015" && platform === "yaya") {
    return { ok: false, reason: "Yaya Middle East rejected the video duration" };
  }
  return { ok: true };
}

export { PLATFORMS };
