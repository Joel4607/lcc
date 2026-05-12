import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../../shared/api/client";
import {
  BarChartCard,
  EmptyState,
  StatCard,
  TrendChartCard,
} from "../components/AnalyticsWidgets";
import { useAuth } from "../../auth/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import { formatCurrency, formatEnumLabel, getBranchLabel } from "../../../shared/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../shared/components/ui/card";
import {
  Banknote,
  Calendar,
  DollarSign,
  HandCoins,
  Wallet,
} from "lucide-react";

function getTodayInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function FinanceSummaryPage() {
  const { getApiErrorMessage, user } = useAuth();
  const { showToast } = useToast();
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: getTodayInput(),
  });
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "finance-summary", user.role, user.branchId, filters.dateFrom, filters.dateTo],
    queryFn: async () => {
      const response = await api.get("/dashboard/finance", {
        params: {
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        },
      });

      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (!dashboardQuery.errorUpdatedAt || !dashboardQuery.error) {
      return;
    }

    showToast({
      type: "error",
      title: "Finance summary",
      message: getApiErrorMessage(dashboardQuery.error, "Unable to load the finance summary."),
    });
  }, [dashboardQuery.error, dashboardQuery.errorUpdatedAt, getApiErrorMessage, showToast]);

  const dashboard = dashboardQuery.data || null;
  const isLoading = dashboardQuery.isLoading;

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  if (isLoading && !dashboard) {
    return <EmptyState message="Loading the finance summary..." />;
  }

  if (!dashboard) {
    return <EmptyState message="No finance summary data is available yet." />;
  }

  const contributions = dashboard.breakdowns.contributionsByTransactionType;

  return (
    <div className="flex flex-col gap-5">
      {/* Hero Header */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-emerald-500/5 via-card to-primary/5 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="font-display text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Finance Summary
            </p>
          </div>
          <CardTitle className="text-2xl font-extrabold">
            {dashboard.branch?.name || getBranchLabel(user.branch)} contribution overview
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-relaxed">
            Focused finance visibility including transaction mix, trend lines, and buscell
            contribution comparisons.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Date Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 py-4">
          <div className="min-w-[180px] flex-1">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">From date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                name="dateFrom"
                onChange={handleFilterChange}
                type="date"
                value={filters.dateFrom}
              />
            </div>
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">To date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                name="dateTo"
                onChange={handleFilterChange}
                type="date"
                value={filters.dateTo}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary Row */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Branch Contributions"
          tone="slate"
          value={formatCurrency(dashboard.metrics.totalBranchContributions)}
          icon={DollarSign}
        />
        <StatCard
          label="Tithes"
          value={formatCurrency(
            contributions.find((row) => row.transactionType === "TITHE")?.totalAmount || 0
          )}
          icon={HandCoins}
        />
        <StatCard
          label="Sunday Offerings"
          tone="emerald"
          value={formatCurrency(
            contributions.find((row) => row.transactionType === "SUNDAY_OFFERING")?.totalAmount || 0
          )}
          icon={Banknote}
        />
        <StatCard
          label="Buscell Offerings"
          value={formatCurrency(
            contributions.find((row) => row.transactionType === "BUSCELL_OFFERING")?.totalAmount || 0
          )}
          icon={Banknote}
        />
      </section>

      {/* Charts Row */}
      <section className="grid gap-5 lg:grid-cols-2">
        <TrendChartCard
          color="hsl(160, 60%, 45%)"
          data={dashboard.breakdowns.branchFinanceTrend}
          dataKey="totalAmount"
          description="Contribution totals over time in the selected date range."
          title="Branch Finance Trend"
          valueFormatter={(value) => formatCurrency(Number(value))}
        />
        <BarChartCard
          bars={[{ color: "hsl(199, 89%, 48%)", dataKey: "totalAmount", name: "Amount" }]}
          data={contributions.map((row) => ({
            transactionType: formatEnumLabel(row.transactionType),
            totalAmount: row.totalAmount,
          }))}
          description="Contribution totals by transaction type."
          title="Contribution Mix"
          xKey="transactionType"
          yFormatter={(value) => formatCurrency(Number(value))}
        />
      </section>
    </div>
  );
}
