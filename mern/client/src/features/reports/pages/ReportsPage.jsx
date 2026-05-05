import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../../shared/api/client";
import { AnalyticsPanel, EmptyState, StatCard } from "../../dashboard/components/AnalyticsWidgets";
import { useAuth } from "../../auth/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import { ATTENDANCE_MEETING_TYPES } from "../../../shared/lib/attendance";
import { downloadExport, getReportOptions, REPORT_DEFINITIONS } from "../../../shared/lib/analytics";
import { FINANCE_PAYMENT_METHODS, FINANCE_TRANSACTION_TYPES } from "../../../shared/lib/finance";
import {
  formatCurrency,
  formatDate,
  formatEnumLabel,
  getBranchLabel,
  getBuscellLabel,
} from "../../../shared/lib/data";
import { ROLES } from "../../../shared/constants/roles";

const MEMBER_STATUSES = ["ACTIVE", "INACTIVE", "TRANSFERRED"];

function getTodayInput() {
  return new Date().toISOString().slice(0, 10);
}

function reportSupportsBuscell(reportType) {
  return ["members", "attendance", "finance", "buscellPerformance"].includes(reportType);
}

function buildReportParams({ filters, reportType, role }) {
  const params = {
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  };

  if (role === ROLES.SUPER_ADMIN && filters.branchId) {
    params.branchId = filters.branchId;
  }

  if (reportSupportsBuscell(reportType) && filters.buscellId) {
    params.buscellId = filters.buscellId;
  }

  if (reportType === "members") {
    params.search = filters.search || undefined;
    params.status = filters.status || undefined;
    params.page = filters.page;
    params.limit = 10;
  }

  if (reportType === "attendance") {
    params.umid = filters.umid || undefined;
    params.meetingType = filters.meetingType || undefined;
    params.status = filters.status || undefined;
    params.page = filters.page;
    params.limit = 10;
  }

  if (reportType === "finance") {
    params.umid = filters.umid || undefined;
    params.transactionType = filters.transactionType || undefined;
    params.paymentMethod = filters.paymentMethod || undefined;
    params.page = filters.page;
    params.limit = 10;
  }

  return params;
}

function getSummaryCards({ report, reportType }) {
  if (!report) {
    return [];
  }

  const summary = report.summary || {};
  const byStatus = Array.isArray(summary.byStatus) ? summary.byStatus : [];
  const byTransactionType = Array.isArray(summary.byTransactionType)
    ? summary.byTransactionType
    : [];

  if (reportType === "members") {
    return [
      { label: "Members", value: summary.totalMembers || 0, tone: "slate" },
      {
        label: "Active",
        value: byStatus.find((row) => row.status === "ACTIVE")?.totalRecords || 0,
        tone: "emerald",
      },
      {
        label: "Inactive",
        value: byStatus.find((row) => row.status === "INACTIVE")?.totalRecords || 0,
      },
    ];
  }

  if (reportType === "attendance") {
    return [
      { label: "Records", value: summary.totalRecords || 0, tone: "slate" },
      {
        label: "Present",
        value: byStatus.find((row) => row.status === "PRESENT")?.totalRecords || 0,
        tone: "emerald",
      },
      {
        label: "Absent",
        value: byStatus.find((row) => row.status === "ABSENT")?.totalRecords || 0,
      },
    ];
  }

  if (reportType === "finance") {
    return [
      { label: "Records", value: summary.totalRecords || 0, tone: "slate" },
      { label: "Total Amount", value: formatCurrency(summary.totalAmount || 0), tone: "emerald" },
      {
        label: "Tithes",
        value: formatCurrency(
          byTransactionType.find((row) => row.transactionType === "TITHE")?.totalAmount || 0
        ),
      },
    ];
  }

  const totalMembers = report.items.reduce((sum, item) => sum + (item.totalMembers || 0), 0);
  const totalAttendance = report.items.reduce((sum, item) => sum + (item.totalAttendance || 0), 0);
  const totalContributions = report.items.reduce((sum, item) => sum + (item.totalContributions || 0), 0);

  return [
    { label: "Rows", value: report.items.length, tone: "slate" },
    { label: "Members", value: totalMembers, tone: "emerald" },
    { label: "Attendance", value: totalAttendance },
    { label: "Contributions", value: formatCurrency(totalContributions) },
  ];
}

function renderTable(reportType, report) {
  if (!report?.items?.length) {
    return (
      <tr>
        <td className="py-4 text-slate-500" colSpan={6}>
          No rows match the current report filters.
        </td>
      </tr>
    );
  }

  if (reportType === "members") {
    return report.items.map((item) => (
      <tr key={item.id}>
        <td className="py-3 pr-4 font-semibold text-slate-950">{item.fullName}</td>
        <td className="py-3 pr-4">{item.umid}</td>
        <td className="py-3 pr-4">{getBranchLabel(item.branch)}</td>
        <td className="py-3 pr-4">{getBuscellLabel(item.buscell)}</td>
        <td className="py-3 pr-4">{item.status}</td>
        <td className="py-4">{formatDate(item.joinDate)}</td>
      </tr>
    ));
  }

  if (reportType === "attendance") {
    return report.items.map((item) => (
      <tr key={item.id}>
        <td className="py-3 pr-4 font-semibold text-slate-950">{item.member?.fullName || item.umid}</td>
        <td className="py-3 pr-4">{item.umid}</td>
        <td className="py-3 pr-4">{formatEnumLabel(item.meetingType)}</td>
        <td className="py-3 pr-4">{formatEnumLabel(item.status)}</td>
        <td className="py-3 pr-4">{getBuscellLabel(item.buscell)}</td>
        <td className="py-4">{formatDate(item.date)}</td>
      </tr>
    ));
  }

  if (reportType === "finance") {
    return report.items.map((item) => (
      <tr key={item.id}>
        <td className="py-3 pr-4 font-semibold text-slate-950">{item.transactionId}</td>
        <td className="py-3 pr-4">{item.member?.fullName || item.umid}</td>
        <td className="py-3 pr-4">{formatEnumLabel(item.transactionType)}</td>
        <td className="py-3 pr-4">{formatEnumLabel(item.paymentMethod)}</td>
        <td className="py-3 pr-4">{formatCurrency(item.amount)}</td>
        <td className="py-4">{formatDate(item.date)}</td>
      </tr>
    ));
  }

  if (reportType === "branchPerformance") {
    return report.items.map((item) => (
      <tr key={item.branchId}>
        <td className="py-3 pr-4 font-semibold text-slate-950">{item.branchName}</td>
        <td className="py-3 pr-4">{item.branchCode}</td>
        <td className="py-3 pr-4">{item.totalMembers}</td>
        <td className="py-3 pr-4">{item.totalAttendance}</td>
        <td className="py-4">{formatCurrency(item.totalContributions)}</td>
      </tr>
    ));
  }

  return report.items.map((item) => (
    <tr key={item.buscellId}>
      <td className="py-3 pr-4 font-semibold text-slate-950">{item.buscellName}</td>
      <td className="py-3 pr-4">{item.branchName}</td>
      <td className="py-3 pr-4">{item.totalMembers}</td>
      <td className="py-3 pr-4">{item.totalAttendance}</td>
      <td className="py-4">{formatCurrency(item.totalContributions)}</td>
    </tr>
  ));
}

function getTableHeaders(reportType) {
  if (reportType === "members") {
    return ["Member", "UMID", "Branch", "Buscell", "Status", "Join Date"];
  }

  if (reportType === "attendance") {
    return ["Member", "UMID", "Meeting", "Status", "Buscell", "Date"];
  }

  if (reportType === "finance") {
    return ["Transaction", "Member", "Type", "Payment", "Amount", "Date"];
  }

  if (reportType === "branchPerformance") {
    return ["Branch", "Code", "Members", "Attendance", "Contributions"];
  }

  return ["Buscell", "Branch", "Members", "Attendance", "Contributions"];
}

export default function ReportsPage() {
  const { getApiErrorMessage, user } = useAuth();
  const { showToast } = useToast();
  const reportOptions = getReportOptions(user.role);
  const [reportType, setReportType] = useState(reportOptions[0] || "members");
  const [filters, setFilters] = useState({
    search: "",
    umid: "",
    branchId: user.role === ROLES.SUPER_ADMIN ? "" : user.branchId || "",
    buscellId: "",
    status: "",
    meetingType: "",
    transactionType: "",
    paymentMethod: "",
    dateFrom: "",
    dateTo: getTodayInput(),
    page: 1,
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const deferredSearch = useDeferredValue(filters.search);
  const deferredUmid = useDeferredValue(filters.umid);
  const referencesQuery = useQuery({
    queryKey: ["report-references", user.role, user.branchId, user.branch?.code],
    queryFn: async () => {
      const requests = [
        api.get("/buscells"),
        user.role === ROLES.SUPER_ADMIN ? api.get("/branches") : Promise.resolve({ data: [] }),
      ];
      const [buscellResponse, branchResponse] = await Promise.all(requests);

      return {
        buscells: buscellResponse.data,
        branches:
          user.role === ROLES.SUPER_ADMIN
            ? branchResponse.data
            : [{ id: user.branchId, name: getBranchLabel(user.branch), code: user.branch?.code }],
      };
    },
  });
  const reportQuery = useQuery({
    queryKey: [
      "report",
      user.role,
      reportType,
      filters.branchId,
      filters.buscellId,
      filters.status,
      filters.meetingType,
      filters.transactionType,
      filters.paymentMethod,
      filters.dateFrom,
      filters.dateTo,
      filters.page,
      deferredSearch,
      deferredUmid,
    ],
    queryFn: async () => {
      const params = buildReportParams({
        filters: {
          ...filters,
          search: deferredSearch,
          umid: deferredUmid,
        },
        reportType,
        role: user.role,
      });
      const endpoint = REPORT_DEFINITIONS[reportType].endpoint;
      const response = await api.get(endpoint, { params });

      return response.data;
    },
  });

  useEffect(() => {
    if (!referencesQuery.errorUpdatedAt || !referencesQuery.error) {
      return;
    }

    showToast({
      type: "error",
      title: "Reports",
      message: getApiErrorMessage(referencesQuery.error, "Unable to load report references."),
    });
  }, [getApiErrorMessage, referencesQuery.error, referencesQuery.errorUpdatedAt, showToast]);

  useEffect(() => {
    if (!reportQuery.errorUpdatedAt || !reportQuery.error) {
      return;
    }

    showToast({
      type: "error",
      title: "Reports",
      message: getApiErrorMessage(reportQuery.error, "Unable to load the selected report."),
    });
  }, [getApiErrorMessage, reportQuery.error, reportQuery.errorUpdatedAt, showToast]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    startTransition(() => {
      setFilters((currentFilters) => ({
        ...currentFilters,
        [name]: value,
        page: 1,
        ...(name === "branchId" ? { buscellId: "" } : {}),
      }));
    });
  }

  async function handleDownload() {
    setIsDownloading(true);

    try {
      const params = buildReportParams({
        filters: {
          ...filters,
          search: deferredSearch,
          umid: deferredUmid,
        },
        reportType,
        role: user.role,
      });

      await downloadExport({
        endpoint: REPORT_DEFINITIONS[reportType].exportEndpoint,
        filename: `${reportType}-export.csv`,
        params,
      });

      showToast({
        title: "Export ready",
        message: `${REPORT_DEFINITIONS[reportType].label} downloaded successfully.`,
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Export",
        message: getApiErrorMessage(error, "Unable to export the selected report."),
      });
    } finally {
      setIsDownloading(false);
    }
  }

  const branches = referencesQuery.data?.branches || [];
  const buscells = referencesQuery.data?.buscells || [];
  const report = reportQuery.data || null;
  const isLoading = reportQuery.isLoading;
  const summaryCards = getSummaryCards({ report, reportType });
  const availableBuscells = buscells.filter((buscell) =>
    user.role === ROLES.SUPER_ADMIN && filters.branchId
      ? buscell.branch?.id === filters.branchId || buscell.branchId === filters.branchId
      : true
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
          Reports & Export
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
          Role-safe reporting with CSV export
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Run filtered reports inside your allowed scope, review the live table, then export the
          exact same dataset as CSV.
        </p>
      </header>

      <AnalyticsPanel
        actions={
          <button
            className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDownloading || isLoading}
            onClick={handleDownload}
            type="button"
          >
            {isDownloading ? "Exporting..." : "Export CSV"}
          </button>
        }
        description="Choose a report type, then narrow it with the filters that apply to that report."
        eyebrow="Filters"
        title="Report Builder"
      >
        <div className="grid gap-3 lg:grid-cols-4">
          <select
            className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            onChange={(event) => {
              setReportType(event.target.value);
              setFilters((currentFilters) => ({
                ...currentFilters,
                page: 1,
              }));
            }}
            value={reportType}
          >
            {reportOptions.map((option) => (
              <option key={option} value={option}>
                {REPORT_DEFINITIONS[option].label}
              </option>
            ))}
          </select>

          {user.role === ROLES.SUPER_ADMIN ? (
            <select
              className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              name="branchId"
              onChange={handleFilterChange}
              value={filters.branchId}
            >
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.code})
                </option>
              ))}
            </select>
          ) : null}

          {reportSupportsBuscell(reportType) ? (
            <select
              className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              name="buscellId"
              onChange={handleFilterChange}
              value={filters.buscellId}
            >
              <option value="">All buscells</option>
              {availableBuscells.map((buscell) => (
                <option key={buscell.id} value={buscell.id}>
                  {buscell.name}
                </option>
              ))}
            </select>
          ) : null}

          {reportType === "members" ? (
            <input
              className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              name="search"
              onChange={handleFilterChange}
              placeholder="Search member"
              value={filters.search}
            />
          ) : null}

          {["attendance", "finance"].includes(reportType) ? (
            <input
              className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              name="umid"
              onChange={handleFilterChange}
              placeholder="Filter by UMID"
              value={filters.umid}
            />
          ) : null}

          {["members", "attendance"].includes(reportType) ? (
            <select
              className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              name="status"
              onChange={handleFilterChange}
              value={filters.status}
            >
              <option value="">All statuses</option>
              {(reportType === "members" ? MEMBER_STATUSES : ["PRESENT", "ABSENT"]).map((status) => (
                <option key={status} value={status}>
                  {formatEnumLabel(status)}
                </option>
              ))}
            </select>
          ) : null}

          {reportType === "attendance" ? (
            <select
              className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              name="meetingType"
              onChange={handleFilterChange}
              value={filters.meetingType}
            >
              <option value="">All meeting types</option>
              {ATTENDANCE_MEETING_TYPES.map((meetingType) => (
                <option key={meetingType} value={meetingType}>
                  {formatEnumLabel(meetingType)}
                </option>
              ))}
            </select>
          ) : null}

          {reportType === "finance" ? (
            <>
              <select
                className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                name="transactionType"
                onChange={handleFilterChange}
                value={filters.transactionType}
              >
                <option value="">All transaction types</option>
                {FINANCE_TRANSACTION_TYPES.map((transactionType) => (
                  <option key={transactionType} value={transactionType}>
                    {formatEnumLabel(transactionType)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                name="paymentMethod"
                onChange={handleFilterChange}
                value={filters.paymentMethod}
              >
                <option value="">All payment methods</option>
                {FINANCE_PAYMENT_METHODS.map((paymentMethod) => (
                  <option key={paymentMethod} value={paymentMethod}>
                    {formatEnumLabel(paymentMethod)}
                  </option>
                ))}
              </select>
            </>
          ) : null}

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
      </AnalyticsPanel>

      {summaryCards.length ? (
        <section className="grid gap-4 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <StatCard key={card.label} label={card.label} tone={card.tone} value={card.value} />
          ))}
        </section>
      ) : null}

      <AnalyticsPanel
        description={REPORT_DEFINITIONS[reportType].label}
        eyebrow="Results"
        title="Report table"
      >
        {isLoading && !report ? (
          <EmptyState message="Loading report data..." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                    {getTableHeaders(reportType).map((header) => (
                      <th className="pb-3 pr-4" key={header}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {renderTable(reportType, report)}
                </tbody>
              </table>
            </div>

            {report?.pagination ? (
              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-sm text-slate-500">
                  Page {report.pagination.page} of {report.pagination.totalPages}
                </p>
                <div className="flex gap-3">
                  <button
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={report.pagination.page <= 1}
                    onClick={() =>
                      setFilters((currentFilters) => ({
                        ...currentFilters,
                        page: currentFilters.page - 1,
                      }))
                    }
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={report.pagination.page >= report.pagination.totalPages}
                    onClick={() =>
                      setFilters((currentFilters) => ({
                        ...currentFilters,
                        page: currentFilters.page + 1,
                      }))
                    }
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </AnalyticsPanel>
    </div>
  );
}
