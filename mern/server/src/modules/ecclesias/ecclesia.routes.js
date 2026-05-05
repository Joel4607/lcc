import express from "express";
import { ROLES } from "../../shared/constants/roles.js";
import {
  applyBranchIsolation,
  assertBranchAccess,
  buildBranchScopedFilter,
} from "../../shared/middleware/branchIsolation.js";
import { requireRole, verifyToken } from "../../shared/middleware/auth.js";
import Branch from "../branches/branch.model.js";
import Buscell from "../buscells/buscell.model.js";
import Ecclesia from "./ecclesia.model.js";
import respondWithError from "../../shared/utils/respondWithError.js";
import serializeEcclesia from "./ecclesia.serializer.js";
import { normalizeObjectId } from "../../shared/utils/objectId.js";
import {
  ensureValidEcclesiaLeaderForBranch,
  syncEcclesiaLeaderAssignment,
} from "./ecclesiaAssignments.js";
import createHttpError from "../../shared/utils/httpError.js";

const router = express.Router();

const ECCLESIA_POPULATE = [
  { path: "branchId", select: "name code" },
  { path: "leaderId", select: "name email role branchId ecclesiaId" },
];

router.use(verifyToken, applyBranchIsolation);

router.get(
  "/",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const filter =
        req.user.role === ROLES.ECCLESIA_LEADER
          ? {
              branchId: req.accessScope.branchId,
              _id: req.accessScope.ecclesiaId,
            }
          : buildBranchScopedFilter(req);
      const ecclesias = await Ecclesia.find(filter)
        .sort({ createdAt: -1 })
        .populate(ECCLESIA_POPULATE);

      return res.status(200).json(ecclesias.map(serializeEcclesia));
    } catch (error) {
      return respondWithError(res, error, "Unable to fetch ecclesias.");
    }
  }
);

router.post("/", requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN]), async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";

    if (!name) {
      return res.status(400).json({ message: "Ecclesia name is required." });
    }

    const requestedBranchId = normalizeObjectId(req.body.branchId);
    const branchId = req.accessScope.isSuperAdmin ? requestedBranchId : req.accessScope.branchId;

    if (!branchId) {
      return res.status(400).json({ message: "branchId is required." });
    }

    if (!req.accessScope.isSuperAdmin && requestedBranchId && requestedBranchId !== branchId) {
      return res.status(403).json({ message: "You can only create ecclesias in your branch." });
    }

    const branch = await Branch.findById(branchId);

    if (!branch) {
      return res.status(404).json({ message: "Branch not found." });
    }

    const leaderId = normalizeObjectId(req.body.leaderId);

    if (req.body.leaderId && !leaderId) {
      return res.status(400).json({ message: "Invalid leaderId." });
    }

    if (leaderId) {
      await ensureValidEcclesiaLeaderForBranch(leaderId, branchId);
    }

    const ecclesia = await Ecclesia.create({
      name,
      branchId,
      leaderId: null,
    });

    if (leaderId) {
      await syncEcclesiaLeaderAssignment({
        userId: leaderId,
        ecclesiaId: ecclesia._id,
      });
    }

    const savedEcclesia = await Ecclesia.findById(ecclesia._id).populate(ECCLESIA_POPULATE);

    return res.status(201).json({
      message: "Ecclesia created successfully.",
      ecclesia: serializeEcclesia(savedEcclesia),
    });
  } catch (error) {
    return respondWithError(res, error, "Unable to create ecclesia.");
  }
});

router.put("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN]), async (req, res) => {
  try {
    const ecclesiaId = normalizeObjectId(req.params.id);

    if (!ecclesiaId) {
      return res.status(400).json({ message: "Invalid ecclesia id." });
    }

    const ecclesia = await Ecclesia.findById(ecclesiaId);

    if (!ecclesia) {
      return res.status(404).json({ message: "Ecclesia not found." });
    }

    assertBranchAccess(req, ecclesia.branchId, "You can only manage ecclesias in your branch.");

    if (Object.prototype.hasOwnProperty.call(req.body, "branchId")) {
      const nextBranchId = normalizeObjectId(req.body.branchId);

      if (!nextBranchId) {
        return res.status(400).json({ message: "Invalid branchId." });
      }

      if (nextBranchId !== ecclesia.branchId.toString()) {
        return res.status(400).json({ message: "Changing an ecclesia branch is not supported." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
      const name = typeof req.body.name === "string" ? req.body.name.trim() : "";

      if (!name) {
        return res.status(400).json({ message: "Ecclesia name cannot be empty." });
      }

      ecclesia.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "leaderId")) {
      const leaderId = normalizeObjectId(req.body.leaderId);

      if (req.body.leaderId && !leaderId) {
        return res.status(400).json({ message: "Invalid leaderId." });
      }

      if (leaderId) {
        await ensureValidEcclesiaLeaderForBranch(leaderId, ecclesia.branchId);
      }

      await ecclesia.save();
      await syncEcclesiaLeaderAssignment({
        userId: leaderId,
        ecclesiaId: ecclesia._id,
      });
    } else {
      await ecclesia.save();
    }

    const updatedEcclesia = await Ecclesia.findById(ecclesia._id).populate(ECCLESIA_POPULATE);

    return res.status(200).json({
      message: "Ecclesia updated successfully.",
      ecclesia: serializeEcclesia(updatedEcclesia),
    });
  } catch (error) {
    return respondWithError(res, error, "Unable to update ecclesia.");
  }
});

router.delete("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN]), async (req, res) => {
  try {
    const ecclesiaId = normalizeObjectId(req.params.id);

    if (!ecclesiaId) {
      return res.status(400).json({ message: "Invalid ecclesia id." });
    }

    const ecclesia = await Ecclesia.findById(ecclesiaId);

    if (!ecclesia) {
      return res.status(404).json({ message: "Ecclesia not found." });
    }

    assertBranchAccess(req, ecclesia.branchId, "You can only manage ecclesias in your branch.");

    const buscellCount = await Buscell.countDocuments({ ecclesiaId: ecclesia._id });

    if (buscellCount) {
      throw createHttpError(
        409,
        "Delete or reassign buscells before deleting this Ecclesia.",
        "ECCLESIA_HAS_BUSCELLS"
      );
    }

    if (ecclesia.leaderId) {
      await syncEcclesiaLeaderAssignment({
        userId: ecclesia.leaderId,
        ecclesiaId: null,
      });
    }

    await Ecclesia.findByIdAndDelete(ecclesia._id);

    return res.status(200).json({ message: "Ecclesia deleted successfully." });
  } catch (error) {
    return respondWithError(res, error, "Unable to delete ecclesia.");
  }
});

export default router;
