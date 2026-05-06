import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../../shared/api/client";
import {
  AnalyticsPanel,
  BarChartCard,
  EmptyState,
  StatCard,
} from "../../dashboard/components/AnalyticsWidgets";
import { useAuth } from "../../auth/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import {
  formatCurrency,
  formatDate,
  formatEnumLabel,
  getBranchLabel,
  getBuscellLabel,
} from "../../../shared/lib/data";

export default function MemberLookupPage() {
  const { getApiErrorMessage } = useAuth();
  const { showToast } = useToast();
  const [umid, setUmid] = useState("");
  const [submittedUmid, setSubmittedUmid] = useState("");
  const memberQuery = useQuery({
    enabled: Boolean(submittedUmid),
    queryKey: ["dashboard", "member", submittedUmid],
    queryFn: async () => {
      const response = await api.get(`/dashboard/member/${submittedUmid}`);
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (!memberQuery.errorUpdatedAt || !memberQuery.error) {
      return;
    }

    showToast({
      type: "error",
      title: "Member lookup",
      message: getApiErrorMessage(memberQuery.error, "Unable to load the member summary."),
    });
  }, [getApiErrorMessage, memberQuery.error, memberQuery.errorUpdatedAt, showToast]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!umid.trim()) {
      return;
    }

    const normalizedUmid = umid.trim().toUpperCase();

    if (normalizedUmid === submittedUmid) {
      await memberQuery.refetch();
      return;
    }

    setSubmittedUmid(normalizedUmid);
  }

  const result = memberQuery.data || null;
  const isLoading = memberQuery.isFetching;
  const canViewAttendance = Boolean(result?.attendanceSummary);

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
          Member Lookup
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
          Search a UMID and view permitted member activity
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Leadership can pull a summarized view of one member without scanning separate attendance
          and finance modules.
        </p>
      </header>

      <AnalyticsPanel
        description="Enter a permanent UMID to load the member profile, recent records, and contribution totals."
        eyebrow="Lookup"
        title="Find a member"
      >
        <form className="flex flex-wrap gap-3" onSubmit={handleSubmit}>
          <input
            className="min-w-0 flex-1 rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            onChange={(event) => setUmid(event.target.value)}
            placeholder="Enter UMID"
            value={umid}
          />
          <button
            className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || !umid.trim()}
            type="submit"
          >
            {isLoading ? "Searching..." : "Lookup Member"}
          </button>
        </form>
      </AnalyticsPanel>

      {!result ? (
        <EmptyState
          message={
            submittedUmid
              ? "No member summary is available for that UMID right now."
              : "No member summary loaded yet. Look up a UMID to begin."
          }
        />
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-4">
            <StatCard label="Member" tone="slate" value={result.member.fullName} />
            {canViewAttendance ? (
              <>
                <StatCard label="Attendances" value={result.attendanceSummary.totalAttendances} />
                <StatCard label="Present" tone="emerald" value={result.attendanceSummary.presentCount} />
              </>
            ) : (
              <StatCard
                label="Finance Records"
                tone="emerald"
                value={result.financeSummary.totalFinanceRecords}
              />
            )}
            <StatCard
              label="Contributed"
              value={formatCurrency(result.financeSummary.totalAmountContributed)}
            />
          </section>

          <AnalyticsPanel
            description={`${getBranchLabel(result.branch)} | ${getBuscellLabel(result.buscell)} | ${formatEnumLabel(result.member.status)}`}
            eyebrow="Profile Summary"
            title={`${result.member.fullName} (${result.member.umid})`}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-950">Contact</p>
                <p className="mt-2">{result.member.phone}</p>
                <p className="mt-1">{result.member.email || "No email provided"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-950">Joined</p>
                <p className="mt-2">{formatDate(result.member.joinDate)}</p>
                <p className="mt-1">{result.member.gender}</p>
              </div>
            </div>
          </AnalyticsPanel>

          {canViewAttendance ? (
            <BarChartCard
              bars={[
                { color: "#f97316", dataKey: "totalRecords", name: "Records" },
                { color: "#0f172a", dataKey: "presentCount", name: "Present" },
              ]}
              data={result.attendanceSummary.byMeetingType.map((row) => ({
                meetingType: formatEnumLabel(row.meetingType),
                totalRecords: row.totalRecords,
                presentCount: row.presentCount,
              }))}
              description="Attendance summary broken down by meeting type."
              title="Attendance Summary"
              xKey="meetingType"
            />
          ) : null}

          <section className={`grid gap-4 ${canViewAttendance ? "lg:grid-cols-2" : ""}`}>
            {canViewAttendance ? (
              <AnalyticsPanel description="Latest attendance records for this member." title="Recent Attendance">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4">Meeting</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                      {!result.attendanceSummary.recentAttendanceRecords.length ? (
                        <tr>
                          <td className="py-5 text-slate-500" colSpan={3}>
                            No attendance records are available yet.
                          </td>
                        </tr>
                      ) : null}
                      {result.attendanceSummary.recentAttendanceRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="py-3 pr-4">{formatDate(record.date)}</td>
                          <td className="py-3 pr-4">{formatEnumLabel(record.meetingType)}</td>
                          <td className="py-4">{formatEnumLabel(record.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AnalyticsPanel>
            ) : null}

            <AnalyticsPanel description="Latest finance records for this member." title="Recent Finance">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {!result.financeSummary.recentFinanceRecords.length ? (
                      <tr>
                        <td className="py-5 text-slate-500" colSpan={3}>
                          No finance records are available yet.
                        </td>
                      </tr>
                    ) : null}
                    {result.financeSummary.recentFinanceRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="py-3 pr-4">{formatDate(record.date)}</td>
                        <td className="py-3 pr-4">{formatEnumLabel(record.transactionType)}</td>
                        <td className="py-4">{formatCurrency(record.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AnalyticsPanel>
          </section>
        </>
      )}
    </div>
  );
}
