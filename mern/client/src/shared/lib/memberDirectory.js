import { ROLES } from "../constants/roles";

export const memberDirectoryPanelClass =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.3)]";
export const memberDirectoryPageSize = 10;
export const memberStatusOptions = ["ACTIVE", "INACTIVE", "TRANSFERRED"];
export const memberGenderOptions = ["MALE", "FEMALE", "OTHER"];
export const memberMaritalStatusOptions = [
  "SINGLE",
  "MARRIED",
  "DIVORCED",
  "WIDOWED",
  "SEPARATED",
];

export function createEmptyMemberForm() {
  return {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    gender: "",
    address: "",
    dateOfBirth: "",
    maritalStatus: "",
    joinDate: "",
    familyGroup: "",
    ministryGroups: "",
    branchId: "",
    ecclesiaId: "",
    buscellId: "",
    status: "ACTIVE",
  };
}

export function toDateInput(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

export function getMemberStatusBadgeClass(status) {
  if (status === "ACTIVE") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-100";
  }

  if (status === "INACTIVE") {
    return "bg-slate-100 text-slate-700 border border-slate-200";
  }

  return "bg-amber-50 text-amber-700 border border-amber-100";
}

export function getMemberDirectoryHeader(role) {
  if (role === ROLES.SUPER_ADMIN) {
    return {
      eyebrow: "Central Member Directory",
      title: "Manage every member from one hierarchy-aware directory",
      description:
        "Create members once, assign them to a branch, Ecclesia, and buscell, and keep the full church structure easy to search and review.",
    };
  }

  if (role === ROLES.BRANCH_ADMIN) {
    return {
      eyebrow: "Branch Member Directory",
      title: "Track every member in your branch with clear Ecclesia assignments",
      description:
        "This view stays limited to your branch while still showing exactly which Ecclesia and buscell each member belongs to.",
    };
  }

  return {
    eyebrow: "Ecclesia Member Directory",
    title: "Review the members assigned to your Ecclesia",
    description:
      "This directory stays focused on your Ecclesia so you can quickly find people by buscell, status, phone, or UMID.",
  };
}
