import express from "express";
import { ATTENDANCE_MEETING_TYPE_VALUES } from "../attendance/attendance.constants.js";
import {
  FINANCE_PAYMENT_METHOD_VALUES,
  FINANCE_TRANSACTION_TYPE_VALUES,
} from "../finance/finance.constants.js";
import { MEMBER_STATUS_VALUES } from "../members/memberStatus.constants.js";
import { ROLES } from "../../shared/constants/roles.js";
import { applyBranchIsolation } from "../../shared/middleware/branchIsolation.js";
import { requireRole, verifyToken } from "../../shared/middleware/auth.js";
import Attendance from "../attendance/attendance.model.js";
import Branch from "../branches/branch.model.js";
import Buscell from "../buscells/buscell.model.js";
import Finance from "../finance/finance.model.js";
import Member from "../members/member.model.js";
import {
  buildAttendanceMatch,
  buildFinanceMatch,
  buildMemberMatch,
  parsePagination,
  resolveScopedBranchId,
  resolveScopedBuscellId,
  toObjectId,
} from "../dashboard/dashboard.analytics.js";
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

function createPaginationPayload({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: total ? Math.ceil(total / limit) : 1,
  };
}

function createCountMap(rows, values, keyName) {
  const rowsByKey = new Map(rows.map((row) => [row._id, row]));

  return values.map((value) => ({
    [keyName]: value,
    totalRecords: rowsByKey.get(value)?.totalRecords || 0,
  }));
}

router.get(
  "/members",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const pagination = parsePagination(req.query);
      const { match } = await buildMemberMatch(req, req.query, {
        allowSearch: true,
        dateField: "joinDate",
      });

      const [items, total, statusRows] = await Promise.all([
        Member.find(match)
          .populate([
            { path: "branchId", select: "name code" },
            { path: "buscellId", select: "name branchId" },
          ])
          .sort({ createdAt: -1 })
          .skip(pagination.skip)
          .limit(pagination.limit),
        Member.countDocuments(match),
        Member.aggregate([
          { $match: match },
          {
            $group: {
              _id: "$status",
              totalRecords: { $sum: 1 },
            },
          },
        ]),
      ]);

      return res.status(200).json({
        filters: {
          branchId: req.query.branchId || null,
          buscellId: req.query.buscellId || null,
          status: req.query.status || null,
          search: req.query.search || null,
          dateFrom: req.query.dateFrom || null,
          dateTo: req.query.dateTo || null,
        },
        summary: {
          totalMembers: total,
          byStatus: createCountMap(statusRows, MEMBER_STATUS_VALUES, "status"),
        },
        pagination: createPaginationPayload({ ...pagination, total }),
        items: items.map(serializeMember),
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to load the member report.");
    }
  }
);

router.get(
  "/attendance",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const pagination = parsePagination(req.query);
      const { match } = await buildAttendanceMatch(req, req.query);

      const [items, total, summaryRows] = await Promise.all([
        Attendance.find(match)
          .populate(ATTENDANCE_POPULATE)
          .sort({ date: -1, createdAt: -1 })
          .skip(pagination.skip)
          .limit(pagination.limit),
        Attendance.countDocuments(match),
        Attendance.aggregate([
          { $match: match },
          {
            $facet: {
              byMeetingType: [
                {
                  $group: {
                    _id: "$meetingType",
                    totalRecords: { $sum: 1 },
                  },
                },
              ],
              byStatus: [
                {
                  $group: {
                    _id: "$status",
                    totalRecords: { $sum: 1 },
                  },
                },
              ],
            },
          },
        ]),
      ]);

      const summary = summaryRows[0] || { byMeetingType: [], byStatus: [] };

      return res.status(200).json({
        filters: {
          branchId: req.query.branchId || null,
          buscellId: req.query.buscellId || null,
          umid: req.query.umid || null,
          meetingType: req.query.meetingType || null,
          status: req.query.status || null,
          dateFrom: req.query.dateFrom || null,
          dateTo: req.query.dateTo || null,
        },
        summary: {
          totalRecords: total,
          byMeetingType: createCountMap(
            summary.byMeetingType,
            ATTENDANCE_MEETING_TYPE_VALUES,
            "meetingType"
          ),
          byStatus: createCountMap(summary.byStatus, ["PRESENT", "ABSENT"], "status"),
        },
        pagination: createPaginationPayload({ ...pagination, total }),
        items: items.map(serializeAttendance),
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to load the attendance report.");
    }
  }
);

router.get(
  "/finance",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.FINANCE_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const pagination = parsePagination(req.query);
      const { match } = await buildFinanceMatch(req, req.query);

      const [items, total, summaryRows] = await Promise.all([
        Finance.find(match)
          .populate(FINANCE_POPULATE)
          .sort({ date: -1, createdAt: -1 })
          .skip(pagination.skip)
          .limit(pagination.limit),
        Finance.countDocuments(match),
        Finance.aggregate([
          { $match: match },
          {
            $facet: {
              byTransactionType: [
                {
                  $group: {
                    _id: "$transactionType",
                    totalRecords: { $sum: 1 },
                    totalAmount: { $sum: "$amount" },
                  },
                },
              ],
              byPaymentMethod: [
                {
                  $group: {
                    _id: "$paymentMethod",
                    totalRecords: { $sum: 1 },
                    totalAmount: { $sum: "$amount" },
                  },
                },
              ],
              totals: [
                {
                  $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" },
                  },
                },
              ],
            },
          },
        ]),
      ]);

      const summary = summaryRows[0] || {
        byTransactionType: [],
        byPaymentMethod: [],
        totals: [],
      };

      return res.status(200).json({
        filters: {
          branchId: req.query.branchId || null,
          buscellId: req.query.buscellId || null,
          umid: req.query.umid || null,
          transactionType: req.query.transactionType || null,
          paymentMethod: req.query.paymentMethod || null,
          dateFrom: req.query.dateFrom || null,
          dateTo: req.query.dateTo || null,
        },
        summary: {
          totalRecords: total,
          totalAmount: summary.totals[0]?.totalAmount || 0,
          byTransactionType: FINANCE_TRANSACTION_TYPE_VALUES.map((transactionType) => {
            const row = summary.byTransactionType.find((item) => item._id === transactionType);

            return {
              transactionType,
              totalRecords: row?.totalRecords || 0,
              totalAmount: row?.totalAmount || 0,
            };
          }),
          byPaymentMethod: FINANCE_PAYMENT_METHOD_VALUES.map((paymentMethod) => {
            const row = summary.byPaymentMethod.find((item) => item._id === paymentMethod);

            return {
              paymentMethod,
              totalRecords: row?.totalRecords || 0,
              totalAmount: row?.totalAmount || 0,
            };
          }),
        },
        pagination: createPaginationPayload({ ...pagination, total }),
        items: items.map(serializeFinance),
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to load the finance report.");
    }
  }
);

router.get(
  "/branch-performance",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN]),
  async (req, res) => {
    try {
      const branchId = resolveScopedBranchId(req, req.query.branchId, {
        forbiddenMessage: "You can only access branch performance in your own branch.",
      });
      const branchFilter = branchId ? { _id: toObjectId(branchId) } : {};
      const attendanceMatch = (
        await buildAttendanceMatch(req, {
          ...req.query,
          branchId: branchId || req.query.branchId,
        })
      ).match;
      const financeMatch = (
        await buildFinanceMatch(req, {
          ...req.query,
          branchId: branchId || req.query.branchId,
        })
      ).match;
      const memberMatch = (
        await buildMemberMatch(req, {
          ...req.query,
          branchId: branchId || req.query.branchId,
        })
      ).match;

      const [branches, membersByBranch, attendanceByBranch, financeByBranch] = await Promise.all([
        Branch.find(branchFilter).select("name code").sort({ name: 1 }),
        Member.aggregate([
          { $match: memberMatch },
          {
            $group: {
              _id: "$branchId",
              totalMembers: { $sum: 1 },
              activeMembers: {
                $sum: {
                  $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0],
                },
              },
            },
          },
        ]),
        Attendance.aggregate([
          { $match: attendanceMatch },
          {
            $group: {
              _id: "$branchId",
              totalAttendance: { $sum: 1 },
              presentCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
                },
              },
            },
          },
        ]),
        Finance.aggregate([
          { $match: financeMatch },
          {
            $group: {
              _id: "$branchId",
              totalAmount: { $sum: "$amount" },
              totalRecords: { $sum: 1 },
            },
          },
        ]),
      ]);

      const memberMap = new Map(membersByBranch.map((row) => [row._id.toString(), row]));
      const attendanceMap = new Map(attendanceByBranch.map((row) => [row._id.toString(), row]));
      const financeMap = new Map(financeByBranch.map((row) => [row._id.toString(), row]));
      const items = branches.map((branch) => {
        const memberRow = memberMap.get(branch._id.toString());
        const attendanceRow = attendanceMap.get(branch._id.toString());
        const financeRow = financeMap.get(branch._id.toString());

        return {
          branchId: branch._id.toString(),
          branchName: branch.name,
          branchCode: branch.code,
          totalMembers: memberRow?.totalMembers || 0,
          activeMembers: memberRow?.activeMembers || 0,
          totalAttendance: attendanceRow?.totalAttendance || 0,
          presentCount: attendanceRow?.presentCount || 0,
          totalContributions: financeRow?.totalAmount || 0,
          totalFinanceRecords: financeRow?.totalRecords || 0,
        };
      });

      return res.status(200).json({
        filters: {
          branchId: branchId || null,
          dateFrom: req.query.dateFrom || null,
          dateTo: req.query.dateTo || null,
        },
        items,
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to load the branch performance report.");
    }
  }
);

router.get(
  "/buscell-performance",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const branchId = resolveScopedBranchId(req, req.query.branchId, {
        forbiddenMessage: "You can only access buscell performance in your branch.",
      });
      const { buscellId } = await resolveScopedBuscellId(req, req.query.buscellId, {
        branchId,
        forbiddenMessage: "You can only access buscell performance in your own Ecclesia.",
        branchMismatchMessage: "Selected buscell does not belong to the allowed branch.",
      });
      const buscellFilter = buscellId
        ? { _id: toObjectId(buscellId) }
        : branchId
          ? { branchId: toObjectId(branchId) }
          : {};

      if (req.accessScope?.role === ROLES.ECCLESIA_LEADER) {
        buscellFilter.ecclesiaId = toObjectId(req.accessScope.ecclesiaId);
      }

      const memberMatch = (
        await buildMemberMatch(req, {
          ...req.query,
          branchId: branchId || req.query.branchId,
          buscellId: buscellId || req.query.buscellId,
        })
      ).match;
      const attendanceMatch = (
        await buildAttendanceMatch(req, {
          ...req.query,
          branchId: branchId || req.query.branchId,
          buscellId: buscellId || req.query.buscellId,
        })
      ).match;
      const financeMatch = (
        await buildFinanceMatch(req, {
          ...req.query,
          branchId: branchId || req.query.branchId,
          buscellId: buscellId || req.query.buscellId,
        })
      ).match;

      const [buscells, membersByBuscell, attendanceByBuscell, financeByBuscell] = await Promise.all([
        Buscell.find(buscellFilter).populate({ path: "branchId", select: "name code" }).sort({ name: 1 }),
        Member.aggregate([
          { $match: memberMatch },
          {
            $group: {
              _id: "$buscellId",
              totalMembers: { $sum: 1 },
              activeMembers: {
                $sum: {
                  $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0],
                },
              },
            },
          },
        ]),
        Attendance.aggregate([
          { $match: attendanceMatch },
          {
            $group: {
              _id: "$buscellId",
              totalAttendance: { $sum: 1 },
              presentCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
                },
              },
            },
          },
        ]),
        Finance.aggregate([
          { $match: financeMatch },
          {
            $group: {
              _id: "$buscellId",
              totalAmount: { $sum: "$amount" },
              totalRecords: { $sum: 1 },
            },
          },
        ]),
      ]);

      const memberMap = new Map(
        membersByBuscell.filter((row) => row._id).map((row) => [row._id.toString(), row])
      );
      const attendanceMap = new Map(
        attendanceByBuscell.filter((row) => row._id).map((row) => [row._id.toString(), row])
      );
      const financeMap = new Map(
        financeByBuscell.filter((row) => row._id).map((row) => [row._id.toString(), row])
      );
      const items = buscells.map((buscell) => {
        const memberRow = memberMap.get(buscell._id.toString());
        const attendanceRow = attendanceMap.get(buscell._id.toString());
        const financeRow = financeMap.get(buscell._id.toString());

        return {
          buscellId: buscell._id.toString(),
          buscellName: buscell.name,
          branchId: buscell.branchId?._id?.toString() || null,
          branchName: buscell.branchId?.name || "",
          totalMembers: memberRow?.totalMembers || 0,
          activeMembers: memberRow?.activeMembers || 0,
          totalAttendance: attendanceRow?.totalAttendance || 0,
          presentCount: attendanceRow?.presentCount || 0,
          totalContributions: financeRow?.totalAmount || 0,
          totalFinanceRecords: financeRow?.totalRecords || 0,
        };
      });

      return res.status(200).json({
        filters: {
          branchId: branchId || null,
          buscellId: buscellId || null,
          dateFrom: req.query.dateFrom || null,
          dateTo: req.query.dateTo || null,
        },
        items,
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to load the buscell performance report.");
    }
  }
);

export default router;
