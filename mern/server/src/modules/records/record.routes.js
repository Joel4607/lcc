import express from "express";
import { ROLES } from "../../shared/constants/roles.js";
import {
  applyBranchIsolation,
  assertAssignedEcclesia,
  assertBranchAccess,
  assertEcclesiaAccess,
} from "../../shared/middleware/branchIsolation.js";
import { requireRole, verifyToken } from "../../shared/middleware/auth.js";
import Branch from "../branches/branch.model.js";
import BranchRecord from "./branchRecord.model.js";
import Buscell from "../buscells/buscell.model.js";
import BuscellRecord from "./buscellRecord.model.js";
import Ecclesia from "../ecclesias/ecclesia.model.js";
import respondWithError from "../../shared/utils/respondWithError.js";
import { idsMatch, normalizeObjectId } from "../../shared/utils/objectId.js";
import { resolveRecordWeek } from "./recordWeeks.js";
import serializeBranchRecord from "./branchRecord.serializer.js";
import serializeBuscellRecord from "./buscellRecord.serializer.js";
import serializeEcclesia from "../ecclesias/ecclesia.serializer.js";
import serializeRecordWeek from "./recordWeek.serializer.js";
import createHttpError from "../../shared/utils/httpError.js";

const router = express.Router();

const BUSCELL_RECORD_POPULATE = [
  { path: "weekId", select: "weekNumber startDate endDate cycleId" },
  { path: "branchId", select: "name code" },
  { path: "ecclesiaId", select: "name branchId leaderId" },
  { path: "buscellId", select: "name branchId ecclesiaId" },
  { path: "recordedBy", select: "name email role" },
];

const BRANCH_RECORD_POPULATE = [
  { path: "weekId", select: "weekNumber startDate endDate cycleId" },
  { path: "branchId", select: "name code" },
  { path: "recordedBy", select: "name email role" },
];

const INTEGER_INPUT_PATTERN = /^\d+$/;
const DECIMAL_INPUT_PATTERN = /^(?:\d+|\d+\.\d+|\.\d+)$/;
const MEANINGFUL_RECORD_MATCH = [
  { sundayAttendance: { $ne: null } },
  { buscellAttendance: { $ne: null } },
  { buscellOffering: { $ne: null } },
];

function normalizeNullableNumber(value, fieldName, { integerOnly = false } = {}) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "boolean" || Array.isArray(value) || typeof value === "object") {
    throw createHttpError(400, `${fieldName} must be a numeric value.`, "INVALID_RECORD_VALUE");
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return null;
    }

    const isValidNumericString = integerOnly
      ? INTEGER_INPUT_PATTERN.test(trimmedValue)
      : DECIMAL_INPUT_PATTERN.test(trimmedValue);

    if (!isValidNumericString) {
      throw createHttpError(400, `${fieldName} must be a numeric value.`, "INVALID_RECORD_VALUE");
    }

    value = Number(trimmedValue);
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw createHttpError(400, `${fieldName} must be 0 or greater.`, "INVALID_RECORD_VALUE");
  }

  if (integerOnly && !Number.isInteger(number)) {
    throw createHttpError(
      400,
      `${fieldName} must be a whole number.`,
      "INVALID_RECORD_VALUE"
    );
  }

  return number;
}

function normalizeRequiredNumber(value, fieldName, options = {}) {
  const normalizedValue = normalizeNullableNumber(value, fieldName, options);

  if (normalizedValue === null) {
    throw createHttpError(400, `${fieldName} is required.`, "MISSING_RECORD_VALUE");
  }

  return normalizedValue;
}

function buildBuscellRecordValues(body) {
  return {
    sundayAttendance: normalizeNullableNumber(body.sundayAttendance, "sundayAttendance", {
      integerOnly: true,
    }),
    buscellAttendance: normalizeNullableNumber(body.buscellAttendance, "buscellAttendance", {
      integerOnly: true,
    }),
    buscellOffering: normalizeNullableNumber(body.buscellOffering, "buscellOffering"),
  };
}

function hasMeaningfulBuscellValues(values) {
  return (
    values.sundayAttendance !== null ||
    values.buscellAttendance !== null ||
    values.buscellOffering !== null
  );
}

function sumField(rows, fieldName) {
  return rows.reduce((sum, row) => sum + (row[fieldName] || 0), 0);
}

function formatAggregateRow(row) {
  if (!row) {
    return null;
  }

  if (
    Object.prototype.hasOwnProperty.call(row, "submittedEcclesias") &&
    !Object.prototype.hasOwnProperty.call(row, "ecclesiaIds")
  ) {
    return {
      totalSundayAttendance: row.totalSundayAttendance || 0,
      totalBuscellAttendance: row.totalBuscellAttendance || 0,
      totalBuscellOffering: row.totalBuscellOffering || 0,
      submittedBuscells: row.submittedBuscells || 0,
      submittedEcclesias: row.submittedEcclesias || 0,
    };
  }

  return {
    totalSundayAttendance: row.totalSundayAttendance || 0,
    totalBuscellAttendance: row.totalBuscellAttendance || 0,
    totalBuscellOffering: row.totalBuscellOffering || 0,
    submittedBuscells: row.submittedBuscells || 0,
    submittedEcclesias: Array.isArray(row.ecclesiaIds) ? row.ecclesiaIds.length : 0,
  };
}

function buildScopedSummary(row, extras = {}) {
  const formattedRow = formatAggregateRow(row);
  const hasSundayOffering = extras.totalSundayOffering !== null && extras.totalSundayOffering !== undefined;
  const hasData = Boolean(formattedRow) || hasSundayOffering;

  return {
    hasData,
    totalSundayAttendance: formattedRow ? formattedRow.totalSundayAttendance : null,
    totalBuscellAttendance: formattedRow ? formattedRow.totalBuscellAttendance : null,
    totalBuscellOffering: formattedRow ? formattedRow.totalBuscellOffering : null,
    submittedBuscells: formattedRow ? formattedRow.submittedBuscells : null,
    submittedEcclesias: formattedRow ? formattedRow.submittedEcclesias : null,
    totalSundayOffering: hasSundayOffering ? extras.totalSundayOffering : null,
  };
}

async function aggregateBuscellRecordsBy({ weekId, groupField, branchId = null, ecclesiaId = null }) {
  const matchStage = {
    weekId,
  };

  if (branchId) {
    matchStage.branchId = branchId;
  }

  if (ecclesiaId) {
    matchStage.ecclesiaId = ecclesiaId;
  }

  return BuscellRecord.aggregate([
    {
      $match: {
        ...matchStage,
        $or: MEANINGFUL_RECORD_MATCH,
      },
    },
    {
      $group: {
        _id: `$${groupField}`,
        totalSundayAttendance: { $sum: { $ifNull: ["$sundayAttendance", 0] } },
        totalBuscellAttendance: { $sum: { $ifNull: ["$buscellAttendance", 0] } },
        totalBuscellOffering: { $sum: { $ifNull: ["$buscellOffering", 0] } },
        submittedBuscells: { $sum: 1 },
        ecclesiaIds: { $addToSet: "$ecclesiaId" },
      },
    },
  ]);
}

function createBranchSummary({ rows, totalBranches, submittedBranches, sundayOfferingRecords }) {
  return {
    totalBranches,
    submittedBranches,
    totalSundayAttendance: sumField(rows, "totalSundayAttendance"),
    totalBuscellAttendance: sumField(rows, "totalBuscellAttendance"),
    totalBuscellOffering: sumField(rows, "totalBuscellOffering"),
    totalSundayOffering: sundayOfferingRecords.reduce(
      (sum, record) => sum + (record.totalSundayOffering || 0),
      0
    ),
  };
}

function createEcclesiaSummary({ rows, totalEcclesias, sundayOfferingRecord }) {
  return {
    totalEcclesias,
    submittedEcclesias: rows.length,
    totalSundayAttendance: sumField(rows, "totalSundayAttendance"),
    totalBuscellAttendance: sumField(rows, "totalBuscellAttendance"),
    totalBuscellOffering: sumField(rows, "totalBuscellOffering"),
    totalSundayOffering: sundayOfferingRecord?.totalSundayOffering || 0,
  };
}

async function resolveAccessibleEcclesia(req, ecclesiaId) {
  const normalizedEcclesiaId =
    normalizeObjectId(ecclesiaId) ||
    (req.user.role === ROLES.ECCLESIA_LEADER ? assertAssignedEcclesia(req) : null);

  if (!normalizedEcclesiaId) {
    throw createHttpError(400, "ecclesiaId is required.", "MISSING_ECCLESIA");
  }

  const ecclesia = await Ecclesia.findById(normalizedEcclesiaId).populate([
    { path: "branchId", select: "name code" },
    { path: "leaderId", select: "name email role branchId ecclesiaId" },
  ]);

  if (!ecclesia) {
    throw createHttpError(404, "Ecclesia not found.", "ECCLESIA_NOT_FOUND");
  }

  assertBranchAccess(req, ecclesia.branchId, "You can only access records in your branch.");
  assertEcclesiaAccess(req, ecclesia._id, "You can only access records for your own Ecclesia.");

  return ecclesia;
}

async function resolveAccessibleBranch(req, branchId) {
  const normalizedBranchId =
    normalizeObjectId(branchId) || (!req.accessScope.isSuperAdmin ? req.accessScope.branchId : null);

  if (!normalizedBranchId) {
    throw createHttpError(400, "branchId is required.", "MISSING_BRANCH");
  }

  const branch = await Branch.findById(normalizedBranchId);

  if (!branch) {
    throw createHttpError(404, "Branch not found.", "BRANCH_NOT_FOUND");
  }

  assertBranchAccess(req, branch._id, "You can only access records in your branch.");

  return branch;
}

function assertBuscellMatchesEcclesia(buscell, ecclesia) {
  const buscellBranchId = normalizeObjectId(buscell.branchId?._id || buscell.branchId);
  const ecclesiaBranchId = normalizeObjectId(ecclesia.branchId?._id || ecclesia.branchId);
  const buscellEcclesiaId = normalizeObjectId(buscell.ecclesiaId?._id || buscell.ecclesiaId);

  if (!buscellBranchId || !ecclesiaBranchId || !buscellEcclesiaId) {
    throw createHttpError(
      400,
      "Buscell structure is incomplete.",
      "INVALID_BUSCELL_STRUCTURE"
    );
  }

  if (!idsMatch(buscellEcclesiaId, ecclesia._id)) {
    throw createHttpError(
      400,
      "Buscell does not belong to the selected Ecclesia.",
      "BUSCELL_ECCLESIA_MISMATCH"
    );
  }

  if (!idsMatch(buscellBranchId, ecclesiaBranchId)) {
    throw createHttpError(
      400,
      "Buscell and Ecclesia must belong to the same branch.",
      "BUSCELL_BRANCH_MISMATCH"
    );
  }
}

router.use(verifyToken, applyBranchIsolation);

router.post(
  "/buscell",
  requireRole([ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const buscellId = normalizeObjectId(req.body.buscellId);

      if (!buscellId) {
        return res.status(400).json({ message: "buscellId is required." });
      }

      const week = await resolveRecordWeek({
        weekId: req.body.weekId,
        date: req.body.date,
      });
      const buscell = await Buscell.findById(buscellId).populate([
        { path: "branchId", select: "name code" },
        { path: "ecclesiaId", select: "name branchId leaderId" },
      ]);

      if (!buscell) {
        return res.status(404).json({ message: "Buscell not found." });
      }

      const buscellEcclesiaId = normalizeObjectId(buscell.ecclesiaId?._id || buscell.ecclesiaId);

      if (!buscellEcclesiaId) {
        throw createHttpError(
          400,
          "Buscell must belong to an Ecclesia.",
          "BUSCELL_ECCLESIA_REQUIRED"
        );
      }

      const ecclesia = await resolveAccessibleEcclesia(req, buscellEcclesiaId);
      assertBuscellMatchesEcclesia(buscell, ecclesia);
      const recordValues = buildBuscellRecordValues(req.body);
      const hasMeaningfulValues = hasMeaningfulBuscellValues(recordValues);
      const existingRecord = await BuscellRecord.findOne({
        weekId: week._id,
        buscellId: buscell._id,
      });

      if (!hasMeaningfulValues) {
        if (existingRecord) {
          await BuscellRecord.findByIdAndDelete(existingRecord._id);
        }

        return res.status(200).json({
          message: "Buscell record cleared successfully.",
          week: serializeRecordWeek(week),
          record: null,
        });
      }

      const record = await BuscellRecord.findOneAndUpdate(
        {
          weekId: week._id,
          buscellId: buscell._id,
        },
        {
          $set: {
            branchId: buscell.branchId?._id || buscell.branchId,
            ecclesiaId: ecclesia._id,
            ...recordValues,
            recordedBy: req.user._id,
          },
          $setOnInsert: {
            weekId: week._id,
            buscellId: buscell._id,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      ).populate(BUSCELL_RECORD_POPULATE);

      return res.status(existingRecord ? 200 : 201).json({
        message: existingRecord
          ? "Buscell record updated successfully."
          : "Buscell record saved successfully.",
        week: serializeRecordWeek(week),
        record: serializeBuscellRecord(record),
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to save the buscell record.");
    }
  }
);

router.post(
  "/branch-sunday-offering",
  requireRole([ROLES.FINANCE_ADMIN]),
  async (req, res) => {
    try {
      const week = await resolveRecordWeek({
        weekId: req.body.weekId,
        date: req.body.date,
      });
      const branch = await resolveAccessibleBranch(req, req.accessScope.branchId);
      const branchRecord = await BranchRecord.findOneAndUpdate(
        {
          weekId: week._id,
          branchId: branch._id,
        },
        {
          $set: {
            totalSundayOffering: normalizeRequiredNumber(
              req.body.totalSundayOffering,
              "totalSundayOffering"
            ),
            recordedBy: req.user._id,
          },
          $setOnInsert: {
            weekId: week._id,
            branchId: branch._id,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      ).populate(BRANCH_RECORD_POPULATE);

      return res.status(200).json({
        message: "Branch Sunday offering saved successfully.",
        week: serializeRecordWeek(week),
        branchSundayOffering: serializeBranchRecord(branchRecord),
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to save the branch Sunday offering.");
    }
  }
);

router.get(
  "/global",
  requireRole([ROLES.SUPER_ADMIN]),
  async (req, res) => {
    try {
      const week = await resolveRecordWeek({
        weekId: req.query.weekId,
        date: req.query.date,
      });
      const [branches, aggregateRows, branchSundayOfferings] = await Promise.all([
        Branch.find().sort({ name: 1 }).select("name code"),
        aggregateBuscellRecordsBy({
          weekId: week._id,
          groupField: "branchId",
        }),
        BranchRecord.find({ weekId: week._id }).populate(BRANCH_RECORD_POPULATE),
      ]);

      const aggregateMap = new Map(
        aggregateRows.map((row) => [row._id.toString(), formatAggregateRow(row)])
      );
      const sundayOfferingMap = new Map(
        branchSundayOfferings.map((record) => [
          (record.branchId?._id || record.branchId).toString(),
          record,
        ])
      );

      const items = branches.map((branch) => {
        const row = aggregateMap.get(branch._id.toString()) || null;
        const sundayOfferingRecord = sundayOfferingMap.get(branch._id.toString()) || null;

        return {
          branch: {
            id: branch._id.toString(),
            name: branch.name,
            code: branch.code,
          },
          summary: buildScopedSummary(row, {
            totalSundayOffering: sundayOfferingRecord?.totalSundayOffering ?? null,
          }),
          branchSundayOffering: serializeBranchRecord(sundayOfferingRecord),
        };
      });

      return res.status(200).json({
        week: serializeRecordWeek(week),
        summary: createBranchSummary({
          rows: aggregateRows.map(formatAggregateRow),
          totalBranches: branches.length,
          submittedBranches: items.filter((item) => item.summary.hasData).length,
          sundayOfferingRecords: branchSundayOfferings,
        }),
        items,
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to fetch global record aggregates.");
    }
  }
);

router.get(
  "/branch/:branchId?",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN]),
  async (req, res) => {
    try {
      const week = await resolveRecordWeek({
        weekId: req.query.weekId,
        date: req.query.date,
      });
      const branch = await resolveAccessibleBranch(req, req.params.branchId || req.query.branchId);
      const [ecclesias, aggregateRows, branchSundayOffering] = await Promise.all([
        Ecclesia.find({ branchId: branch._id })
          .sort({ name: 1 })
          .populate([
            { path: "branchId", select: "name code" },
            { path: "leaderId", select: "name email role branchId ecclesiaId" },
          ]),
        aggregateBuscellRecordsBy({
          weekId: week._id,
          branchId: branch._id,
          groupField: "ecclesiaId",
        }),
        BranchRecord.findOne({
          weekId: week._id,
          branchId: branch._id,
        }).populate(BRANCH_RECORD_POPULATE),
      ]);

      const aggregateMap = new Map(
        aggregateRows.map((row) => [row._id.toString(), formatAggregateRow(row)])
      );

      const items = ecclesias.map((ecclesia) => {
        const row = aggregateMap.get(ecclesia._id.toString()) || null;

        return {
          ecclesia: serializeEcclesia(ecclesia),
          summary: buildScopedSummary(row),
        };
      });

      return res.status(200).json({
        week: serializeRecordWeek(week),
        branch: {
          id: branch._id.toString(),
          name: branch.name,
          code: branch.code,
        },
        summary: createEcclesiaSummary({
          rows: aggregateRows.map(formatAggregateRow),
          totalEcclesias: ecclesias.length,
          sundayOfferingRecord: branchSundayOffering,
        }),
        branchSundayOffering: serializeBranchRecord(branchSundayOffering),
        items,
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to fetch branch record aggregates.");
    }
  }
);

router.get(
  "/ecclesia/:ecclesiaId",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const ecclesia = await resolveAccessibleEcclesia(req, req.params.ecclesiaId);
      const week = await resolveRecordWeek({
        weekId: req.query.weekId,
        date: req.query.date,
      });

      const [buscells, records, branch] = await Promise.all([
        Buscell.find({ ecclesiaId: ecclesia._id })
          .sort({ name: 1 })
          .populate([
            { path: "branchId", select: "name code" },
            { path: "ecclesiaId", select: "name branchId leaderId" },
          ]),
        BuscellRecord.find({
          ecclesiaId: ecclesia._id,
          weekId: week._id,
          $or: MEANINGFUL_RECORD_MATCH,
        })
          .sort({ createdAt: -1 })
          .populate(BUSCELL_RECORD_POPULATE),
        Branch.findById(ecclesia.branchId).select("name code"),
      ]);

      const recordMap = new Map(
        records.map((record) => [(record.buscellId?._id || record.buscellId).toString(), record])
      );
      const items = buscells.map((buscell) => {
        const record = recordMap.get(buscell._id.toString());

        return {
          buscell: {
            id: buscell._id.toString(),
            name: buscell.name,
          },
          record: record ? serializeBuscellRecord(record) : null,
        };
      });

      return res.status(200).json({
        week: serializeRecordWeek(week),
        branch: branch
          ? {
              id: branch._id.toString(),
              name: branch.name,
              code: branch.code,
            }
          : null,
        ecclesia: serializeEcclesia(ecclesia),
        summary: {
          totalBuscells: buscells.length,
          submittedBuscells: records.length,
          totalSundayAttendance: records.reduce(
            (sum, record) => sum + (record.sundayAttendance || 0),
            0
          ),
          totalBuscellAttendance: records.reduce(
            (sum, record) => sum + (record.buscellAttendance || 0),
            0
          ),
          totalBuscellOffering: records.reduce(
            (sum, record) => sum + (record.buscellOffering || 0),
            0
          ),
        },
        items,
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to fetch Ecclesia records.");
    }
  }
);

export default router;
