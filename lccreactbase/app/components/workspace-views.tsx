import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar03Icon,
  ChartBarLineIcon,
  DatabaseAddIcon,
  Download01Icon,
  DollarCircleIcon,
  FileChartPieIcon,
  MinusSignIcon,
  PlusSignIcon,
  ReceiptTextIcon,
  Search01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart"
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Textarea } from "~/components/ui/textarea"
import type { useLccData } from "~/hooks/use-lcc-data"
import {
  BUSCELL_INCOME_TYPES,
  DONATION_DONOR_TYPES,
  EXPENSE_CATEGORIES,
  EXPENSE_TRANSACTION_TYPES,
  FINANCE_PAYMENT_METHODS,
  FINANCE_TRANSACTION_TYPES,
  INCOME_TRANSACTION_TYPES,
  formatFinanceLabel,
  inferFinanceServiceType,
  isExpenseTransactionType,
} from "~/lib/finance"
import {
  ROLES,
  allRoles,
  currency,
  financeTotals,
  labelForBranch,
  labelForBuscell,
  labelForEkklesia,
  nextUmid,
  numberValue,
  roleLabels,
  type AppView,
  type FinanceRecord,
  type LccData,
  type Profile,
} from "~/lib/domain"

type DataState = ReturnType<typeof useLccData>

type WorkspaceViewProps = {
  dataState: DataState
  profile: Profile
  view: AppView
}

type Column<T> = {
  label: string
  render: (row: T) => React.ReactNode
}

type FinanceTabId = "income" | "expense" | "records" | "analytics" | "export" | "reports"

type FinanceFilters = {
  recordType: string
  branchId: string
  transactionType: string
  paymentMethod: string
  dateFrom: string
  dateTo: string
}

type IncomeFormState = {
  branch_id: string
  ekklesia_id: string
  buscell_id: string
  member_id: string
  transaction_type: string
  amount: string
  payment_method: string
  transaction_date: string
  donor_type: string
  donor_name: string
  giver_name: string
  notes: string
}

type ExpenseFormState = {
  branch_id: string
  transaction_type: string
  expense_category: string
  amount: string
  payment_method: string
  transaction_date: string
  description: string
}

const financeTabs: Array<{ id: FinanceTabId; label: string; icon: typeof DollarCircleIcon }> = [
  { id: "income", label: "Income Collection", icon: PlusSignIcon },
  { id: "expense", label: "Expense Collection", icon: MinusSignIcon },
  { id: "records", label: "Finance Records", icon: ReceiptTextIcon },
  { id: "analytics", label: "Finance Analytics", icon: ChartBarLineIcon },
  { id: "export", label: "CSV Export", icon: Download01Icon },
  { id: "reports", label: "Reports", icon: FileChartPieIcon },
]

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function createIncomeForm(profile: Profile): IncomeFormState {
  return {
    branch_id: profile.branch_id || "",
    ekklesia_id: "",
    buscell_id: profile.role === ROLES.BUSCELL_PASTOR ? profile.buscell_id || "" : "",
    member_id: "",
    transaction_type:
      profile.role === ROLES.BUSCELL_PASTOR ? BUSCELL_INCOME_TYPES[0] : INCOME_TRANSACTION_TYPES[0],
    amount: "",
    payment_method: FINANCE_PAYMENT_METHODS[0],
    transaction_date: todayInput(),
    donor_type: DONATION_DONOR_TYPES[0],
    donor_name: "",
    giver_name: "",
    notes: "",
  }
}

function createExpenseForm(profile: Profile): ExpenseFormState {
  return {
    branch_id: profile.branch_id || "",
    transaction_type: EXPENSE_TRANSACTION_TYPES[0],
    expense_category: "",
    amount: "",
    payment_method: FINANCE_PAYMENT_METHODS[0],
    transaction_date: todayInput(),
    description: "",
  }
}

function sumFinanceRecords(records: FinanceRecord[]) {
  return records.reduce((sum, record) => sum + (Number(record.amount) || 0), 0)
}

function groupFinanceAmount(records: FinanceRecord[], label: (record: FinanceRecord) => string) {
  return Object.entries(
    records.reduce<Record<string, number>>((groups, record) => {
      const key = label(record)
      groups[key] = (groups[key] || 0) + (Number(record.amount) || 0)
      return groups
    }, {})
  )
    .map(([name, amount]) => ({ name, amount }))
    .sort((left, right) => right.amount - left.amount)
}

function toCsvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function exportFinanceCsv(filename: string, records: FinanceRecord[], data: LccData) {
  const headers = [
    "Transaction ID",
    "Record Type",
    "Transaction Type",
    "Amount",
    "Payment Method",
    "Date",
    "Branch",
    "Buscell",
    "Member",
    "Notes",
  ]
  const rows = records.map((record) => {
    const member = record.member_id ? data.members.find((item) => item.id === record.member_id) : null
    return [
      record.transaction_id,
      record.record_type,
      record.transaction_type,
      record.amount,
      record.payment_method,
      record.transaction_date,
      labelForBranch(data, record.branch_id),
      labelForBuscell(data, record.buscell_id),
      member?.full_name || record.donor_name || record.giver_name || record.umid || "",
      record.description || record.notes || "",
    ]
  })
  const csv = [headers, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function WorkspaceView({ dataState, profile, view }: WorkspaceViewProps) {
  switch (view) {
    case "dashboard":
      return <DashboardView data={dataState.data} demoMode={dataState.demoMode} profile={profile} />
    case "branches":
      return <BranchesView dataState={dataState} />
    case "users":
      return <UsersView dataState={dataState} />
    case "ekklesias":
      return <EkklesiasView dataState={dataState} />
    case "buscells":
      return <BuscellsView dataState={dataState} />
    case "members":
      return <MembersView dataState={dataState} profile={profile} />
    case "operations":
      return <OperationsView dataState={dataState} profile={profile} />
    case "attendance":
      return <AttendanceView dataState={dataState} profile={profile} />
    case "finance":
      return <FinanceView dataState={dataState} profile={profile} />
    case "member-lookup":
      return <MemberLookupView data={dataState.data} />
    case "reports":
      return <ReportsView data={dataState.data} />
    case "weekly-records":
      return <WeeklyRecordsView dataState={dataState} profile={profile} />
    default:
      return null
  }
}

function DashboardView({
  data,
  demoMode,
  profile,
}: {
  data: LccData
  demoMode: boolean
  profile: Profile
}) {
  const isFinanceRole =
    profile.role === ROLES.FINANCE_ADMIN || profile.role === ROLES.SUPER_FINANCE_ADMIN

  if (isFinanceRole) {
    return <FinanceDashboard data={data} demoMode={demoMode} profile={profile} />
  }

  return <GeneralDashboard data={data} demoMode={demoMode} profile={profile} />
}

function FinanceDashboard({
  data,
  demoMode,
  profile,
}: {
  data: LccData
  demoMode: boolean
  profile: Profile
}) {
  const branchRecords = profile.branch_id
    ? data.finance_records.filter((record) => record.branch_id === profile.branch_id)
    : data.finance_records

  const incomeRecords = branchRecords.filter((record) => record.record_type === "income")
  const expenseRecords = branchRecords.filter((record) => record.record_type === "expense")
  const totalIncome = incomeRecords.reduce((sum, record) => sum + (Number(record.amount) || 0), 0)
  const totalExpenses = expenseRecords.reduce((sum, record) => sum + (Number(record.amount) || 0), 0)

  const financeByMonth = useMemo(() => {
    const buckets = new Map<string, { month: string; income: number; expense: number }>()

    branchRecords.forEach((record) => {
      const month = record.transaction_date.slice(0, 7)
      const current = buckets.get(month) || { month, income: 0, expense: 0 }
      if (record.record_type === "income") current.income += Number(record.amount)
      if (record.record_type === "expense") current.expense += Number(record.amount)
      buckets.set(month, current)
    })

    return Array.from(buckets.values()).sort((a, b) => a.month.localeCompare(b.month))
  }, [branchRecords])

  const incomeByType = useMemo(
    () => groupFinanceAmount(incomeRecords, (record) => formatFinanceLabel(record.transaction_type)),
    [incomeRecords]
  )
  const expenseByType = useMemo(
    () => groupFinanceAmount(expenseRecords, (record) => formatFinanceLabel(record.transaction_type)),
    [expenseRecords]
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description={`Finance overview for ${labelForBranch(data, profile.branch_id)}.`}
        title="Finance Dashboard"
      >
        {demoMode ? <Badge variant="secondary">Demo data</Badge> : <Badge>Live Supabase</Badge>}
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={DollarCircleIcon} label="Total Income" value={currency(totalIncome)} />
        <KpiCard icon={DollarCircleIcon} label="Total Expenses" value={currency(totalExpenses)} />
        <KpiCard icon={DollarCircleIcon} label="Net Balance" value={currency(totalIncome - totalExpenses)} />
        <KpiCard icon={DollarCircleIcon} label="Transactions" value={numberValue(branchRecords.length)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Finance trend</CardTitle>
            <CardDescription>Income and expense movement by month.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[280px] w-full"
              config={{
                income: { label: "Income", color: "var(--chart-1)" },
                expense: { label: "Expense", color: "var(--chart-4)" },
              }}
            >
              <AreaChart data={financeByMonth}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} />
                <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="income" fill="var(--color-income)" fillOpacity={0.18} stroke="var(--color-income)" />
                <Area dataKey="expense" fill="var(--color-expense)" fillOpacity={0.14} stroke="var(--color-expense)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Income by category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {incomeByType.slice(0, 6).map((row) => (
                  <div className="flex items-center justify-between gap-3 text-sm" key={row.name}>
                    <span className="truncate text-muted-foreground">{row.name}</span>
                    <span className="font-semibold">{currency(row.amount)}</span>
                  </div>
                ))}
                {!incomeByType.length ? <p className="text-sm text-muted-foreground">No income data yet.</p> : null}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Expense by category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {expenseByType.slice(0, 6).map((row) => (
                  <div className="flex items-center justify-between gap-3 text-sm" key={row.name}>
                    <span className="truncate text-muted-foreground">{row.name}</span>
                    <span className="font-semibold">{currency(row.amount)}</span>
                  </div>
                ))}
                {!expenseByType.length ? <p className="text-sm text-muted-foreground">No expense data yet.</p> : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <EntityTable
        columns={[
          { label: "Transaction", render: (row) => row.transaction_id },
          { label: "Type", render: (row) => <Badge variant="outline">{formatFinanceLabel(row.transaction_type)}</Badge> },
          { label: "Record", render: (row) => <Badge variant={row.record_type === "income" ? "secondary" : "outline"}>{row.record_type}</Badge> },
          { label: "Amount", render: (row) => currency(row.amount) },
          { label: "Payment", render: (row) => formatFinanceLabel(row.payment_method) },
          { label: "Date", render: (row) => row.transaction_date },
        ]}
        description="Most recent finance activity for your branch."
        rows={branchRecords.slice(0, 10)}
        title="Recent transactions"
      />
    </div>
  )
}

function GeneralDashboard({
  data,
  demoMode,
  profile,
}: {
  data: LccData
  demoMode: boolean
  profile: Profile
}) {
  const totals = financeTotals(data.finance_records)
  const activeMembers = data.members.filter((member) => member.status === "ACTIVE").length
  const present = data.attendance_records.filter((record) => record.status === "PRESENT").length
  const attendanceRate = data.attendance_records.length
    ? Math.round((present / data.attendance_records.length) * 100)
    : 0

  const financeByMonth = useMemo(() => {
    const buckets = new Map<string, { month: string; income: number; expense: number }>()

    data.finance_records.forEach((record) => {
      const month = record.transaction_date.slice(0, 7)
      const current = buckets.get(month) || { month, income: 0, expense: 0 }
      if (record.record_type === "income") current.income += Number(record.amount)
      if (record.record_type === "expense") current.expense += Number(record.amount)
      buckets.set(month, current)
    })

    return Array.from(buckets.values()).sort((a, b) => a.month.localeCompare(b.month))
  }, [data.finance_records])

  const branchMix = data.branches.map((branch) => ({
    branch: branch.code,
    members: data.members.filter((member) => member.branch_id === branch.id).length,
    finance: data.finance_records
      .filter((record) => record.branch_id === branch.id && record.record_type === "income")
      .reduce((sum, record) => sum + record.amount, 0),
  }))

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description={`${roleLabels[profile.role]} view for ${labelForBranch(data, profile.branch_id)}.`}
        title="Dashboard"
      >
        {demoMode ? <Badge variant="secondary">Demo data</Badge> : <Badge>Live Supabase</Badge>}
      </PageHeader>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={UserGroupIcon} label="Active members" value={numberValue(activeMembers)} />
        <KpiCard icon={Calendar03Icon} label="Attendance rate" value={`${attendanceRate}%`} />
        <KpiCard icon={DollarCircleIcon} label="Income" value={currency(totals.income)} />
        <KpiCard icon={DatabaseAddIcon} label="Net finance" value={currency(totals.income - totals.expense)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Finance trend</CardTitle>
            <CardDescription>Income and expense movement by month.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[280px] w-full"
              config={{
                income: { label: "Income", color: "var(--chart-1)" },
                expense: { label: "Expense", color: "var(--chart-4)" },
              }}
            >
              <AreaChart data={financeByMonth}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} />
                <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="income" fill="var(--color-income)" fillOpacity={0.18} stroke="var(--color-income)" />
                <Area dataKey="expense" fill="var(--color-expense)" fillOpacity={0.14} stroke="var(--color-expense)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branch mix</CardTitle>
            <CardDescription>Members and income by branch.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[280px] w-full"
              config={{
                members: { label: "Members", color: "var(--chart-2)" },
                finance: { label: "Income", color: "var(--chart-3)" },
              }}
            >
              <BarChart data={branchMix}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="branch" tickLine={false} />
                <YAxis tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="members" fill="var(--color-members)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <EntityTable
        columns={[
          { label: "Transaction", render: (row) => row.transaction_id },
          { label: "Type", render: (row) => <Badge variant="outline">{row.transaction_type}</Badge> },
          { label: "Branch", render: (row) => labelForBranch(data, row.branch_id) },
          { label: "Amount", render: (row) => currency(row.amount) },
          { label: "Date", render: (row) => row.transaction_date },
        ]}
        description="Most recent finance activity visible to this role."
        rows={data.finance_records.slice(0, 8)}
        title="Recent finance"
      />
    </div>
  )
}

function BranchesView({ dataState }: { dataState: DataState }) {
  return (
    <DataPage
      description="Create and manage top-level church branches."
      form={<BranchForm dataState={dataState} />}
      title="Branches"
    >
      <EntityTable
        columns={[
          { label: "Name", render: (row) => row.name },
          { label: "Code", render: (row) => <Badge variant="secondary">{row.code}</Badge> },
          { label: "Phone", render: (row) => row.phone || "-" },
          { label: "Address", render: (row) => row.address || "-" },
        ]}
        rows={dataState.data.branches}
        title="Branch directory"
      />
    </DataPage>
  )
}

function EkklesiasView({ dataState }: { dataState: DataState }) {
  return (
    <DataPage
      description="Group branches into Ekklesias and assign leaders."
      form={<EkklesiaForm dataState={dataState} />}
      title="Ekklesias"
    >
      <EntityTable
        columns={[
          { label: "Name", render: (row) => row.name },
          { label: "Branch", render: (row) => labelForBranch(dataState.data, row.branch_id) },
          {
            label: "Leader",
            render: (row) => dataState.data.profiles.find((profile) => profile.id === row.leader_id)?.name || "-",
          },
        ]}
        rows={dataState.data.ekklesias}
        title="Ekklesia directory"
      />
    </DataPage>
  )
}

function BuscellsView({ dataState }: { dataState: DataState }) {
  return (
    <DataPage
      description="Maintain buscell groups, meeting days, and Ekklesia assignment."
      form={<BuscellForm dataState={dataState} />}
      title="Buscells"
    >
      <EntityTable
        columns={[
          { label: "Name", render: (row) => row.name },
          { label: "Branch", render: (row) => labelForBranch(dataState.data, row.branch_id) },
          { label: "Ekklesia", render: (row) => labelForEkklesia(dataState.data, row.ekklesia_id) },
          { label: "Meeting day", render: (row) => row.meeting_day || "-" },
        ]}
        rows={dataState.data.buscells}
        title="Buscell directory"
      />
    </DataPage>
  )
}

function UsersView({ dataState }: { dataState: DataState }) {
  return (
    <DataPage
      description="Create profile assignments for Supabase Auth users."
      form={<ProfileForm dataState={dataState} />}
      title="Staff Management"
    >
      <EntityTable
        columns={[
          { label: "Name", render: (row) => row.name },
          { label: "Email", render: (row) => row.email },
          { label: "Role", render: (row) => <Badge variant="outline">{roleLabels[row.role]}</Badge> },
          { label: "Branch", render: (row) => labelForBranch(dataState.data, row.branch_id) },
          { label: "Ekklesia", render: (row) => labelForEkklesia(dataState.data, row.ekklesia_id) },
          { label: "Buscell", render: (row) => labelForBuscell(dataState.data, row.buscell_id) },
        ]}
        rows={dataState.data.profiles}
        title="Staff profiles"
      />
    </DataPage>
  )
}

function MembersView({ dataState, profile }: { dataState: DataState; profile: Profile }) {
  const visibleMembers = dataState.data.members

  return (
    <DataPage
      description={`${roleLabels[profile.role]} member directory and UMID registration.`}
      form={<MemberForm dataState={dataState} />}
      title="Members"
    >
      <EntityTable
        columns={[
          { label: "UMID", render: (row) => <Badge>{row.umid}</Badge> },
          { label: "Name", render: (row) => row.full_name },
          { label: "Phone", render: (row) => row.phone },
          { label: "Branch", render: (row) => labelForBranch(dataState.data, row.branch_id) },
          { label: "Buscell", render: (row) => labelForBuscell(dataState.data, row.buscell_id) },
          { label: "Status", render: (row) => <Badge variant="outline">{row.status}</Badge> },
        ]}
        rows={visibleMembers}
        title="Member directory"
      />
    </DataPage>
  )
}

function OperationsView({ dataState, profile }: { dataState: DataState; profile: Profile }) {
  const assignedMembers = dataState.data.members.filter((member) => member.buscell_id === profile.buscell_id)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description={`${labelForBuscell(dataState.data, profile.buscell_id)} weekly capture and member view.`}
        title="Operations"
      />
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <BuscellRecordForm dataState={dataState} profile={profile} />
        <EntityTable
          columns={[
            { label: "UMID", render: (row) => <Badge>{row.umid}</Badge> },
            { label: "Name", render: (row) => row.full_name },
            { label: "Phone", render: (row) => row.phone },
            { label: "Status", render: (row) => row.status },
          ]}
          rows={assignedMembers}
          title="Assigned members"
        />
      </div>
    </div>
  )
}

function AttendanceView({ dataState, profile }: { dataState: DataState; profile: Profile }) {
  return (
    <DataPage
      description="Capture attendance by member, meeting type, and date."
      form={<AttendanceForm dataState={dataState} profile={profile} />}
      title="Attendance"
    >
      <EntityTable
        columns={[
          { label: "UMID", render: (row) => row.umid },
          { label: "Meeting", render: (row) => <Badge variant="secondary">{row.meeting_type}</Badge> },
          { label: "Status", render: (row) => <Badge>{row.status}</Badge> },
          { label: "Buscell", render: (row) => labelForBuscell(dataState.data, row.buscell_id) },
          { label: "Date", render: (row) => row.date },
        ]}
        rows={dataState.data.attendance_records}
        title="Attendance history"
      />
    </DataPage>
  )
}

function FinanceView({ dataState, profile }: { dataState: DataState; profile: Profile }) {
  const hasGlobalFinanceScope = profile.role === ROLES.SUPER_ADMIN || profile.role === ROLES.SUPER_FINANCE_ADMIN
  const canCollectFinance = profile.role === ROLES.SUPER_FINANCE_ADMIN || profile.role === ROLES.FINANCE_ADMIN
  const canSelectBranch = hasGlobalFinanceScope
  const [activeTab, setActiveTab] = useState<FinanceTabId>("income")
  const [filters, setFilters] = useState<FinanceFilters>({
    recordType: "",
    branchId: hasGlobalFinanceScope ? "" : profile.branch_id || "",
    transactionType: "",
    paymentMethod: "",
    dateFrom: "",
    dateTo: "",
  })

  const canCollectIncome = canCollectFinance || profile.role === ROLES.BUSCELL_PASTOR
  const canCollectExpense = canCollectFinance
  const availableTabs = financeTabs.filter((tab) => {
    if (tab.id === "income") return canCollectIncome
    if (tab.id === "expense") return canCollectExpense
    return profile.role !== ROLES.BUSCELL_PASTOR || ["records", "analytics"].includes(tab.id)
  })
  const selectedTab = availableTabs.some((tab) => tab.id === activeTab) ? activeTab : availableTabs[0]?.id || "records"

  const visibleRecords = dataState.data.finance_records.filter((record) => {
    if (hasGlobalFinanceScope) return true
    if (profile.branch_id && record.branch_id !== profile.branch_id) return false
    if (profile.role === ROLES.EKKLESIA_LEADER) return record.ekklesia_id === profile.ekklesia_id
    if (profile.role === ROLES.BUSCELL_PASTOR) return record.buscell_id === profile.buscell_id
    return true
  })
  const records = visibleRecords.filter((record) => {
    if (filters.recordType && record.record_type !== filters.recordType) return false
    if (filters.branchId && record.branch_id !== filters.branchId) return false
    if (filters.transactionType && record.transaction_type !== filters.transactionType) return false
    if (filters.paymentMethod && record.payment_method !== filters.paymentMethod) return false
    if (filters.dateFrom && record.transaction_date < filters.dateFrom) return false
    if (filters.dateTo && record.transaction_date > filters.dateTo) return false
    return true
  })
  const incomeRecords = records.filter((record) => record.record_type === "income")
  const expenseRecords = records.filter((record) => record.record_type === "expense")
  const totals = {
    income: sumFinanceRecords(incomeRecords),
    expense: sumFinanceRecords(expenseRecords),
  }

  function updateFilter(name: keyof FinanceFilters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description="Income, expenses, records, analytics, CSV exports, and report handoff from the rebuilt LCC ledger."
        title="Finance"
      />
      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard icon={DollarCircleIcon} label="Income" value={currency(totals.income)} />
        <KpiCard icon={DollarCircleIcon} label="Expenses" value={currency(totals.expense)} />
        <KpiCard icon={DollarCircleIcon} label="Net" value={currency(totals.income - totals.expense)} />
      </section>
      <Tabs className="min-w-0" onValueChange={(value) => setActiveTab(value as FinanceTabId)} value={selectedTab}>
        <div className="hide-scrollbar overflow-x-auto rounded-2xl border bg-card p-1">
          <TabsList className="h-auto w-max min-w-full justify-start rounded-xl bg-transparent p-0" variant="line">
            {availableTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger className="h-8 flex-none px-3 text-xs" key={tab.id} value={tab.id}>
                  <HugeiconsIcon data-icon="inline-start" icon={Icon} />
                  {tab.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        <TabsContent value="income">
          <FinanceIncomePanel
            canSelectBranch={canSelectBranch}
            dataState={dataState}
            profile={profile}
          />
        </TabsContent>
        <TabsContent value="expense">
          <FinanceExpensePanel
            canSelectBranch={canSelectBranch}
            dataState={dataState}
            profile={profile}
          />
        </TabsContent>
        {(["records", "analytics", "export", "reports"] as FinanceTabId[]).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <FinanceLedgerPanel
              activeTab={tab}
              canSelectBranch={canSelectBranch}
              data={dataState.data}
              expenseRecords={expenseRecords}
              filters={filters}
              incomeRecords={incomeRecords}
              records={records}
              updateFilter={updateFilter}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function MemberLookupView({ data }: { data: LccData }) {
  const [query, setQuery] = useState("")
  const member = data.members.find((item) => item.umid.toLowerCase() === query.trim().toLowerCase())

  return (
    <div className="flex flex-col gap-5">
      <PageHeader description="Find a member by UMID for finance and attendance validation." title="Member Lookup" />
      <Card>
        <CardHeader>
          <CardTitle>UMID search</CardTitle>
          <CardDescription>Type the exact UMID to open the member record.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input onChange={(event) => setQuery(event.target.value)} placeholder="LCC-HQ-0001" value={query} />
            <Button type="button" variant="outline">
              <HugeiconsIcon data-icon="inline-start" icon={Search01Icon} />
              Search
            </Button>
          </div>
          {member ? (
            <div className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-3">
              <Detail label="Name" value={member.full_name} />
              <Detail label="Phone" value={member.phone} />
              <Detail label="Branch" value={labelForBranch(data, member.branch_id)} />
              <Detail label="Ekklesia" value={labelForEkklesia(data, member.ekklesia_id)} />
              <Detail label="Buscell" value={labelForBuscell(data, member.buscell_id)} />
              <Detail label="Status" value={member.status} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function ReportsView({ data }: { data: LccData }) {
  const branchRows = data.branches.map((branch) => {
    const finance = data.finance_records.filter((record) => record.branch_id === branch.id)
    const totals = financeTotals(finance)

    return {
      ...branch,
      members: data.members.filter((member) => member.branch_id === branch.id).length,
      attendance: data.attendance_records.filter((record) => record.branch_id === branch.id).length,
      income: totals.income,
      expense: totals.expense,
    }
  })

  return (
    <div className="flex flex-col gap-5">
      <PageHeader description="Branch, buscell, attendance, and finance rollups." title="Reports" />
      <EntityTable
        columns={[
          { label: "Branch", render: (row) => row.name },
          { label: "Members", render: (row) => numberValue(row.members) },
          { label: "Attendance rows", render: (row) => numberValue(row.attendance) },
          { label: "Income", render: (row) => currency(row.income) },
          { label: "Expense", render: (row) => currency(row.expense) },
          { label: "Net", render: (row) => currency(row.income - row.expense) },
        ]}
        rows={branchRows}
        title="Branch summary"
      />
    </div>
  )
}

function WeeklyRecordsView({ dataState, profile }: { dataState: DataState; profile: Profile }) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader description="Manage the 5-week cycle and buscell record submissions." title="Weekly Records" />
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="flex flex-col gap-4">
          <RecordWeekForm dataState={dataState} />
          <BuscellRecordForm dataState={dataState} profile={profile} />
        </div>
        <EntityTable
          columns={[
            { label: "Week", render: (row) => `Week ${row.week_number}` },
            { label: "Cycle", render: (row) => row.cycle_id || "-" },
            { label: "Start", render: (row) => row.start_date },
            { label: "End", render: (row) => row.end_date },
          ]}
          rows={dataState.data.record_weeks}
          title="Record weeks"
        />
      </div>
    </div>
  )
}

function BranchForm({ dataState }: { dataState: DataState }) {
  const { notice, run } = useFormNotice()

  return (
    <FormCard description="Only Super Admin can create branches when RLS is active." title="New branch">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) =>
          run(event, async (form) => {
            await dataState.createRecord("branches", {
              name: field(form, "name"),
              code: field(form, "code").toUpperCase(),
              phone: field(form, "phone"),
              address: field(form, "address"),
            })
          })
        }
      >
        <TextField label="Name" name="name" required />
        <TextField label="Code" name="code" required />
        <TextField label="Phone" name="phone" />
        <TextAreaField label="Address" name="address" />
        <SubmitRow notice={notice} />
      </form>
    </FormCard>
  )
}

function EkklesiaForm({ dataState }: { dataState: DataState }) {
  const { notice, run } = useFormNotice()

  return (
    <FormCard description="Ekklesias inherit branch-scoped access policies." title="New Ekklesia">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) =>
          run(event, async (form) => {
            await dataState.createRecord("ekklesias", {
              name: field(form, "name"),
              branch_id: field(form, "branch_id"),
              leader_id: nullableField(form, "leader_id"),
            })
          })
        }
      >
        <TextField label="Name" name="name" required />
        <SelectField label="Branch" name="branch_id" options={dataState.data.branches.map(optionForBranch)} />
        <SelectField
          label="Leader"
          name="leader_id"
          optional
          options={dataState.data.profiles
            .filter((profile) => profile.role === ROLES.EKKLESIA_LEADER)
            .map(optionForProfile)}
        />
        <SubmitRow notice={notice} />
      </form>
    </FormCard>
  )
}

function BuscellForm({ dataState }: { dataState: DataState }) {
  const { notice, run } = useFormNotice()

  return (
    <FormCard description="Buscells sit under a branch and Ekklesia." title="New buscell">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) =>
          run(event, async (form) => {
            const ekklesiaId = field(form, "ekklesia_id")
            const ekklesia = dataState.data.ekklesias.find((item) => item.id === ekklesiaId)

            await dataState.createRecord("buscells", {
              name: field(form, "name"),
              branch_id: ekklesia?.branch_id || field(form, "branch_id"),
              ekklesia_id: ekklesiaId,
              meeting_day: field(form, "meeting_day"),
              description: field(form, "description"),
            })
          })
        }
      >
        <TextField label="Name" name="name" required />
        <SelectField label="Branch" name="branch_id" options={dataState.data.branches.map(optionForBranch)} />
        <SelectField label="Ekklesia" name="ekklesia_id" options={dataState.data.ekklesias.map(optionForEkklesia)} />
        <TextField label="Meeting day" name="meeting_day" />
        <TextAreaField label="Description" name="description" />
        <SubmitRow notice={notice} />
      </form>
    </FormCard>
  )
}

function ProfileForm({ dataState }: { dataState: DataState }) {
  const { notice, run } = useFormNotice()

  return (
    <FormCard description="Create the Auth user first, then use its UUID here." title="Assign staff profile">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) =>
          run(event, async (form) => {
            await dataState.createRecord("profiles", {
              id: field(form, "id"),
              name: field(form, "name"),
              email: field(form, "email").toLowerCase(),
              role: field(form, "role"),
              branch_id: nullableField(form, "branch_id"),
              ekklesia_id: nullableField(form, "ekklesia_id"),
              buscell_id: nullableField(form, "buscell_id"),
            })
          })
        }
      >
        <TextField label="Auth user ID" name="id" required />
        <TextField label="Name" name="name" required />
        <TextField label="Email" name="email" required type="email" />
        <SelectField
          label="Role"
          name="role"
          options={allRoles.map((role) => ({ label: roleLabels[role], value: role }))}
        />
        <SelectField label="Branch" name="branch_id" optional options={dataState.data.branches.map(optionForBranch)} />
        <SelectField
          label="Ekklesia"
          name="ekklesia_id"
          optional
          options={dataState.data.ekklesias.map(optionForEkklesia)}
        />
        <SelectField
          label="Buscell"
          name="buscell_id"
          optional
          options={dataState.data.buscells.map(optionForBuscell)}
        />
        <SubmitRow notice={notice} />
      </form>
    </FormCard>
  )
}

function MemberForm({ dataState }: { dataState: DataState }) {
  const { notice, run } = useFormNotice()

  return (
    <FormCard description="UMIDs are generated from the selected branch code." title="Register member">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) =>
          run(event, async (form) => {
            const firstName = field(form, "first_name")
            const lastName = field(form, "last_name")
            const branchId = field(form, "branch_id")

            await dataState.createRecord("members", {
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim(),
              phone: field(form, "phone"),
              email: nullableField(form, "email"),
              gender: nullableField(form, "gender"),
              address: field(form, "address"),
              date_of_birth: nullableField(form, "date_of_birth"),
              marital_status: nullableField(form, "marital_status"),
              join_date: field(form, "join_date") || new Date().toISOString().slice(0, 10),
              family_group: field(form, "family_group"),
              ministry_groups: field(form, "ministry_groups")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
              branch_id: branchId,
              ekklesia_id: field(form, "ekklesia_id"),
              buscell_id: field(form, "buscell_id"),
              umid: nextUmid(dataState.data, branchId),
              status: "ACTIVE",
            })
          })
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="First name" name="first_name" required />
          <TextField label="Last name" name="last_name" required />
        </div>
        <TextField label="Phone" name="phone" required />
        <TextField label="Email" name="email" type="email" />
        <SelectField label="Branch" name="branch_id" options={dataState.data.branches.map(optionForBranch)} />
        <SelectField label="Ekklesia" name="ekklesia_id" options={dataState.data.ekklesias.map(optionForEkklesia)} />
        <SelectField label="Buscell" name="buscell_id" options={dataState.data.buscells.map(optionForBuscell)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Gender" name="gender" />
          <TextField label="Join date" name="join_date" type="date" />
        </div>
        <TextField label="Family group" name="family_group" />
        <TextField label="Ministry groups" name="ministry_groups" />
        <TextAreaField label="Address" name="address" />
        <SubmitRow notice={notice} />
      </form>
    </FormCard>
  )
}

function AttendanceForm({ dataState, profile }: { dataState: DataState; profile: Profile }) {
  const { notice, run } = useFormNotice()

  return (
    <FormCard description="A member can have one row per date, meeting, and event." title="Record attendance">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) =>
          run(event, async (form) => {
            const member = dataState.data.members.find((item) => item.id === field(form, "member_id"))
            if (!member) throw new Error("Choose a member.")

            await dataState.createRecord("attendance_records", {
              umid: member.umid,
              member_id: member.id,
              branch_id: member.branch_id,
              buscell_id: member.buscell_id,
              date: field(form, "date") || new Date().toISOString().slice(0, 10),
              meeting_type: field(form, "meeting_type"),
              status: field(form, "status"),
              recorded_by: profile.id,
              event_id: nullableField(form, "event_id"),
            })
          })
        }
      >
        <SelectField
          label="Member"
          name="member_id"
          options={dataState.data.members.map((member) => ({ label: `${member.full_name} (${member.umid})`, value: member.id }))}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Meeting type"
            name="meeting_type"
            options={["BUSCELL_WEEKLY", "SUNDAY_SERVICE", "OVERCOMERS_SERVICE", "OTHER"].map((value) => ({ label: value, value }))}
          />
          <SelectField
            label="Status"
            name="status"
            options={["PRESENT", "ABSENT", "EXCUSED"].map((value) => ({ label: value, value }))}
          />
        </div>
        <TextField label="Date" name="date" type="date" />
        <TextField label="Event ID" name="event_id" />
        <SubmitRow notice={notice} />
      </form>
    </FormCard>
  )
}

function FinanceIncomePanel({
  canSelectBranch,
  dataState,
  profile,
}: {
  canSelectBranch: boolean
  dataState: DataState
  profile: Profile
}) {
  const [form, setForm] = useState(() => createIncomeForm(profile))
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const selectedBranchId = canSelectBranch ? form.branch_id : profile.branch_id || form.branch_id
  const incomeTypes = profile.role === ROLES.BUSCELL_PASTOR ? BUSCELL_INCOME_TYPES : INCOME_TRANSACTION_TYPES
  const branchOptions = canSelectBranch
    ? dataState.data.branches
    : dataState.data.branches.filter((branch) => branch.id === selectedBranchId)
  const ekklesiaOptions = dataState.data.ekklesias.filter(
    (ekklesia) => !selectedBranchId || ekklesia.branch_id === selectedBranchId
  )
  const buscellOptions = dataState.data.buscells.filter(
    (buscell) =>
      (!selectedBranchId || buscell.branch_id === selectedBranchId) &&
      (!form.ekklesia_id || buscell.ekklesia_id === form.ekklesia_id)
  )
  const memberOptions = dataState.data.members.filter(
    (member) =>
      (!selectedBranchId || member.branch_id === selectedBranchId) &&
      (!form.ekklesia_id || member.ekklesia_id === form.ekklesia_id) &&
      (!form.buscell_id || member.buscell_id === form.buscell_id)
  )

  function update(name: keyof IncomeFormState, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "branch_id" ? { ekklesia_id: "", buscell_id: "", member_id: "" } : {}),
      ...(name === "ekklesia_id" ? { buscell_id: "", member_id: "" } : {}),
      ...(name === "buscell_id" ? { member_id: "" } : {}),
    }))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    setSubmitting(true)

    try {
      const member = memberOptions.find((item) => item.id === form.member_id)
      const branchId = member?.branch_id || selectedBranchId
      if (!branchId) throw new Error("Select a branch before saving income.")

      await dataState.createRecord("finance_records", {
        transaction_id: `LCC-${Date.now()}`,
        record_type: "income",
        umid: member?.umid || null,
        member_id: member?.id || null,
        scope: member ? "MEMBER" : "BRANCH",
        service_type: inferFinanceServiceType(form.transaction_type),
        branch_id: branchId,
        ekklesia_id: member?.ekklesia_id || form.ekklesia_id || null,
        buscell_id: member?.buscell_id || form.buscell_id || null,
        amount: Number(form.amount || 0),
        transaction_type: form.transaction_type,
        payment_method: form.payment_method,
        transaction_date: form.transaction_date || todayInput(),
        expense_category: null,
        donor_name: form.transaction_type === "donation" ? form.donor_name || null : null,
        donor_type: form.transaction_type === "donation" ? form.donor_type || "anonymous" : member ? "member" : null,
        giver_name: member?.full_name || form.giver_name || form.donor_name || null,
        notes: form.notes,
        description: form.notes,
        recorded_by: profile.id,
        approved_by: profile.id,
        status: "approved",
      })
      setForm(createIncomeForm(profile))
      setNotice("Income record saved.")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save income record.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Collection</CardTitle>
        <CardDescription>Record member, buscell, donor, or branch income using the MERN ledger taxonomy.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" onSubmit={submit}>
          {canSelectBranch ? (
            <ControlledSelect
              label="Branch"
              onValueChange={(value) => update("branch_id", value)}
              options={branchOptions.map(optionForBranch)}
              placeholder="Select branch"
              required
              value={form.branch_id}
            />
          ) : null}
          <ControlledSelect
            label="Ekklesia"
            onValueChange={(value) => update("ekklesia_id", value)}
            options={ekklesiaOptions.map(optionForEkklesia)}
            placeholder="Optional Ekklesia"
            value={form.ekklesia_id}
          />
          <ControlledSelect
            disabled={profile.role === ROLES.BUSCELL_PASTOR}
            label="Buscell"
            onValueChange={(value) => update("buscell_id", value)}
            options={buscellOptions.map(optionForBuscell)}
            placeholder="Optional buscell"
            value={form.buscell_id}
          />
          <ControlledSelect
            label="Member"
            onValueChange={(value) => update("member_id", value)}
            options={memberOptions.map((member) => ({ label: `${member.full_name} (${member.umid})`, value: member.id }))}
            placeholder="Optional member"
            value={form.member_id}
          />
          <ControlledSelect
            label="Income Type"
            onValueChange={(value) => update("transaction_type", value)}
            options={incomeTypes.map((type) => ({ label: formatFinanceLabel(type), value: type }))}
            required
            value={form.transaction_type}
          />
          <ControlledInput label="Amount" min="0.01" onValueChange={(value) => update("amount", value)} required step="0.01" type="number" value={form.amount} />
          <ControlledSelect
            label="Payment Method"
            onValueChange={(value) => update("payment_method", value)}
            options={FINANCE_PAYMENT_METHODS.map((method) => ({ label: formatFinanceLabel(method), value: method }))}
            value={form.payment_method}
          />
          <ControlledInput label="Transaction Date" onValueChange={(value) => update("transaction_date", value)} required type="date" value={form.transaction_date} />
          {form.transaction_type === "donation" ? (
            <>
              <ControlledSelect
                label="Donor Type"
                onValueChange={(value) => update("donor_type", value)}
                options={DONATION_DONOR_TYPES.map((type) => ({ label: formatFinanceLabel(type), value: type }))}
                value={form.donor_type}
              />
              <ControlledInput label="Donor Name" onValueChange={(value) => update("donor_name", value)} value={form.donor_name} />
            </>
          ) : null}
          {form.transaction_type === "shiloh_sacrifice" ? (
            <ControlledInput label="Giver Name" onValueChange={(value) => update("giver_name", value)} value={form.giver_name} />
          ) : null}
          <ControlledTextarea className="sm:col-span-2 xl:col-span-3" label="Notes" onValueChange={(value) => update("notes", value)} value={form.notes} />
          <FinanceSubmitRow
            icon={PlusSignIcon}
            label={submitting ? "Saving..." : "Submit Income Record"}
            notice={notice}
            submitting={submitting}
          />
        </form>
      </CardContent>
    </Card>
  )
}

function FinanceExpensePanel({
  canSelectBranch,
  dataState,
  profile,
}: {
  canSelectBranch: boolean
  dataState: DataState
  profile: Profile
}) {
  const [form, setForm] = useState(() => createExpenseForm(profile))
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const selectedBranchId = canSelectBranch ? form.branch_id : profile.branch_id || form.branch_id
  const branchOptions = canSelectBranch
    ? dataState.data.branches
    : dataState.data.branches.filter((branch) => branch.id === selectedBranchId)
  const categoryOptions = EXPENSE_CATEGORIES[form.transaction_type] || []

  function update(name: keyof ExpenseFormState, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "transaction_type" ? { expense_category: "" } : {}),
    }))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    setSubmitting(true)

    try {
      if (!selectedBranchId) throw new Error("Select a branch before saving expense.")

      await dataState.createRecord("finance_records", {
        transaction_id: `LCC-${Date.now()}`,
        record_type: "expense",
        umid: null,
        member_id: null,
        scope: "BRANCH",
        service_type: "OTHER",
        branch_id: selectedBranchId,
        ekklesia_id: null,
        buscell_id: null,
        amount: Number(form.amount || 0),
        transaction_type: form.transaction_type,
        payment_method: form.payment_method,
        transaction_date: form.transaction_date || todayInput(),
        expense_category: form.expense_category || null,
        donor_name: null,
        donor_type: null,
        giver_name: null,
        notes: form.description,
        description: form.description,
        recorded_by: profile.id,
        approved_by: profile.id,
        status: "approved",
      })
      setForm(createExpenseForm(profile))
      setNotice("Expense record saved.")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save expense record.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Collection</CardTitle>
        <CardDescription>Capture branch expenses with the same categories and subcategories as the MERN app.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" onSubmit={submit}>
          {canSelectBranch ? (
            <ControlledSelect
              label="Branch"
              onValueChange={(value) => update("branch_id", value)}
              options={branchOptions.map(optionForBranch)}
              placeholder="Select branch"
              required
              value={form.branch_id}
            />
          ) : null}
          <ControlledSelect
            label="Expense Type"
            onValueChange={(value) => update("transaction_type", value)}
            options={EXPENSE_TRANSACTION_TYPES.map((type) => ({ label: formatFinanceLabel(type), value: type }))}
            value={form.transaction_type}
          />
          <ControlledSelect
            label="Subcategory"
            onValueChange={(value) => update("expense_category", value)}
            options={categoryOptions.map((category) => ({ label: formatFinanceLabel(category), value: category }))}
            placeholder="Optional subcategory"
            value={form.expense_category}
          />
          <ControlledInput label="Amount" min="0.01" onValueChange={(value) => update("amount", value)} required step="0.01" type="number" value={form.amount} />
          <ControlledSelect
            label="Payment Method"
            onValueChange={(value) => update("payment_method", value)}
            options={FINANCE_PAYMENT_METHODS.map((method) => ({ label: formatFinanceLabel(method), value: method }))}
            value={form.payment_method}
          />
          <ControlledInput label="Transaction Date" onValueChange={(value) => update("transaction_date", value)} required type="date" value={form.transaction_date} />
          <ControlledTextarea className="sm:col-span-2 xl:col-span-3" label="Description" onValueChange={(value) => update("description", value)} value={form.description} />
          <FinanceSubmitRow
            icon={MinusSignIcon}
            label={submitting ? "Saving..." : "Submit Expense Record"}
            notice={notice}
            submitting={submitting}
          />
        </form>
      </CardContent>
    </Card>
  )
}

function FinanceLedgerPanel({
  activeTab,
  canSelectBranch,
  data,
  expenseRecords,
  filters,
  incomeRecords,
  records,
  updateFilter,
}: {
  activeTab: FinanceTabId
  canSelectBranch: boolean
  data: LccData
  expenseRecords: FinanceRecord[]
  filters: FinanceFilters
  incomeRecords: FinanceRecord[]
  records: FinanceRecord[]
  updateFilter: (name: keyof FinanceFilters, value: string) => void
}) {
  const totalIncome = sumFinanceRecords(incomeRecords)
  const totalExpenses = sumFinanceRecords(expenseRecords)

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>
              {activeTab === "records" ? "Finance Records" : null}
              {activeTab === "analytics" ? "Finance Analytics" : null}
              {activeTab === "export" ? "CSV Export" : null}
              {activeTab === "reports" ? "Reports" : null}
            </CardTitle>
            <CardDescription>{records.length} records in the current view.</CardDescription>
          </div>
          <Badge variant="secondary">{records.length} records</Badge>
        </div>
        <FinanceFiltersBar
          canSelectBranch={canSelectBranch}
          data={data}
          filters={filters}
          updateFilter={updateFilter}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {activeTab === "analytics" ? (
          <FinanceAnalytics
            data={data}
            expenseRecords={expenseRecords}
            incomeRecords={incomeRecords}
            totalExpenses={totalExpenses}
            totalIncome={totalIncome}
          />
        ) : null}
        {activeTab === "export" ? (
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => exportFinanceCsv("income-records.csv", incomeRecords, data)} type="button">
              <HugeiconsIcon data-icon="inline-start" icon={Download01Icon} />
              Export Income
            </Button>
            <Button onClick={() => exportFinanceCsv("expense-records.csv", expenseRecords, data)} type="button">
              <HugeiconsIcon data-icon="inline-start" icon={Download01Icon} />
              Export Expenses
            </Button>
            <Button
              onClick={() => exportFinanceCsv("member-linked-finance-records.csv", records.filter((record) => record.member_id), data)}
              type="button"
              variant="outline"
            >
              <HugeiconsIcon data-icon="inline-start" icon={Download01Icon} />
              Export Member-Linked
            </Button>
          </div>
        ) : null}
        {activeTab === "reports" ? (
          <Alert>
            <HugeiconsIcon icon={FileChartPieIcon} />
            <AlertTitle>Reports use this ledger</AlertTitle>
            <AlertDescription>
              The Reports page reads these same finance records for branch, buscell, and finance summaries.
            </AlertDescription>
          </Alert>
        ) : null}
        {activeTab === "records" ? <FinanceRecordsTable data={data} records={records} /> : null}
      </CardContent>
    </Card>
  )
}

function FinanceFiltersBar({
  canSelectBranch,
  data,
  filters,
  updateFilter,
}: {
  canSelectBranch: boolean
  data: LccData
  filters: FinanceFilters
  updateFilter: (name: keyof FinanceFilters, value: string) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <ControlledSelect
        label="Record Type"
        onValueChange={(value) => updateFilter("recordType", value)}
        options={[
          { label: "Income", value: "income" },
          { label: "Expense", value: "expense" },
        ]}
        placeholder="All records"
        value={filters.recordType}
      />
      {canSelectBranch ? (
        <ControlledSelect
          label="Branch"
          onValueChange={(value) => updateFilter("branchId", value)}
          options={data.branches.map(optionForBranch)}
          placeholder="All branches"
          value={filters.branchId}
        />
      ) : null}
      <ControlledSelect
        label="Transaction Type"
        onValueChange={(value) => updateFilter("transactionType", value)}
        options={FINANCE_TRANSACTION_TYPES.map((type) => ({ label: formatFinanceLabel(type), value: type }))}
        placeholder="All types"
        value={filters.transactionType}
      />
      <ControlledSelect
        label="Payment Method"
        onValueChange={(value) => updateFilter("paymentMethod", value)}
        options={FINANCE_PAYMENT_METHODS.map((method) => ({ label: formatFinanceLabel(method), value: method }))}
        placeholder="All methods"
        value={filters.paymentMethod}
      />
      <ControlledInput label="From" onValueChange={(value) => updateFilter("dateFrom", value)} type="date" value={filters.dateFrom} />
      <ControlledInput label="To" onValueChange={(value) => updateFilter("dateTo", value)} type="date" value={filters.dateTo} />
    </div>
  )
}

function FinanceAnalytics({
  data,
  expenseRecords,
  incomeRecords,
  totalExpenses,
  totalIncome,
}: {
  data: LccData
  expenseRecords: FinanceRecord[]
  incomeRecords: FinanceRecord[]
  totalExpenses: number
  totalIncome: number
}) {
  const analyticsCards = [
    { label: "Total Income", amount: totalIncome },
    { label: "Total Expenses", amount: totalExpenses },
    { label: "Net Balance", amount: totalIncome - totalExpenses },
  ]
  const groups = [
    ["Income by Category", groupFinanceAmount(incomeRecords, (record) => formatFinanceLabel(record.transaction_type))],
    ["Expense by Category", groupFinanceAmount(expenseRecords, (record) => formatFinanceLabel(record.transaction_type))],
    ["Income by Branch", groupFinanceAmount(incomeRecords, (record) => labelForBranch(data, record.branch_id))],
    ["Expense by Branch", groupFinanceAmount(expenseRecords, (record) => labelForBranch(data, record.branch_id))],
  ] as const

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {analyticsCards.map((item) => (
        <div className="rounded-2xl border bg-muted/35 p-4" key={item.label}>
          <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal">{currency(item.amount)}</p>
        </div>
      ))}
      {groups.map(([title, rows]) => (
        <div className="rounded-2xl border p-4" key={title}>
          <h3 className="text-sm font-semibold">{title}</h3>
          <div className="mt-3 flex flex-col gap-2">
            {rows.slice(0, 6).map((row) => (
              <div className="flex items-center justify-between gap-3 text-sm" key={row.name}>
                <span className="truncate text-muted-foreground">{row.name}</span>
                <span className="font-semibold">{currency(row.amount)}</span>
              </div>
            ))}
            {!rows.length ? <p className="text-sm text-muted-foreground">No data yet.</p> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function FinanceRecordsTable({ data, records }: { data: LccData; records: FinanceRecord[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Record</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length ? (
            records.map((record) => {
              const member = record.member_id ? data.members.find((item) => item.id === record.member_id) : null
              return (
                <TableRow key={record.id}>
                  <TableCell>
                    <p className="font-semibold">{record.transaction_id}</p>
                    <p className="text-xs text-muted-foreground">{formatFinanceLabel(record.record_type)}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isExpenseTransactionType(record.transaction_type) ? "outline" : "secondary"}>
                      {formatFinanceLabel(record.transaction_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{currency(record.amount)}</TableCell>
                  <TableCell>{record.transaction_date}</TableCell>
                  <TableCell>
                    <p>{labelForBranch(data, record.branch_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {member?.full_name || labelForBuscell(data, record.buscell_id)}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-[20rem] whitespace-normal">
                    {record.description || record.notes || "No notes"}
                  </TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell className="h-24 text-center text-muted-foreground" colSpan={6}>
                No finance records match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function ControlledSelect({
  disabled,
  label,
  onValueChange,
  options,
  placeholder,
  required,
  value,
}: {
  disabled?: boolean
  label: string
  onValueChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  placeholder?: string
  required?: boolean
  value: string
}) {
  const displayValue = value || "none"

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select
        disabled={disabled}
        onValueChange={(nextValue) => onValueChange(nextValue === "none" ? "" : nextValue)}
        required={required}
        value={displayValue}
      >
        <SelectTrigger aria-label={label} className="w-full">
          <SelectValue placeholder={placeholder || label} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {placeholder ? <SelectItem value="none">{placeholder}</SelectItem> : null}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

function ControlledInput({
  className,
  label,
  min,
  onValueChange,
  required,
  step,
  type = "text",
  value,
}: {
  className?: string
  label: string
  min?: string
  onValueChange: (value: string) => void
  required?: boolean
  step?: string
  type?: React.HTMLInputTypeAttribute
  value: string
}) {
  const id = label.toLowerCase().replaceAll(" ", "-")

  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        min={min}
        onChange={(event) => onValueChange(event.target.value)}
        required={required}
        step={step}
        type={type}
        value={value}
      />
    </Field>
  )
}

function ControlledTextarea({
  className,
  label,
  onValueChange,
  value,
}: {
  className?: string
  label: string
  onValueChange: (value: string) => void
  value: string
}) {
  const id = label.toLowerCase().replaceAll(" ", "-")

  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea id={id} onChange={(event) => onValueChange(event.target.value)} value={value} />
    </Field>
  )
}

function FinanceSubmitRow({
  icon,
  label,
  notice,
  submitting,
}: {
  icon: typeof PlusSignIcon
  label: string
  notice: string | null
  submitting: boolean
}) {
  return (
    <div className="flex flex-col gap-3 sm:col-span-2 xl:col-span-3">
      {notice ? (
        <Alert>
          <AlertTitle>Status</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      <Button className="w-fit" disabled={submitting} type="submit">
        <HugeiconsIcon data-icon="inline-start" icon={icon} />
        {label}
      </Button>
    </div>
  )
}

function RecordWeekForm({ dataState }: { dataState: DataState }) {
  const { notice, run } = useFormNotice()

  return (
    <FormCard description="Create weekly cycle windows for record submissions." title="New record week">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) =>
          run(event, async (form) => {
            await dataState.createRecord("record_weeks", {
              week_number: numberField(form, "week_number"),
              start_date: field(form, "start_date"),
              end_date: field(form, "end_date"),
              cycle_id: field(form, "cycle_id"),
            })
          })
        }
      >
        <TextField label="Week number" name="week_number" required type="number" />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Start date" name="start_date" required type="date" />
          <TextField label="End date" name="end_date" required type="date" />
        </div>
        <TextField label="Cycle ID" name="cycle_id" />
        <SubmitRow notice={notice} />
      </form>
    </FormCard>
  )
}

function BuscellRecordForm({ dataState, profile }: { dataState: DataState; profile: Profile }) {
  const { notice, run } = useFormNotice()

  return (
    <FormCard description="Submit buscell attendance and offering for a record week." title="Buscell record">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) =>
          run(event, async (form) => {
            const buscell = dataState.data.buscells.find((item) => item.id === field(form, "buscell_id"))
            if (!buscell) throw new Error("Choose a buscell.")

            await dataState.createRecord("buscell_records", {
              week_id: field(form, "week_id"),
              branch_id: buscell.branch_id,
              ekklesia_id: buscell.ekklesia_id,
              buscell_id: buscell.id,
              sunday_attendance: numberField(form, "sunday_attendance"),
              buscell_attendance: numberField(form, "buscell_attendance"),
              buscell_offering: numberField(form, "buscell_offering"),
              recorded_by: profile.id,
            })
          })
        }
      >
        <SelectField
          label="Week"
          name="week_id"
          options={dataState.data.record_weeks.map((week) => ({
            label: `Week ${week.week_number} (${week.start_date})`,
            value: week.id,
          }))}
        />
        <SelectField label="Buscell" name="buscell_id" options={dataState.data.buscells.map(optionForBuscell)} />
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Sunday" name="sunday_attendance" type="number" />
          <TextField label="Buscell" name="buscell_attendance" type="number" />
          <TextField label="Offering" name="buscell_offering" type="number" />
        </div>
        <SubmitRow notice={notice} />
      </form>
    </FormCard>
  )
}

function PageHeader({
  children,
  description,
  title,
}: {
  children?: React.ReactNode
  description: string
  title: string
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h2 className="text-2xl font-semibold tracking-normal md:text-3xl">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  )
}

function DataPage({
  children,
  description,
  form,
  title,
}: {
  children: React.ReactNode
  description: string
  form: React.ReactNode
  title: string
}) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader description={description} title={title} />
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        {form}
        {children}
      </div>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: typeof UserGroupIcon
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <HugeiconsIcon icon={icon} />
        </div>
      </CardContent>
    </Card>
  )
}

function EntityTable<T extends { id: string }>({
  columns,
  description,
  rows,
  title,
}: {
  columns: Array<Column<T>>
  description?: string
  rows: T[]
  title: string
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead className="whitespace-nowrap" key={column.label}>
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    {columns.map((column) => (
                      <TableCell className="whitespace-nowrap" key={column.label}>
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={columns.length}>
                    No records yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function FormCard({
  children,
  description,
  title,
}: {
  children: React.ReactNode
  description: string
  title: string
}) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function TextField({
  label,
  name,
  required,
  type = "text",
}: {
  label: string
  name: string
  required?: boolean
  type?: React.HTMLInputTypeAttribute
}) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} required={required} type={type} />
    </Field>
  )
}

function TextAreaField({ label, name }: { label: string; name: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Textarea id={name} name={name} />
    </Field>
  )
}

function SelectField({
  label,
  name,
  optional,
  options,
}: {
  label: string
  name: string
  optional?: boolean
  options: Array<{ label: string; value: string }>
}) {
  const normalizedOptions = optional ? [{ label: "None", value: "none" }, ...options] : options
  const [value, setValue] = useState(normalizedOptions[0]?.value || "none")

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <input name={name} type="hidden" value={value} />
      <Select onValueChange={setValue} value={value}>
        <SelectTrigger aria-label={label} className="w-full">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {normalizedOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

function SubmitRow({ notice }: { notice: string | null }) {
  return (
    <div className="flex flex-col gap-3">
      {notice ? (
        <Alert>
          <AlertTitle>Status</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit">
        <HugeiconsIcon data-icon="inline-start" icon={PlusSignIcon} />
        Save record
      </Button>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

function useFormNotice() {
  const [notice, setNotice] = useState<string | null>(null)

  async function run(
    event: React.FormEvent<HTMLFormElement>,
    submit: (form: FormData) => Promise<void>
  ) {
    event.preventDefault()
    setNotice(null)
    const form = new FormData(event.currentTarget)

    try {
      await submit(form)
      event.currentTarget.reset()
      setNotice("Saved.")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Save failed.")
    }
  }

  return { notice, run }
}

function field(form: FormData, name: string) {
  return String(form.get(name) || "").trim()
}

function nullableField(form: FormData, name: string) {
  const value = field(form, name)
  return value && value !== "none" ? value : null
}

function numberField(form: FormData, name: string) {
  const value = Number(form.get(name) || 0)
  return Number.isFinite(value) ? value : 0
}

function optionForBranch(branch: { id: string; name: string; code: string }) {
  return { label: `${branch.name} (${branch.code})`, value: branch.id }
}

function optionForEkklesia(ekklesia: { id: string; name: string }) {
  return { label: ekklesia.name, value: ekklesia.id }
}

function optionForBuscell(buscell: { id: string; name: string }) {
  return { label: buscell.name, value: buscell.id }
}

function optionForProfile(profile: { id: string; name: string; email: string }) {
  return { label: `${profile.name} (${profile.email})`, value: profile.id }
}
