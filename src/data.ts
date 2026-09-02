import type { RoleId } from "./lib/roles";
import type { Stage, TaskType, OutcomeType, Platform } from "./lib/stages";
import type { PriorityAlgorithm } from "./lib/priority";
import type { WorkingHours } from "./lib/hours";

export type HousemaidType = "MV" | "CC" | "CC to MV";
export interface Complaint { summary: string; erpLink: string; }

export interface Housemaid {
  id: string;
  name: string;
  nationality: string;
  age: number;
  housemaidType: HousemaidType;
  mobile: string;
  whatsapp: string;
  visaExpiry: string;
  passportExpiry: string;
  salary: number;
  employmentHistory: string[];
  complaints: Complaint[];
  isGoldenProfile: boolean;
  preferences: string[];
  maidsCcId: string;
  employerName?: string;
  maidsCcProfileLink?: string;
  currentStage: Stage;
}

export interface Task {
  id: string;
  housemaidId: string;
  type: TaskType;
  status: "open" | "closed";
  assignedRole: RoleId | "None";
  createdAt: number;
  closedAt?: number;
  metadata?: {
    stockPhotoUrl?: string;
    stockVideoUrl?: string;
    finalPhoto?: string;
    finalVideo?: string;
    comment?: string;
    publishState?: Record<Platform, boolean>;
    preferences?: string[];
    employerName?: string;
    maidsCcProfileLink?: string;
  };
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

export interface SystemConfig {
  breakDurationMinutes: number;
  maxBreaksPerDay: number;
  priorityAlgorithm: PriorityAlgorithm;
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

export const PREFERENCE_OPTIONS = [
  "She doesn't prefer for the employer to have Babies < 2 yrs",
  "She doesn't prefer for the employer to have a Home in Abu Dhabi",
  "She doesn't prefer for the employer to have a cat",
  "She doesn't prefer for the employer to have a dog",
  "She prefers for the employer to have a private maids' room for her",
  "She doesn't prefer for the employer to have More than 2 kids",
  "She prefers for the employer to give her a Day-off on Sunday",
  "She prefers to be a Live in maid",
  "She prefers to be a Live out maid",
];

export const HOUSEMAID_TYPE_OPTIONS: HousemaidType[] = ["MV", "CC", "CC to MV"];

export const NATIONALITY_OPTIONS = ["Filipino", "Ethiopian", "Kenyan", "Sri Lankan", "Indian", "Nepali"];

export const defaultConfig: SystemConfig = {
  breakDurationMinutes: 15,
  maxBreaksPerDay: 3,
  priorityAlgorithm: "FIFO",
  goldenProfile: {
    nationalities: ["Filipino"],
    ageMin: 25,
    ageMax: 40,
    visaExpiryMonthsMin: 3,
    visaExpiryMonthsMax: 24,
    housemaidTypes: ["MV"],
  },
  workingHours: { startHour: 8, endHour: 20 },
  daysOff: [0, 6],
  defaultRolePerTask: {
    retraction: "retractor",
    shooting: "media",
    editing: "media",
    publishing: "sales",
    available: "sales",
    trial: "sales",
  },
};

function mk(id: string, overrides: Partial<Housemaid> = {}): Housemaid {
  return {
    id,
    name: id,
    nationality: "Filipino",
    age: 30,
    housemaidType: "MV",
    mobile: "",
    whatsapp: "",
    visaExpiry: "2027-01-01",
    passportExpiry: "2030-01-01",
    salary: 2000,
    employmentHistory: [],
    complaints: [],
    isGoldenProfile: false,
    preferences: [],
    maidsCcId: "",
    currentStage: "Reception",
    ...overrides,
  };
}

export const seedHousemaids: Housemaid[] = [
  mk("h001", {
    name: "Maria Santos",
    nationality: "Filipino",
    age: 28,
    housemaidType: "MV",
    mobile: "+971 50 100 1201",
    whatsapp: "+971 50 100 1201",
    visaExpiry: "2026-12-10",
    passportExpiry: "2030-04-10",
    salary: 2200,
    employmentHistory: ["2 yrs - Dubai, family of 4"],
    complaints: [],
    isGoldenProfile: false,
    preferences: ["She prefers for the employer to give her a Day-off on Sunday"],
    maidsCcId: "",
    currentStage: "Reception",
  }),
  mk("h002", {
    name: "Amina Bekele",
    nationality: "Ethiopian",
    age: 31,
    housemaidType: "CC to MV",
    mobile: "+971 55 200 1202",
    whatsapp: "+971 55 200 1202",
    visaExpiry: "2027-02-14",
    passportExpiry: "2029-08-22",
    salary: 1900,
    employmentHistory: ["3 yrs - Abu Dhabi, family of 5"],
    complaints: [],
    isGoldenProfile: false,
    preferences: [],
    maidsCcId: "CC-1042",
    currentStage: "Reception",
  }),
  mk("h003", {
    name: "Priya Sharma",
    nationality: "Indian",
    age: 26,
    housemaidType: "MV",
    mobile: "+971 52 300 1203",
    whatsapp: "+971 52 300 1203",
    visaExpiry: "2026-10-30",
    passportExpiry: "2031-01-15",
    salary: 2100,
    employmentHistory: ["1 yr - Sharjah, couple"],
    complaints: [],
    isGoldenProfile: false,
    preferences: ["She prefers to be a Live out maid"],
    maidsCcId: "",
    currentStage: "Reception",
  }),

  mk("h004", {
    name: "Joy Reyes",
    nationality: "Filipino",
    age: 30,
    housemaidType: "MV",
    mobile: "+971 50 400 1204",
    whatsapp: "+971 50 400 1204",
    visaExpiry: "2027-03-15",
    passportExpiry: "2030-09-01",
    salary: 2500,
    employmentHistory: ["4 yrs - Dubai, family of 3", "2 yrs - Hong Kong, family of 4"],
    complaints: [],
    isGoldenProfile: true,
    preferences: ["She prefers to be a Live in maid", "She doesn't prefer for the employer to have a dog"],
    maidsCcId: "",
    currentStage: "PendingRetraction",
  }),
  mk("h005", {
    name: "Lineth Wanjiru",
    nationality: "Kenyan",
    age: 29,
    housemaidType: "CC",
    mobile: "+971 56 500 1205",
    whatsapp: "+971 56 500 1205",
    visaExpiry: "2027-06-20",
    passportExpiry: "2030-11-30",
    salary: 1800,
    employmentHistory: ["2 yrs - Dubai, family of 6"],
    complaints: [{ summary: "Employer reported late arrival", erpLink: "erp://complaints/c-5021" }],
    isGoldenProfile: false,
    preferences: ["She doesn't prefer for the employer to have More than 2 kids"],
    maidsCcId: "CC-1098",
    currentStage: "PendingRetraction",
  }),
  mk("h006", {
    name: "Nimali Perera",
    nationality: "Sri Lankan",
    age: 33,
    housemaidType: "MV",
    mobile: "+971 50 600 1206",
    whatsapp: "+971 50 600 1206",
    visaExpiry: "2026-12-01",
    passportExpiry: "2030-06-18",
    salary: 2000,
    employmentHistory: ["5 yrs - Dubai, family of 5"],
    complaints: [],
    isGoldenProfile: false,
    preferences: ["She prefers for the employer to give her a Day-off on Sunday"],
    maidsCcId: "",
    currentStage: "PendingRetraction",
  }),
  mk("h007", {
    name: "Angel Dela Cruz",
    nationality: "Filipino",
    age: 27,
    housemaidType: "MV",
    mobile: "+971 54 700 1207",
    whatsapp: "+971 54 700 1207",
    visaExpiry: "2027-05-20",
    passportExpiry: "2031-03-05",
    salary: 2400,
    employmentHistory: ["2 yrs - Dubai, family of 3"],
    complaints: [],
    isGoldenProfile: true,
    preferences: ["She prefers for the employer to have a private maids' room for her"],
    maidsCcId: "",
    currentStage: "PendingRetraction",
  }),

  mk("h008", {
    name: "Grace Mendoza",
    nationality: "Filipino",
    age: 29,
    housemaidType: "MV",
    mobile: "+971 50 800 1208",
    whatsapp: "+971 50 800 1208",
    visaExpiry: "2027-08-01",
    passportExpiry: "2030-12-12",
    salary: 2600,
    employmentHistory: ["3 yrs - Dubai, family of 4"],
    complaints: [],
    isGoldenProfile: true,
    preferences: ["She prefers to be a Live in maid", "She doesn't prefer for the employer to have a cat"],
    maidsCcId: "",
    currentStage: "PendingShooting",
  }),
  mk("h009", {
    name: "Sunita Gurung",
    nationality: "Nepali",
    age: 34,
    housemaidType: "CC to MV",
    mobile: "+971 55 900 1209",
    whatsapp: "+971 55 900 1209",
    visaExpiry: "2027-01-25",
    passportExpiry: "2029-10-02",
    salary: 1850,
    employmentHistory: ["6 yrs - Abu Dhabi, family of 6"],
    complaints: [],
    isGoldenProfile: false,
    preferences: [],
    maidsCcId: "CC-1144",
    currentStage: "PendingShooting",
  }),
  mk("h010", {
    name: "Fatima Hassan",
    nationality: "Ethiopian",
    age: 25,
    housemaidType: "MV",
    mobile: "+971 52 101 1210",
    whatsapp: "+971 52 101 1210",
    visaExpiry: "2027-09-15",
    passportExpiry: "2031-07-08",
    salary: 1950,
    employmentHistory: ["1 yr - Dubai, couple"],
    complaints: [],
    isGoldenProfile: false,
    preferences: ["She prefers to be a Live out maid"],
    maidsCcId: "",
    currentStage: "PendingShooting",
  }),

  mk("h011", {
    name: "Rachel Aquino",
    nationality: "Filipino",
    age: 32,
    housemaidType: "MV",
    mobile: "+971 50 202 1211",
    whatsapp: "+971 50 202 1211",
    visaExpiry: "2026-12-15",
    passportExpiry: "2030-02-20",
    salary: 2700,
    employmentHistory: ["5 yrs - Dubai, family of 5", "2 yrs - Singapore, family of 3"],
    complaints: [],
    isGoldenProfile: true,
    preferences: ["She prefers for the employer to have a private maids' room for her", "She doesn't prefer for the employer to have Babies < 2 yrs"],
    maidsCcId: "",
    currentStage: "PendingEditing",
  }),
  mk("h012", {
    name: "Wanjiku Kamau",
    nationality: "Kenyan",
    age: 36,
    housemaidType: "CC",
    mobile: "+971 56 303 1212",
    whatsapp: "+971 56 303 1212",
    visaExpiry: "2027-04-05",
    passportExpiry: "2029-12-19",
    salary: 1750,
    employmentHistory: ["7 yrs - Dubai, family of 7"],
    complaints: [],
    isGoldenProfile: false,
    preferences: ["She doesn't prefer for the employer to have More than 2 kids"],
    maidsCcId: "CC-1188",
    currentStage: "PendingEditing",
  }),
  mk("h013", {
    name: "Lakshmi Nair",
    nationality: "Indian",
    age: 30,
    housemaidType: "MV",
    mobile: "+971 52 404 1213",
    whatsapp: "+971 52 404 1213",
    visaExpiry: "2027-02-08",
    passportExpiry: "2031-05-25",
    salary: 2050,
    employmentHistory: ["3 yrs - Sharjah, family of 4"],
    complaints: [],
    isGoldenProfile: false,
    preferences: ["She prefers for the employer to give her a Day-off on Sunday"],
    maidsCcId: "",
    currentStage: "PendingEditing",
  }),

  mk("h014", {
    name: "Christine Bautista",
    nationality: "Filipino",
    age: 28,
    housemaidType: "MV",
    mobile: "+971 50 505 1214",
    whatsapp: "+971 50 505 1214",
    visaExpiry: "2027-02-28",
    passportExpiry: "2030-10-14",
    salary: 2500,
    employmentHistory: ["2 yrs - Dubai, family of 3"],
    complaints: [],
    isGoldenProfile: true,
    preferences: ["She prefers to be a Live in maid"],
    maidsCcId: "",
    currentStage: "AvailablePendingPublishing",
  }),
  mk("h015", {
    name: "Deepa Rai",
    nationality: "Nepali",
    age: 31,
    housemaidType: "CC to MV",
    mobile: "+971 55 606 1215",
    whatsapp: "+971 55 606 1215",
    visaExpiry: "2027-07-12",
    passportExpiry: "2029-09-09",
    salary: 1900,
    employmentHistory: ["4 yrs - Abu Dhabi, family of 5"],
    complaints: [{ summary: "Previous employer disputed contract end", erpLink: "erp://complaints/c-5330" }],
    isGoldenProfile: false,
    preferences: [],
    maidsCcId: "CC-1207",
    currentStage: "AvailablePendingPublishing",
  }),

  mk("h016", {
    name: "Marites Lopez",
    nationality: "Filipino",
    age: 26,
    housemaidType: "MV",
    mobile: "+971 50 707 1216",
    whatsapp: "+971 50 707 1216",
    visaExpiry: "2027-06-10",
    passportExpiry: "2031-01-30",
    salary: 2450,
    employmentHistory: ["2 yrs - Dubai, family of 4"],
    complaints: [],
    isGoldenProfile: true,
    preferences: ["She prefers for the employer to have a private maids' room for her", "She doesn't prefer for the employer to have a dog"],
    maidsCcId: "",
    maidsCcProfileLink: "https://maids.cc/profile/h016",
    currentStage: "AvailablePublished",
  }),
  mk("h017", {
    name: "Abeba Tesfaye",
    nationality: "Ethiopian",
    age: 30,
    housemaidType: "MV",
    mobile: "+971 52 808 1217",
    whatsapp: "+971 52 808 1217",
    visaExpiry: "2027-05-01",
    passportExpiry: "2030-03-28",
    salary: 1950,
    employmentHistory: ["3 yrs - Dubai, family of 3"],
    complaints: [],
    isGoldenProfile: false,
    preferences: ["She prefers to be a Live out maid"],
    maidsCcId: "",
    maidsCcProfileLink: "https://maids.cc/profile/h017",
    currentStage: "AvailablePublished",
  }),
  mk("h018", {
    name: "Kamala Silva",
    nationality: "Sri Lankan",
    age: 35,
    housemaidType: "CC to MV",
    mobile: "+971 50 909 1218",
    whatsapp: "+971 50 909 1218",
    visaExpiry: "2027-01-18",
    passportExpiry: "2029-11-21",
    salary: 1850,
    employmentHistory: ["6 yrs - Dubai, family of 6"],
    complaints: [],
    isGoldenProfile: false,
    preferences: ["She doesn't prefer for the employer to have Babies < 2 yrs"],
    maidsCcId: "CC-1239",
    maidsCcProfileLink: "https://maids.cc/profile/h018",
    currentStage: "AvailablePublished",
  }),

  mk("h019", {
    name: "Rowena Garcia",
    nationality: "Filipino",
    age: 29,
    housemaidType: "MV",
    mobile: "+971 54 111 1219",
    whatsapp: "+971 54 111 1219",
    visaExpiry: "2027-04-05",
    passportExpiry: "2030-07-16",
    salary: 2600,
    employmentHistory: ["3 yrs - Dubai, family of 4"],
    complaints: [],
    isGoldenProfile: true,
    preferences: ["She prefers to be a Live in maid"],
    maidsCcId: "",
    employerName: "Al Habtoor Family",
    maidsCcProfileLink: "https://maids.cc/profile/h019",
    currentStage: "UnderTrial",
  }),
  mk("h020", {
    name: "Mercy Otieno",
    nationality: "Kenyan",
    age: 33,
    housemaidType: "CC",
    mobile: "+971 56 212 1220",
    whatsapp: "+971 56 212 1220",
    visaExpiry: "2027-03-30",
    passportExpiry: "2029-10-11",
    salary: 1800,
    employmentHistory: ["4 yrs - Dubai, family of 5"],
    complaints: [],
    isGoldenProfile: false,
    preferences: ["She doesn't prefer for the employer to have a cat"],
    maidsCcId: "CC-1266",
    employerName: "Rashid Family",
    currentStage: "UnderTrial",
  }),

  mk("h021", {
    name: "Ana Villanueva",
    nationality: "Filipino",
    age: 38,
    housemaidType: "CC",
    mobile: "+971 50 313 1221",
    whatsapp: "+971 50 313 1221",
    visaExpiry: "2027-11-20",
    passportExpiry: "2029-05-08",
    salary: 1700,
    employmentHistory: ["8 yrs - Dubai, family of 6"],
    complaints: [],
    isGoldenProfile: false,
    preferences: [],
    maidsCcId: "CC-1290",
    currentStage: "RetractedToCC",
  }),
  mk("h022", {
    name: "Tirunesh Alemu",
    nationality: "Ethiopian",
    age: 41,
    housemaidType: "CC to MV",
    mobile: "+971 55 414 1222",
    whatsapp: "+971 55 414 1222",
    visaExpiry: "2027-08-24",
    passportExpiry: "2029-06-30",
    salary: 1650,
    employmentHistory: ["9 yrs - Abu Dhabi, family of 7"],
    complaints: [],
    isGoldenProfile: false,
    preferences: [],
    maidsCcId: "CC-1312",
    currentStage: "MovedToOffboard",
  }),
  mk("h023", {
    name: "Bernadette Ramos",
    nationality: "Filipino",
    age: 27,
    housemaidType: "MV",
    mobile: "+971 50 515 1223",
    whatsapp: "+971 50 515 1223",
    visaExpiry: "2027-09-30",
    passportExpiry: "2031-02-11",
    salary: 2800,
    employmentHistory: ["2 yrs - Dubai, family of 3"],
    complaints: [],
    isGoldenProfile: true,
    preferences: ["She prefers for the employer to give her a Day-off on Sunday"],
    maidsCcId: "",
    employerName: "Khalifa Family",
    maidsCcProfileLink: "https://maids.cc/profile/h023",
    currentStage: "Hired",
  }),
  mk("h024", {
    name: "Sita Thapa",
    nationality: "Nepali",
    age: 32,
    housemaidType: "CC",
    mobile: "+971 56 616 1224",
    whatsapp: "+971 56 616 1224",
    visaExpiry: "2026-11-05",
    passportExpiry: "2029-08-19",
    salary: 1750,
    employmentHistory: ["5 yrs - Sharjah, family of 5"],
    complaints: [],
    isGoldenProfile: false,
    preferences: [],
    maidsCcId: "CC-1345",
    currentStage: "Cancelled",
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
];
