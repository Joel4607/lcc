import { EmptyState } from "../components/AnalyticsWidgets";
import { useAuth } from "../../auth/context/AuthContext";
import { ROLES } from "../../../shared/constants/roles";
import BranchDashboardPage from "./BranchDashboardPage";
import EcclesiaLeaderDashboardPage from "./EcclesiaLeaderDashboardPage";
import FinanceSummaryPage from "./FinanceSummaryPage";
import GlobalDashboardPage from "./GlobalDashboardPage";

export default function DashboardPage() {
  const { user } = useAuth();

  if (user.role === ROLES.SUPER_ADMIN) {
    return <GlobalDashboardPage />;
  }

  if (user.role === ROLES.BRANCH_ADMIN) {
    return <BranchDashboardPage />;
  }

  if (user.role === ROLES.ECCLESIA_LEADER) {
    return <EcclesiaLeaderDashboardPage />;
  }

  if (user.role === ROLES.FINANCE_ADMIN) {
    return <FinanceSummaryPage />;
  }

  return <EmptyState message="No dashboard is available for this account." />;
}
