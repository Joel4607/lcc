import express from "express";
import {
  ATTENDANCE_MEETING_TYPE_VALUES,
  ATTENDANCE_STATUS_VALUES,
} from "../attendance/attendance.constants.js";
import {
  FINANCE_TRANSACTION_TYPE_VALUES,
  FinanceTransactionTypes,
} from "../finance/finance.constants.js";
import { MemberStatuses } from "../members/memberStatus.constants.js";
import { ROLES } from "../../shared/constants/roles.js";
import { applyBranchIsolation } from "../../shared/middleware/branchIsolation.js";
import { requireRole, verifyToken } from "../../shared/middleware/auth.js";
import Attendance from "../attendance/attendance.model.js";
import Branch from "../branches/branch.model.js";
import Buscell from "../buscells/buscell.model.js";
import Finance from "../finance/finance.model.js";
import Member from "../members/member.model.js";
import User from "../users/user.model.js";
import {
  buildAttendanceMatch,
  buildFinanceMatch,
  createDateBucketExpression,
  resolveScopedBranchId,
  resolveScopedBuscellId,
  toObjectId,
} from "./dashboard.analytics.js";
import { assertMemberWithinScope, normalizeUmid } from "../members/memberScope.js";
import respondWithError from "../../shared/utils/respondWithError.js";
import serializeAttendance from "../attendance/attendance.serializer.js";
import serializeFinance from "../finance/finance.serializer.js";
import serializeMember from "../members/member.serializer.js";

const router = express.Router();

const ATTENDANCE_POPULATE = [
  { path: "memberId", select: "fullName umid phone" },
  { path: "branchId", select: "name code" },
  { path: "buscellId", select: "name" },
  { path: "recordedBy", select: "name email role" },
];

const FINANCE_POPULATE = [
  { path: "memberId", select: "fullName umid phone" },
  { path: "branchId", select: "name code" },
  { path: "buscellId", select: "name" },
  { path: "recordedBy", select: "name email role" },
];

router.use(verifyToken, applyBranchIsolation);

function createLookupStages({ from, localField = "_id", foreignField = "_id", as, preserveNull = false }) {
  return [
    {
      $lookup: {
        from,
        localField,
        foreignField,
        as,
      },
    },
    {
      $unwind: {
        path: `$${as}`,
        preserveNullAndEmptyArrays: preserveNull,
      },
    },
  ];
}

function getTransactionAmountMap(rows) {
  const totals = Object.fromEntries(
    FINANCE_TRANSACTION_TYPE_VALUES.map((transactionType) => [transactionType, 0])
  );

  rows.forEach((row) => {
    totals[row._id] = row.totalAmount;
  });

  return totals;
}

function getTransactionBreakdown(rows) {
  const rowsByType = new Map(rows.map((row) => [row._id, row]));

  return FINANCE_TRANSACTION_TYPE_VALUES.map((transactionType) => {
    const row = rowsByType.get(transactionType);

    return {
      transactionType,
      totalAmount: row?.totalAmount || 0,
      totalRecords: row?.totalRecords || 0,
    };
  });
}

function getAttendanceMeetingBreakdown(rows) {
  const rowsByType = new Map(rows.map((row) => [row._id, row]));

  return ATTENDANCE_MEETING_TYPE_VALUES.map((meetingType) => {
    const row = rowsByType.get(meetingType);
    const totalRecords = row?.totalRecords || 0;
    const presentCount = row?.presentCount || 0;
    const absentCount = row?.absentCount || 0;

    return {
      meetingType,
      totalRecords,
      presentCount,
      absentCount,
      attendanceRate: totalRecords ? Number(((presentCount / totalRecords) * 100).toFixed(2)) : 0,
    };
  });
}

function getStatusTotals(rows) {
  const totals = Object.fromEntries(ATTENDANCE_STATUS_VALUES.map((status) => [status, 0]));

  rows.forEach((row) => {
    totals[row._id] = row.totalRecords;
  });

  return totals;
}

function mapBranchAggregate(rows, { attendance = false, finance = false, members = false } = {}) {
  return rows.map((row) => ({
    branchId: row.branch?._id?.toString() || null,
    branchName: row.branch?.name || "Unknown Branch",
    branchCode: row.branch?.code || "",
    ...(members
      ? {
          totalMembers: row.totalMembers || 0,
          activeMembers: row.activeMembers || 0,
        }
      : {}),
    ...(attendance
      ? {
          totalAttendance: row.totalAttendance || 0,
          presentCount: row.presentCount || 0,
          absentCount: row.absentCount || 0,
        }
      : {}),
    ...(finance
      ? {
          totalAmount: row.totalAmount || 0,
          totalRecords: row.totalRecords || 0,
        }
      : {}),
  }));
}

function mapBuscellAggregate(rows, { attendance = false, finance = false } = {}) {
  return rows.map((row) => ({
    buscellId: row.buscell?._id?.toString() || null,
    buscellName: row.buscell?.name || "Unassigned",
    ...(attendance
      ? {
          totalAttendance: row.totalAttendance || 0,
          presentCount: row.presentCount || 0,
          absentCount: row.absentCount || 0,
        }
      : {}),
    ...(finance
      ? {
          totalAmount: row.totalAmount || 0,
          totalRecords: row.totalRecords || 0,
        }
      : {}),
  }));
}

function mapTrendRows(rows, { valueKey = "total", amountKey = "totalAmount" } = {}) {
  return rows.map((row) => ({
    date: row._id,
    total: row[valueKey] || 0,
    totalAmount: row[amountKey] || 0,
    presentCount: row.presentCount || 0,
    absentCount: row.absentCount || 0,
    totalRecords: row.totalRecords || 0,
  }));
}

async function loadBranch(branchId) {
  return Branch.findById(branchId).select("name code");
}

async function loadBuscell(buscellId) {
  return Buscell.findById(buscellId).select("name branchId");
}

router.get("/global", requireRole([ROLES.SUPER_ADMIN]), async (req, res) => {
  try {
    const branchId = resolveScopedBranchId(req, req.query.branchId);
    const memberMatch = branchId ? { branchId: toObjectId(branchId) } : {};
    const userMatch = branchId ? { branchId: toObjectId(branchId) } : {};
    const attendanceFilter = (await buildAttendanceMatch(req, {
      ...req.query,
      branchId: branchId || req.query.branchId,
    })).match;
    const financeFilter = (await buildFinanceMatch(req, {
      ...req.query,
      branchId: branchId || req.query.branchId,
    })).match;

    const [
      totalBranches,
      totalUsers,
      totalMembers,
      totalActiveMembers,
      attendanceSummaryRows,
      financeSummaryRows,
      membersByBranchRows,
      attendanceByBranchRows,
      financeByBranchRows,
      attendanceTrendRows,
      financeTrendRows,
    ] = await Promise.all([
      Branch.countDocuments(branchId ? { _id: toObjectId(branchId) } : {}),
      User.countDocuments(userMatch),
      Member.countDocuments(memberMatch),
      Member.countDocuments({
        ...memberMatch,
        status: MemberStatuses.ACTIVE,
      }),
      Attendance.aggregate([
        {
          $match: attendanceFilter,
        },
        {
          $group: {
            _id: null,
            totalAttendanceRecords: { $sum: 1 },
          },
        },
      ]),
      Finance.aggregate([
        {
          $match: financeFilter,
        },
        {
          $group: {
            _id: "$transactionType",
            totalAmount: { $sum: "$amount" },
            totalRecords: { $sum: 1 },
          },
        },
      ]),
      Member.aggregate([
        {
          $match: memberMatch,
        },
        {
          $group: {
            _id: "$branchId",
            totalMembers: { $sum: 1 },
            activeMembers: {
              $sum: {
                $cond: [{ $eq: ["$status", MemberStatuses.ACTIVE] }, 1, 0],
              },
            },
          },
        },
        ...createLookupStages({ from: "branches", as: "branch" }),
        {
          $sort: {
            "branch.name": 1,
          },
        },
      ]),
      Attendance.aggregate([
        {
          $match: attendanceFilter,
        },
        {
          $group: {
            _id: "$branchId",
            totalAttendance: { $sum: 1 },
            presentCount: {
              $sum: {
                $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
              },
            },
            absentCount: {
              $sum: {
                $cond: [{ $eq: ["$status", "ABSENT"] }, 1, 0],
              },
            },
          },
        },
        ...createLookupStages({ from: "branches", as: "branch" }),
        {
          $sort: {
            totalAttendance: -1,
            "branch.name": 1,
          },
        },
      ]),
      Finance.aggregate([
        {
          $match: financeFilter,
        },
        {
          $group: {
            _id: "$branchId",
            totalAmount: { $sum: "$amount" },
            totalRecords: { $sum: 1 },
          },
        },
        ...createLookupStages({ from: "branches", as: "branch" }),
        {
          $sort: {
            totalAmount: -1,
            "branch.name": 1,
          },
        },
      ]),
      Attendance.aggregate([
        {
          $match: attendanceFilter,
        },
        {
          $group: {
            _id: createDateBucketExpression("$date"),
            totalRecords: { $sum: 1 },
            presentCount: {
              $sum: {
                $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
              },
            },
            absentCount: {
              $sum: {
                $cond: [{ $eq: ["$status", "ABSENT"] }, 1, 0],
              },
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]),
      Finance.aggregate([
        {
          $match: financeFilter,
        },
        {
          $group: {
            _id: createDateBucketExpression("$date"),
            totalAmount: { $sum: "$amount" },
            totalRecords: { $sum: 1 },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]),
    ]);

    const financeTotalsByType = getTransactionAmountMap(financeSummaryRows);

    return res.status(200).json({
      filters: {
        branchId: branchId || null,
        dateFrom: req.query.dateFrom || null,
        dateTo: req.query.dateTo || null,
      },
      metrics: {
        totalBranches,
        totalUsers,
        totalMembers,
        totalActiveMembers,
        totalAttendanceRecords: attendanceSummaryRows[0]?.totalAttendanceRecords || 0,
        totalFinanceRecords: financeSummaryRows.reduce((sum, row) => sum + row.totalRecords, 0),
        totalContributions: financeSummaryRows.reduce((sum, row) => sum + row.totalAmount, 0),
        totalTithes: financeTotalsByType[FinanceTransactionTypes.TITHE],
        totalSundayOfferings: financeTotalsByType[FinanceTransactionTypes.SUNDAY_OFFERING],
        totalBuscellOfferings: financeTotalsByType[FinanceTransactionTypes.BUSCELL_OFFERING],
        totalWelfare: financeTotalsByType[FinanceTransactionTypes.WELFARE],
        totalPledges: financeTotalsByType[FinanceTransactionTypes.PLEDGE],
      },
      breakdowns: {
        membersByBranch: mapBranchAggregate(membersByBranchRows, { members: true }),
        attendanceByBranch: mapBranchAggregate(attendanceByBranchRows, { attendance: true }),
        contributionsByBranch: mapBranchAggregate(financeByBranchRows, { finance: true }),
        attendanceTrend: mapTrendRows(attendanceTrendRows, { valueKey: "totalRecords" }),
        financeTrend: mapTrendRows(financeTrendRows),
        topPerformingBranchesByAttendance: mapBranchAggregate(
          attendanceByBranchRows.slice(0, 5),
          { attendance: true }
        ),
        topPerformingBranchesByContributions: mapBranchAggregate(financeByBranchRows.slice(0, 5), {
          finance: true,
        }),
      },
    });
  } catch (error) {
    return respondWithError(res, error, "Unable to load the global dashboard.");
  }
});

router.get(
  "/finance",
  requireRole([ROLES.FINANCE_ADMIN]),
  async (req, res) => {
    try {
      const branchId = resolveScopedBranchId(req, req.query.branchId, {
        forbiddenMessage: "You can only access finance summaries for your own branch.",
      });
      const branch = await loadBranch(branchId);

      if (!branch) {
        return res.status(404).json({ message: "Branch not found." });
      }

      const financeFilter = (
        await buildFinanceMatch(req, {
          ...req.query,
          branchId,
        })
      ).match;
      const [financeSummaryRows, buscellContributionRows, financeTrendRows] =
        await Promise.all([
          Finance.aggregate([
            { $match: financeFilter },
            {
              $group: {
                _id: "$transactionType",
                totalAmount: { $sum: "$amount" },
                totalRecords: { $sum: 1 },
              },
            },
          ]),
          Finance.aggregate([
            { $match: financeFilter },
            {
              $group: {
                _id: "$buscellId",
                totalAmount: { $sum: "$amount" },
                totalRecords: { $sum: 1 },
              },
            },
            ...createLookupStages({
              from: "buscells",
              as: "buscell",
              preserveNull: true,
            }),
            {
              $sort: {
                totalAmount: -1,
                "buscell.name": 1,
              },
            },
          ]),
          Finance.aggregate([
            { $match: financeFilter },
            {
              $group: {
                _id: createDateBucketExpression("$date"),
                totalAmount: { $sum: "$amount" },
                totalRecords: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ]),
        ]);
      const financeTotalsByType = getTransactionAmountMap(financeSummaryRows);

      return res.status(200).json({
        branch: {
          id: branchId,
          name: branch.name,
          code: branch.code,
        },
        filters: {
          dateFrom: req.query.dateFrom || null,
          dateTo: req.query.dateTo || null,
        },
        metrics: {
          totalFinanceRecords: financeSummaryRows.reduce(
            (sum, row) => sum + row.totalRecords,
            0
          ),
          totalBranchContributions: financeSummaryRows.reduce(
            (sum, row) => sum + row.totalAmount,
            0
          ),
          totalTithes: financeTotalsByType[FinanceTransactionTypes.TITHE],
          totalSundayOfferings:
            financeTotalsByType[FinanceTransactionTypes.SUNDAY_OFFERING],
          totalBuscellOfferings:
            financeTotalsByType[FinanceTransactionTypes.BUSCELL_OFFERING],
          totalWelfare: financeTotalsByType[FinanceTransactionTypes.WELFARE],
          totalPledges: financeTotalsByType[FinanceTransactionTypes.PLEDGE],
        },
        breakdowns: {
          contributionsByTransactionType: getTransactionBreakdown(financeSummaryRows),
          buscellContributionComparison: mapBuscellAggregate(buscellContributionRows, {
            finance: true,
          }),
          branchFinanceTrend: mapTrendRows(financeTrendRows),
        },
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to load the finance dashboard.");
    }
  }
);

router.get(
  "/branch",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN]),
  async (req, res) => {
    try {
      const branchId = resolveScopedBranchId(req, req.query.branchId, {
        required: req.accessScope?.isSuperAdmin,
        requiredMessage: "branchId is required for the branch dashboard.",
        forbiddenMessage: "You can only access the dashboard for your own branch.",
      });

      const branch = await loadBranch(branchId);

      if (!branch) {
        return res.status(404).json({ message: "Branch not found." });
      }

      const branchObjectId = toObjectId(branchId);
      const attendanceFilter = (
        await buildAttendanceMatch(req, {
          ...req.query,
          branchId,
        })
      ).match;
      const financeFilter = (
        await buildFinanceMatch(req, {
          ...req.query,
          branchId,
        })
      ).match;
      const memberJoinDateFilter = {
        branchId: branchObjectId,
        ...(req.query.dateFrom || req.query.dateTo
          ? {
              joinDate: {
                ...(req.query.dateFrom
                  ? {
                      $gte: new Date(`${req.query.dateFrom}T00:00:00.000Z`),
                    }
                  : {}),
                ...(req.query.dateTo
                  ? {
                      $lte: new Date(`${req.query.dateTo}T00:00:00.000Z`),
                    }
                  : {}),
              },
            }
          : {}),
      };

      const [
        totalMembers,
        totalActiveMembers,
        totalBuscells,
        totalEcclesiaLeaders,
        totalFinanceAdmins,
        unassignedMemberCount,
        attendanceSummaryRows,
        financeSummaryRows,
        attendanceRateRows,
        buscellAttendanceRows,
        buscellContributionRows,
        attendanceTrendRows,
        financeTrendRows,
        newMembersRows,
      ] = await Promise.all([
        Member.countDocuments({ branchId: branchObjectId }),
        Member.countDocuments({ branchId: branchObjectId, status: MemberStatuses.ACTIVE }),
        Buscell.countDocuments({ branchId: branchObjectId }),
        User.countDocuments({ branchId: branchObjectId, role: ROLES.ECCLESIA_LEADER }),
        User.countDocuments({ branchId: branchObjectId, role: ROLES.FINANCE_ADMIN }),
        Member.countDocuments({ branchId: branchObjectId, buscellId: null }),
        Attendance.aggregate([
          { $match: attendanceFilter },
          {
            $group: {
              _id: null,
              totalAttendanceRecords: { $sum: 1 },
            },
          },
        ]),
        Finance.aggregate([
          { $match: financeFilter },
          {
            $group: {
              _id: "$transactionType",
              totalAmount: { $sum: "$amount" },
              totalRecords: { $sum: 1 },
            },
          },
        ]),
        Attendance.aggregate([
          { $match: attendanceFilter },
          {
            $group: {
              _id: "$meetingType",
              totalRecords: { $sum: 1 },
              presentCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
                },
              },
              absentCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "ABSENT"] }, 1, 0],
                },
              },
            },
          },
        ]),
        Attendance.aggregate([
          { $match: attendanceFilter },
          {
            $group: {
              _id: "$buscellId",
              totalAttendance: { $sum: 1 },
              presentCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
                },
              },
              absentCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "ABSENT"] }, 1, 0],
                },
              },
            },
          },
          ...createLookupStages({
            from: "buscells",
            as: "buscell",
            preserveNull: true,
          }),
          {
            $sort: {
              totalAttendance: -1,
              "buscell.name": 1,
            },
          },
        ]),
        Finance.aggregate([
          { $match: financeFilter },
          {
            $group: {
              _id: "$buscellId",
              totalAmount: { $sum: "$amount" },
              totalRecords: { $sum: 1 },
            },
          },
          ...createLookupStages({
            from: "buscells",
            as: "buscell",
            preserveNull: true,
          }),
          {
            $sort: {
              totalAmount: -1,
              "buscell.name": 1,
            },
          },
        ]),
        Attendance.aggregate([
          { $match: attendanceFilter },
          {
            $group: {
              _id: createDateBucketExpression("$date"),
              totalRecords: { $sum: 1 },
              presentCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
                },
              },
              absentCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "ABSENT"] }, 1, 0],
                },
              },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Finance.aggregate([
          { $match: financeFilter },
          {
            $group: {
              _id: createDateBucketExpression("$date"),
              totalAmount: { $sum: "$amount" },
              totalRecords: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Member.aggregate([
          { $match: memberJoinDateFilter },
          {
            $group: {
              _id: createDateBucketExpression("$joinDate"),
              totalMembers: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

      return res.status(200).json({
        branch: {
          id: branchId,
          name: branch.name,
          code: branch.code,
        },
        filters: {
          dateFrom: req.query.dateFrom || null,
          dateTo: req.query.dateTo || null,
        },
        metrics: {
          totalMembers,
          totalActiveMembers,
          totalBuscells,
          totalEcclesiaLeaders,
          totalFinanceAdmins,
          totalAttendanceRecords: attendanceSummaryRows[0]?.totalAttendanceRecords || 0,
          totalBranchContributions: financeSummaryRows.reduce((sum, row) => sum + row.totalAmount, 0),
          unassignedMemberCount,
        },
        breakdowns: {
          attendanceRateByMeetingType: getAttendanceMeetingBreakdown(attendanceRateRows),
          contributionsByTransactionType: getTransactionBreakdown(financeSummaryRows),
          buscellAttendanceComparison: mapBuscellAggregate(buscellAttendanceRows, { attendance: true }),
          buscellContributionComparison: mapBuscellAggregate(buscellContributionRows, { finance: true }),
          branchAttendanceTrend: mapTrendRows(attendanceTrendRows, { valueKey: "totalRecords" }),
          branchFinanceTrend: mapTrendRows(financeTrendRows),
          newMembersOverTime: newMembersRows.map((row) => ({
            date: row._id,
            totalMembers: row.totalMembers,
          })),
        },
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to load the branch dashboard.");
    }
  }
);

router.get(
  "/buscell",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const branchId = resolveScopedBranchId(req, req.query.branchId, {
        required: false,
        forbiddenMessage: "You can only access buscell dashboards in your branch.",
      });
      const { buscellId } = await resolveScopedBuscellId(req, req.query.buscellId, {
        branchId,
        required: true,
        requiredMessage: "buscellId is required for the buscell dashboard.",
        forbiddenMessage: "You can only access buscell dashboards in your own Ecclesia.",
        branchMismatchMessage: "Selected buscell does not belong to the allowed branch.",
      });
      const buscell = await loadBuscell(buscellId);

      if (!buscell) {
        return res.status(404).json({ message: "Buscell not found." });
      }

      const attendanceFilter = (
        await buildAttendanceMatch(req, {
          ...req.query,
          branchId: buscell.branchId.toString(),
          buscellId,
        })
      ).match;
      const financeFilter = (
        await buildFinanceMatch(req, {
          ...req.query,
          branchId: buscell.branchId.toString(),
          buscellId,
        })
      ).match;
      const buscellObjectId = toObjectId(buscellId);

      const [
        totalMembers,
        activeMembers,
        attendanceSummaryRows,
        sundayAttendanceRows,
        weeklyAttendanceRows,
        attendanceTrendRows,
        presentVsAbsentRows,
        contributionRows,
        buscellOfferingTrendRows,
      ] = await Promise.all([
        Member.countDocuments({ buscellId: buscellObjectId }),
        Member.countDocuments({ buscellId: buscellObjectId, status: MemberStatuses.ACTIVE }),
        Attendance.aggregate([
          { $match: attendanceFilter },
          {
            $group: {
              _id: null,
              totalAttendanceRecords: { $sum: 1 },
            },
          },
        ]),
        Attendance.aggregate([
          {
            $match: {
              ...attendanceFilter,
              meetingType: "SUNDAY_SERVICE",
            },
          },
          {
            $group: {
              _id: createDateBucketExpression("$date"),
              totalRecords: { $sum: 1 },
              presentCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
                },
              },
              absentCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "ABSENT"] }, 1, 0],
                },
              },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Attendance.aggregate([
          {
            $match: {
              ...attendanceFilter,
              meetingType: "BUSCELL_WEEKLY",
            },
          },
          {
            $group: {
              _id: createDateBucketExpression("$date"),
              totalRecords: { $sum: 1 },
              presentCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
                },
              },
              absentCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "ABSENT"] }, 1, 0],
                },
              },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Attendance.aggregate([
          { $match: attendanceFilter },
          {
            $group: {
              _id: createDateBucketExpression("$date"),
              totalRecords: { $sum: 1 },
              presentCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
                },
              },
              absentCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "ABSENT"] }, 1, 0],
                },
              },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Attendance.aggregate([
          { $match: attendanceFilter },
          {
            $group: {
              _id: "$status",
              totalRecords: { $sum: 1 },
            },
          },
        ]),
        Finance.aggregate([
          { $match: financeFilter },
          {
            $group: {
              _id: "$transactionType",
              totalAmount: { $sum: "$amount" },
              totalRecords: { $sum: 1 },
            },
          },
        ]),
        Finance.aggregate([
          {
            $match: {
              ...financeFilter,
              transactionType: FinanceTransactionTypes.BUSCELL_OFFERING,
            },
          },
          {
            $group: {
              _id: createDateBucketExpression("$date"),
              totalAmount: { $sum: "$amount" },
              totalRecords: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

      const statusTotals = getStatusTotals(presentVsAbsentRows);

      return res.status(200).json({
        buscell: {
          id: buscellId,
          name: buscell.name,
          branchId: buscell.branchId.toString(),
        },
        filters: {
          dateFrom: req.query.dateFrom || null,
          dateTo: req.query.dateTo || null,
        },
        metrics: {
          totalMembers,
          activeMembers,
          totalAttendanceRecords: attendanceSummaryRows[0]?.totalAttendanceRecords || 0,
          totalBuscellContributions: contributionRows.reduce((sum, row) => sum + row.totalAmount, 0),
          rosterSize: totalMembers,
          presentCount: statusTotals.PRESENT,
          absentCount: statusTotals.ABSENT,
        },
        breakdowns: {
          sundayAttendanceTrend: mapTrendRows(sundayAttendanceRows, { valueKey: "totalRecords" }),
          weeklyBuscellAttendanceTrend: mapTrendRows(weeklyAttendanceRows, {
            valueKey: "totalRecords",
          }),
          attendanceTrendByDate: mapTrendRows(attendanceTrendRows, { valueKey: "totalRecords" }),
          presentVsAbsentSummary: [
            { status: "PRESENT", totalRecords: statusTotals.PRESENT },
            { status: "ABSENT", totalRecords: statusTotals.ABSENT },
          ],
          contributionTotalsByType: getTransactionBreakdown(contributionRows),
          contributionTrendForBuscellOfferings: mapTrendRows(buscellOfferingTrendRows),
        },
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to load the buscell dashboard.");
    }
  }
);

router.get(
  "/member/:umid",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER, ROLES.FINANCE_ADMIN]),
  async (req, res) => {
    try {
      const umid = normalizeUmid(req.params.umid);

      if (!umid) {
        return res.status(400).json({ message: "Invalid UMID." });
      }

      const member = await Member.findOne({ umid }).populate([
        { path: "branchId", select: "name code" },
        { path: "buscellId", select: "name branchId" },
      ]);

      if (!member) {
        return res.status(404).json({ message: "Member not found." });
      }

      assertMemberWithinScope(req, member, {
        ecclesiaLeaderOwnBuscellOnly: false,
        branchMessage: "You can only access member dashboards in your branch.",
        ecclesiaMessage: "You can only access member dashboards in your Ecclesia.",
      });

      const isFinanceAdmin = req.accessScope?.role === ROLES.FINANCE_ADMIN;
      const [
        attendanceSummaryRows,
        financeSummaryRows,
        recentAttendance,
        recentFinance,
      ] =
        await Promise.all([
          isFinanceAdmin
            ? Promise.resolve(null)
            : Attendance.aggregate([
                {
                  $match: {
                    memberId: member._id,
                  },
                },
                {
                  $facet: {
                    totals: [
                      {
                        $group: {
                          _id: null,
                          totalAttendances: { $sum: 1 },
                          presentCount: {
                            $sum: {
                              $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
                            },
                          },
                          absentCount: {
                            $sum: {
                              $cond: [{ $eq: ["$status", "ABSENT"] }, 1, 0],
                            },
                          },
                        },
                      },
                    ],
                    byMeetingType: [
                      {
                        $group: {
                          _id: "$meetingType",
                          totalRecords: { $sum: 1 },
                          presentCount: {
                            $sum: {
                              $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
                            },
                          },
                          absentCount: {
                            $sum: {
                              $cond: [{ $eq: ["$status", "ABSENT"] }, 1, 0],
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              ]),
          Finance.aggregate([
            {
              $match: {
                memberId: member._id,
              },
            },
            {
              $facet: {
                totals: [
                  {
                    $group: {
                      _id: null,
                      totalFinanceRecords: { $sum: 1 },
                      totalAmountContributed: { $sum: "$amount" },
                    },
                  },
                ],
                byTransactionType: [
                  {
                    $group: {
                      _id: "$transactionType",
                      totalAmount: { $sum: "$amount" },
                      totalRecords: { $sum: 1 },
                    },
                  },
                ],
              },
            },
          ]),
          isFinanceAdmin
            ? Promise.resolve([])
            : Attendance.find({ memberId: member._id })
                .populate(ATTENDANCE_POPULATE)
                .sort({ date: -1, createdAt: -1 })
                .limit(10),
          Finance.find({ memberId: member._id })
            .populate(FINANCE_POPULATE)
            .sort({ date: -1, createdAt: -1 })
            .limit(10),
        ]);

      const attendanceSummary = attendanceSummaryRows?.[0] || { totals: [], byMeetingType: [] };
      const financeSummary = financeSummaryRows[0] || { totals: [], byTransactionType: [] };
      const attendanceTotals = attendanceSummary.totals[0] || {
        totalAttendances: 0,
        presentCount: 0,
        absentCount: 0,
      };
      const financeTotals = financeSummary.totals[0] || {
        totalFinanceRecords: 0,
        totalAmountContributed: 0,
      };

      return res.status(200).json({
        member: serializeMember(member),
        branch: member.branchId?._id
          ? {
              id: member.branchId._id.toString(),
              name: member.branchId.name,
              code: member.branchId.code,
            }
          : null,
        buscell: member.buscellId?._id
          ? {
              id: member.buscellId._id.toString(),
              name: member.buscellId.name,
            }
          : null,
        attendanceSummary: isFinanceAdmin
          ? null
          : {
              totalAttendances: attendanceTotals.totalAttendances,
              presentCount: attendanceTotals.presentCount,
              absentCount: attendanceTotals.absentCount,
              byMeetingType: getAttendanceMeetingBreakdown(attendanceSummary.byMeetingType),
              recentAttendanceRecords: recentAttendance.map(serializeAttendance),
            },
        financeSummary: {
          totalFinanceRecords: financeTotals.totalFinanceRecords,
          totalAmountContributed: financeTotals.totalAmountContributed,
          contributionBreakdownByTransactionType: getTransactionBreakdown(
            financeSummary.byTransactionType
          ),
          recentFinanceRecords: recentFinance.map(serializeFinance),
        },
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to load the member dashboard.");
    }
  }
);

export default router;
