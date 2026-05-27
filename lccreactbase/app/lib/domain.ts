export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SUPER_FINANCE_ADMIN: "SUPER_FINANCE_ADMIN",
  BRANCH_ADMIN: "BRANCH_ADMIN",
  EKKLESIA_LEADER: "EKKLESIA_LEADER",
  BUSCELL_PASTOR: "BUSCELL_PASTOR",
  FINANCE_ADMIN: "FINANCE_ADMIN",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export type AppView =
  | "dashboard"
  | "branches"
  | "users"
  | "ekklesias"
  | "buscells"
  | "members"
  | "operations"
  | "attendance"
  | "finance"
  | "member-lookup"
  | "reports"
  | "weekly-records"

export type Branch = {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  created_at?: string
}

export type Ekklesia = {
  id: string
  name: string
  branch_id: string
  leader_id: string | null
  created_at?: string
}

export type Buscell = {
  id: string
  name: string
  branch_id: string
  ekklesia_id: string
  meeting_day: string | null
  description: string | null
  created_at?: string
}

export type Profile = {
  id: string
  name: string
  email: string
  role: Role
  branch_id: string | null
  ekklesia_id: string | null
  buscell_id: string | null
  created_at?: string
}

export type Member = {
  id: string
  first_name: string
  last_name: string
  full_name: string
  phone: string
  email: string | null
  gender: string | null
  address: string | null
  date_of_birth: string | null
  marital_status: string | null
  join_date: string
  family_group: string | null
  ministry_groups: string[]
  branch_id: string
  ekklesia_id: string
  buscell_id: string
  umid: string
  status: "ACTIVE" | "INACTIVE" | "TRANSFERRED" | "DECEASED"
  created_at?: string
}

export type RecordWeek = {
  id: string
  week_number: number
  start_date: string
  end_date: string
  cycle_id: string | null
}

export type BuscellRecord = {
  id: string
  week_id: string
  branch_id: string
  ekklesia_id: string
  buscell_id: string
  sunday_attendance: number | null
  buscell_attendance: number | null
  buscell_offering: number | null
  recorded_by: string | null
  created_at?: string
}

export type AttendanceRecord = {
  id: string
  umid: string
  member_id: string
  branch_id: string
  buscell_id: string | null
  date: string
  meeting_type: "BUSCELL_WEEKLY" | "SUNDAY_SERVICE" | "OVERCOMERS_SERVICE" | "OTHER"
  status: "PRESENT" | "ABSENT" | "EXCUSED"
  recorded_by: string | null
  event_id: string | null
}

export type FinanceRecord = {
  id: string
  transaction_id: string
  record_type: "income" | "expense"
  umid: string | null
  member_id: string | null
  scope: "MEMBER" | "BRANCH"
  service_type: "BUSCELL_WEEKLY" | "SUNDAY_SERVICE" | "OVERCOMERS_SERVICE" | "OTHER"
  branch_id: string
  ekklesia_id: string | null
  buscell_id: string | null
  amount: number
  transaction_type: string
  payment_method: "cash" | "momo" | "bank_transfer" | "cheque"
  transaction_date: string
  expense_category: string | null
  donor_name: string | null
  donor_type: string | null
  giver_name: string | null
  notes: string | null
  description: string | null
  recorded_by: string | null
  approved_by: string | null
  status: "pending" | "approved" | "rejected"
}

export type LccData = {
  branches: Branch[]
  ekklesias: Ekklesia[]
  buscells: Buscell[]
  profiles: Profile[]
  members: Member[]
  record_weeks: RecordWeek[]
  buscell_records: BuscellRecord[]
  attendance_records: AttendanceRecord[]
  finance_records: FinanceRecord[]
}

export type LccTable = keyof LccData

export const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  SUPER_FINANCE_ADMIN: "Super Finance Admin",
  BRANCH_ADMIN: "Branch Admin",
  EKKLESIA_LEADER: "Ekklesia Leader",
  BUSCELL_PASTOR: "Buscell Pastor",
  FINANCE_ADMIN: "Finance Admin",
}

export const allRoles = Object.values(ROLES)

export const navItems: Array<{ label: string; path: string; view: AppView; roles: Role[] }> = [
  { label: "Dashboard", path: "/dashboard", view: "dashboard", roles: allRoles },
  { label: "Branches", path: "/branches", view: "branches", roles: [ROLES.SUPER_ADMIN] },
  {
    label: "Staff Management",
    path: "/users",
    view: "users",
    roles: [ROLES.SUPER_ADMIN, ROLES.SUPER_FINANCE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.EKKLESIA_LEADER],
  },
  {
    label: "Ekklesias",
    path: "/ekklesias",
    view: "ekklesias",
    roles: [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN],
  },
  {
    label: "Buscells",
    path: "/buscells",
    view: "buscells",
    roles: [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN],
  },
  {
    label: "Members",
    path: "/members",
    view: "members",
    roles: [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.EKKLESIA_LEADER, ROLES.BUSCELL_PASTOR],
  },
  { label: "Operations", path: "/operations", view: "operations", roles: [ROLES.BUSCELL_PASTOR] },
  {
    label: "Finance",
    path: "/finance",
    view: "finance",
    roles: [ROLES.SUPER_ADMIN, ROLES.SUPER_FINANCE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.FINANCE_ADMIN],
  },
  {
    label: "Member Lookup",
    path: "/member-lookup",
    view: "member-lookup",
    roles: [ROLES.SUPER_ADMIN, ROLES.SUPER_FINANCE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.FINANCE_ADMIN],
  },
  {
    label: "Reports",
    path: "/reports",
    view: "reports",
    roles: [ROLES.SUPER_ADMIN, ROLES.SUPER_FINANCE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.FINANCE_ADMIN],
  },
  {
    label: "Weekly Records",
    path: "/weekly-records",
    view: "weekly-records",
    roles: [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.EKKLESIA_LEADER],
  },
]

export const emptyLccData: LccData = {
  branches: [],
  ekklesias: [],
  buscells: [],
  profiles: [],
  members: [],
  record_weeks: [],
  buscell_records: [],
  attendance_records: [],
  finance_records: [],
}

export const demoProfile: Profile = {
  id: "demo-super-admin",
  name: "System Super Admin",
  email: "superadmin@lcc.local",
  role: ROLES.SUPER_ADMIN,
  branch_id: null,
  ekklesia_id: null,
  buscell_id: null,
}

export const demoData: LccData = {
  branches: [
    { id: "branch-hq", name: "Headquarters", code: "HQ", address: "Accra Central", phone: "+233 24 000 0000" },
    { id: "branch-east", name: "East Legon", code: "EL", address: "East Legon", phone: "+233 24 000 0011" },
  ],
  ekklesias: [
    { id: "Ekklesia-alpha", name: "Alpha Ekklesia", branch_id: "branch-hq", leader_id: "leader-alpha" },
    { id: "Ekklesia-grace", name: "Grace Ekklesia", branch_id: "branch-east", leader_id: "leader-grace" },
  ],
  buscells: [
    {
      id: "buscell-1",
      name: "Faith Buscell",
      branch_id: "branch-hq",
      ekklesia_id: "Ekklesia-alpha",
      meeting_day: "Wednesday",
      description: "Young families and students",
    },
    {
      id: "buscell-2",
      name: "Victory Buscell",
      branch_id: "branch-east",
      ekklesia_id: "Ekklesia-grace",
      meeting_day: "Friday",
      description: "Community outreach group",
    },
  ],
  profiles: [
    demoProfile,
    {
      id: "leader-alpha",
      name: "Ama Mensah",
      email: "ama@lcc.local",
      role: ROLES.EKKLESIA_LEADER,
      branch_id: "branch-hq",
      ekklesia_id: "Ekklesia-alpha",
      buscell_id: null,
    },
    {
      id: "pastor-faith",
      name: "Kojo Owusu",
      email: "kojo@lcc.local",
      role: ROLES.BUSCELL_PASTOR,
      branch_id: "branch-hq",
      ekklesia_id: "Ekklesia-alpha",
      buscell_id: "buscell-1",
    },
  ],
  members: [
    {
      id: "member-1",
      first_name: "Miriam",
      last_name: "Boateng",
      full_name: "Miriam Boateng",
      phone: "+233 20 111 1111",
      email: "miriam@example.com",
      gender: "FEMALE",
      address: "Adabraka",
      date_of_birth: null,
      marital_status: "SINGLE",
      join_date: "2026-01-14",
      family_group: "Abraham",
      ministry_groups: ["Choir"],
      branch_id: "branch-hq",
      ekklesia_id: "Ekklesia-alpha",
      buscell_id: "buscell-1",
      umid: "LCC-HQ-0001",
      status: "ACTIVE",
    },
    {
      id: "member-2",
      first_name: "Daniel",
      last_name: "Amoako",
      full_name: "Daniel Amoako",
      phone: "+233 20 222 2222",
      email: "daniel@example.com",
      gender: "MALE",
      address: "Madina",
      date_of_birth: null,
      marital_status: "MARRIED",
      join_date: "2026-02-05",
      family_group: "Isaac",
      ministry_groups: ["Ushering"],
      branch_id: "branch-east",
      ekklesia_id: "Ekklesia-grace",
      buscell_id: "buscell-2",
      umid: "LCC-EL-0001",
      status: "ACTIVE",
    },
  ],
  record_weeks: [
    { id: "week-1", week_number: 1, start_date: "2026-05-03", end_date: "2026-05-09", cycle_id: "2026-05" },
    { id: "week-2", week_number: 2, start_date: "2026-05-10", end_date: "2026-05-16", cycle_id: "2026-05" },
  ],
  buscell_records: [
    {
      id: "record-1",
      week_id: "week-1",
      branch_id: "branch-hq",
      ekklesia_id: "Ekklesia-alpha",
      buscell_id: "buscell-1",
      sunday_attendance: 38,
      buscell_attendance: 19,
      buscell_offering: 440,
      recorded_by: "pastor-faith",
    },
  ],
  attendance_records: [
    {
      id: "attendance-1",
      umid: "LCC-HQ-0001",
      member_id: "member-1",
      branch_id: "branch-hq",
      buscell_id: "buscell-1",
      date: "2026-05-24",
      meeting_type: "SUNDAY_SERVICE",
      status: "PRESENT",
      recorded_by: "pastor-faith",
      event_id: "sunday-2026-05-24",
    },
  ],
  finance_records: [
    {
      id: "finance-1",
      transaction_id: "LCC-20260524-001",
      record_type: "income",
      umid: "LCC-HQ-0001",
      member_id: "member-1",
      scope: "MEMBER",
      service_type: "SUNDAY_SERVICE",
      branch_id: "branch-hq",
      ekklesia_id: "Ekklesia-alpha",
      buscell_id: "buscell-1",
      amount: 520,
      transaction_type: "tithe",
      payment_method: "momo",
      transaction_date: "2026-05-24",
      expense_category: null,
      donor_name: null,
      donor_type: "member",
      giver_name: "Miriam Boateng",
      notes: "Sunday tithe",
      description: "Sunday tithe",
      recorded_by: "demo-super-admin",
      approved_by: "demo-super-admin",
      status: "approved",
    },
    {
      id: "finance-2",
      transaction_id: "LCC-20260525-001",
      record_type: "expense",
      umid: null,
      member_id: null,
      scope: "BRANCH",
      service_type: "OTHER",
      branch_id: "branch-hq",
      ekklesia_id: null,
      buscell_id: null,
      amount: 180,
      transaction_type: "printing_expense",
      payment_method: "cash",
      transaction_date: "2026-05-25",
      expense_category: "printing_expense",
      donor_name: null,
      donor_type: null,
      giver_name: null,
      notes: "Flyer printing",
      description: "Flyer printing",
      recorded_by: "demo-super-admin",
      approved_by: "demo-super-admin",
      status: "approved",
    },
  ],
}

export function canAccess(role: Role, view: AppView) {
  return navItems.some((item) => item.view === view && item.roles.includes(role))
}

export function getVisibleNav(role: Role) {
  return navItems.filter((item) => item.roles.includes(role))
}

export function labelForBranch(data: LccData, id: string | null | undefined) {
  if (!id) return "All branches"
  return data.branches.find((branch) => branch.id === id)?.name || "Unknown branch"
}

export function labelForEkklesia(data: LccData, id: string | null | undefined) {
  if (!id) return "No Ekklesia"
  return data.ekklesias.find((Ekklesia) => Ekklesia.id === id)?.name || "Unknown Ekklesia"
}

export function labelForBuscell(data: LccData, id: string | null | undefined) {
  if (!id) return "No buscell"
  return data.buscells.find((buscell) => buscell.id === id)?.name || "Unknown buscell"
}

export function currency(value: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(value)
}

export function numberValue(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

export function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function nextUmid(data: LccData, branchId: string) {
  const branch = data.branches.find((item) => item.id === branchId)
  const code = branch?.code || "LCC"
  const count = data.members.filter((member) => member.branch_id === branchId).length + 1
  return `LCC-${code}-${String(count).padStart(4, "0")}`
}

export function financeTotals(records: FinanceRecord[]) {
  return records.reduce(
    (totals, record) => {
      if (record.record_type === "income") totals.income += Number(record.amount || 0)
      if (record.record_type === "expense") totals.expense += Number(record.amount || 0)
      return totals
    },
    { income: 0, expense: 0 }
  )
}
