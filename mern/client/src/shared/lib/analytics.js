import api from "../api/client";
import { ROLES } from "../constants/roles";

export const REPORT_DEFINITIONS = Object.freeze({
  members: {
    label: "Member Report",
    endpoint: "/reports/members",
    exportEndpoint: "/export/members",
  },
  attendance: {
    label: "Attendance Report",
    endpoint: "/reports/attendance",
    exportEndpoint: "/export/attendance",
  },
  finance: {
    label: "Finance Report",
    endpoint: "/reports/finance",
    exportEndpoint: "/export/finance",
  },
  branchPerformance: {
    label: "Branch Performance",
    endpoint: "/reports/branch-performance",
    exportEndpoint: "/export/branch-summary",
  },
  buscellPerformance: {
    label: "Buscell Performance",
    endpoint: "/reports/buscell-performance",
    exportEndpoint: "/export/buscell-summary",
  },
});

export function getReportOptions(role) {
  if (role === ROLES.SUPER_ADMIN) {
    return ["members", "attendance", "finance", "branchPerformance", "buscellPerformance"];
  }

  if (role === ROLES.BRANCH_ADMIN) {
    return ["members", "attendance", "finance", "branchPerformance", "buscellPerformance"];
  }

  if (role === ROLES.FINANCE_ADMIN) {
    return ["finance"];
  }

  return [];
}

export async function downloadExport({ endpoint, filename, params }) {
  const response = await api.get(endpoint, {
    params,
    responseType: "blob",
  });
  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");

  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
