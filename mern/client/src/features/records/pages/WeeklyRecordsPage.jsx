import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../../shared/api/client";
import { AnalyticsPanel, EmptyState, StatCard, panelClass } from "../../dashboard/components/AnalyticsWidgets";
import { useAuth } from "../../auth/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import { formatCurrency, formatDate, getBranchLabel, getEcclesiaLabel } from "../../../shared/lib/data";
import { ROLES } from "../../../shared/constants/roles";

const emptyBuscellForm = { sundayAttendance: "", buscellAttendance: "", buscellOffering: "" };

function toValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function toNumberOrNull(value) {
  return value === "" ? null : Number(value);
}

function displayMetric(value, formatter = (item) => item) {
  return value === null || value === undefined ? "N/A" : formatter(value);
}

function weekLabel(week) {
  return week ? `Week ${week.weekNumber} - ${formatDate(week.startDate)} to ${formatDate(week.endDate)}` : "Select week";
}

function summaryCards(role, summary) {
  if (!summary) return [];
  if (role === ROLES.SUPER_ADMIN) return [
    ["Branches", summary.totalBranches || 0, "slate"],
    ["Submitted", summary.submittedBranches || 0, "emerald"],
    ["Sunday Attendance", summary.totalSundayAttendance || 0],
    ["Buscell Attendance", summary.totalBuscellAttendance || 0],
    ["Buscell Offering", formatCurrency(summary.totalBuscellOffering || 0)],
    ["Sunday Offering", formatCurrency(summary.totalSundayOffering || 0)],
  ];
  if (role === ROLES.BRANCH_ADMIN) return [
    ["Ecclesias", summary.totalEcclesias || 0, "slate"],
    ["Submitted", summary.submittedEcclesias || 0, "emerald"],
    ["Sunday Attendance", summary.totalSundayAttendance || 0],
    ["Buscell Attendance", summary.totalBuscellAttendance || 0],
    ["Buscell Offering", formatCurrency(summary.totalBuscellOffering || 0)],
    ["Sunday Offering", formatCurrency(summary.totalSundayOffering || 0)],
  ];
  return [
    ["Buscells", summary.totalBuscells || 0, "slate"],
    ["Submitted", summary.submittedBuscells || 0, "emerald"],
    ["Sunday Attendance", summary.totalSundayAttendance || 0],
    ["Buscell Attendance", summary.totalBuscellAttendance || 0],
    ["Buscell Offering", formatCurrency(summary.totalBuscellOffering || 0)],
  ];
}

export default function WeeklyRecordsPage() {
  const { getApiErrorMessage, user } = useAuth();
  const { showToast } = useToast();
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedEcclesiaId, setSelectedEcclesiaId] = useState(
    user.role === ROLES.ECCLESIA_LEADER ? user.ecclesiaId || "" : ""
  );
  const [selectedBuscellId, setSelectedBuscellId] = useState("");
  const [buscellForm, setBuscellForm] = useState(emptyBuscellForm);
  const [savingBuscell, setSavingBuscell] = useState(false);

  const weeksQuery = useQuery({
    queryKey: ["record-weeks", "list"],
    queryFn: async () => (await api.get("/record-weeks", { params: { limit: 10 } })).data.weeks,
  });
  const weeks = useMemo(() => weeksQuery.data || [], [weeksQuery.data]);
  const activeWeek = useMemo(
    () => weeks.find((week) => week.id === selectedWeekId) || weeks[0] || null,
    [selectedWeekId, weeks]
  );
  const activeWeekId = activeWeek?.id || "";
  const canEditBuscellRecords = user.role === ROLES.ECCLESIA_LEADER;
  const activeEcclesiaId =
    user.role === ROLES.ECCLESIA_LEADER ? user.ecclesiaId || "" : selectedEcclesiaId;

  const globalQuery = useQuery({
    enabled: user.role === ROLES.SUPER_ADMIN && Boolean(activeWeekId),
    queryKey: ["records", "global", activeWeekId],
    queryFn: async () => (await api.get("/records/global", { params: { weekId: activeWeekId } })).data,
  });
  const branchQuery = useQuery({
    enabled: user.role === ROLES.BRANCH_ADMIN && Boolean(activeWeekId),
    queryKey: ["records", "branch", "self", activeWeekId],
    queryFn: async () => (await api.get("/records/branch", { params: { weekId: activeWeekId } })).data,
  });
  const selectedBranchQuery = useQuery({
    enabled: user.role === ROLES.SUPER_ADMIN && Boolean(activeWeekId) && Boolean(selectedBranchId),
    queryKey: ["records", "branch", selectedBranchId, activeWeekId],
    queryFn: async () =>
      (await api.get(`/records/branch/${selectedBranchId}`, { params: { weekId: activeWeekId } })).data,
  });
  const ecclesiaQuery = useQuery({
    enabled: Boolean(activeWeekId) && Boolean(activeEcclesiaId),
    queryKey: ["records", "ecclesia", activeEcclesiaId, activeWeekId],
    queryFn: async () =>
      (await api.get(`/records/ecclesia/${activeEcclesiaId}`, { params: { weekId: activeWeekId } })).data,
  });

  const globalItems = useMemo(() => globalQuery.data?.items || [], [globalQuery.data?.items]);
  const branchItems = useMemo(
    () => (user.role === ROLES.BRANCH_ADMIN ? branchQuery.data?.items || [] : selectedBranchQuery.data?.items || []),
    [branchQuery.data?.items, selectedBranchQuery.data?.items, user.role]
  );
  const buscellItems = useMemo(() => ecclesiaQuery.data?.items || [], [ecclesiaQuery.data?.items]);
  const selectedBuscell = useMemo(
    () => buscellItems.find((item) => item.buscell.id === selectedBuscellId) || null,
    [buscellItems, selectedBuscellId]
  );
  const scopeSummary =
    user.role === ROLES.SUPER_ADMIN ? globalQuery.data?.summary : user.role === ROLES.BRANCH_ADMIN ? branchQuery.data?.summary : ecclesiaQuery.data?.summary;

  useEffect(() => {
    if (weeks.length && (!selectedWeekId || !weeks.some((week) => week.id === selectedWeekId))) setSelectedWeekId(weeks[0].id);
  }, [selectedWeekId, weeks]);

  useEffect(() => {
    if (user.role === ROLES.SUPER_ADMIN) {
      if (globalItems.length && (!selectedBranchId || !globalItems.some((item) => item.branch.id === selectedBranchId))) setSelectedBranchId(globalItems[0].branch.id);
    }
  }, [globalItems, selectedBranchId, user.role]);

  useEffect(() => {
    if (user.role === ROLES.ECCLESIA_LEADER) return;
    if (!branchItems.length) return setSelectedEcclesiaId("");
    if (!selectedEcclesiaId || !branchItems.some((item) => item.ecclesia.id === selectedEcclesiaId)) setSelectedEcclesiaId(branchItems[0].ecclesia.id);
  }, [branchItems, selectedEcclesiaId, user.role]);

  useEffect(() => {
    if (!buscellItems.length) {
      setSelectedBuscellId("");
      setBuscellForm(emptyBuscellForm);
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
      [globalQuery, "Records", "Unable to load global record totals."],
      [branchQuery, "Records", "Unable to load branch record totals."],
      [selectedBranchQuery, "Records", "Unable to load selected branch totals."],
      [ecclesiaQuery, "Records", "Unable to load Ecclesia record totals."],
    ].forEach(([query, title, fallback]) => {
      if (query.errorUpdatedAt && query.error) {
        showToast({ type: "error", title, message: getApiErrorMessage(query.error, fallback) });
      }
    });
  }, [branchQuery, ecclesiaQuery, getApiErrorMessage, globalQuery, selectedBranchQuery, showToast, weeksQuery]);

  async function refetchRecords() {
    const work = [];
    if (user.role === ROLES.SUPER_ADMIN) {
      work.push(globalQuery.refetch());
      if (selectedBranchId) work.push(selectedBranchQuery.refetch());
    }
    if (user.role === ROLES.BRANCH_ADMIN) work.push(branchQuery.refetch());
    if (activeEcclesiaId) work.push(ecclesiaQuery.refetch());
    await Promise.all(work);
  }

  async function saveBuscellRecord(event) {
    event.preventDefault();
    if (!canEditBuscellRecords) return;
    if (!activeWeekId || !selectedBuscellId) return;
    setSavingBuscell(true);
    try {
      await api.post("/records/buscell", {
        weekId: activeWeekId,
        buscellId: selectedBuscellId,
        sundayAttendance: toNumberOrNull(buscellForm.sundayAttendance),
        buscellAttendance: toNumberOrNull(buscellForm.buscellAttendance),
        buscellOffering: toNumberOrNull(buscellForm.buscellOffering),
      });
      showToast({ title: "Buscell record saved", message: "The weekly buscell summary was saved." });
      await refetchRecords();
    } catch (error) {
      showToast({ type: "error", title: "Buscell record", message: getApiErrorMessage(error, "Unable to save the buscell record.") });
    } finally {
      setSavingBuscell(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">Records</p>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-950">Weekly drill-down records</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Branch totals roll up from Ecclesias, and Ecclesias roll up from buscell records inside the 5-week cycle.</p>
      </header>

      <AnalyticsPanel eyebrow="Week" title="Select reporting week" description="Choose the active or recent week, then drill down inside your allowed scope.">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,1fr))]">
          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">Week</span>
            <select className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" onChange={(event) => setSelectedWeekId(event.target.value)} value={activeWeekId}>
              {weeks.map((week) => <option key={week.id} value={week.id}>{weekLabel(week)}</option>)}
            </select>
          </label>
          <StatCard label="Cycle" tone="slate" value={activeWeek?.cycleId || "N/A"} />
          <StatCard label="Start" value={activeWeek ? formatDate(activeWeek.startDate) : "N/A"} />
          <StatCard label="End" value={activeWeek ? formatDate(activeWeek.endDate) : "N/A"} />
        </div>
      </AnalyticsPanel>

      {summaryCards(user.role, scopeSummary).length ? <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{summaryCards(user.role, scopeSummary).map(([label, value, tone]) => <StatCard key={label} label={label} tone={tone} value={value} />)}</section> : null}

      {user.role === ROLES.SUPER_ADMIN ? (
        <section className={panelClass}>
          <div className="flex items-center justify-between gap-3"><h3 className="text-xl font-bold text-slate-950">Branches</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{globalItems.length} total</span></div>
          {!globalItems.length && !globalQuery.isLoading ? <div className="mt-4"><EmptyState message="No branches are available for this week." /></div> : null}
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200"><thead><tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500"><th className="pb-3 pr-4">Branch</th><th className="pb-3 pr-4">Sunday Att.</th><th className="pb-3 pr-4">Buscell Att.</th><th className="pb-3 pr-4">Buscell Offering</th><th className="pb-3 pr-4">Sunday Offering</th><th className="pb-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100 text-sm text-slate-700">{globalItems.map((item) => <tr key={item.branch.id}><td className="py-3 pr-4 font-semibold text-slate-950">{item.branch.name} ({item.branch.code})</td><td className="py-3 pr-4">{displayMetric(item.summary.totalSundayAttendance)}</td><td className="py-3 pr-4">{displayMetric(item.summary.totalBuscellAttendance)}</td><td className="py-3 pr-4">{displayMetric(item.summary.totalBuscellOffering, formatCurrency)}</td><td className="py-3 pr-4">{displayMetric(item.summary.totalSundayOffering, formatCurrency)}</td><td className="py-4"><button className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold" onClick={() => setSelectedBranchId((current) => current === item.branch.id ? "" : item.branch.id)} type="button">{selectedBranchId === item.branch.id ? "Collapse" : "Expand"}</button></td></tr>)}{globalQuery.isLoading ? <tr><td className="py-4 text-slate-500" colSpan={6}>Loading branch totals...</td></tr> : null}</tbody></table>
          </div>
        </section>
      ) : null}

      {user.role !== ROLES.ECCLESIA_LEADER ? (
        <section className={panelClass}>
          <div className="flex items-center justify-between gap-3"><h3 className="text-xl font-bold text-slate-950">Ecclesias</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{branchItems.length} total</span></div>
          <p className="mt-3 text-sm text-slate-600">{user.role === ROLES.SUPER_ADMIN ? getBranchLabel(selectedBranchQuery.data?.branch) : getBranchLabel(branchQuery.data?.branch || user.branch)}</p>
          {!branchItems.length && !(user.role === ROLES.SUPER_ADMIN ? selectedBranchQuery.isLoading : branchQuery.isLoading) ? <div className="mt-4"><EmptyState message="No Ecclesias are available in this branch yet." /></div> : null}
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200"><thead><tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500"><th className="pb-3 pr-4">Ecclesia</th><th className="pb-3 pr-4">Sunday Att.</th><th className="pb-3 pr-4">Buscell Att.</th><th className="pb-3 pr-4">Buscell Offering</th><th className="pb-3 pr-4">Submitted</th><th className="pb-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100 text-sm text-slate-700">{branchItems.map((item) => <tr key={item.ecclesia.id}><td className="py-3 pr-4"><p className="font-semibold text-slate-950">{item.ecclesia.name}</p><p className="mt-1 text-xs text-slate-500">{item.ecclesia.leader?.name || "No leader assigned"}</p></td><td className="py-3 pr-4">{displayMetric(item.summary.totalSundayAttendance)}</td><td className="py-3 pr-4">{displayMetric(item.summary.totalBuscellAttendance)}</td><td className="py-3 pr-4">{displayMetric(item.summary.totalBuscellOffering, formatCurrency)}</td><td className="py-3 pr-4">{displayMetric(item.summary.submittedBuscells)}</td><td className="py-4"><button className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold" onClick={() => setSelectedEcclesiaId((current) => current === item.ecclesia.id ? "" : item.ecclesia.id)} type="button">{selectedEcclesiaId === item.ecclesia.id ? "Collapse" : "Expand"}</button></td></tr>)}{(user.role === ROLES.SUPER_ADMIN ? selectedBranchQuery.isLoading : branchQuery.isLoading) ? <tr><td className="py-4 text-slate-500" colSpan={6}>Loading Ecclesia totals...</td></tr> : null}</tbody></table>
          </div>
        </section>
      ) : null}

      {user.role === ROLES.ECCLESIA_LEADER && !user.ecclesiaId ? <EmptyState message="This Ecclesia Leader account is not assigned to an Ecclesia yet." /> : null}

      {activeEcclesiaId ? (
        <section className={`grid gap-4 ${canEditBuscellRecords ? "lg:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
          <section className={panelClass}>
            <div className="flex items-center justify-between gap-3"><h3 className="text-xl font-bold text-slate-950">Buscells</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{buscellItems.length} total</span></div>
            <p className="mt-3 text-sm text-slate-600">{getEcclesiaLabel(ecclesiaQuery.data?.ecclesia || user.ecclesia)}</p>
            {!buscellItems.length && !ecclesiaQuery.isLoading ? <div className="mt-4"><EmptyState message="No buscells are available in this Ecclesia yet." /></div> : null}
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200"><thead><tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500"><th className="pb-3 pr-4">Buscell</th><th className="pb-3 pr-4">Sunday Att.</th><th className="pb-3 pr-4">Buscell Att.</th><th className="pb-3 pr-4">Buscell Offering</th><th className="pb-3 pr-4">Updated</th>{canEditBuscellRecords ? <th className="pb-3">Action</th> : null}</tr></thead><tbody className="divide-y divide-slate-100 text-sm text-slate-700">{buscellItems.map((item) => <tr key={item.buscell.id}><td className="py-3 pr-4 font-semibold text-slate-950">{item.buscell.name}</td><td className="py-3 pr-4">{displayMetric(item.record?.sundayAttendance)}</td><td className="py-3 pr-4">{displayMetric(item.record?.buscellAttendance)}</td><td className="py-3 pr-4">{displayMetric(item.record?.buscellOffering, formatCurrency)}</td><td className="py-3 pr-4">{item.record?.updatedAt ? formatDate(item.record.updatedAt) : "N/A"}</td>{canEditBuscellRecords ? <td className="py-4"><button className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold" onClick={() => setSelectedBuscellId(item.buscell.id)} type="button">{selectedBuscellId === item.buscell.id ? "Selected" : "Edit"}</button></td> : null}</tr>)}{ecclesiaQuery.isLoading ? <tr><td className="py-4 text-slate-500" colSpan={canEditBuscellRecords ? 6 : 5}>Loading buscell records...</td></tr> : null}</tbody></table>
            </div>
          </section>

          {canEditBuscellRecords ? <form className={panelClass} onSubmit={saveBuscellRecord}>
            <h3 className="text-xl font-bold text-slate-950">Buscell editor</h3>
            {!selectedBuscell ? <div className="mt-4"><EmptyState message="Select a buscell to update its record." /></div> : (
              <>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Selected buscell</p><p className="mt-2 text-lg font-semibold text-slate-950">{selectedBuscell.buscell.name}</p></div>
                <div className="mt-4 grid gap-4">
                  <input className="rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" min="0" name="sundayAttendance" onChange={(event) => setBuscellForm((current) => ({ ...current, sundayAttendance: event.target.value }))} placeholder="Sunday attendance" step="1" type="number" value={buscellForm.sundayAttendance} />
                  <input className="rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" min="0" name="buscellAttendance" onChange={(event) => setBuscellForm((current) => ({ ...current, buscellAttendance: event.target.value }))} placeholder="Buscell attendance" step="1" type="number" value={buscellForm.buscellAttendance} />
                  <input className="rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" min="0" name="buscellOffering" onChange={(event) => setBuscellForm((current) => ({ ...current, buscellOffering: event.target.value }))} placeholder="Buscell offering" step="0.01" type="number" value={buscellForm.buscellOffering} />
                </div>
                <button className="mt-4 w-full rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60" disabled={savingBuscell || !activeWeekId} type="submit">{savingBuscell ? "Saving..." : "Save Buscell Record"}</button>
              </>
            )}
          </form> : null}
        </section>
      ) : null}
    </div>
  );
}
