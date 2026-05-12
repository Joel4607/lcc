import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../../shared/api/client";
import { AnalyticsPanel, EmptyState, StatCard } from "../components/AnalyticsWidgets";
import { useAuth } from "../../auth/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import { formatCurrency, formatDate } from "../../../shared/lib/data";
import { displayMetric, weekLabel } from "../../../shared/lib/recordsDashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../shared/components/ui/card";
import { Badge } from "../../../shared/components/ui/badge";
import { Button } from "../../../shared/components/ui/button";
import {
  Globe,
  Calendar,
  Users,
  ChevronRight,
  Building2,
  CheckCircle2,
  Church,
  ArrowUpRight,
  Layers,
} from "lucide-react";

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
    <div className="flex flex-col gap-5">
      {/* Hero Header */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/5 via-card to-primary/5 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <p className="font-display text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Global Dashboard
            </p>
          </div>
          <CardTitle className="text-2xl font-extrabold">
            Branch summaries with Ecclesia drill-down
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-relaxed">
            Review the active reporting week across all branches, then open one branch at a time to
            inspect its Ecclesia totals.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Week Scope */}
      <AnalyticsPanel
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <select
                className="h-10 min-w-[220px] rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                onChange={(event) => setSelectedWeekId(event.target.value)}
                value={activeWeekId}
              >
                {weeks.map((week) => (
                  <option key={week.id} value={week.id}>
                    {weekLabel(week)}
                  </option>
                ))}
              </select>
            </div>
            <Button asChild>
              <Link to="/weekly-records">
                Open Full Drill-Down
                <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        }
        description="Every branch summary reflects the selected week from the 5-week reporting engine."
        eyebrow="Week Scope"
        title="Active reporting window"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Cycle" tone="slate" value={activeWeek?.cycleId || "N/A"} icon={Layers} />
          <StatCard label="Start" value={activeWeek ? formatDate(activeWeek.startDate) : "N/A"} icon={Calendar} />
          <StatCard label="End" value={activeWeek ? formatDate(activeWeek.endDate) : "N/A"} icon={Calendar} />
        </div>
      </AnalyticsPanel>

      {/* KPI Summary Row */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Branches" tone="slate" value={summary.totalBranches || 0} icon={Building2} />
        <StatCard label="Submitted" tone="emerald" value={summary.submittedBranches || 0} icon={CheckCircle2} />
        <StatCard label="Sunday Attendance" value={summary.totalSundayAttendance || 0} icon={Users} />
        <StatCard label="Buscell Attendance" value={summary.totalBuscellAttendance || 0} icon={Users} />
        <StatCard
          label="Buscell Offering"
          value={formatCurrency(summary.totalBuscellOffering || 0)}
        />
        <StatCard
          label="Sunday Offering"
          value={formatCurrency(summary.totalSundayOffering || 0)}
        />
      </section>

      {/* Branch Roll-Up Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Branch roll-up</CardTitle>
              <CardDescription className="mt-1">
                Select a branch to inspect its Ecclesia totals.
              </CardDescription>
            </div>
            <Badge variant="secondary">{branchItems.length} branches</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!branchItems.length ? (
            <EmptyState message="No branch summaries have been recorded for this week yet." icon={Building2} />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Branch</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Sunday Att.</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Buscell Att.</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Buscell Offering</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Sunday Offering</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {branchItems.map((item) => (
                    <tr key={item.branch.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-foreground">{item.branch.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{item.branch.code}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {displayMetric(item.summary.totalSundayAttendance)}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {displayMetric(item.summary.totalBuscellAttendance)}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {displayMetric(item.summary.totalBuscellOffering, formatCurrency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {displayMetric(item.summary.totalSundayOffering, formatCurrency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant={selectedBranchId === item.branch.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedBranchId(item.branch.id)}
                        >
                          {selectedBranchId === item.branch.id ? "Selected" : "View"}
                          <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branch Detail + Ecclesia Drill-Down */}
      <section className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <AnalyticsPanel
          description={
            selectedBranch
              ? "Summary sourced from the same weekly record engine."
              : "Pick a branch above to inspect its structure."
          }
          eyebrow="Selected Branch"
          title={selectedBranch ? `${selectedBranch.branch.name}` : "Branch detail"}
        >
          {!selectedBranch ? (
            <EmptyState message="Select a branch to view its summary." icon={Building2} />
          ) : (
            <div className="grid gap-3">
              <StatCard
                label="Submitted Ecclesias"
                tone="emerald"
                value={displayMetric(selectedBranch.summary.submittedEcclesias)}
                icon={CheckCircle2}
              />
              <StatCard
                label="Sunday Attendance"
                value={displayMetric(selectedBranch.summary.totalSundayAttendance)}
                icon={Users}
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

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Ecclesia drill-down</CardTitle>
                <CardDescription className="mt-1">
                  Inspect which Ecclesias have submitted weekly data in the selected branch.
                </CardDescription>
              </div>
              {branchDetail?.branch ? (
                <Badge variant="info">{branchDetail.branch.name}</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedBranchId ? (
              <EmptyState message="Select a branch above to view its Ecclesias." icon={Church} />
            ) : branchDetailQuery.isLoading && !branchDetail ? (
              <EmptyState message="Loading branch drill-down..." icon={Layers} />
            ) : !branchDetail?.items?.length ? (
              <EmptyState message="No Ecclesias are available in this branch yet." icon={Church} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Ecclesia</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Sunday Att.</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Buscell Att.</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Buscell Offering</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Submitted Buscells</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {branchDetail.items.map((item) => (
                      <tr key={item.ecclesia.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-foreground">{item.ecclesia.name}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {item.ecclesia.leader?.name || "No leader assigned"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {displayMetric(item.summary.totalSundayAttendance)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {displayMetric(item.summary.totalBuscellAttendance)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {displayMetric(item.summary.totalBuscellOffering, formatCurrency)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {displayMetric(item.summary.submittedBuscells)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
