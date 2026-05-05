import { ROLES } from "../../shared/constants/roles.js";
import createHttpError from "../../shared/utils/httpError.js";
import { idsMatch } from "../../shared/utils/objectId.js";
import { isValidUmid } from "../../shared/utils/validation.js";

export function normalizeUmid(value) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return normalized && isValidUmid(normalized) ? normalized : "";
}

export function assertMemberWithinScope(
  req,
  member,
  {
    ecclesiaLeaderOwnBuscellOnly = false,
    branchMessage = "You cannot access a member outside your branch.",
    ecclesiaMessage = "You cannot access a member outside your Ecclesia.",
    buscellMessage = "You cannot access a member outside your buscell.",
  } = {}
) {
  if (req.accessScope?.isSuperAdmin) {
    return true;
  }

  if (!idsMatch(req.accessScope?.branchId, member.branchId)) {
    throw createHttpError(403, branchMessage);
  }

  if (req.accessScope?.role === ROLES.ECCLESIA_LEADER) {
    if (!req.accessScope.ecclesiaId) {
      throw createHttpError(403, "This Ecclesia Leader account is not assigned to an Ecclesia.");
    }

    if (!member.ecclesiaId || !idsMatch(req.accessScope.ecclesiaId, member.ecclesiaId)) {
      throw createHttpError(403, ecclesiaMessage);
    }
  }

  if (req.accessScope?.role === ROLES.ECCLESIA_LEADER && ecclesiaLeaderOwnBuscellOnly) {
    if (!req.accessScope.buscellId) {
      throw createHttpError(403, "This Ecclesia Leader account is not assigned to a buscell.");
    }

    if (!member.buscellId || !idsMatch(req.accessScope.buscellId, member.buscellId)) {
      throw createHttpError(403, buscellMessage);
    }
  }

  return true;
}
