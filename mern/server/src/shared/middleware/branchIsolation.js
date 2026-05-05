import { ROLES } from "../constants/roles.js";
import createHttpError from "../utils/httpError.js";
import { idsMatch } from "../utils/objectId.js";
import { canonicalizeRole } from "../utils/roleAccess.js";

export function applyBranchIsolation(req, _res, next) {
  const role = canonicalizeRole(req.user.role);
  req.user.role = role;

  if (role === ROLES.SUPER_ADMIN) {
    req.accessScope = {
      isSuperAdmin: true,
      branchId: null,
      ecclesiaId: null,
      buscellId: null,
      role,
    };

    return next();
  }

  if (!req.user.branchId) {
    return next(createHttpError(403, "This account is not assigned to a branch."));
  }

  req.accessScope = {
    isSuperAdmin: false,
    branchId: req.user.branchId.toString(),
    ecclesiaId: req.user.ecclesiaId ? req.user.ecclesiaId.toString() : null,
    buscellId: req.user.buscellId ? req.user.buscellId.toString() : null,
    role,
  };

  return next();
}

export function buildBranchScopedFilter(req, baseFilter = {}) {
  if (req.accessScope?.isSuperAdmin) {
    return { ...baseFilter };
  }

  return {
    ...baseFilter,
    branchId: req.user.branchId,
  };
}

export function buildBuscellScopedFilter(req, baseFilter = {}) {
  if (req.accessScope?.isSuperAdmin) {
    return { ...baseFilter };
  }

  if (req.accessScope?.role !== ROLES.ECCLESIA_LEADER) {
    return buildBranchScopedFilter(req, baseFilter);
  }

  if (!req.accessScope.buscellId) {
    throw createHttpError(403, "This Ecclesia Leader account is not assigned to a buscell.");
  }

  return {
    ...baseFilter,
    branchId: req.accessScope.branchId,
    buscellId: req.accessScope.buscellId,
  };
}

export function assertBranchAccess(req, branchId, message = "You cannot access another branch.") {
  if (req.accessScope?.isSuperAdmin) {
    return true;
  }

  if (idsMatch(req.accessScope?.branchId, branchId)) {
    return true;
  }

  throw createHttpError(403, message);
}

export function assertBuscellAccess(req, buscellId, message = "You cannot access another buscell.") {
  if (req.accessScope?.isSuperAdmin || req.accessScope?.role !== ROLES.ECCLESIA_LEADER) {
    return true;
  }

  if (idsMatch(req.accessScope?.buscellId, buscellId)) {
    return true;
  }

  throw createHttpError(403, message);
}

export function assertAssignedBuscell(
  req,
  message = "This Ecclesia Leader account is not assigned to a buscell."
) {
  if (req.accessScope?.isSuperAdmin || req.accessScope?.role !== ROLES.ECCLESIA_LEADER) {
    return req.accessScope?.buscellId || null;
  }

  if (req.accessScope?.buscellId) {
    return req.accessScope.buscellId;
  }

  throw createHttpError(403, message);
}

export function buildEcclesiaScopedFilter(req, baseFilter = {}) {
  if (req.accessScope?.isSuperAdmin) {
    return { ...baseFilter };
  }

  if (req.accessScope?.role !== ROLES.ECCLESIA_LEADER) {
    return buildBranchScopedFilter(req, baseFilter);
  }

  if (!req.accessScope.ecclesiaId) {
    throw createHttpError(403, "This Ecclesia Leader account is not assigned to an Ecclesia.");
  }

  return {
    ...baseFilter,
    branchId: req.accessScope.branchId,
    ecclesiaId: req.accessScope.ecclesiaId,
  };
}

export function assertEcclesiaAccess(req, ecclesiaId, message = "You cannot access another Ecclesia.") {
  if (req.accessScope?.isSuperAdmin || req.accessScope?.role !== ROLES.ECCLESIA_LEADER) {
    return true;
  }

  if (idsMatch(req.accessScope?.ecclesiaId, ecclesiaId)) {
    return true;
  }

  throw createHttpError(403, message);
}

export function assertAssignedEcclesia(
  req,
  message = "This Ecclesia Leader account is not assigned to an Ecclesia."
) {
  if (req.accessScope?.isSuperAdmin || req.accessScope?.role !== ROLES.ECCLESIA_LEADER) {
    return req.accessScope?.ecclesiaId || null;
  }

  if (req.accessScope?.ecclesiaId) {
    return req.accessScope.ecclesiaId;
  }

  throw createHttpError(403, message);
}
