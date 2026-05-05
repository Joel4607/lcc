import Branch from "../branches/branch.model.js";
import User from "./user.model.js";
import { ROLES } from "../../shared/constants/roles.js";
import createHttpError from "../../shared/utils/httpError.js";
import logger from "../../shared/utils/logger.js";
import { idsMatch, normalizeObjectId } from "../../shared/utils/objectId.js";
import {
  canCreateRole,
  canManageUserRole,
  isBranchScopedRole,
  isEcclesiaScopedRole,
  normalizeEmail,
  normalizeRole,
} from "../../shared/utils/roleAccess.js";
import { assertStrongPassword } from "../../shared/utils/validation.js";
import {
  ensureValidEcclesiaForBranch,
  syncEcclesiaLeaderAssignment,
} from "../ecclesias/ecclesiaAssignments.js";

const USER_POPULATE = [
  { path: "branchId", select: "name code" },
  { path: "buscellId", select: "name" },
  { path: "ecclesiaId", select: "name branchId" },
];

export async function populateUser(user) {
  return user.populate(USER_POPULATE);
}

function hasOwnProperty(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

async function ensureBranchExists(branchId) {
  const branch = await Branch.findById(branchId);

  if (!branch) {
    throw createHttpError(404, "Branch not found.");
  }

  return branch;
}

export async function createManagedUser(actor, payload) {
  const normalizedName = typeof payload.name === "string" ? payload.name.trim() : "";
  const normalizedEmail = normalizeEmail(payload.email);
  const normalizedRole = normalizeRole(payload.role);
  const requestedBranchId = normalizeObjectId(payload.branchId);

  if (!normalizedName || !normalizedEmail || !payload.password || !normalizedRole) {
    throw createHttpError(400, "Name, email, password, and role are required.");
  }

  assertStrongPassword(payload.password);

  if (!canCreateRole(actor.role, normalizedRole)) {
    throw createHttpError(403, "You cannot create a user with that role.");
  }

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw createHttpError(409, "A user with that email already exists.");
  }

  if (
    actor.role === ROLES.BRANCH_ADMIN &&
    requestedBranchId &&
    !idsMatch(requestedBranchId, actor.branchId)
  ) {
    throw createHttpError(403, "You can only create users in your own branch.");
  }

  const branchId = isBranchScopedRole(normalizedRole)
    ? actor.role === ROLES.BRANCH_ADMIN
      ? actor.branchId?.toString()
      : requestedBranchId
    : null;

  if (isBranchScopedRole(normalizedRole) && !branchId) {
    throw createHttpError(400, "branchId is required for the selected role.");
  }

  if (branchId) {
    await ensureBranchExists(branchId);
  }

  const desiredEcclesiaId = isEcclesiaScopedRole(normalizedRole)
    ? normalizeObjectId(payload.ecclesiaId)
    : null;

  if (isEcclesiaScopedRole(normalizedRole) && !desiredEcclesiaId) {
    throw createHttpError(400, "ecclesiaId is required for the selected role.");
  }

  if (
    isEcclesiaScopedRole(normalizedRole) &&
    Object.prototype.hasOwnProperty.call(payload, "ecclesiaId") &&
    payload.ecclesiaId &&
    !desiredEcclesiaId
  ) {
    throw createHttpError(400, "Invalid ecclesiaId.");
  }

  if (desiredEcclesiaId) {
    await ensureValidEcclesiaForBranch(desiredEcclesiaId, branchId);
  }

  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password: payload.password,
    role: normalizedRole,
    branchId,
    buscellId: null,
    ecclesiaId: desiredEcclesiaId,
  });

  if (isEcclesiaScopedRole(normalizedRole)) {
    await syncEcclesiaLeaderAssignment({
      userId: user._id,
      ecclesiaId: desiredEcclesiaId,
    });
  }

  logger.info("Managed user created", {
    actorUserId: actor._id?.toString(),
    actorRole: actor.role,
    createdUserId: user._id?.toString(),
    createdUserRole: normalizedRole,
    branchId,
    ecclesiaId: desiredEcclesiaId,
  });

  return populateUser(await User.findById(user._id));
}

export async function updateManagedUser(actor, targetUser, payload) {
  if (!canManageUserRole(actor.role, targetUser.role)) {
    throw createHttpError(403, "You cannot update that user.");
  }

  const previousBranchId = targetUser.branchId ? targetUser.branchId.toString() : null;
  const nextRole = hasOwnProperty(payload, "role")
    ? normalizeRole(payload.role)
    : targetUser.role;

  if (!canManageUserRole(actor.role, nextRole)) {
    throw createHttpError(403, "You cannot assign that role.");
  }

  if (hasOwnProperty(payload, "email")) {
    const email = normalizeEmail(payload.email);

    if (!email) {
      throw createHttpError(400, "Email cannot be empty.");
    }

    const duplicateUser = await User.findOne({
      email,
      _id: { $ne: targetUser._id },
    });

    if (duplicateUser) {
      throw createHttpError(409, "A user with that email already exists.");
    }

    targetUser.email = email;
  }

  if (hasOwnProperty(payload, "name")) {
    const name = typeof payload.name === "string" ? payload.name.trim() : "";

    if (!name) {
      throw createHttpError(400, "Name cannot be empty.");
    }

    targetUser.name = name;
  }

  if (hasOwnProperty(payload, "password")) {
    const password = typeof payload.password === "string" ? payload.password.trim() : "";

    if (!password) {
      throw createHttpError(400, "Password cannot be empty.");
    }

    assertStrongPassword(password);
    targetUser.password = password;
  }

  targetUser.role = nextRole;

  let nextBranchId = targetUser.branchId ? targetUser.branchId.toString() : null;
  const requestedBranchId = hasOwnProperty(payload, "branchId")
    ? normalizeObjectId(payload.branchId)
    : null;

  if (
    actor.role === ROLES.BRANCH_ADMIN &&
    hasOwnProperty(payload, "branchId") &&
    requestedBranchId &&
    !idsMatch(requestedBranchId, actor.branchId)
  ) {
    throw createHttpError(403, "You can only manage users in your own branch.");
  }

  if (isBranchScopedRole(nextRole)) {
    nextBranchId =
      actor.role === ROLES.BRANCH_ADMIN
        ? actor.branchId?.toString()
        : hasOwnProperty(payload, "branchId")
          ? requestedBranchId
          : nextBranchId;

    if (!nextBranchId) {
      throw createHttpError(400, "branchId is required for the selected role.");
    }

    await ensureBranchExists(nextBranchId);
  } else {
    nextBranchId = null;
  }

  targetUser.branchId = nextBranchId;

  let desiredEcclesiaId = null;

  if (isEcclesiaScopedRole(nextRole)) {
    desiredEcclesiaId = hasOwnProperty(payload, "ecclesiaId")
      ? normalizeObjectId(payload.ecclesiaId)
      : idsMatch(nextBranchId, previousBranchId)
        ? targetUser.ecclesiaId?.toString() || null
        : null;

    if (!desiredEcclesiaId) {
      throw createHttpError(400, "ecclesiaId is required for the selected role.");
    }

    if (hasOwnProperty(payload, "ecclesiaId") && payload.ecclesiaId && !desiredEcclesiaId) {
      throw createHttpError(400, "Invalid ecclesiaId.");
    }

    if (desiredEcclesiaId) {
      await ensureValidEcclesiaForBranch(desiredEcclesiaId, nextBranchId);
    }
  }

  targetUser.buscellId = null;
  targetUser.ecclesiaId = isEcclesiaScopedRole(nextRole) ? desiredEcclesiaId : null;
  await targetUser.save();

  if (isEcclesiaScopedRole(nextRole)) {
    await syncEcclesiaLeaderAssignment({
      userId: targetUser._id,
      ecclesiaId: desiredEcclesiaId,
    });
  } else {
    await syncEcclesiaLeaderAssignment({
      userId: targetUser._id,
      ecclesiaId: null,
    });
  }

  logger.info("Managed user updated", {
    actorUserId: actor._id?.toString(),
    actorRole: actor.role,
    updatedUserId: targetUser._id?.toString(),
    updatedUserRole: nextRole,
    branchId: nextBranchId,
    ecclesiaId: desiredEcclesiaId,
  });

  return populateUser(await User.findById(targetUser._id));
}

export async function deleteManagedUser(actor, targetUser) {
  if (!canManageUserRole(actor.role, targetUser.role)) {
    throw createHttpError(403, "You cannot delete that user.");
  }

  if (idsMatch(actor._id, targetUser._id)) {
    throw createHttpError(400, "You cannot delete your own account.");
  }

  await syncEcclesiaLeaderAssignment({
    userId: targetUser._id,
    ecclesiaId: null,
  });

  await User.findByIdAndDelete(targetUser._id);

  logger.info("Managed user deleted", {
    actorUserId: actor._id?.toString(),
    actorRole: actor.role,
    deletedUserId: targetUser._id?.toString(),
    deletedUserRole: targetUser.role,
  });
}
