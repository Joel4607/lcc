import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("branches", "routes/branches.tsx"),
  route("users", "routes/users.tsx"),
  route("ekklesias", "routes/ekklesias.tsx"),
  route("buscells", "routes/buscells.tsx"),
  route("members", "routes/members.tsx"),
  route("operations", "routes/operations.tsx"),
  route("attendance", "routes/attendance.tsx"),
  route("finance", "routes/finance.tsx"),
  route("member-lookup", "routes/member-lookup.tsx"),
  route("reports", "routes/reports.tsx"),
  route("weekly-records", "routes/weekly-records.tsx"),
] satisfies RouteConfig
