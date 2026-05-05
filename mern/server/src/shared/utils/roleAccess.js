import { ROLES } from "../constants/roles.js";
import { isValidEmail } from "./validation.js";

export function canonicalizeRole(role) {
  const normalized = typeof role === "string" ? role.trim().toUpperCase() : "";

  if (normalized === "SHEPHERD") {
    return ROLES.ECCLESIA_LEADER;
  }

  if (normalized === "FINANCE") {
    return ROLES.FINANCE_ADMIN;
  }

  return normalized;
}

export function normalizeRole(role) {
  return canonicalizeRole(role);
}

export function normalizeEmail(email) {
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  return normalized && isValidEmail(normalized) ? normalized : "";
}

export function getCreatableRoles(actorRole) {
  switch (actorRole) {
    case ROLES.SUPER_ADMIN:
      return [ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER, ROLES.FINANCE_ADMIN];
    case ROLES.BRANCH_ADMIN:
      return [ROLES.ECCLESIA_LEADER, ROLES.FINANCE_ADMIN];
    default:
      return [];
  }
}

export function canCreateRole(actorRole, targetRole) {
  return getCreatableRoles(actorRole).includes(targetRole);
}

export function canManageUserRole(actorRole, targetRole) {
  return getCreatableRoles(actorRole).includes(targetRole);
}

export function isBranchScopedRole(role) {
  return [ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER, ROLES.FINANCE_ADMIN].includes(role);
}

export function isEcclesiaScopedRole(role) {
  return canonicalizeRole(role) === ROLES.ECCLESIA_LEADER;
}
