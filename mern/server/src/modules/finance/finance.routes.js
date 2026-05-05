import express from "express";
import {
  FINANCE_PAYMENT_METHOD_VALUES,
  FINANCE_TRANSACTION_TYPE_VALUES,
  FinanceTransactionTypes,
} from "./finance.constants.js";
import { ROLES } from "../../shared/constants/roles.js";
import { applyBranchIsolation } from "../../shared/middleware/branchIsolation.js";
import { requireRole, verifyToken } from "../../shared/middleware/auth.js";
import Finance from "./finance.model.js";
import Member from "../members/member.model.js";
import { buildDateRangeFilter, normalizeDateOnly } from "../../shared/utils/date.js";
import {
  getScopedEcclesiaBuscellIds,
  getScopedEcclesiaBuscellIdStrings,
} from "../ecclesias/ecclesiaScope.js";
import createHttpError from "../../shared/utils/httpError.js";
import logger from "../../shared/utils/logger.js";
import { assertMemberWithinScope, normalizeUmid } from "../members/memberScope.js";
import { normalizeObjectId } from "../../shared/utils/objectId.js";
import respondWithError from "../../shared/utils/respondWithError.js";
import serializeFinance from "./finance.serializer.js";
import generateTransactionId from "./transactionId.js";

const router = express.Router();

const FINANCE_POPULATE = [
  { path: "memberId", select: "fullName umid phone" },
  { path: "branchId", select: "name code" },
  { path: "buscellId", select: "name" },
  { path: "recordedBy", select: "name email role" },
];

router.use(verifyToken, applyBranchIsolation);

function hasOwnProperty(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function normalizeTransactionType(value) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (!FINANCE_TRANSACTION_TYPE_VALUES.includes(normalized)) {
    throw createHttpError(400, "transactionType is invalid.");
  }

  return normalized;
}

function normalizePaymentMethod(value) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (!FINANCE_PAYMENT_METHOD_VALUES.includes(normalized)) {
    throw createHttpError(400, "paymentMethod is invalid.");
  }

  return normalized;
}

function normalizeAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw createHttpError(400, "amount must be greater than 0.");
  }

  return amount;
}

function normalizeNotes(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function buildFinanceFilter(req) {
  let filter = req.accessScope?.isSuperAdmin
    ? {}
    : req.accessScope?.role === ROLES.ECCLESIA_LEADER
      ? {
          branchId: req.accessScope.branchId,
          buscellId: { $in: await getScopedEcclesiaBuscellIds(req) },
        }
      : {
          branchId: req.accessScope.branchId,
        };

  if (hasOwnProperty(req.query, "umid") && req.query.umid) {
    filter.umid = normalizeUmid(req.query.umid);
  }

  if (hasOwnProperty(req.query, "branchId")) {
    const branchId = normalizeObjectId(req.query.branchId);

    if (req.query.branchId && !branchId) {
      throw createHttpError(400, "Invalid branchId.");
    }

    if (req.accessScope?.isSuperAdmin) {
      if (branchId) {
        filter.branchId = branchId;
      }
    } else if (branchId && branchId !== req.accessScope.branchId) {
      throw createHttpError(403, "You can only access finance records in your branch.");
    }
  }

  if (hasOwnProperty(req.query, "buscellId")) {
    const buscellId = normalizeObjectId(req.query.buscellId);

    if (req.query.buscellId && !buscellId) {
      throw createHttpError(400, "Invalid buscellId.");
    }

    if (req.accessScope?.role === ROLES.ECCLESIA_LEADER) {
      if (buscellId) {
        const allowedBuscellIds = await getScopedEcclesiaBuscellIdStrings(req);

        if (!allowedBuscellIds.includes(buscellId)) {
          throw createHttpError(403, "You can only access finance records in your Ecclesia.");
        }

        filter.buscellId = buscellId;
      }
    } else if (buscellId) {
      filter.buscellId = buscellId;
    }
  }

  if (hasOwnProperty(req.query, "transactionType") && req.query.transactionType) {
    filter.transactionType = normalizeTransactionType(req.query.transactionType);
  }

  if (hasOwnProperty(req.query, "paymentMethod") && req.query.paymentMethod) {
    filter.paymentMethod = normalizePaymentMethod(req.query.paymentMethod);
  }

  return {
    ...filter,
    ...buildDateRangeFilter("date", req.query),
  };
}

function assertFinanceRecordAccess(req, finance) {
  assertMemberWithinScope(
    req,
    {
      branchId: finance.branchId,
      buscellId: finance.buscellId,
    },
    {
      ecclesiaLeaderOwnBuscellOnly: false,
      branchMessage: "You can only access finance records in your branch.",
      ecclesiaMessage: "You can only access finance records in your Ecclesia.",
      buscellMessage: "You can only access finance records for your own buscell.",
    }
  );
}

function assertFinanceMutationAllowed(req, transactionType) {
  if (
    req.accessScope?.role === ROLES.ECCLESIA_LEADER &&
    transactionType !== FinanceTransactionTypes.BUSCELL_OFFERING
  ) {
    throw createHttpError(403, "Ecclesia Leaders can only record BUSCELL_OFFERING transactions.");
  }

  if (
    req.accessScope?.role === ROLES.FINANCE_ADMIN &&
    transactionType === FinanceTransactionTypes.BUSCELL_OFFERING
  ) {
    throw createHttpError(403, "Finance Admins cannot manage BUSCELL_OFFERING transactions.");
  }
}

function assertFinanceEntryScope(req, member, transactionType) {
  assertMemberWithinScope(req, member, {
    ecclesiaLeaderOwnBuscellOnly: false,
    branchMessage: "You can only create finance records for members in your branch.",
    ecclesiaMessage: "You can only create finance records for members in your Ecclesia.",
    buscellMessage: "You can only create finance records for members in your own buscell.",
  });

  assertFinanceMutationAllowed(req, transactionType);
}

router.get(
  "/",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.FINANCE_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const records = await Finance.find(await buildFinanceFilter(req))
        .populate(FINANCE_POPULATE)
        .sort({ date: -1, createdAt: -1 });

      return res.status(200).json(records.map(serializeFinance));
    } catch (error) {
      return respondWithError(res, error, "Unable to fetch finance records.");
    }
  }
);

router.get(
  "/member/:umid",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.FINANCE_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const umid = normalizeUmid(req.params.umid);

      if (!umid) {
        return res.status(400).json({ message: "Invalid UMID." });
      }

      const member = await Member.findOne({ umid }).select("umid branchId ecclesiaId buscellId");

      if (!member) {
        return res.status(404).json({ message: "Member not found." });
      }

      assertMemberWithinScope(req, member, {
        ecclesiaLeaderOwnBuscellOnly: false,
        branchMessage: "You can only view finance history in your branch.",
        ecclesiaMessage: "You can only view finance history in your Ecclesia.",
        buscellMessage: "You can only view finance history for your own buscell.",
      });

      const records = await Finance.find({
        ...(await buildFinanceFilter(req)),
        umid,
      })
        .populate(FINANCE_POPULATE)
        .sort({ date: -1, createdAt: -1 });

      return res.status(200).json(records.map(serializeFinance));
    } catch (error) {
      return respondWithError(res, error, "Unable to fetch member finance history.");
    }
  }
);

router.post(
  "/entry",
  requireRole([ROLES.FINANCE_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const umid = normalizeUmid(req.body.umid);

      if (!umid) {
        return res.status(400).json({ message: "umid is required." });
      }

      const transactionType = normalizeTransactionType(req.body.transactionType);
      const paymentMethod = normalizePaymentMethod(req.body.paymentMethod);
      const amount = normalizeAmount(req.body.amount);
      const date = normalizeDateOnly(req.body.date);
      const member = await Member.findOne({ umid }).select("umid branchId ecclesiaId buscellId fullName");

      if (!member) {
        return res.status(404).json({ message: "Member not found." });
      }

      assertFinanceEntryScope(req, member, transactionType);

      const record = await Finance.create({
        transactionId: await generateTransactionId(),
        umid: member.umid,
        memberId: member._id,
        branchId: member.branchId,
        buscellId: member.buscellId || null,
        amount,
        transactionType,
        paymentMethod,
        date,
        notes: normalizeNotes(req.body.notes),
        recordedBy: req.user._id,
      });

      const savedRecord = await Finance.findById(record._id).populate(FINANCE_POPULATE);

      logger.info("Finance entry created", {
        actorUserId: req.user._id?.toString(),
        actorRole: req.user.role,
        financeId: record._id?.toString(),
        transactionId: record.transactionId,
        umid: member.umid,
        branchId: member.branchId?.toString(),
        buscellId: member.buscellId?.toString() || null,
        transactionType,
        amount,
      });

      return res.status(201).json({
        message: "Finance record created successfully.",
        finance: serializeFinance(savedRecord),
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to create finance record.");
    }
  }
);

router.put(
  "/:id",
  requireRole([ROLES.FINANCE_ADMIN]),
  async (req, res) => {
    try {
      const financeId = normalizeObjectId(req.params.id);

      if (!financeId) {
        return res.status(400).json({ message: "Invalid finance id." });
      }

      const record = await Finance.findById(financeId);

      if (!record) {
        return res.status(404).json({ message: "Finance record not found." });
      }

      assertFinanceRecordAccess(req, record);
      assertFinanceMutationAllowed(req, record.transactionType);

      if (hasOwnProperty(req.body, "amount")) {
        record.amount = normalizeAmount(req.body.amount);
      }

      if (hasOwnProperty(req.body, "transactionType")) {
        const transactionType = normalizeTransactionType(req.body.transactionType);
        assertFinanceMutationAllowed(req, transactionType);
        record.transactionType = transactionType;
      }

      if (hasOwnProperty(req.body, "paymentMethod")) {
        record.paymentMethod = normalizePaymentMethod(req.body.paymentMethod);
      }

      if (hasOwnProperty(req.body, "date")) {
        record.date = normalizeDateOnly(req.body.date);
      }

      if (hasOwnProperty(req.body, "notes")) {
        record.notes = normalizeNotes(req.body.notes);
      }

      await record.save();

      const updatedRecord = await Finance.findById(financeId).populate(FINANCE_POPULATE);

      return res.status(200).json({
        message: "Finance record updated successfully.",
        finance: serializeFinance(updatedRecord),
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to update finance record.");
    }
  }
);

router.delete(
  "/:id",
  requireRole([ROLES.FINANCE_ADMIN]),
  async (req, res) => {
    try {
      const financeId = normalizeObjectId(req.params.id);

      if (!financeId) {
        return res.status(400).json({ message: "Invalid finance id." });
      }

      const record = await Finance.findById(financeId);

      if (!record) {
        return res.status(404).json({ message: "Finance record not found." });
      }

      assertFinanceRecordAccess(req, record);
      assertFinanceMutationAllowed(req, record.transactionType);

      await Finance.findByIdAndDelete(financeId);

      return res.status(200).json({ message: "Finance record deleted successfully." });
    } catch (error) {
      return respondWithError(res, error, "Unable to delete finance record.");
    }
  }
);

export default router;
