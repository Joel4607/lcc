import express from "express";
import { ROLES } from "../../shared/constants/roles.js";
import { applyBranchIsolation } from "../../shared/middleware/branchIsolation.js";
import { requireRole, verifyToken } from "../../shared/middleware/auth.js";
import respondWithError from "../../shared/utils/respondWithError.js";
import serializeRecordWeek from "./recordWeek.serializer.js";
import { ensureRecordWeeksWindow, getOrCreateCurrentRecordWeek } from "./recordWeeks.js";

const router = express.Router();

router.use(verifyToken, applyBranchIsolation);

router.get(
  "/",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const weeks = await ensureRecordWeeksWindow({
        referenceDate: req.query.date || new Date(),
        limit: req.query.limit || 8,
      });

      return res.status(200).json({
        weeks: weeks.map(serializeRecordWeek),
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to load the available record weeks.");
    }
  }
);

router.get(
  "/current",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const week = await getOrCreateCurrentRecordWeek(req.query.date || new Date());

      return res.status(200).json({
        week: serializeRecordWeek(week),
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to resolve the current record week.");
    }
  }
);

export default router;
