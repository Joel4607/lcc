import { ROLES } from "../../shared/constants/roles.js";
import Buscell from "../buscells/buscell.model.js";
import createHttpError from "../../shared/utils/httpError.js";

export async function getScopedEcclesiaBuscellIds(req) {
  if (req.accessScope?.role !== ROLES.ECCLESIA_LEADER) {
    return [];
  }

  if (!req.accessScope.ecclesiaId) {
    throw createHttpError(403, "This Ecclesia Leader account is not assigned to an Ecclesia.");
  }

  const buscells = await Buscell.find({
    branchId: req.accessScope.branchId,
    ecclesiaId: req.accessScope.ecclesiaId,
  }).select("_id");

  return buscells.map((buscell) => buscell._id);
}

export async function getScopedEcclesiaBuscellIdStrings(req) {
  return (await getScopedEcclesiaBuscellIds(req)).map((id) => id.toString());
}
