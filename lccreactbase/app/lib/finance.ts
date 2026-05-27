import type { FinanceRecord } from "~/lib/domain"

export const INCOME_TRANSACTION_TYPES = [
  "tithe",
  "leaders_tithe",
  "sunday_offering",
  "lcm_offering",
  "buscell_offering",
  "overcomers_service_offering",
  "shiloh_sacrifice",
  "donation",
  "seed",
  "building_fund",
  "welfare_contribution",
  "momo_income",
  "special_offering",
  "dollar_sunday",
  "other_income",
] as const

export const EXPENSE_TRANSACTION_TYPES = [
  "building_expense",
  "fuel_expense",
  "vehicle_expense",
  "welfare_expense",
  "printing_expense",
  "rent_expense",
  "program_expense",
  "transport_expense",
  "reimbursement",
  "bank_transfer",
  "maintenance_expense",
  "other_expense",
] as const

export const FINANCE_TRANSACTION_TYPES = [
  ...INCOME_TRANSACTION_TYPES,
  ...EXPENSE_TRANSACTION_TYPES,
] as const

export const MEMBER_LINKED_INCOME_TYPES = [
  "tithe",
  "leaders_tithe",
  "shiloh_sacrifice",
  "donation",
  "seed",
  "building_fund",
  "welfare_contribution",
] as const

export const BUSCELL_INCOME_TYPES = ["buscell_offering"] as const

export const FINANCE_PAYMENT_METHODS = ["cash", "momo", "bank_transfer", "cheque"] as const

export const FINANCE_SERVICE_TYPES = [
  "BUSCELL_WEEKLY",
  "SUNDAY_SERVICE",
  "OVERCOMERS_SERVICE",
  "OTHER",
] as const

export const DONATION_DONOR_TYPES = [
  "member",
  "visitor",
  "organization",
  "anonymous",
  "external",
] as const

export const EXPENSE_CATEGORIES: Record<string, string[]> = {
  building_expense: [
    "blocks",
    "cement",
    "stones",
    "workmanship",
    "electrical",
    "transport",
    "repairs",
    "maintenance",
    "other_building_expense",
  ],
  fuel_expense: [
    "ministry_fuel",
    "branch_fuel",
    "buscell_fuel",
    "vehicle_fuel",
    "other_fuel_expense",
  ],
  vehicle_expense: [
    "car_expense",
    "car_oil_change",
    "vehicle_maintenance",
    "vehicle_repairs",
    "other_vehicle_expense",
  ],
  welfare_expense: [
    "funeral_welfare",
    "member_support",
    "salary_welfare",
    "emergency_support",
    "other_welfare_expense",
  ],
  printing_expense: [
    "printing_expense",
    "book_printing",
    "stationery",
    "documentation",
    "other_admin_expense",
  ],
  program_expense: [
    "rose_of_sharon",
    "outreach",
    "conference",
    "special_service",
    "other_program_expense",
  ],
}

export function formatFinanceLabel(value: string | null | undefined) {
  if (!value) return "Not set"

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function isExpenseTransactionType(value: string) {
  return (EXPENSE_TRANSACTION_TYPES as readonly string[]).includes(value)
}

export function inferFinanceServiceType(transactionType: string): FinanceRecord["service_type"] {
  if (transactionType === "buscell_offering") return "BUSCELL_WEEKLY"
  if (transactionType === "sunday_offering" || transactionType === "tithe") return "SUNDAY_SERVICE"
  if (transactionType === "overcomers_service_offering") return "OVERCOMERS_SERVICE"
  return "OTHER"
}
