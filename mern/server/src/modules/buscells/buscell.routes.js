import express from "express";
import { ROLES } from "../../shared/constants/roles.js";
import {
  applyBranchIsolation,
  buildBranchScopedFilter,
  buildEcclesiaScopedFilter,
  assertBranchAccess,
} from "../../shared/middleware/branchIsolation.js";
import { requireRole, verifyToken } from "../../shared/middleware/auth.js";
import Branch from "../branches/branch.model.js";
import Buscell from "./buscell.model.js";
import Member from "../members/member.model.js";
import User from "../users/user.model.js";
import respondWithError from "../../shared/utils/respondWithError.js";
import serializeBuscell from "./buscell.serializer.js";
import { normalizeObjectId } from "../../shared/utils/objectId.js";
import { ensureValidEcclesiaForBranch } from "../ecclesias/ecclesiaAssignments.js";
import createHttpError from "../../shared/utils/httpError.js";

const router = express.Router();

const BUSCELL_POPULATE = [
  { path: "branchId", select: "name code" },
  {
    path: "ecclesiaId",
    select: "name branchId leaderId",
    populate: { path: "leaderId", select: "name email role" },
  },
];

router.use(verifyToken, applyBranchIsolation);

function buildListFilter(req) {
  const baseFilter =
    req.user.role === ROLES.ECCLESIA_LEADER
      ? buildEcclesiaScopedFilter(req)
      : buildBranchScopedFilter(req);
  const ecclesiaId = normalizeObjectId(req.query.ecclesiaId);

  if (req.query.ecclesiaId && !ecclesiaId) {
    throw createHttpError(400, "Invalid ecclesiaId.");
  }

  if (ecclesiaId) {
    return {
      ...baseFilter,
      ecclesiaId,
    };
  }

  return baseFilter;
}

router.get(
  "/",
  requireRole([
    ROLES.SUPER_ADMIN,
    ROLES.BRANCH_ADMIN,
    ROLES.ECCLESIA_LEADER,
    ROLES.FINANCE_ADMIN,
  ]),
  async (req, res) => {
    try {
      const buscells = await Buscell.find(buildListFilter(req))
        .sort({ createdAt: -1 })
        .populate(BUSCELL_POPULATE);

      return res.status(200).json(buscells.map(serializeBuscell));
    } catch (error) {
      return respondWithError(res, error, "Unable to fetch buscells.");
    }
  }
);

router.post("/", requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN]), async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const meetingDay =
      typeof req.body.meetingDay === "string" ? req.body.meetingDay.trim() : "";
    const description =
      typeof req.body.description === "string" ? req.body.description.trim() : "";

    if (!name) {
      return res.status(400).json({ message: "Buscell name is required." });
    }

    const requestedBranchId = normalizeObjectId(req.body.branchId);
    const branchId = req.accessScope.isSuperAdmin ? requestedBranchId : req.accessScope.branchId;

    if (!branchId) {
      return res.status(400).json({ message: "branchId is required." });
    }

    if (!req.accessScope.isSuperAdmin && requestedBranchId && requestedBranchId !== branchId) {
      return res.status(403).json({ message: "You can only create buscells in your branch." });
    }

    const branch = await Branch.findById(branchId);

    if (!branch) {
      return res.status(404).json({ message: "Branch not found." });
    }

    const ecclesiaId = normalizeObjectId(req.body.ecclesiaId);

    if (!ecclesiaId) {
      return res.status(400).json({ message: "ecclesiaId is required." });
    }

    await ensureValidEcclesiaForBranch(ecclesiaId, branchId);

    const buscell = await Buscell.create({
      name,
      branchId,
      ecclesiaId,
      meetingDay,
      description,
    });

    const savedBuscell = await Buscell.findById(buscell._id).populate(BUSCELL_POPULATE);

    return res.status(201).json({
      message: "Buscell created successfully.",
      buscell: serializeBuscell(savedBuscell),
    });
  } catch (error) {
    return respondWithError(res, error, "Unable to create buscell.");
  }
});

router.put("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN]), async (req, res) => {
  try {
    const buscellId = normalizeObjectId(req.params.id);

    if (!buscellId) {
      return res.status(400).json({ message: "Invalid buscell id." });
    }

    const buscell = await Buscell.findById(buscellId);

    if (!buscell) {
      return res.status(404).json({ message: "Buscell not found." });
    }

    assertBranchAccess(req, buscell.branchId, "You can only manage buscells in your branch.");

    if (Object.prototype.hasOwnProperty.call(req.body, "branchId")) {
      const nextBranchId = normalizeObjectId(req.body.branchId);

      if (!nextBranchId) {
        return res.status(400).json({ message: "Invalid branchId." });
      }

      if (nextBranchId !== buscell.branchId.toString()) {
        return res.status(400).json({ message: "Changing a buscell branch is not supported." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
      const name = typeof req.body.name === "string" ? req.body.name.trim() : "";

      if (!name) {
        return res.status(400).json({ message: "Buscell name cannot be empty." });
      }

      buscell.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "ecclesiaId")) {
      const ecclesiaId = normalizeObjectId(req.body.ecclesiaId);

      if (!ecclesiaId) {
        return res.status(400).json({ message: "Invalid ecclesiaId." });
      }

      await ensureValidEcclesiaForBranch(ecclesiaId, buscell.branchId);
      buscell.ecclesiaId = ecclesiaId;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "meetingDay")) {
      buscell.meetingDay =
        typeof req.body.meetingDay === "string" ? req.body.meetingDay.trim() : "";
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
      buscell.description =
        typeof req.body.description === "string" ? req.body.description.trim() : "";
    }

    await buscell.save();

    const updatedBuscell = await Buscell.findById(buscell._id).populate(BUSCELL_POPULATE);

    return res.status(200).json({
      message: "Buscell updated successfully.",
      buscell: serializeBuscell(updatedBuscell),
    });
  } catch (error) {
    return respondWithError(res, error, "Unable to update buscell.");
  }
});

router.delete("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN]), async (req, res) => {
  try {
    const buscellId = normalizeObjectId(req.params.id);

    if (!buscellId) {
      return res.status(400).json({ message: "Invalid buscell id." });
    }

    const buscell = await Buscell.findById(buscellId);

    if (!buscell) {
      return res.status(404).json({ message: "Buscell not found." });
    }

    assertBranchAccess(req, buscell.branchId, "You can only manage buscells in your branch.");

    const [assignedMembersCount, assignedUsersCount] = await Promise.all([
      Member.countDocuments({ buscellId: buscell._id }),
      User.countDocuments({ buscellId: buscell._id }),
    ]);

    if (assignedMembersCount > 0) {
      return res.status(409).json({
        message: "Reassign members in this buscell before deleting it.",
        errorCode: "BUSCELL_HAS_MEMBERS",
      });
    }

    if (assignedUsersCount > 0) {
      return res.status(409).json({
        message: "Reassign staff linked to this buscell before deleting it.",
        errorCode: "BUSCELL_HAS_USERS",
      });
    }

    await Buscell.findByIdAndDelete(buscell._id);

    return res.status(200).json({ message: "Buscell deleted successfully." });
  } catch (error) {
    return respondWithError(res, error, "Unable to delete buscell.");
  }
});

export default router;
