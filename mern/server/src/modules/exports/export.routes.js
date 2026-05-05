import express from "express";
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
  resolveScopedBranchId,
  resolveScopedBuscellId,
  toObjectId,
} from "../dashboard/dashboard.analytics.js";
import { formatCsvDate, sendCsv } from "../../shared/utils/csv.js";
import respondWithError from "../../shared/utils/respondWithError.js";

const router = express.Router();

router.use(verifyToken, applyBranchIsolation);

function getRecordedByName(value) {
  return value?.name || "";
}

function getMemberName(value, fallback = "") {
  return value?.fullName || fallback;
}

function getBranchName(value) {
  return value?.name || "";
}

function getBuscellName(value) {
  return value?.name || "";
}

router.get(
  "/members",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const { match } = await buildMemberMatch(req, req.query, {
        allowSearch: true,
        dateField: "joinDate",
      });
      const rows = await Member.find(match)
        .populate([
          { path: "branchId", select: "name code" },
          { path: "buscellId", select: "name branchId" },
        ])
        .sort({ fullName: 1 });

      return sendCsv(res, {
        filename: "members-export.csv",
        columns: [
          { header: "UMID", value: (row) => row.umid },
          { header: "First Name", value: (row) => row.firstName },
          { header: "Last Name", value: (row) => row.lastName },
          { header: "Full Name", value: (row) => row.fullName },
          { header: "Phone", value: (row) => row.phone },
          { header: "Email", value: (row) => row.email || "" },
          { header: "Gender", value: (row) => row.gender },
          { header: "Branch", value: (row) => getBranchName(row.branchId) },
          { header: "Buscell", value: (row) => getBuscellName(row.buscellId) },
          { header: "Status", value: (row) => row.status },
          { header: "Join Date", value: (row) => formatCsvDate(row.joinDate) },
        ],
        rows,
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to export members.");
    }
  }
);

router.get(
  "/attendance",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const { match } = await buildAttendanceMatch(req, req.query);
      const rows = await Attendance.find(match)
        .populate([
          { path: "memberId", select: "fullName umid phone" },
          { path: "branchId", select: "name code" },
          { path: "buscellId", select: "name" },
          { path: "recordedBy", select: "name email role" },
        ])
        .sort({ date: -1, createdAt: -1 });

      return sendCsv(res, {
        filename: "attendance-export.csv",
        columns: [
          { header: "UMID", value: (row) => row.umid },
          { header: "Member Name", value: (row) => getMemberName(row.memberId, row.umid) },
          { header: "Branch", value: (row) => getBranchName(row.branchId) },
          { header: "Buscell", value: (row) => getBuscellName(row.buscellId) },
          { header: "Date", value: (row) => formatCsvDate(row.date) },
          { header: "Meeting Type", value: (row) => row.meetingType },
          { header: "Status", value: (row) => row.status },
          { header: "Recorded By", value: (row) => getRecordedByName(row.recordedBy) },
        ],
        rows,
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to export attendance.");
    }
  }
);

router.get(
  "/finance",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.FINANCE_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const { match } = await buildFinanceMatch(req, req.query);
      const rows = await Finance.find(match)
        .populate([
          { path: "memberId", select: "fullName umid phone" },
          { path: "branchId", select: "name code" },
          { path: "buscellId", select: "name" },
          { path: "recordedBy", select: "name email role" },
        ])
        .sort({ date: -1, createdAt: -1 });

      return sendCsv(res, {
        filename: "finance-export.csv",
        columns: [
          { header: "Transaction ID", value: (row) => row.transactionId },
          { header: "UMID", value: (row) => row.umid },
          { header: "Member Name", value: (row) => getMemberName(row.memberId, row.umid) },
          { header: "Branch", value: (row) => getBranchName(row.branchId) },
          { header: "Buscell", value: (row) => getBuscellName(row.buscellId) },
          { header: "Amount", value: (row) => row.amount },
          { header: "Transaction Type", value: (row) => row.transactionType },
          { header: "Payment Method", value: (row) => row.paymentMethod },
          { header: "Date", value: (row) => formatCsvDate(row.date) },
          { header: "Recorded By", value: (row) => getRecordedByName(row.recordedBy) },
          { header: "Notes", value: (row) => row.notes || "" },
        ],
        rows,
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to export finance records.");
    }
  }
);

router.get(
  "/branch-summary",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN]),
  async (req, res) => {
    try {
      const branchId = resolveScopedBranchId(req, req.query.branchId, {
        forbiddenMessage: "You can only export branch summaries in your own branch.",
      });
      const branchFilter = branchId ? { _id: toObjectId(branchId) } : {};
      const memberMatch = (
        await buildMemberMatch(req, {
          ...req.query,
          branchId: branchId || req.query.branchId,
        })
      ).match;
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
              totalContributions: { $sum: "$amount" },
              totalFinanceRecords: { $sum: 1 },
            },
          },
        ]),
      ]);

      const memberMap = new Map(membersByBranch.map((row) => [row._id.toString(), row]));
      const attendanceMap = new Map(attendanceByBranch.map((row) => [row._id.toString(), row]));
      const financeMap = new Map(financeByBranch.map((row) => [row._id.toString(), row]));
      const rows = branches.map((branch) => {
        const memberRow = memberMap.get(branch._id.toString());
        const attendanceRow = attendanceMap.get(branch._id.toString());
        const financeRow = financeMap.get(branch._id.toString());

        return {
          branchCode: branch.code,
          branchName: branch.name,
          totalMembers: memberRow?.totalMembers || 0,
          activeMembers: memberRow?.activeMembers || 0,
          totalAttendance: attendanceRow?.totalAttendance || 0,
          presentCount: attendanceRow?.presentCount || 0,
          totalContributions: financeRow?.totalContributions || 0,
          totalFinanceRecords: financeRow?.totalFinanceRecords || 0,
        };
      });

      return sendCsv(res, {
        filename: "branch-summary-export.csv",
        columns: [
          { header: "Branch Code", value: (row) => row.branchCode },
          { header: "Branch Name", value: (row) => row.branchName },
          { header: "Total Members", value: (row) => row.totalMembers },
          { header: "Active Members", value: (row) => row.activeMembers },
          { header: "Attendance Records", value: (row) => row.totalAttendance },
          { header: "Present Count", value: (row) => row.presentCount },
          { header: "Contribution Total", value: (row) => row.totalContributions },
          { header: "Finance Records", value: (row) => row.totalFinanceRecords },
        ],
        rows,
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to export branch summaries.");
    }
  }
);

router.get(
  "/buscell-summary",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const branchId = resolveScopedBranchId(req, req.query.branchId, {
        forbiddenMessage: "You can only export buscell summaries in your branch.",
      });
      const { buscellId } = await resolveScopedBuscellId(req, req.query.buscellId, {
        branchId,
        forbiddenMessage: "You can only export buscell summaries in your own Ecclesia.",
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
              totalContributions: { $sum: "$amount" },
              totalFinanceRecords: { $sum: 1 },
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
      const rows = buscells.map((buscell) => {
        const memberRow = memberMap.get(buscell._id.toString());
        const attendanceRow = attendanceMap.get(buscell._id.toString());
        const financeRow = financeMap.get(buscell._id.toString());

        return {
          branchName: buscell.branchId?.name || "",
          buscellName: buscell.name,
          totalMembers: memberRow?.totalMembers || 0,
          activeMembers: memberRow?.activeMembers || 0,
          totalAttendance: attendanceRow?.totalAttendance || 0,
          presentCount: attendanceRow?.presentCount || 0,
          totalContributions: financeRow?.totalContributions || 0,
          totalFinanceRecords: financeRow?.totalFinanceRecords || 0,
        };
      });

      return sendCsv(res, {
        filename: "buscell-summary-export.csv",
        columns: [
          { header: "Branch", value: (row) => row.branchName },
          { header: "Buscell", value: (row) => row.buscellName },
          { header: "Total Members", value: (row) => row.totalMembers },
          { header: "Active Members", value: (row) => row.activeMembers },
          { header: "Attendance Records", value: (row) => row.totalAttendance },
          { header: "Present Count", value: (row) => row.presentCount },
          { header: "Contribution Total", value: (row) => row.totalContributions },
          { header: "Finance Records", value: (row) => row.totalFinanceRecords },
        ],
        rows,
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to export buscell summaries.");
    }
  }
);

export default router;
