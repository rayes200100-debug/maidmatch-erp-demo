import { describe, it, expect } from "vitest";
import { canAccess, visibleNav, type NavKey } from "../src/lib/roles";

const ALL: NavKey[] = ["dashboard", "teamwork", "reception", "directory", "retraction", "media", "publishing", "users", "config"];

describe("role visibility", () => {
  it("admins see everything", () => {
    for (const role of ["sysadmin", "superadmin"] as const) {
      expect(visibleNav(role)).toEqual(ALL);
    }
  });

  it("retractor sees reception, directory, retraction and publishing (not media/config)", () => {
    expect(visibleNav("retractor")).toEqual(["dashboard", "teamwork", "reception", "directory", "retraction", "publishing"]);
    expect(canAccess("retractor", "media")).toBe(false);
    expect(canAccess("retractor", "config")).toBe(false);
  });

  it("media sees only media flow", () => {
    expect(visibleNav("media")).toEqual(["dashboard", "teamwork", "media"]);
    expect(canAccess("media", "publishing")).toBe(false);
  });

  it("sales sees directory and publishing only", () => {
    expect(visibleNav("sales")).toEqual(["dashboard", "teamwork", "directory", "publishing"]);
    expect(canAccess("sales", "retraction")).toBe(false);
  });
});
