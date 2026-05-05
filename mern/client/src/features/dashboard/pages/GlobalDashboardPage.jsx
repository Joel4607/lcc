import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../../shared/api/client";
import { AnalyticsPanel, EmptyState, StatCard, panelClass } from "../components/AnalyticsWidgets";
import { useAuth } from "../../auth/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import { formatCurrency, formatDate } from "../../../shared/lib/data";
import { displayMetric, weekLabel } from "../../../shared/lib/recordsDashboard";

export default function GlobalDashboardPage() {
  const { getApiErrorMessage } = useAuth();
  const { showToast } = useToast();
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");

  const weeksQuery = useQuery({
    queryKey: ["record-weeks", "dashboard", "global"],
    queryFn: async () => (await api.get("/record-weeks", { params: { limit: 10 } })).data.weeks,
  });
  const weeks = useMemo(() => weeksQuery.data || [], [weeksQuery.data]);
  const activeWeek = useMemo(
    () => weeks.find((week) => week.id === selectedWeekId) || weeks[0] || null,
    [selectedWeekId, weeks]
  );
  const activeWeekId = activeWeek?.id || "";

  const globalQuery = useQuery({
    enabled: Boolean(activeWeekId),
    queryKey: ["records", "dashboard", "global", activeWeekId],
    queryFn: async () =>
      (await api.get("/records/global", { params: { weekId: activeWeekId } })).data,
  });
  const branchItems = useMemo(() => globalQuery.data?.items || [], [globalQuery.data?.items]);

  const branchDetailQuery = useQuery({
    enabled: Boolean(activeWeekId) && Boolean(selectedBranchId),
    queryKey: ["records", "dashboard", "global-branch", selectedBranchId, activeWeekId],
    queryFn: async () =>
      (await api.get(`/records/branch/${selectedBranchId}`, { params: { weekId: activeWeekId } }))
        .data,
  });

  useEffect(() => {
    if (weeks.length && (!selectedWeekId || !weeks.some((week) => week.id === selectedWeekId))) {
      setSelectedWeekId(weeks[0].id);
    }
  }, [selectedWeekId, weeks]);

  useEffect(() => {
    if (
      branchItems.length &&
      (!selectedBranchId || !branchItems.some((item) => item.branch.id === selectedBranchId))
    ) {
      setSelectedBranchId(branchItems[0].branch.id);
    }
  }, [branchItems, selectedBranchId]);

  useEffect(() => {
    [
      [weeksQuery, "Record weeks", "Unable to load record weeks."],
      [globalQuery, "Global dashboard", "Unable to load the global dashboard."],
      [branchDetailQuery, "Branch drill-down", "Unable to load the selected branch summary."],
    ].forEach(([query, title, fallback]) => {
      if (query.errorUpdatedAt && query.error) {
        showToast({
          type: "error",
          title,
          message: getApiErrorMessage(query.error, fallback),
        });
      }
    });
  }, [branchDetailQuery, getApiErrorMessage, globalQuery, showToast, weeksQuery]);

  if ((weeksQuery.isLoading || globalQuery.isLoading) && !globalQuery.data) {
    return <EmptyState message="Loading the hierarchy dashboard..." />;
  }

  if (!globalQuery.data) {
    return <EmptyState message="No hierarchy dashboard data is available yet." />;
  }

  const summary = globalQuery.data.summary;
  const selectedBranch = branchItems.find((item) => item.branch.id === selectedBranchId) || null;
  const branchDetail = branchDetailQuery.data || null;

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
          Global Dashboard
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
          Branch summaries with Ecclesia drill-down
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Review the active reporting week across all branches, then open one branch at a time to
          inspect its Ecclesia totals without leaving the hierarchy view.
        </p>
      </header>

      <AnalyticsPanel
        actions={
          <div className="flex flex-wrap gap-3">
            <select
              className="min-w-[220px] rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              onChange={(event) => setSelectedWeekId(event.target.value)}
              value={activeWeekId}
            >
              {weeks.map((week) => (
                <option key={week.id} value={week.id}>
                  {weekLabel(week)}
                </option>
              ))}
            </select>
            <Link
              className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600"
              to="/weekly-records"
            >
              Open Full Drill-Down
            </Link>
          </div>
        }
        description="The dashboard follows the 5-week reporting engine, so every branch summary reflects the selected week."
        eyebrow="Week Scope"
        title="Active reporting window"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Cycle" tone="slate" value={activeWeek?.cycleId || "N/A"} />
          <StatCard label="Start" value={activeWeek ? formatDate(activeWeek.startDate) : "N/A"} />
          <StatCard label="End" value={activeWeek ? formatDate(activeWeek.endDate) : "N/A"} />
        </div>
      </AnalyticsPanel>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Branches" tone="slate" value={summary.totalBranches || 0} />
        <StatCard label="Submitted" tone="emerald" value={summary.submittedBranches || 0} />
        <StatCard label="Sunday Attendance" value={summary.totalSundayAttendance || 0} />
        <StatCard label="Buscell Attendance" value={summary.totalBuscellAttendance || 0} />
        <StatCard
          label="Buscell Offering"
          value={formatCurrency(summary.totalBuscellOffering || 0)}
        />
        <StatCard
          label="Sunday Offering"
          value={formatCurrency(summary.totalSundayOffering || 0)}
        />
      </section>

      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-950">Branch roll-up</h3>
            <p className="mt-2 text-sm text-slate-600">
              Select a branch to inspect the Ecclesia totals contributing to its weekly summary.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            {branchItems.length} branches
          </span>
        </div>

        {!branchItems.length ? (
          <div className="mt-4">
            <EmptyState message="No branch summaries have been recorded for this week yet." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <th className="pb-3 pr-4">Branch</th>
                  <th className="pb-3 pr-4">Sunday Att.</th>
                  <th className="pb-3 pr-4">Buscell Att.</th>
                  <th className="pb-3 pr-4">Buscell Offering</th>
                  <th className="pb-3 pr-4">Sunday Offering</th>
                  <th className="pb-3">Drill-down</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {branchItems.map((item) => (
                  <tr key={item.branch.id}>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-950">{item.branch.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.branch.code}</p>
                    </td>
                    <td className="py-3 pr-4">
                      {displayMetric(item.summary.totalSundayAttendance)}
                    </td>
                    <td className="py-3 pr-4">
                      {displayMetric(item.summary.totalBuscellAttendance)}
                    </td>
                    <td className="py-3 pr-4">
                      {displayMetric(item.summary.totalBuscellOffering, formatCurrency)}
                    </td>
                    <td className="py-3 pr-4">
                      {displayMetric(item.summary.totalSundayOffering, formatCurrency)}
                    </td>
                    <td className="py-4">
                      <button
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                        onClick={() => setSelectedBranchId(item.branch.id)}
                        type="button"
                      >
                        {selectedBranchId === item.branch.id ? "Selected" : "View"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <AnalyticsPanel
          description={
            selectedBranch
              ? "The selected branch summary is sourced from the same weekly record engine as the drill-down table."
              : "Pick a branch above to inspect its Ecclesia structure."
          }
          eyebrow="Selected Branch"
          title={selectedBranch ? `${selectedBranch.branch.name} overview` : "Branch detail"}
        >
          {!selectedBranch ? (
            <EmptyState message="Select a branch to view its summary." />
          ) : (
            <div className="grid gap-4">
              <StatCard
                label="Submitted Ecclesias"
                tone="emerald"
                value={displayMetric(selectedBranch.summary.submittedEcclesias)}
              />
              <StatCard
                label="Sunday Attendance"
                value={displayMetric(selectedBranch.summary.totalSundayAttendance)}
              />
              <StatCard
                label="Buscell Attendance"
                value={displayMetric(selectedBranch.summary.totalBuscellAttendance)}
              />
              <StatCard
                label="Buscell Offering"
                value={displayMetric(selectedBranch.summary.totalBuscellOffering, formatCurrency)}
              />
              <StatCard
                label="Sunday Offering"
                value={displayMetric(selectedBranch.summary.totalSundayOffering, formatCurrency)}
              />
            </div>
          )}
        </AnalyticsPanel>

        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-950">Ecclesia drill-down</h3>
              <p className="mt-2 text-sm text-slate-600">
                Drill into the selected branch to see which Ecclesias have submitted weekly data.
              </p>
            </div>
            {branchDetail?.branch ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                {branchDetail.branch.name}
              </span>
            ) : null}
          </div>

          {!selectedBranchId ? (
            <div className="mt-4">
              <EmptyState message="Select a branch above to view its Ecclesias." />
            </div>
          ) : branchDetailQuery.isLoading && !branchDetail ? (
            <div className="mt-4">
              <EmptyState message="Loading branch drill-down..." />
            </div>
          ) : !branchDetail?.items?.length ? (
            <div className="mt-4">
              <EmptyState message="No Ecclesias are available in this branch yet." />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                    <th className="pb-3 pr-4">Ecclesia</th>
                    <th className="pb-3 pr-4">Sunday Att.</th>
                    <th className="pb-3 pr-4">Buscell Att.</th>
                    <th className="pb-3 pr-4">Buscell Offering</th>
                    <th className="pb-3">Submitted Buscells</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {branchDetail.items.map((item) => (
                    <tr key={item.ecclesia.id}>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-slate-950">{item.ecclesia.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.ecclesia.leader?.name || "No leader assigned"}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        {displayMetric(item.summary.totalSundayAttendance)}
                      </td>
                      <td className="py-3 pr-4">
                        {displayMetric(item.summary.totalBuscellAttendance)}
                      </td>
                      <td className="py-3 pr-4">
                        {displayMetric(item.summary.totalBuscellOffering, formatCurrency)}
                      </td>
                      <td className="py-4">
                        {displayMetric(item.summary.submittedBuscells)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
