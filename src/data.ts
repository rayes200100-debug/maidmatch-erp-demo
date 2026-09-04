import type { RoleId } from "./lib/roles";
import type { Stage, TaskType, OutcomeType, Platform } from "./lib/stages";
import type { PriorityAlgorithm } from "./lib/priority";
import type { WorkingHours } from "./lib/hours";

export type HousemaidType = "MV" | "CC live-in" | "CC live-out" | "Cleaner";

/** MV sub-types, sourced from maids.cc (RD-6 — values to be confirmed against the real enumeration). */
export const MV_SUBTYPES = ["MV to MV", "CC to MV", "Travel Assist", "Normal MV"] as const;
export type MvSubType = (typeof MV_SUBTYPES)[number];

export interface Complaint {
  title: string;
  summary: string;
  dateRaised: string; // ISO date
  status: "open" | "closed";
  assignedTo: string; // "Retractor" | "Retraction team" | other team name
  erpLink: string;
}

export interface EmploymentEntry {
  employerName: string;
  startDate: string;
  endDate: string;
  salary: number;
  reason?: string; // termination / cancellation reason
}

export type WpsStatus = "Paid" | "Pending" | "Not sent";

export interface WpsEntry {
  month: string; // e.g. "2026-08"
  amount: number;
  status: WpsStatus;
}

export interface Housemaid {
  id: string;
  name: string;
  nationality: string;
  age: number;
  birthday?: string;
  housemaidType: HousemaidType;
  subType?: string;
  mobile: string;
  whatsapp: string;
  visaStartDate: string;
  visaExpiry: string;
  passportExpiry: string;
  passportNumber: string;
  arrivalDate: string;
  salary: number;
  wpsHistory: WpsEntry[];
  employmentHistory: EmploymentEntry[];
  terminationSummary?: string;
  complaints: Complaint[];
  isGoldenProfile: boolean;
  maidsCcId: string;
  room?: string;
  photoUrl?: string;
  employerName?: string;
  maidsCcProfileLink?: string;
  maidMatchProfile?: MaidMatchProfile;
  currentStage: Stage;
}

/** Human "type and sub-type" label. MV shows "MV · {sub-type}"; CC live-in/out and Cleaner show the type alone. */
export function maidTypeLabel(maid: Pick<Housemaid, "housemaidType" | "subType">): string {
  return maid.housemaidType === "MV" ? (maid.subType ? `MV · ${maid.subType}` : "MV") : maid.housemaidType;
}

/** A CC live-in maid is handled via the accommodation collection panel, not the walk-in search. */
export function isCcLiveIn(maid: Pick<Housemaid, "housemaidType">): boolean {
  return maid.housemaidType === "CC live-in";
}

/* ------------------------------------------------------------------ *
 * MaidMatch profile (captured at "Retract to MaidMatch", stored here) *
 * ------------------------------------------------------------------ */

export interface MaidMatchProfile {
  joinedMaidMatchAt?: string; // filled on confirm
  unpaidLeaveDueDate?: string; // computed & stored on confirm (replaces the preview)
  hasClient: boolean | null; // tri-state: null = unanswered
  disclosedClient: boolean | null;
  prospectName?: string;
  prospectPhone?: string;
  spouseName?: string;
  spousePhone?: string;
  source?: string;
  maritalStatus?: string;
  kids: number;
  birthday?: string;
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  livingArrangement?: "Live-in" | "Live-out";
  daysOffPerWeek: number;
  cities: string[];
  email?: string;
  yearsExperience?: string;
  childcare: boolean | null;
  childcareAgeBands: string[];
  cook: boolean | null;
  pets: boolean | null;
  petsTypes: string[];
  smoker: boolean | null;
  languages: string[];
  languageOther?: string;
  certifications: boolean | null;
  certificationTypes: string[];
  certificationOther?: string;
  education?: string;
  tasksSkills: string[];
}

export const TERMINATION_REASONS = [
  "Health issues",
  "Expired visa",
  "Legal risk",
  "Over age",
  "Traveling home",
  "Will change her career",
  "Wants gratuity/benefits",
  "Found her own employer",
  "No place to go",
];

export const SOURCE_OPTIONS = ["Referral", "Old employer", "Facebook group", "MaidMatch or Peekaboo", "Word of mouth", "Other"];
export const MARITAL_STATUS_OPTIONS = ["Single", "Married", "Widowed", "Divorced"];
export const CITY_OPTIONS = ["Dubai", "Abu Dhabi", "Sharjah", "All UAE"];
export const EXPERIENCE_OPTIONS = ["1+", "3+", "5+"];
export const CHILDCARE_AGE_BANDS = ["Infants", "Toddlers", "Preschool", "School age"];
export const PETS_TYPES = ["Cats", "Dogs", "Birds", "Other"];
export const LANGUAGE_OPTIONS = ["English", "Arabic", "Other"];
export const CERTIFICATION_TYPES = ["Special Needs", "First Aid", "Other"];
export const EDUCATION_OPTIONS = ["No High School", "High School", "Bachelor's degree", "Other"];
export const TASKS_SKILLS = ["Caregiver", "Cleaning", "Laundry", "Ironing", "Tutoring", "Driving"];

export interface Task {
  id: string;
  housemaidId: string;
  type: TaskType;
  status: "open" | "closed";
  assignedRole: RoleId | "None";
  sentByRole?: RoleId;
  createdAt: number;
  openedAt?: number;
  closedAt?: number;
  metadata?: {
    stockPhotoUrl?: string;
    stockVideoUrl?: string;
    editorNote?: string;
    finalPhoto?: string;
    finalVideo?: string;
    comment?: string;
    publish?: PublishState;
    employerName?: string;
    maidsCcProfileLink?: string;
    terminationReason?: string;
    handNote?: string;
    grantedAmount?: number;
    documents?: DocumentsState;
  };
}

/* ------------------------------------------------------------------ *
 * Publishing (Available Pending Publishing)                           *
 * ------------------------------------------------------------------ */

export type PublishStatus = "pending" | "posted" | "failed";

export interface PlatformPublish {
  status: PublishStatus;
  failureReason?: string;
  postedAt?: number;
  source?: "auto" | "manual";
}

export interface PublishState {
  /** Set when a required field/asset is missing — the profile is held, not posted. */
  heldReason?: string;
  platforms: Record<Platform, PlatformPublish>;
  lastAttemptAt?: number;
  lastFailedAt?: number;
  /** Set once all three platforms are green — the success is logged back to maids.cc. */
  erpNotifiedAt?: number;
}

/** Fixed list of hold reasons, so held profiles can be worked through as a queue. */
export const PUBLISH_HOLD_REASONS = [
  "Final photo missing",
  "Final video missing",
  "Profile information incomplete",
] as const;

/* ------------------------------------------------------------------ *
 * Document collection (Collect Documents step)                        *
 * ------------------------------------------------------------------ */

export type DocumentKind = "unpaidLeave" | "mmrConsent";

export interface DocumentStatus {
  collected: boolean;
  uploadedAt?: string; // ISO timestamp — always read back from the ERP, never typed
  expiryDate?: string; // unpaid leave only — user-entered in MaidMatch
  source?: "erp" | "manual";
}

export interface DocumentsState {
  unpaidLeave?: DocumentStatus;
  mmrConsent?: DocumentStatus;
  lastCheckedAt?: number;
  lastCheckError?: string | null;
}

export interface Outcome {
  id: string;
  housemaidId: string;
  type: OutcomeType;
  timestamp: number;
  actorRole: RoleId;
  note?: string;
  metadata?: Record<string, unknown>;
}

export interface ErpIntegrationSetting {
  complaintType: string;
  handlingTeam: string;
}

export interface SystemConfig {
  breakDurationMinutes: number;
  maxBreaksPerDay: number;
  priorityAlgorithm: PriorityAlgorithm;
  liveInPriority: boolean;
  terminationReasons: string[];
  retiredTerminationReasons: string[];
  erpIntegrations: {
    offboarding: ErpIntegrationSetting;
    payroll: ErpIntegrationSetting;
  };
  goldenProfile: {
    nationalities: string[];
    ageMin: number;
    ageMax: number;
    visaExpiryMonthsMin: number;
    visaExpiryMonthsMax: number;
    housemaidTypes: HousemaidType[];
  };
  workingHours: WorkingHours;
  daysOff: number[];
  defaultRolePerTask: Record<TaskType, RoleId | "None">;
}

export interface User { id: string; name: string; email: string; roles: RoleId[]; }

export const HOUSEMAID_TYPE_OPTIONS: HousemaidType[] = ["MV", "CC live-in", "CC live-out", "Cleaner"];

export const NATIONALITY_OPTIONS = ["Filipino", "Ethiopian", "Kenyan", "Sri Lankan", "Indian", "Nepali"];

export const defaultConfig: SystemConfig = {
  breakDurationMinutes: 15,
  maxBreaksPerDay: 3,
  priorityAlgorithm: "FIFO",
  liveInPriority: true,
  terminationReasons: TERMINATION_REASONS,
  retiredTerminationReasons: [],
  erpIntegrations: {
    offboarding: { complaintType: "Offboarding", handlingTeam: "Offboarding team" },
    payroll: { complaintType: "Payroll", handlingTeam: "Payroll team" },
  },
  goldenProfile: {
    nationalities: ["Filipino"],
    ageMin: 18,
    ageMax: 45,
    visaExpiryMonthsMin: 0,
    visaExpiryMonthsMax: 120,
    housemaidTypes: ["MV", "CC live-in", "CC live-out", "Cleaner"],
  },
  workingHours: { startHour: 8, endHour: 20 },
  daysOff: [0, 6],
  defaultRolePerTask: {
    retraction: "retractor",
    documents: "retractor",
    shooting: "media",
    editing: "media",
    publishing: "sales",
    available: "sales",
    trial: "sales",
  },
};

/** Payload returned by the (mock) "CC live-in due today" API — one call per hour. */
export interface CcLiveInDuePayload {
  maidsCcId: string;
  name: string;
  photoUrl?: string;
  nationality: string;
  age: number;
  room: string;
  visaExpiry: string;
  dueReason: string;
}

/** A row on the CC live-in panel, enriched with local state on ingest. */
export interface CcLiveInEntry extends CcLiveInDuePayload {
  addedAt: number;
  collected: boolean;
  collectedAt?: number;
  housemaidId?: string;
}

export interface CcLiveInState {
  items: CcLiveInEntry[];
  lastRefreshedAt: number | null;
  lastSuccessfulAt: number | null;
  lastRefreshError: string | null;
}

function wps(months: [string, number, WpsStatus][]): WpsEntry[] {
  return months.map(([month, amount, status]) => ({ month, amount, status }));
}

const DEFAULT_WPS = wps([
  ["2026-08", 2000, "Paid"],
  ["2026-07", 2000, "Paid"],
  ["2026-06", 2000, "Pending"],
]);

function mk(id: string, overrides: Partial<Housemaid> = {}): Housemaid {
  return {
    id,
    name: id,
    nationality: "Filipino",
    age: 30,
    housemaidType: "MV",
    subType: "Normal MV",
    mobile: "",
    whatsapp: "",
    visaStartDate: "2025-06-01",
    visaExpiry: "2027-01-01",
    passportExpiry: "2030-01-01",
    passportNumber: "",
    arrivalDate: "2026-09-12",
    salary: 2000,
    wpsHistory: DEFAULT_WPS,
    employmentHistory: [],
    complaints: [],
    isGoldenProfile: false,
    maidsCcId: "",
    currentStage: "Reception",
    ...overrides,
  };
}

export const seedHousemaids: Housemaid[] = [
  mk("h001", {
    name: "Maria Santos", nationality: "Filipino", age: 28, housemaidType: "MV", subType: "Normal MV",
    mobile: "+971 50 100 1201", whatsapp: "+971 50 100 1201", visaStartDate: "2025-06-10",
    visaExpiry: "2026-12-10", passportExpiry: "2030-04-10", passportNumber: "P0123456", arrivalDate: "2026-09-12",
    salary: 2200, employmentHistory: [{ employerName: "Al Fahidi family", startDate: "2024-06-01", endDate: "2026-08-30", salary: 2000, reason: "Contract completed" }],
    complaints: [], currentStage: "Reception",
  }),
  mk("h002", {
    name: "Amina Bekele", nationality: "Ethiopian", age: 31, housemaidType: "MV", subType: "CC to MV",
    mobile: "+971 55 200 1202", whatsapp: "+971 55 200 1202", visaStartDate: "2025-08-14",
    visaExpiry: "2027-02-14", passportExpiry: "2029-08-22", arrivalDate: "2026-09-05",
    salary: 1900, employmentHistory: [{ employerName: "Al Qasimi family", startDate: "2023-01-01", endDate: "2026-07-31", salary: 1700, reason: "Employer relocated" }],
    maidsCcId: "CC-1042", currentStage: "Reception",
  }),
  mk("h003", {
    name: "Priya Sharma", nationality: "Indian", age: 26, housemaidType: "MV", subType: "Normal MV",
    mobile: "+971 52 300 1203", whatsapp: "+971 52 300 1203", visaStartDate: "2025-04-30",
    visaExpiry: "2026-10-30", passportExpiry: "2031-01-15", arrivalDate: "2026-09-20",
    salary: 2100, employmentHistory: [{ employerName: "Couple in Sharjah", startDate: "2025-01-01", endDate: "2026-09-01", salary: 1900 }],
    currentStage: "Reception",
  }),
  mk("h004", {
    name: "Joy Reyes", nationality: "Filipino", age: 30, housemaidType: "MV", subType: "Normal MV",
    mobile: "+971 50 400 1204", whatsapp: "+971 50 400 1204", visaStartDate: "2025-09-15",
    visaExpiry: "2027-03-15", passportExpiry: "2030-09-01", arrivalDate: "2026-08-28",
    salary: 2500, isGoldenProfile: true,
    employmentHistory: [
      { employerName: "Al Mansoori family", startDate: "2022-01-01", endDate: "2026-02-28", salary: 2300, reason: "Contract completed" },
      { employerName: "Hong Kong family", startDate: "2020-01-01", endDate: "2021-12-01", salary: 4000 },
    ],
    currentStage: "PendingRetraction",
  }),
  mk("h005", {
    name: "Lineth Wanjiru", nationality: "Kenyan", age: 29, housemaidType: "CC live-out",
    mobile: "+971 56 500 1205", whatsapp: "+971 56 500 1205", visaStartDate: "2025-12-20",
    visaExpiry: "2027-06-20", passportExpiry: "2030-11-30", arrivalDate: "2026-09-01",
    salary: 1800,
    employmentHistory: [{ employerName: "Large family, Dubai", startDate: "2024-01-01", endDate: "2026-06-30", salary: 1600, reason: "Dispute over hours" }],
    terminationSummary: "Ended after a dispute over working hours; employer reported late arrival.",
    complaints: [{ title: "Late arrival", summary: "Employer reported repeated late arrival to the shift.", dateRaised: "2026-05-12", status: "closed", assignedTo: "Retraction team", erpLink: "erp://complaints/c-5021" }],
    maidsCcId: "CC-1098", currentStage: "PendingRetraction",
  }),
  mk("h006", {
    name: "Nimali Perera", nationality: "Sri Lankan", age: 33, housemaidType: "MV", subType: "Travel Assist",
    mobile: "+971 50 600 1206", whatsapp: "+971 50 600 1206", visaStartDate: "2025-06-01",
    visaExpiry: "2026-12-01", passportExpiry: "2030-06-18", arrivalDate: "2026-08-15",
    salary: 2000, employmentHistory: [{ employerName: "Al Marri family", startDate: "2021-01-01", endDate: "2026-05-31", salary: 1800 }],
    currentStage: "PendingRetraction",
  }),
  mk("h007", {
    name: "Angel Dela Cruz", nationality: "Filipino", age: 27, housemaidType: "MV", subType: "Normal MV",
    mobile: "+971 54 700 1207", whatsapp: "+971 54 700 1207", visaStartDate: "2025-11-20",
    visaExpiry: "2027-05-20", passportExpiry: "2031-03-05", arrivalDate: "2026-09-18",
    salary: 2400, isGoldenProfile: true, employmentHistory: [{ employerName: "Al Shamsi family", startDate: "2024-01-01", endDate: "2026-06-30", salary: 2200 }],
    currentStage: "PendingRetraction",
  }),
  mk("h008", {
    name: "Grace Mendoza", nationality: "Filipino", age: 29, housemaidType: "MV", subType: "Normal MV",
    mobile: "+971 50 800 1208", whatsapp: "+971 50 800 1208", visaStartDate: "2026-02-01",
    visaExpiry: "2027-08-01", passportExpiry: "2030-12-12", arrivalDate: "2026-08-10",
    salary: 2600, isGoldenProfile: true, employmentHistory: [{ employerName: "Al Falasi family", startDate: "2023-01-01", endDate: "2026-05-31", salary: 2400 }],
    currentStage: "PendingShooting",
  }),
  mk("h009", {
    name: "Sunita Gurung", nationality: "Nepali", age: 34, housemaidType: "MV", subType: "CC to MV",
    mobile: "+971 55 900 1209", whatsapp: "+971 55 900 1209", visaStartDate: "2025-07-25",
    visaExpiry: "2027-01-25", passportExpiry: "2029-10-02", arrivalDate: "2026-07-30",
    salary: 1850, employmentHistory: [{ employerName: "Abu Dhabi family", startDate: "2020-01-01", endDate: "2026-04-30", salary: 1650 }],
    maidsCcId: "CC-1144", currentStage: "PendingShooting",
  }),
  mk("h010", {
    name: "Fatima Hassan", nationality: "Ethiopian", age: 25, housemaidType: "MV", subType: "Normal MV",
    mobile: "+971 52 101 1210", whatsapp: "+971 52 101 1210", visaStartDate: "2026-03-15",
    visaExpiry: "2027-09-15", passportExpiry: "2031-07-08", arrivalDate: "2026-08-01",
    salary: 1950, employmentHistory: [{ employerName: "Couple, Dubai", startDate: "2025-01-01", endDate: "2026-07-01", salary: 1800 }],
    currentStage: "PendingShooting",
  }),
  mk("h011", {
    name: "Rachel Aquino", nationality: "Filipino", age: 32, housemaidType: "MV", subType: "Normal MV",
    mobile: "+971 50 202 1211", whatsapp: "+971 50 202 1211", visaStartDate: "2025-06-15",
    visaExpiry: "2026-12-15", passportExpiry: "2030-02-20", arrivalDate: "2026-07-25",
    salary: 2700, isGoldenProfile: true,
    employmentHistory: [
      { employerName: "Al Nahyan family", startDate: "2021-01-01", endDate: "2026-03-31", salary: 2500 },
      { employerName: "Singapore family", startDate: "2019-01-01", endDate: "2020-12-01", salary: 3500 },
    ],
    currentStage: "PendingEditing",
  }),
  mk("h012", {
    name: "Wanjiku Kamau", nationality: "Kenyan", age: 36, housemaidType: "CC live-out",
    mobile: "+971 56 303 1212", whatsapp: "+971 56 303 1212", visaStartDate: "2025-10-05",
    visaExpiry: "2027-04-05", passportExpiry: "2029-12-19", arrivalDate: "2026-07-01",
    salary: 1750, employmentHistory: [{ employerName: "Family of 7, Dubai", startDate: "2019-01-01", endDate: "2026-02-28", salary: 1550 }],
    maidsCcId: "CC-1188", currentStage: "PendingEditing",
  }),
  mk("h013", {
    name: "Lakshmi Nair", nationality: "Indian", age: 30, housemaidType: "MV", subType: "Normal MV",
    mobile: "+971 52 404 1213", whatsapp: "+971 52 404 1213", visaStartDate: "2025-08-08",
    visaExpiry: "2027-02-08", passportExpiry: "2031-05-25", arrivalDate: "2026-08-20",
    salary: 2050, employmentHistory: [{ employerName: "Family of 4, Sharjah", startDate: "2023-01-01", endDate: "2026-06-30", salary: 1850 }],
    currentStage: "PendingEditing",
  }),
  mk("h014", {
    name: "Christine Bautista", nationality: "Filipino", age: 28, housemaidType: "MV", subType: "Normal MV",
    mobile: "+971 50 505 1214", whatsapp: "+971 50 505 1214", visaStartDate: "2025-08-28",
    visaExpiry: "2027-02-28", passportExpiry: "2030-10-14", arrivalDate: "2026-07-10",
    salary: 2500, isGoldenProfile: true, employmentHistory: [{ employerName: "Al Suwaidi family", startDate: "2024-01-01", endDate: "2026-05-31", salary: 2300 }],
    maidMatchProfile: {
      hasClient: false, disclosedClient: false, kids: 1, cities: ["Dubai"],
      livingArrangement: "Live-in", expectedSalaryMin: 2200, expectedSalaryMax: 2800, daysOffPerWeek: 1,
      yearsExperience: "3+", childcare: true, childcareAgeBands: ["Toddlers"], cook: true,
      pets: false, petsTypes: [], smoker: false, languages: ["English"],
      certifications: false, certificationTypes: [], education: "High School", tasksSkills: ["Cleaning", "Laundry"],
    },
    currentStage: "AvailablePendingPublishing",
  }),
  mk("h015", {
    name: "Deepa Rai", nationality: "Nepali", age: 31, housemaidType: "MV", subType: "CC to MV",
    mobile: "+971 55 606 1215", whatsapp: "+971 55 606 1215", visaStartDate: "2026-01-12",
    visaExpiry: "2027-07-12", passportExpiry: "2029-09-09", arrivalDate: "2026-07-05",
    salary: 1900, employmentHistory: [{ employerName: "Abu Dhabi family", startDate: "2022-01-01", endDate: "2026-03-31", salary: 1700 }],
    complaints: [{ title: "Contract dispute", summary: "Previous employer disputed the contract end date.", dateRaised: "2026-03-20", status: "closed", assignedTo: "Retraction team", erpLink: "erp://complaints/c-5330" }],
    maidsCcId: "CC-1207",
    maidMatchProfile: {
      hasClient: true, disclosedClient: true, prospectName: "Al Mansouri", prospectPhone: "055 123 4567",
      source: "Referral", kids: 0, cities: ["Abu Dhabi", "All UAE"],
      livingArrangement: "Live-out", expectedSalaryMin: 1800, expectedSalaryMax: 2200, daysOffPerWeek: 1,
      yearsExperience: "3+", childcare: false, childcareAgeBands: [], cook: true,
      pets: false, petsTypes: [], smoker: false, languages: ["English", "Arabic"],
      certifications: false, certificationTypes: [], education: "High School", tasksSkills: ["Cleaning", "Caregiver"],
    },
    currentStage: "AvailablePendingPublishing",
  }),
  mk("h016", {
    name: "Marites Lopez", nationality: "Filipino", age: 26, housemaidType: "MV", subType: "Normal MV",
    mobile: "+971 50 707 1216", whatsapp: "+971 50 707 1216", visaStartDate: "2025-12-10",
    visaExpiry: "2027-06-10", passportExpiry: "2031-01-30", arrivalDate: "2026-07-15",
    salary: 2450, isGoldenProfile: true, employmentHistory: [{ employerName: "Family of 4, Dubai", startDate: "2024-01-01", endDate: "2026-05-31", salary: 2200 }],
    maidsCcProfileLink: "https://maids.cc/profile/h016", currentStage: "AvailablePublished",
  }),
  mk("h017", {
    name: "Abeba Tesfaye", nationality: "Ethiopian", age: 30, housemaidType: "MV", subType: "Normal MV",
    mobile: "+971 52 808 1217", whatsapp: "+971 52 808 1217", visaStartDate: "2025-11-01",
    visaExpiry: "2027-05-01", passportExpiry: "2030-03-28", arrivalDate: "2026-07-01",
    salary: 1950, employmentHistory: [{ employerName: "Family of 3, Dubai", startDate: "2023-01-01", endDate: "2026-06-30", salary: 1800 }],
    maidsCcProfileLink: "https://maids.cc/profile/h017", currentStage: "AvailablePublished",
  }),
  mk("h018", {
    name: "Kamala Silva", nationality: "Sri Lankan", age: 35, housemaidType: "MV", subType: "CC to MV",
    mobile: "+971 50 909 1218", whatsapp: "+971 50 909 1218", visaStartDate: "2025-07-18",
    visaExpiry: "2027-01-18", passportExpiry: "2029-11-21", arrivalDate: "2026-06-25",
    salary: 1850, employmentHistory: [{ employerName: "Family of 6, Dubai", startDate: "2020-01-01", endDate: "2026-02-28", salary: 1650 }],
    maidsCcId: "CC-1239", maidsCcProfileLink: "https://maids.cc/profile/h018", currentStage: "AvailablePublished",
  }),
  mk("h019", {
    name: "Rowena Garcia", nationality: "Filipino", age: 29, housemaidType: "MV", subType: "Normal MV",
    mobile: "+971 54 111 1219", whatsapp: "+971 54 111 1219", visaStartDate: "2025-10-05",
    visaExpiry: "2027-04-05", passportExpiry: "2030-07-16", arrivalDate: "2026-06-10",
    salary: 2600, isGoldenProfile: true, employmentHistory: [{ employerName: "Family of 4, Dubai", startDate: "2023-01-01", endDate: "2026-05-31", salary: 2400 }],
    employerName: "Al Habtoor Family", maidsCcProfileLink: "https://maids.cc/profile/h019", currentStage: "UnderTrial",
  }),
  mk("h020", {
    name: "Mercy Otieno", nationality: "Kenyan", age: 33, housemaidType: "CC live-out",
    mobile: "+971 56 212 1220", whatsapp: "+971 56 212 1220", visaStartDate: "2025-09-30",
    visaExpiry: "2027-03-30", passportExpiry: "2029-10-11", arrivalDate: "2026-06-05",
    salary: 1800, employmentHistory: [{ employerName: "Family of 5, Dubai", startDate: "2022-01-01", endDate: "2026-04-30", salary: 1600 }],
    maidsCcId: "CC-1266", employerName: "Rashid Family", currentStage: "UnderTrial",
  }),
  mk("h021", {
    name: "Ana Villanueva", nationality: "Filipino", age: 38, housemaidType: "CC live-in",
    mobile: "+971 50 313 1221", whatsapp: "+971 50 313 1221", visaStartDate: "2025-12-20",
    visaExpiry: "2026-11-20", passportExpiry: "2029-05-08", arrivalDate: "2026-05-01",
    salary: 1700, room: "Villa 2 · Room 05", employmentHistory: [{ employerName: "Family of 6, Dubai", startDate: "2018-01-01", endDate: "2026-01-31", salary: 1500 }],
    maidsCcId: "CC-1290", currentStage: "RetractedToCC",
  }),
  mk("h022", {
    name: "Tirunesh Alemu", nationality: "Ethiopian", age: 41, housemaidType: "MV", subType: "CC to MV",
    mobile: "+971 55 414 1222", whatsapp: "+971 55 414 1222", visaStartDate: "2026-02-24",
    visaExpiry: "2027-08-24", passportExpiry: "2029-06-30", arrivalDate: "2026-04-01",
    salary: 1650, employmentHistory: [{ employerName: "Family of 7, Abu Dhabi", startDate: "2017-01-01", endDate: "2026-01-31", salary: 1450 }],
    maidsCcId: "CC-1312", currentStage: "MovedToOffboard",
  }),
  mk("h023", {
    name: "Bernadette Ramos", nationality: "Filipino", age: 27, housemaidType: "MV", subType: "Normal MV",
    mobile: "+971 50 515 1223", whatsapp: "+971 50 515 1223", visaStartDate: "2026-03-30",
    visaExpiry: "2027-09-30", passportExpiry: "2031-02-11", arrivalDate: "2026-05-20",
    salary: 2800, isGoldenProfile: true, employmentHistory: [{ employerName: "Family of 3, Dubai", startDate: "2024-01-01", endDate: "2026-04-30", salary: 2600 }],
    employerName: "Khalifa Family", maidsCcProfileLink: "https://maids.cc/profile/h023", currentStage: "Hired",
  }),
  mk("h024", {
    name: "Sita Thapa", nationality: "Nepali", age: 32, housemaidType: "CC live-out",
    mobile: "+971 56 616 1224", whatsapp: "+971 56 616 1224", visaStartDate: "2025-05-05",
    visaExpiry: "2026-11-05", passportExpiry: "2029-08-19", arrivalDate: "2026-03-01",
    salary: 1750, employmentHistory: [{ employerName: "Family of 5, Sharjah", startDate: "2021-01-01", endDate: "2026-02-28", salary: 1550 }],
    maidsCcId: "CC-1345", currentStage: "Cancelled",
  }),
  mk("h025", {
    name: "Teresa Mendoza", nationality: "Filipino", age: 40, housemaidType: "Cleaner",
    mobile: "+971 50 900 1301", whatsapp: "+971 50 900 1301", visaStartDate: "2025-07-30",
    visaExpiry: "2027-01-30", passportExpiry: "2029-12-05", passportNumber: "P0456789", arrivalDate: "2026-09-02",
    salary: 1500, employmentHistory: [{ employerName: "Office contract, Dubai", startDate: "2023-01-01", endDate: "2026-08-31", salary: 1400 }],
    maidsCcId: "CL-2001", currentStage: "Reception",
  }),
  mk("h026", {
    name: "Birtukan Assefa", nationality: "Ethiopian", age: 37, housemaidType: "Cleaner",
    mobile: "+971 55 901 1302", whatsapp: "+971 55 901 1302", visaStartDate: "2025-10-12",
    visaExpiry: "2027-04-12", passportExpiry: "2030-03-18", passportNumber: "P0456790", arrivalDate: "2026-09-03",
    salary: 1400, employmentHistory: [{ employerName: "Villa contract, Abu Dhabi", startDate: "2024-01-01", endDate: "2026-08-31", salary: 1300 }],
    maidsCcId: "CL-2002", currentStage: "Reception",
  }),
  mk("h027", {
    name: "Josephine Flores", nationality: "Filipino", age: 29, housemaidType: "CC live-out",
    mobile: "+971 52 902 1303", whatsapp: "+971 52 902 1303", visaStartDate: "2025-12-18",
    visaExpiry: "2027-06-18", passportExpiry: "2030-08-22", passportNumber: "P0456791", arrivalDate: "2026-08-20",
    salary: 1900, employmentHistory: [{ employerName: "Family of 4, Dubai", startDate: "2024-01-01", endDate: "2026-07-31", salary: 1700 }],
    maidsCcId: "CC-1401", currentStage: "DocumentsCollection",
  }),
  mk("h028", {
    name: "Anita Desai", nationality: "Indian", age: 31, housemaidType: "MV", subType: "Normal MV",
    mobile: "+971 50 903 1304", whatsapp: "+971 50 903 1304", visaStartDate: "2025-08-25",
    visaExpiry: "2027-02-25", passportExpiry: "2031-04-09", passportNumber: "P0456792", arrivalDate: "2026-08-12",
    salary: 2000, employmentHistory: [{ employerName: "Family of 5, Sharjah", startDate: "2022-01-01", endDate: "2026-07-31", salary: 1800 }],
    currentStage: "DocumentsCollection",
  }),
  mk("h029", {
    name: "Luzviminda Cruz", nationality: "Filipino", age: 33, housemaidType: "CC live-in",
    mobile: "+971 55 904 1305", whatsapp: "+971 55 904 1305", visaStartDate: "2025-11-01",
    visaExpiry: "2026-12-28", passportExpiry: "2030-01-20", arrivalDate: "2026-09-10",
    salary: 1750, room: "Villa 3 · Room 12", employmentHistory: [{ employerName: "Family of 5, Dubai", startDate: "2022-01-01", endDate: "2026-08-31", salary: 1550 }],
    maidsCcId: "CC-1501", currentStage: "PendingRetraction",
  }),
  mk("h030", {
    name: "Jasmin Ponce", nationality: "Filipino", age: 27, housemaidType: "MV", subType: "Travel Assist",
    mobile: "+971 50 905 1306", whatsapp: "+971 50 905 1306", visaStartDate: "2025-09-01",
    visaExpiry: "2027-01-15", passportExpiry: "2030-06-01", arrivalDate: "2026-08-05",
    salary: 2300, employmentHistory: [{ employerName: "Family of 4, Dubai", startDate: "2024-01-01", endDate: "2026-07-31", salary: 2100 }],
    // No maidMatchProfile — held in publishing for "Profile information incomplete".
    currentStage: "AvailablePendingPublishing",
  }),
];

export const seedUsers: User[] = [
  { id: "u001", name: "Aliyah Rahman", email: "aliyah.rahman@maidmatch.ae", roles: ["sysadmin"] },
  { id: "u002", name: "Marcus Tan", email: "marcus.tan@maidmatch.ae", roles: ["superadmin"] },
  { id: "u003", name: "Leila Cruz", email: "leila.cruz@maidmatch.ae", roles: ["retractor"] },
  { id: "u004", name: "Omar Haddad", email: "omar.haddad@maidmatch.ae", roles: ["media"] },
  { id: "u005", name: "Sofia Reyes", email: "sofia.reyes@maidmatch.ae", roles: ["sales"] },
  { id: "u006", name: "Dana White", email: "dana.white@maidmatch.ae", roles: ["superadmin"] },
  { id: "u007", name: "Kenji Sato", email: "kenji.sato@maidmatch.ae", roles: ["sysadmin"] },
  { id: "u008", name: "Nadia Ali", email: "nadia.ali@maidmatch.ae", roles: ["media"] },
  { id: "u009", name: "Rania Haddad", email: "rania.haddad@maidmatch.ae", roles: ["receptionist"] },
];
