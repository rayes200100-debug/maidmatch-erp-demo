export type RoleId = "sysadmin" | "superadmin" | "retractor" | "media" | "sales";

export const ROLES: { id: RoleId; label: string }[] = [
  { id: "sysadmin", label: "System Admin" },
  { id: "superadmin", label: "Super Admin" },
  { id: "retractor", label: "Retractor" },
  { id: "media", label: "Media Team" },
  { id: "sales", label: "Sales" },
];

export type NavKey =
  | "dashboard" | "teamwork" | "reception"
  | "retraction" | "media" | "publishing"
  | "users" | "config";

export const ROLE_ACCESS: Record<RoleId, NavKey[]> = {
  sysadmin: ["dashboard","teamwork","reception","retraction","media","publishing","users","config"],
  superadmin: ["dashboard","teamwork","reception","retraction","media","publishing","users","config"],
  retractor: ["dashboard","teamwork","reception","retraction","publishing"],
  media: ["dashboard","teamwork","media"],
  sales: ["dashboard","teamwork","publishing"],
};

export const ADMIN_ROLES: RoleId[] = ["sysadmin", "superadmin"];

export function canAccess(role: RoleId, key: NavKey): boolean {
  return ROLE_ACCESS[role].includes(key);
}

export function visibleNav(role: RoleId): NavKey[] {
  return ROLE_ACCESS[role];
}
