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
    <div className="flex flex-col gap-4">
      <header className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
          Finance Summary
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
          {dashboard.branch?.name || getBranchLabel(user.branch)} contribution overview
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Focused finance visibility for the branch, including transaction mix, trend lines, and
          buscell contribution comparisons.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          name="dateFrom"
          onChange={handleFilterChange}
          type="date"
          value={filters.dateFrom}
        />
        <input
          className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          name="dateTo"
          onChange={handleFilterChange}
          type="date"
          value={filters.dateTo}
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard
          label="Branch Contributions"
          tone="slate"
          value={formatCurrency(dashboard.metrics.totalBranchContributions)}
        />
        <StatCard
          label="Tithes"
          value={formatCurrency(
            contributions.find((row) => row.transactionType === "TITHE")?.totalAmount || 0
          )}
        />
        <StatCard
          label="Sunday Offerings"
          tone="emerald"
          value={formatCurrency(
            contributions.find((row) => row.transactionType === "SUNDAY_OFFERING")?.totalAmount || 0
          )}
        />
        <StatCard
          label="Buscell Offerings"
          value={formatCurrency(
            contributions.find((row) => row.transactionType === "BUSCELL_OFFERING")?.totalAmount || 0
          )}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TrendChartCard
          color="#0f172a"
          data={dashboard.breakdowns.branchFinanceTrend}
          dataKey="totalAmount"
          description="Contribution totals over time in the selected date range."
          title="Branch Finance Trend"
          valueFormatter={(value) => formatCurrency(Number(value))}
        />
        <BarChartCard
          bars={[{ color: "#f97316", dataKey: "totalAmount", name: "Amount" }]}
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
