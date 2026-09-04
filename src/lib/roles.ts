export type RoleId = "sysadmin" | "superadmin" | "retractor" | "media" | "sales" | "receptionist";

export const ROLES: { id: RoleId; label: string }[] = [
  { id: "sysadmin", label: "System Admin" },
  { id: "superadmin", label: "Super Admin" },
  { id: "retractor", label: "Retractor" },
  { id: "media", label: "Media Team" },
  { id: "sales", label: "Sales" },
  { id: "receptionist", label: "Receptionist" },
];

export type NavKey =
  | "dashboard" | "teamwork" | "reception" | "directory"
  | "retraction" | "documents" | "media" | "publishing"
  | "users" | "config";

export const ROLE_ACCESS: Record<RoleId, NavKey[]> = {
  sysadmin: ["dashboard","teamwork","reception","directory","retraction","documents","media","publishing","users","config"],
  superadmin: ["dashboard","teamwork","reception","directory","retraction","documents","media","publishing","users","config"],
  retractor: ["dashboard","teamwork","directory","retraction","documents","publishing"],
  media: ["dashboard","teamwork","media"],
  sales: ["dashboard","teamwork","directory","media","publishing"],
  receptionist: ["dashboard","teamwork","reception","directory"],
};

export const ADMIN_ROLES: RoleId[] = ["sysadmin", "superadmin"];

export function canAccess(role: RoleId, key: NavKey): boolean {
  return ROLE_ACCESS[role].includes(key);
}

export function visibleNav(role: RoleId): NavKey[] {
  return ROLE_ACCESS[role];
}
