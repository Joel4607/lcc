import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../../shared/api/client";
import { AnalyticsPanel, EmptyState, StatCard, panelClass } from "../components/AnalyticsWidgets";
import { useAuth } from "../../auth/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import { formatCurrency, formatDate, getEcclesiaLabel } from "../../../shared/lib/data";
import {
  displayMetric,
  emptyBuscellRecordForm,
  toNumberOrNull,
  toValue,
  weekLabel,
} from "../../../shared/lib/recordsDashboard";

export default function EcclesiaLeaderDashboardPage() {
  const { getApiErrorMessage, user } = useAuth();
  const { showToast } = useToast();
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [selectedBuscellId, setSelectedBuscellId] = useState("");
  const [buscellForm, setBuscellForm] = useState(emptyBuscellRecordForm);
  const [savingRecord, setSavingRecord] = useState(false);

  const weeksQuery = useQuery({
    queryKey: ["record-weeks", "dashboard", "ecclesia"],
    queryFn: async () => (await api.get("/record-weeks", { params: { limit: 10 } })).data.weeks,
  });
  const weeks = useMemo(() => weeksQuery.data || [], [weeksQuery.data]);
  const activeWeek = useMemo(
    () => weeks.find((week) => week.id === selectedWeekId) || weeks[0] || null,
    [selectedWeekId, weeks]
  );
  const activeWeekId = activeWeek?.id || "";

  const ecclesiaQuery = useQuery({
    enabled: Boolean(user.ecclesiaId) && Boolean(activeWeekId),
    queryKey: ["records", "dashboard", "ecclesia", user.ecclesiaId, activeWeekId],
    queryFn: async () =>
      (await api.get(`/records/ecclesia/${user.ecclesiaId}`, { params: { weekId: activeWeekId } }))
        .data,
  });
  const buscellItems = useMemo(() => ecclesiaQuery.data?.items || [], [ecclesiaQuery.data?.items]);
  const selectedBuscell = useMemo(
    () => buscellItems.find((item) => item.buscell.id === selectedBuscellId) || null,
    [buscellItems, selectedBuscellId]
  );

  useEffect(() => {
    if (weeks.length && (!selectedWeekId || !weeks.some((week) => week.id === selectedWeekId))) {
      setSelectedWeekId(weeks[0].id);
    }
  }, [selectedWeekId, weeks]);

  useEffect(() => {
    if (!buscellItems.length) {
      setSelectedBuscellId("");
      setBuscellForm(emptyBuscellRecordForm);
      return;
    }

    if (!selectedBuscellId || !buscellItems.some((item) => item.buscell.id === selectedBuscellId)) {
      setSelectedBuscellId(buscellItems[0].buscell.id);
      return;
    }

    setBuscellForm({
      sundayAttendance: toValue(selectedBuscell?.record?.sundayAttendance),
      buscellAttendance: toValue(selectedBuscell?.record?.buscellAttendance),
      buscellOffering: toValue(selectedBuscell?.record?.buscellOffering),
    });
  }, [buscellItems, selectedBuscell, selectedBuscellId]);

  useEffect(() => {
    [
      [weeksQuery, "Record weeks", "Unable to load record weeks."],
      [ecclesiaQuery, "Ecclesia dashboard", "Unable to load your Ecclesia summary."],
    ].forEach(([query, title, fallback]) => {
      if (query.errorUpdatedAt && query.error) {
        showToast({
          type: "error",
          title,
          message: getApiErrorMessage(query.error, fallback),
        });
      }
    });
  }, [ecclesiaQuery, getApiErrorMessage, showToast, weeksQuery]);

  async function saveBuscellRecord(event) {
    event.preventDefault();

    if (!activeWeekId || !selectedBuscellId) {
      return;
    }

    setSavingRecord(true);

    try {
      await api.post("/records/buscell", {
        weekId: activeWeekId,
        buscellId: selectedBuscellId,
        sundayAttendance: toNumberOrNull(buscellForm.sundayAttendance),
        buscellAttendance: toNumberOrNull(buscellForm.buscellAttendance),
        buscellOffering: toNumberOrNull(buscellForm.buscellOffering),
      });

      showToast({
        title: "Buscell record saved",
        message: "The weekly buscell summary has been saved for your Ecclesia.",
      });
      await ecclesiaQuery.refetch();
    } catch (error) {
      showToast({
        type: "error",
        title: "Buscell record",
        message: getApiErrorMessage(error, "Unable to save the buscell record."),
      });
    } finally {
      setSavingRecord(false);
    }
  }

  if (!user.ecclesiaId) {
    return (
      <EmptyState message="This Ecclesia Leader account is not assigned to an Ecclesia yet." />
    );
  }

  if ((weeksQuery.isLoading || ecclesiaQuery.isLoading) && !ecclesiaQuery.data) {
    return <EmptyState message="Loading your Ecclesia dashboard..." />;
  }

  if (!ecclesiaQuery.data) {
    return <EmptyState message="No Ecclesia dashboard data is available yet." />;
  }

  const summary = ecclesiaQuery.data.summary;

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
          Ecclesia Dashboard
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
          {getEcclesiaLabel(ecclesiaQuery.data.ecclesia || user.ecclesia)} weekly reporting desk
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This dashboard stays inside your Ecclesia only, showing the current week, the submitted
          buscell totals, and a direct editor for buscell data entry.
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
        description="You can only access your own Ecclesia from here. Every total and buscell editor below stays within that assignment."
        eyebrow="Week Scope"
        title="Weekly reporting window"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Cycle" tone="slate" value={activeWeek?.cycleId || "N/A"} />
          <StatCard label="Start" value={activeWeek ? formatDate(activeWeek.startDate) : "N/A"} />
          <StatCard label="End" value={activeWeek ? formatDate(activeWeek.endDate) : "N/A"} />
        </div>
      </AnalyticsPanel>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Buscells" tone="slate" value={summary.totalBuscells || 0} />
        <StatCard label="Submitted" tone="emerald" value={summary.submittedBuscells || 0} />
        <StatCard label="Sunday Attendance" value={summary.totalSundayAttendance || 0} />
        <StatCard label="Buscell Attendance" value={summary.totalBuscellAttendance || 0} />
        <StatCard
          label="Buscell Offering"
          value={formatCurrency(summary.totalBuscellOffering || 0)}
        />
        <StatCard label="Week" value={activeWeek ? `Week ${activeWeek.weekNumber}` : "N/A"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-950">Buscell weekly records</h3>
              <p className="mt-2 text-sm text-slate-600">
                Unsubmitted buscells stay visible as N/A so you can quickly see what still needs
                to be recorded this week.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              {buscellItems.length} buscells
            </span>
          </div>

          {!buscellItems.length ? (
            <div className="mt-4">
              <EmptyState message="No buscells are available in your Ecclesia yet." />
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
                    <th className="pb-3 pr-4">Updated</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {buscellItems.map((item) => (
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
                      <td className="py-3 pr-4">
                        {item.record?.updatedAt ? formatDate(item.record.updatedAt) : "N/A"}
                      </td>
                      <td className="py-4">
                        <button
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                          onClick={() => setSelectedBuscellId(item.buscell.id)}
                          type="button"
                        >
                          {selectedBuscellId === item.buscell.id ? "Selected" : "Edit"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <form className={panelClass} onSubmit={saveBuscellRecord}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
                Buscell Data Entry
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">Update one buscell</h3>
            </div>
            {selectedBuscell?.record?.updatedAt ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                Updated {formatDate(selectedBuscell.record.updatedAt)}
              </span>
            ) : null}
          </div>

          {!selectedBuscell ? (
            <div className="mt-4">
              <EmptyState message="Select a buscell from the table to enter weekly data." />
            </div>
          ) : (
            <>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Selected buscell</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {selectedBuscell.buscell.name}
                </p>
              </div>

              <div className="mt-4 grid gap-4">
                <input
                  className="rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  min="0"
                  onChange={(event) =>
                    setBuscellForm((current) => ({
                      ...current,
                      sundayAttendance: event.target.value,
                    }))
                  }
                  placeholder="Sunday attendance"
                  step="1"
                  type="number"
                  value={buscellForm.sundayAttendance}
                />
                <input
                  className="rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  min="0"
                  onChange={(event) =>
                    setBuscellForm((current) => ({
                      ...current,
                      buscellAttendance: event.target.value,
                    }))
                  }
                  placeholder="Buscell attendance"
                  step="1"
                  type="number"
                  value={buscellForm.buscellAttendance}
                />
                <input
                  className="rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  min="0"
                  onChange={(event) =>
                    setBuscellForm((current) => ({
                      ...current,
                      buscellOffering: event.target.value,
                    }))
                  }
                  placeholder="Buscell offering"
                  step="0.01"
                  type="number"
                  value={buscellForm.buscellOffering}
                />
              </div>

              <button
                className="mt-4 w-full rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingRecord || !activeWeekId}
                type="submit"
              >
                {savingRecord ? "Saving..." : "Save Buscell Record"}
              </button>
            </>
          )}
        </form>
      </section>
    </div>
  );
}
