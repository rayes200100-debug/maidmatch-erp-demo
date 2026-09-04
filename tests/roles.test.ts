import { describe, it, expect } from "vitest";
import { canAccess, visibleNav, type NavKey } from "../src/lib/roles";

const ALL: NavKey[] = ["dashboard", "teamwork", "reception", "directory", "retraction", "documents", "media", "publishing", "users", "config"];

describe("role visibility", () => {
  it("admins see everything", () => {
    for (const role of ["sysadmin", "superadmin"] as const) {
      expect(visibleNav(role)).toEqual(ALL);
    }
  });

  it("retractor sees directory, retraction, documents and publishing (not reception/media/config)", () => {
    expect(visibleNav("retractor")).toEqual(["dashboard", "teamwork", "directory", "retraction", "documents", "publishing"]);
    expect(canAccess("retractor", "media")).toBe(false);
    expect(canAccess("retractor", "reception")).toBe(false);
    expect(canAccess("retractor", "config")).toBe(false);
  });

  it("media sees only media flow", () => {
    expect(visibleNav("media")).toEqual(["dashboard", "teamwork", "media"]);
    expect(canAccess("media", "publishing")).toBe(false);
  });

  it("sales sees directory, media and publishing", () => {
    expect(visibleNav("sales")).toEqual(["dashboard", "teamwork", "directory", "media", "publishing"]);
    expect(canAccess("sales", "retraction")).toBe(false);
  });

  it("receptionist sees reception and directory only", () => {
    expect(visibleNav("receptionist")).toEqual(["dashboard", "teamwork", "reception", "directory"]);
    expect(canAccess("receptionist", "retraction")).toBe(false);
    expect(canAccess("receptionist", "publishing")).toBe(false);
    expect(canAccess("receptionist", "media")).toBe(false);
  });
});
