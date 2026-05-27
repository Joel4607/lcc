import assert from "node:assert/strict"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import test from "node:test"

const root = process.cwd()

function read(path) {
  return readFileSync(join(root, path), "utf8")
}

function filesUnder(path) {
  const absolute = join(root, path)
  return readdirSync(absolute).flatMap((entry) => {
    const next = join(absolute, entry)
    const stats = statSync(next)
    return stats.isDirectory() ? filesUnder(relative(root, next)) : [relative(root, next)]
  })
}

test("finance page keeps the MERN finance workflow and taxonomy", () => {
  const source = `${read("app/components/workspace-views.tsx")}\n${read("app/lib/finance.ts")}`
  const expected = [
    "Income Collection",
    "Expense Collection",
    "Finance Records",
    "Finance Analytics",
    "CSV Export",
    "overcomers_service_offering",
    "building_expense",
    "fuel_expense",
    "bank_transfer",
    "donor_type",
    "expense_category",
  ]

  for (const text of expected) {
    assert.match(source, new RegExp(text), `${text} should be present in the finance surface`)
  }
})

test("app source uses Ekklesia spelling everywhere", () => {
  const legacySpellings = [
    ["Ecc", "lesia"].join(""),
    ["ecc", "lesia"].join(""),
    ["ECC", "LESIA"].join(""),
  ]
  const legacyPattern = new RegExp(legacySpellings.join("|"))
  const checkedFiles = [
    ...filesUnder("app"),
    ...filesUnder("supabase"),
    "README.md",
  ].filter((file) => /\.(tsx?|mjs|sql|md)$/.test(file))

  for (const file of checkedFiles) {
    const source = read(file)
    assert.doesNotMatch(source, legacyPattern, `${file} still uses old spelling`)
  }
})

test("password inputs expose an explicit show-hide control", () => {
  const source = read("app/components/login-screen.tsx")
  assert.match(source, /showPassword/, "login should track password visibility")
  assert.match(source, /Hide password|Show password/, "login should label the password visibility control")
})

test("desktop sidebar has fixed regions, scrollable nav, and a collapsed mode", () => {
  const source = read("app/components/lcc-app.tsx")
  assert.match(source, /sidebarCollapsed/, "app shell should track collapsed sidebar state")
  assert.match(source, /overflow-y-auto/, "nav region should scroll independently")
  assert.match(source, /hide-scrollbar/, "nav region should hide its scrollbar")
  assert.match(source, /shrink-0/, "top and bottom sidebar regions should stay locked")
})
