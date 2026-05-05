import mongoose from "mongoose";
import {
  ATTENDANCE_MEETING_TYPE_VALUES,
  ATTENDANCE_STATUS_VALUES,
} from "./attendance.constants.js";

const attendanceSchema = new mongoose.Schema(
  {
    umid: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
      immutable: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      index: true,
      immutable: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
      immutable: true,
    },
    buscellId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Buscell",
      default: null,
      index: true,
      immutable: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    meetingType: {
      type: String,
      required: true,
      enum: ATTENDANCE_MEETING_TYPE_VALUES,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ATTENDANCE_STATUS_VALUES,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    eventId: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ branchId: 1, date: -1, meetingType: 1 });
attendanceSchema.index({ buscellId: 1, date: -1 });
attendanceSchema.index({ memberId: 1, date: -1 });
attendanceSchema.index({ branchId: 1, meetingType: 1, date: -1 });
attendanceSchema.index({ branchId: 1, status: 1, date: -1 });
attendanceSchema.index({ buscellId: 1, meetingType: 1, date: -1 });
attendanceSchema.index({ memberId: 1, date: 1, meetingType: 1, eventId: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;
