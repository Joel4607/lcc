import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../shared/components/layout/AppLayout";
import ProtectedRoute from "../shared/components/navigation/ProtectedRoute";
import { useAuth } from "../features/auth/context/AuthContext";
import { ROLES } from "../shared/constants/roles";

const BranchesPage = lazy(() => import("../features/structure/pages/BranchesPage"));
const BuscellsPage = lazy(() => import("../features/structure/pages/BuscellsPage"));
const DashboardPage = lazy(() => import("../features/dashboard/pages/DashboardPage"));
const EcclesiasPage = lazy(() => import("../features/structure/pages/EcclesiasPage"));
const FinancePage = lazy(() => import("../features/finance/pages/FinancePage"));
const LoginPage = lazy(() => import("../features/auth/pages/LoginPage"));
const AttendancePage = lazy(() => import("../features/attendance/pages/AttendancePage"));
const MemberLookupPage = lazy(() => import("../features/members/pages/MemberLookupPage"));
const MembersPage = lazy(() => import("../features/members/pages/MembersPage"));
const OperationsPage = lazy(() => import("../features/operations/pages/OperationsPage"));
const ReportsPage = lazy(() => import("../features/reports/pages/ReportsPage"));
const UsersPage = lazy(() => import("../features/users/pages/UsersPage"));
const WeeklyRecordsPage = lazy(() => import("../features/records/pages/WeeklyRecordsPage"));

function RouteFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="rounded-3xl border border-slate-200 bg-white/90 px-8 py-6 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)]">
        <p className="font-['Space_Grotesk'] text-sm uppercase tracking-[0.22em] text-slate-500">
          Loading View
        </p>
        <p className="mt-3 text-sm text-slate-600">Preparing the next workspace.</p>
      </div>
    </main>
  );
}

function LoginRoute() {
  const { token } = useAuth();

  if (token) {
    return <Navigate replace to="/dashboard" />;
  }

  return <LoginPage />;
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<LoginRoute />} path="/login" />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route element={<Navigate replace to="/dashboard" />} path="/" />
          <Route element={<DashboardPage />} path="/dashboard" />
          <Route
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
                <BranchesPage />
              </ProtectedRoute>
            }
            path="/branches"
          />
          <Route
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN]}>
                <UsersPage />
              </ProtectedRoute>
            }
            path="/users"
          />
          <Route
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN]}>
                <EcclesiasPage />
              </ProtectedRoute>
            }
            path="/ecclesias"
          />
          <Route
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN]}>
                <BuscellsPage />
              </ProtectedRoute>
            }
            path="/buscells"
          />
          <Route
            element={
              <ProtectedRoute
                allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]}
              >
                <MembersPage />
              </ProtectedRoute>
            }
            path="/members"
          />
          <Route
            element={
              <ProtectedRoute allowedRoles={[ROLES.ECCLESIA_LEADER]}>
                <AttendancePage />
              </ProtectedRoute>
            }
            path="/attendance"
          />
          <Route
            element={
              <ProtectedRoute allowedRoles={[ROLES.ECCLESIA_LEADER]}>
                <OperationsPage />
              </ProtectedRoute>
            }
            path="/operations"
          />
          <Route
            element={
              <ProtectedRoute allowedRoles={[ROLES.FINANCE_ADMIN]}>
                <FinancePage />
              </ProtectedRoute>
            }
            path="/finance"
          />
          <Route
            element={
              <ProtectedRoute
                allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]}
              >
                <WeeklyRecordsPage />
              </ProtectedRoute>
            }
            path="/weekly-records"
          />
          <Route
            element={
              <ProtectedRoute
                allowedRoles={[
                  ROLES.SUPER_ADMIN,
                  ROLES.BRANCH_ADMIN,
                  ROLES.FINANCE_ADMIN,
                ]}
              >
                <MemberLookupPage />
              </ProtectedRoute>
            }
            path="/member-lookup"
          />
          <Route
            element={
              <ProtectedRoute
                allowedRoles={[
                  ROLES.SUPER_ADMIN,
                  ROLES.BRANCH_ADMIN,
                  ROLES.FINANCE_ADMIN,
                ]}
              >
                <ReportsPage />
              </ProtectedRoute>
            }
            path="/reports"
          />
        </Route>
        <Route element={<Navigate replace to="/dashboard" />} path="*" />
      </Routes>
    </Suspense>
  );
}
