import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../../shared/api/client";
import { AnalyticsPanel, EmptyState, StatCard, panelClass } from "../components/AnalyticsWidgets";
import { useAuth } from "../../auth/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import { formatCurrency, formatDate, getBranchLabel } from "../../../shared/lib/data";
import { displayMetric, weekLabel } from "../../../shared/lib/recordsDashboard";

export default function BranchDashboardPage() {
  const { getApiErrorMessage, user } = useAuth();
  const { showToast } = useToast();
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [selectedEcclesiaId, setSelectedEcclesiaId] = useState("");

  const weeksQuery = useQuery({
    queryKey: ["record-weeks", "dashboard", "branch"],
    queryFn: async () => (await api.get("/record-weeks", { params: { limit: 10 } })).data.weeks,
  });
  const weeks = useMemo(() => weeksQuery.data || [], [weeksQuery.data]);
  const activeWeek = useMemo(
    () => weeks.find((week) => week.id === selectedWeekId) || weeks[0] || null,
    [selectedWeekId, weeks]
  );
  const activeWeekId = activeWeek?.id || "";

  const branchQuery = useQuery({
    enabled: Boolean(activeWeekId),
    queryKey: ["records", "dashboard", "branch", user.branchId, activeWeekId],
    queryFn: async () =>
      (await api.get("/records/branch", { params: { weekId: activeWeekId } })).data,
  });
  const ecclesiaItems = useMemo(() => branchQuery.data?.items || [], [branchQuery.data?.items]);

  const ecclesiaQuery = useQuery({
    enabled: Boolean(activeWeekId) && Boolean(selectedEcclesiaId),
    queryKey: ["records", "dashboard", "branch-ecclesia", selectedEcclesiaId, activeWeekId],
    queryFn: async () =>
      (await api.get(`/records/ecclesia/${selectedEcclesiaId}`, { params: { weekId: activeWeekId } }))
        .data,
  });

  useEffect(() => {
    if (weeks.length && (!selectedWeekId || !weeks.some((week) => week.id === selectedWeekId))) {
      setSelectedWeekId(weeks[0].id);
    }
  }, [selectedWeekId, weeks]);

  useEffect(() => {
    if (
      ecclesiaItems.length &&
      (!selectedEcclesiaId || !ecclesiaItems.some((item) => item.ecclesia.id === selectedEcclesiaId))
    ) {
      setSelectedEcclesiaId(ecclesiaItems[0].ecclesia.id);
    }
  }, [ecclesiaItems, selectedEcclesiaId]);

  useEffect(() => {
    [
      [weeksQuery, "Record weeks", "Unable to load record weeks."],
      [branchQuery, "Branch dashboard", "Unable to load the branch hierarchy dashboard."],
      [ecclesiaQuery, "Ecclesia drill-down", "Unable to load the selected Ecclesia summary."],
    ].forEach(([query, title, fallback]) => {
      if (query.errorUpdatedAt && query.error) {
        showToast({
          type: "error",
          title,
          message: getApiErrorMessage(query.error, fallback),
        });
      }
    });
  }, [branchQuery, ecclesiaQuery, getApiErrorMessage, showToast, weeksQuery]);

  if ((weeksQuery.isLoading || branchQuery.isLoading) && !branchQuery.data) {
    return <EmptyState message="Loading your branch dashboard..." />;
  }

  if (!branchQuery.data) {
    return <EmptyState message="No branch hierarchy data is available yet." />;
  }

  const summary = branchQuery.data.summary;
  const selectedEcclesia =
    ecclesiaItems.find((item) => item.ecclesia.id === selectedEcclesiaId) || null;
  const selectedEcclesiaDetail = ecclesiaQuery.data || null;

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
          Branch Dashboard
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
          {branchQuery.data.branch?.name || getBranchLabel(user.branch)} hierarchy at a glance
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Watch weekly Ecclesia performance, review branch roll-ups, and open the buscell layer
          without leaving your branch scope.
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
              Open Full Weekly Records
            </Link>
          </div>
        }
        description="The selected week drives the branch summary, Ecclesia totals, and read-only Sunday offering roll-up."
        eyebrow="Week Scope"
        title="Current reporting window"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Cycle" tone="slate" value={activeWeek?.cycleId || "N/A"} />
          <StatCard label="Start" value={activeWeek ? formatDate(activeWeek.startDate) : "N/A"} />
          <StatCard label="End" value={activeWeek ? formatDate(activeWeek.endDate) : "N/A"} />
        </div>
      </AnalyticsPanel>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Ecclesias" tone="slate" value={summary.totalEcclesias || 0} />
        <StatCard label="Submitted" tone="emerald" value={summary.submittedEcclesias || 0} />
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
            <h3 className="text-xl font-bold text-slate-950">Ecclesia summaries</h3>
            <p className="mt-2 text-sm text-slate-600">
              Pick an Ecclesia below to inspect the buscell-level records inside it.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            {ecclesiaItems.length} Ecclesias
          </span>
        </div>

        {!ecclesiaItems.length ? (
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
                  <th className="pb-3 pr-4">Submitted Buscells</th>
                  <th className="pb-3">Drill-down</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {ecclesiaItems.map((item) => (
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
                    <td className="py-3 pr-4">
                      {displayMetric(item.summary.submittedBuscells)}
                    </td>
                    <td className="py-4">
                      <button
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                        onClick={() => setSelectedEcclesiaId(item.ecclesia.id)}
                        type="button"
                      >
                        {selectedEcclesiaId === item.ecclesia.id ? "Selected" : "View"}
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
            selectedEcclesia
              ? "This snapshot shows the currently selected Ecclesia inside your branch."
              : "Choose an Ecclesia above to see its weekly record totals."
          }
          eyebrow="Selected Ecclesia"
          title={selectedEcclesia ? selectedEcclesia.ecclesia.name : "Ecclesia detail"}
        >
          {!selectedEcclesia ? (
            <EmptyState message="Select an Ecclesia to inspect it." />
          ) : (
            <div className="grid gap-4">
              <StatCard
                label="Submitted Buscells"
                tone="emerald"
                value={displayMetric(selectedEcclesia.summary.submittedBuscells)}
              />
              <StatCard
                label="Sunday Attendance"
                value={displayMetric(selectedEcclesia.summary.totalSundayAttendance)}
              />
              <StatCard
                label="Buscell Attendance"
                value={displayMetric(selectedEcclesia.summary.totalBuscellAttendance)}
              />
              <StatCard
                label="Buscell Offering"
                value={displayMetric(selectedEcclesia.summary.totalBuscellOffering, formatCurrency)}
              />
            </div>
          )}
        </AnalyticsPanel>

        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-950">Buscell view</h3>
              <p className="mt-2 text-sm text-slate-600">
                This drill-down stays inside the selected Ecclesia so you can see which buscell
                records are already in for the week and which should still show N/A.
              </p>
            </div>
            {selectedEcclesiaDetail?.ecclesia?.name ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                {selectedEcclesiaDetail.ecclesia.name}
              </span>
            ) : null}
          </div>

          {!selectedEcclesiaId ? (
            <div className="mt-4">
              <EmptyState message="Select an Ecclesia above to view its buscells." />
            </div>
          ) : ecclesiaQuery.isLoading && !selectedEcclesiaDetail ? (
            <div className="mt-4">
              <EmptyState message="Loading buscell records..." />
            </div>
          ) : !selectedEcclesiaDetail?.items?.length ? (
            <div className="mt-4">
              <EmptyState message="No buscells are available in this Ecclesia yet." />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                    <th className="pb-3 pr-4">Buscell</th>
                    <th className="pb-3 pr-4">Sunday Att.</th>
                    <th className="pb-3 pr-4">Buscell Att.</th>
                    <th className="pb-3 pr-4">Buscell Offering</th>
                    <th className="pb-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {selectedEcclesiaDetail.items.map((item) => (
                    <tr key={item.buscell.id}>
                      <td className="py-3 pr-4 font-semibold text-slate-950">{item.buscell.name}</td>
                      <td className="py-3 pr-4">
                        {displayMetric(item.record?.sundayAttendance)}
                      </td>
                      <td className="py-3 pr-4">
                        {displayMetric(item.record?.buscellAttendance)}
                      </td>
                      <td className="py-3 pr-4">
                        {displayMetric(item.record?.buscellOffering, formatCurrency)}
                      </td>
                      <td className="py-4">
                        {item.record?.updatedAt ? formatDate(item.record.updatedAt) : "N/A"}
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
