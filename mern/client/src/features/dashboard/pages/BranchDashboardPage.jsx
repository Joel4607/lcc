import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../../shared/api/client";
import { AnalyticsPanel, EmptyState, StatCard } from "../components/AnalyticsWidgets";
import { useAuth } from "../../auth/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import { formatCurrency, formatDate, getBranchLabel } from "../../../shared/lib/data";
import { displayMetric, weekLabel } from "../../../shared/lib/recordsDashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../shared/components/ui/card";
import { Badge } from "../../../shared/components/ui/badge";
import { Button } from "../../../shared/components/ui/button";
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Church,
  Users,
  ArrowUpRight,
  Layers,
  BookOpen,
} from "lucide-react";

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
    <div className="flex flex-col gap-5">
      {/* Hero Header */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/5 via-card to-primary/5 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <p className="font-display text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Branch Dashboard
            </p>
          </div>
          <CardTitle className="text-2xl font-extrabold">
            {branchQuery.data.branch?.name || getBranchLabel(user.branch)} hierarchy at a glance
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-relaxed">
            Watch weekly Ecclesia performance, review branch roll-ups, and open the buscell layer
            without leaving your branch scope.
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
                Open Full Weekly Records
                <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        }
        description="The selected week drives the branch summary, Ecclesia totals, and Sunday offering roll-up."
        eyebrow="Week Scope"
        title="Current reporting window"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Cycle" tone="slate" value={activeWeek?.cycleId || "N/A"} icon={Layers} />
          <StatCard label="Start" value={activeWeek ? formatDate(activeWeek.startDate) : "N/A"} icon={Calendar} />
          <StatCard label="End" value={activeWeek ? formatDate(activeWeek.endDate) : "N/A"} icon={Calendar} />
        </div>
      </AnalyticsPanel>

      {/* KPI Summary Row */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Ecclesias" tone="slate" value={summary.totalEcclesias || 0} icon={Church} />
        <StatCard label="Submitted" tone="emerald" value={summary.submittedEcclesias || 0} icon={CheckCircle2} />
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

      {/* Ecclesia Summary Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Ecclesia summaries</CardTitle>
              <CardDescription className="mt-1">
                Pick an Ecclesia to inspect its buscell-level records.
              </CardDescription>
            </div>
            <Badge variant="secondary">{ecclesiaItems.length} Ecclesias</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!ecclesiaItems.length ? (
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
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ecclesiaItems.map((item) => (
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
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant={selectedEcclesiaId === item.ecclesia.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedEcclesiaId(item.ecclesia.id)}
                        >
                          {selectedEcclesiaId === item.ecclesia.id ? "Selected" : "View"}
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

      {/* Ecclesia Detail + Buscell View */}
      <section className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <AnalyticsPanel
          description={
            selectedEcclesia
              ? "Snapshot of the currently selected Ecclesia."
              : "Choose an Ecclesia above to see its weekly totals."
          }
          eyebrow="Selected Ecclesia"
          title={selectedEcclesia ? selectedEcclesia.ecclesia.name : "Ecclesia detail"}
        >
          {!selectedEcclesia ? (
            <EmptyState message="Select an Ecclesia to inspect it." icon={Church} />
          ) : (
            <div className="grid gap-3">
              <StatCard
                label="Submitted Buscells"
                tone="emerald"
                value={displayMetric(selectedEcclesia.summary.submittedBuscells)}
                icon={CheckCircle2}
              />
              <StatCard
                label="Sunday Attendance"
                value={displayMetric(selectedEcclesia.summary.totalSundayAttendance)}
                icon={Users}
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

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Buscell view</CardTitle>
                <CardDescription className="mt-1">
                  See which buscell records are already in for the week.
                </CardDescription>
              </div>
              {selectedEcclesiaDetail?.ecclesia?.name ? (
                <Badge variant="info">{selectedEcclesiaDetail.ecclesia.name}</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedEcclesiaId ? (
              <EmptyState message="Select an Ecclesia above to view its buscells." icon={BookOpen} />
            ) : ecclesiaQuery.isLoading && !selectedEcclesiaDetail ? (
              <EmptyState message="Loading buscell records..." icon={Layers} />
            ) : !selectedEcclesiaDetail?.items?.length ? (
              <EmptyState message="No buscells are available in this Ecclesia yet." icon={BookOpen} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Buscell</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Sunday Att.</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Buscell Att.</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Buscell Offering</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedEcclesiaDetail.items.map((item) => (
                      <tr key={item.buscell.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">{item.buscell.name}</td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {displayMetric(item.record?.sundayAttendance)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {displayMetric(item.record?.buscellAttendance)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {displayMetric(item.record?.buscellOffering, formatCurrency)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {item.record?.updatedAt ? formatDate(item.record.updatedAt) : "N/A"}
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
