import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../../shared/api/client";
import { AnalyticsPanel, EmptyState, StatCard } from "../components/AnalyticsWidgets";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../shared/components/ui/card";
import { Badge } from "../../../shared/components/ui/badge";
import { Button } from "../../../shared/components/ui/button";
import {
  Calendar,
  CheckCircle2,
  Church,
  Edit3,
  Layers,
  Save,
  Users,
  ArrowUpRight,
  BookOpen,
  Loader2,
} from "lucide-react";

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
      <EmptyState message="This Ecclesia Leader account is not assigned to an Ecclesia yet." icon={Church} />
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
    <div className="flex flex-col gap-5">
      {/* Hero Header */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/5 via-card to-primary/5 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Church className="h-5 w-5 text-primary" />
            </div>
            <p className="font-display text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Ecclesia Dashboard
            </p>
          </div>
          <CardTitle className="text-2xl font-extrabold">
            {getEcclesiaLabel(ecclesiaQuery.data.ecclesia || user.ecclesia)} weekly reporting desk
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-relaxed">
            Your Ecclesia dashboard shows the current week, submitted buscell totals, and a direct
            editor for buscell data entry.
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
        description="You can only access your own Ecclesia. Every total and buscell editor stays within that assignment."
        eyebrow="Week Scope"
        title="Weekly reporting window"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Cycle" tone="slate" value={activeWeek?.cycleId || "N/A"} icon={Layers} />
          <StatCard label="Start" value={activeWeek ? formatDate(activeWeek.startDate) : "N/A"} icon={Calendar} />
          <StatCard label="End" value={activeWeek ? formatDate(activeWeek.endDate) : "N/A"} icon={Calendar} />
        </div>
      </AnalyticsPanel>

      {/* KPI Summary Row */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Buscells" tone="slate" value={summary.totalBuscells || 0} icon={BookOpen} />
        <StatCard label="Submitted" tone="emerald" value={summary.submittedBuscells || 0} icon={CheckCircle2} />
        <StatCard label="Sunday Attendance" value={summary.totalSundayAttendance || 0} icon={Users} />
        <StatCard label="Buscell Attendance" value={summary.totalBuscellAttendance || 0} icon={Users} />
        <StatCard
          label="Buscell Offering"
          value={formatCurrency(summary.totalBuscellOffering || 0)}
        />
        <StatCard label="Week" value={activeWeek ? `Week ${activeWeek.weekNumber}` : "N/A"} icon={Calendar} />
      </section>

      {/* Buscell Table + Data Entry Form */}
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Buscell weekly records</CardTitle>
                <CardDescription className="mt-1">
                  Unsubmitted buscells stay visible as N/A so you can see what still needs recording.
                </CardDescription>
              </div>
              <Badge variant="secondary">{buscellItems.length} buscells</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {!buscellItems.length ? (
              <EmptyState message="No buscells are available in your Ecclesia yet." icon={BookOpen} />
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
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {buscellItems.map((item) => (
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
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant={selectedBuscellId === item.buscell.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedBuscellId(item.buscell.id)}
                          >
                            {selectedBuscellId === item.buscell.id ? (
                              <>
                                Selected
                                <CheckCircle2 className="ml-1 h-3 w-3" />
                              </>
                            ) : (
                              <>
                                Edit
                                <Edit3 className="ml-1 h-3 w-3" />
                              </>
                            )}
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

        <Card className="h-fit">
          <form onSubmit={saveBuscellRecord}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Buscell Data Entry
                  </p>
                  <CardTitle className="mt-1">Update one buscell</CardTitle>
                </div>
                {selectedBuscell?.record?.updatedAt ? (
                  <Badge variant="secondary">
                    Updated {formatDate(selectedBuscell.record.updatedAt)}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedBuscell ? (
                <EmptyState message="Select a buscell from the table to enter weekly data." icon={Edit3} />
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/50 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Selected buscell</p>
                    <p className="mt-1 text-base font-semibold text-foreground">
                      {selectedBuscell.buscell.name}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Sunday attendance</label>
                      <input
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                        min="0"
                        onChange={(event) =>
                          setBuscellForm((current) => ({
                            ...current,
                            sundayAttendance: event.target.value,
                          }))
                        }
                        placeholder="0"
                        step="1"
                        type="number"
                        value={buscellForm.sundayAttendance}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Buscell attendance</label>
                      <input
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                        min="0"
                        onChange={(event) =>
                          setBuscellForm((current) => ({
                            ...current,
                            buscellAttendance: event.target.value,
                          }))
                        }
                        placeholder="0"
                        step="1"
                        type="number"
                        value={buscellForm.buscellAttendance}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Buscell offering</label>
                      <input
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                        min="0"
                        onChange={(event) =>
                          setBuscellForm((current) => ({
                            ...current,
                            buscellOffering: event.target.value,
                          }))
                        }
                        placeholder="0.00"
                        step="0.01"
                        type="number"
                        value={buscellForm.buscellOffering}
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    disabled={savingRecord || !activeWeekId}
                    type="submit"
                  >
                    {savingRecord ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        Save Buscell Record
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </form>
        </Card>
      </section>
    </div>
  );
}
