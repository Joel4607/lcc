import Buscell from "../buscells/buscell.model.js";
import Ecclesia from "./ecclesia.model.js";
import User from "../users/user.model.js";
import { ROLES } from "../../shared/constants/roles.js";
import createHttpError from "../../shared/utils/httpError.js";
import { idsMatch, normalizeObjectId } from "../../shared/utils/objectId.js";
import { canonicalizeRole } from "../../shared/utils/roleAccess.js";

export async function ensureValidEcclesiaForBranch(ecclesiaId, branchId) {
  if (!ecclesiaId) {
    return null;
  }

  const ecclesia = await Ecclesia.findById(ecclesiaId);

  if (!ecclesia) {
    throw createHttpError(404, "Ecclesia not found.");
  }

  if (!idsMatch(ecclesia.branchId, branchId)) {
    throw createHttpError(400, "Ecclesia must belong to the selected branch.");
  }

  return ecclesia;
}

export async function ensureValidEcclesiaLeaderForBranch(leaderId, branchId) {
  if (!leaderId) {
    return null;
  }

  const leader = await User.findById(leaderId);

  if (!leader) {
    throw createHttpError(404, "Ecclesia leader not found.");
  }

  if (canonicalizeRole(leader.role) !== ROLES.ECCLESIA_LEADER) {
    throw createHttpError(400, "Only Ecclesia Leader users can be assigned to an Ecclesia.");
  }

  if (!idsMatch(leader.branchId, branchId)) {
    throw createHttpError(400, "Ecclesia Leader must belong to the same branch as the Ecclesia.");
  }

  return leader;
}

export async function syncEcclesiaLeaderAssignment({ userId = null, ecclesiaId = null }) {
  const normalizedUserId = normalizeObjectId(userId);
  const normalizedEcclesiaId = normalizeObjectId(ecclesiaId);

  if (normalizedUserId) {
    await Ecclesia.updateMany(
      {
        leaderId: normalizedUserId,
        ...(normalizedEcclesiaId ? { _id: { $ne: normalizedEcclesiaId } } : {}),
      },
      {
        $set: {
          leaderId: null,
        },
      }
    );
  }

  if (normalizedEcclesiaId) {
    const targetEcclesia = await Ecclesia.findById(normalizedEcclesiaId);

    if (!targetEcclesia) {
      throw createHttpError(404, "Ecclesia not found.");
    }

    if (targetEcclesia.leaderId && !idsMatch(targetEcclesia.leaderId, normalizedUserId)) {
      await User.findByIdAndUpdate(targetEcclesia.leaderId, {
        $set: { ecclesiaId: null },
      });
    }

    targetEcclesia.leaderId = normalizedUserId;
    await targetEcclesia.save();
  }

  if (!normalizedEcclesiaId && normalizedUserId) {
    await User.findByIdAndUpdate(normalizedUserId, {
      $set: { ecclesiaId: null },
    });
  }

  if (normalizedUserId && normalizedEcclesiaId) {
    await User.findByIdAndUpdate(normalizedUserId, {
      $set: { ecclesiaId: normalizedEcclesiaId },
    });
  }
}

export async function clearEcclesiaReferences(ecclesiaId) {
  await User.updateMany(
    { ecclesiaId },
    {
      $set: {
        ecclesiaId: null,
      },
    }
  );

  await Buscell.updateMany(
    { ecclesiaId },
    {
      $set: {
        ecclesiaId: null,
      },
    }
  );
}
