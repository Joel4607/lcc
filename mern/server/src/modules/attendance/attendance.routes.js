import express from "express";
import {
  ATTENDANCE_MEETING_TYPE_VALUES,
  ATTENDANCE_STATUS_VALUES,
} from "./attendance.constants.js";
import { ROLES } from "../../shared/constants/roles.js";
import { applyBranchIsolation } from "../../shared/middleware/branchIsolation.js";
import { requireRole, verifyToken } from "../../shared/middleware/auth.js";
import Attendance from "./attendance.model.js";
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
import serializeAttendance from "./attendance.serializer.js";

const router = express.Router();

const ATTENDANCE_POPULATE = [
  { path: "memberId", select: "fullName umid phone" },
  { path: "branchId", select: "name code" },
  { path: "buscellId", select: "name" },
  { path: "recordedBy", select: "name email role" },
];

router.use(verifyToken, applyBranchIsolation);

function hasOwnProperty(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function normalizeMeetingType(value) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (!ATTENDANCE_MEETING_TYPE_VALUES.includes(normalized)) {
    throw createHttpError(400, "meetingType is invalid.");
  }

  return normalized;
}

function normalizeAttendanceStatus(value) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (!ATTENDANCE_STATUS_VALUES.includes(normalized)) {
    throw createHttpError(400, "status is invalid.");
  }

  return normalized;
}

function normalizeEventId(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

async function buildAttendanceFilter(req) {
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
      throw createHttpError(403, "You can only access attendance records in your branch.");
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
          throw createHttpError(403, "You can only access attendance records in your Ecclesia.");
        }

        filter.buscellId = buscellId;
      }
    } else if (buscellId) {
      filter.buscellId = buscellId;
    }
  }

  if (hasOwnProperty(req.query, "meetingType") && req.query.meetingType) {
    filter.meetingType = normalizeMeetingType(req.query.meetingType);
  }

  if (hasOwnProperty(req.query, "status") && req.query.status) {
    filter.status = normalizeAttendanceStatus(req.query.status);
  }

  return {
    ...filter,
    ...buildDateRangeFilter("date", req.query),
  };
}

async function assertAttendanceRecordAccess(req, attendance) {
  if (req.accessScope?.role === ROLES.ECCLESIA_LEADER) {
    const allowedBuscellIds = await getScopedEcclesiaBuscellIdStrings(req);

    if (!attendance.buscellId || !allowedBuscellIds.includes(attendance.buscellId.toString())) {
      throw createHttpError(403, "You can only manage attendance records in your Ecclesia.");
    }

    return true;
  }

  assertMemberWithinScope(
    req,
    {
      branchId: attendance.branchId,
      buscellId: attendance.buscellId,
    },
    {
      ecclesiaLeaderOwnBuscellOnly: false,
      branchMessage: "You can only manage attendance records in your branch.",
      ecclesiaMessage: "You can only manage attendance records in your Ecclesia.",
      buscellMessage: "You can only manage attendance records for your own buscell.",
    }
  );
}

async function saveAttendanceRecords(req, payload) {
  const date = normalizeDateOnly(payload.date);
  const meetingType = normalizeMeetingType(payload.meetingType);
  const eventId = normalizeEventId(payload.eventId);
  const records = Array.isArray(payload.records) ? payload.records : [];

  if (!records.length) {
    throw createHttpError(400, "records must contain at least one attendance entry.");
  }

  const normalizedRecords = records.map((record, index) => {
    const umid = normalizeUmid(record.umid);
    const status = normalizeAttendanceStatus(record.status);

    if (!umid) {
      throw createHttpError(400, `Record ${index + 1} is missing a valid umid.`);
    }

    return {
      umid,
      status,
    };
  });

  const uniqueUmids = [...new Set(normalizedRecords.map((record) => record.umid))];

  if (uniqueUmids.length !== normalizedRecords.length) {
    throw createHttpError(400, "Each UMID can only appear once per batch request.");
  }

  const members = await Member.find({ umid: { $in: uniqueUmids } }).select(
    "umid branchId ecclesiaId buscellId fullName"
  );

  if (members.length !== uniqueUmids.length) {
    const foundUmids = new Set(members.map((member) => member.umid));
    const missingUmids = uniqueUmids.filter((umid) => !foundUmids.has(umid));
    throw createHttpError(404, `Members not found for UMIDs: ${missingUmids.join(", ")}.`);
  }

  const membersByUmid = new Map(members.map((member) => [member.umid, member]));

  normalizedRecords.forEach((record) => {
    const member = membersByUmid.get(record.umid);
    assertMemberWithinScope(req, member, {
      ecclesiaLeaderOwnBuscellOnly: false,
      branchMessage: "You can only record attendance for members in your branch.",
      ecclesiaMessage: "You can only record attendance for members in your Ecclesia.",
      buscellMessage: "You can only record attendance for members in your own buscell.",
    });
  });

  await Attendance.bulkWrite(
    normalizedRecords.map((record) => {
      const member = membersByUmid.get(record.umid);

      return {
        updateOne: {
          filter: {
            memberId: member._id,
            date,
            meetingType,
            eventId,
          },
          update: {
            $set: {
              date,
              meetingType,
              status: record.status,
              eventId,
            },
            $setOnInsert: {
              umid: member.umid,
              memberId: member._id,
              branchId: member.branchId,
              buscellId: member.buscellId || null,
              recordedBy: req.user._id,
            },
          },
          upsert: true,
        },
      };
    })
  );

  const savedRecords = await Attendance.find({
    memberId: { $in: members.map((member) => member._id) },
    date,
    meetingType,
    eventId,
  })
    .populate(ATTENDANCE_POPULATE)
    .sort({ date: -1, createdAt: -1 });

  logger.info("Attendance submitted", {
    actorUserId: req.user._id?.toString(),
    actorRole: req.user.role,
    branchId: req.accessScope?.branchId || null,
    buscellId: req.accessScope?.buscellId || null,
    meetingType,
    date: date.toISOString(),
    totalRecords: savedRecords.length,
  });

  return savedRecords;
}

router.get("/", requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]), async (req, res) => {
  try {
    const records = await Attendance.find(await buildAttendanceFilter(req))
      .populate(ATTENDANCE_POPULATE)
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json(records.map(serializeAttendance));
  } catch (error) {
    return respondWithError(res, error, "Unable to fetch attendance records.");
  }
});

router.get(
  "/member/:umid",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]),
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
        branchMessage: "You can only view attendance history in your branch.",
        ecclesiaMessage: "You can only view attendance history in your Ecclesia.",
        buscellMessage: "You can only view attendance history for your own buscell.",
      });

      const records = await Attendance.find({
        ...(await buildAttendanceFilter(req)),
        umid,
      })
        .populate(ATTENDANCE_POPULATE)
        .sort({ date: -1, createdAt: -1 });

      return res.status(200).json(records.map(serializeAttendance));
    } catch (error) {
      return respondWithError(res, error, "Unable to fetch member attendance history.");
    }
  }
);

router.post("/", requireRole([ROLES.ECCLESIA_LEADER]), async (req, res) => {
  try {
    const savedRecords = await saveAttendanceRecords(req, {
      date: req.body.date,
      meetingType: req.body.meetingType,
      eventId: req.body.eventId,
      records: [
        {
          umid: req.body.umid,
          status: req.body.status,
        },
      ],
    });

    return res.status(201).json({
      message: "Attendance recorded successfully.",
      attendance: serializeAttendance(savedRecords[0]),
    });
  } catch (error) {
    return respondWithError(res, error, "Unable to record attendance.");
  }
});

router.post(
  "/batch",
  requireRole([ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const savedRecords = await saveAttendanceRecords(req, req.body);

      return res.status(201).json({
        message: "Attendance batch submitted successfully.",
        attendance: savedRecords.map(serializeAttendance),
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to submit attendance batch.");
    }
  }
);

router.put("/:id", requireRole([ROLES.ECCLESIA_LEADER]), async (req, res) => {
  try {
    const attendanceId = normalizeObjectId(req.params.id);

    if (!attendanceId) {
      return res.status(400).json({ message: "Invalid attendance id." });
    }

    const attendance = await Attendance.findById(attendanceId);

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found." });
    }

    await assertAttendanceRecordAccess(req, attendance);

    if (hasOwnProperty(req.body, "date")) {
      attendance.date = normalizeDateOnly(req.body.date);
    }

    if (hasOwnProperty(req.body, "meetingType")) {
      attendance.meetingType = normalizeMeetingType(req.body.meetingType);
    }

    if (hasOwnProperty(req.body, "status")) {
      attendance.status = normalizeAttendanceStatus(req.body.status);
    }

    if (hasOwnProperty(req.body, "eventId")) {
      attendance.eventId = normalizeEventId(req.body.eventId);
    }

    await attendance.save();

    const updatedAttendance = await Attendance.findById(attendanceId).populate(ATTENDANCE_POPULATE);

    return res.status(200).json({
      message: "Attendance record updated successfully.",
      attendance: serializeAttendance(updatedAttendance),
    });
  } catch (error) {
    return respondWithError(res, error, "Unable to update attendance record.");
  }
});

router.delete(
  "/:id",
  requireRole([ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const attendanceId = normalizeObjectId(req.params.id);

      if (!attendanceId) {
        return res.status(400).json({ message: "Invalid attendance id." });
      }

      const attendance = await Attendance.findById(attendanceId);

      if (!attendance) {
        return res.status(404).json({ message: "Attendance record not found." });
      }

      await assertAttendanceRecordAccess(req, attendance);

      await Attendance.findByIdAndDelete(attendanceId);

      return res.status(200).json({ message: "Attendance record deleted successfully." });
    } catch (error) {
      return respondWithError(res, error, "Unable to delete attendance record.");
    }
  }
);

export default router;
