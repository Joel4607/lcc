import mongoose from "mongoose";

import { MEMBER_STATUS_VALUES, MemberStatuses } from "./memberStatus.constants.js";

const memberSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    gender: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
      enum: ["MALE", "FEMALE", "OTHER", null],
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    maritalStatus: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
      enum: ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "SEPARATED", null],
    },
    joinDate: {
      type: Date,
      required: true,
    },
    familyGroup: {
      type: String,
      default: "",
      trim: true,
    },
    ministryGroups: {
      type: [String],
      default: [],
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    ecclesiaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ecclesia",
      required: true,
      index: true,
    },
    buscellId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Buscell",
      required: true,
      index: true,
    },
    umid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    status: {
      type: String,
      default: MemberStatuses.ACTIVE,
      enum: MEMBER_STATUS_VALUES,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

memberSchema.pre("validate", function setFullName(next) {
  const firstName = typeof this.firstName === "string" ? this.firstName.trim() : "";
  const lastName = typeof this.lastName === "string" ? this.lastName.trim() : "";

  this.firstName = firstName;
  this.lastName = lastName;
  this.fullName = `${firstName} ${lastName}`.trim();
  this.ministryGroups = (this.ministryGroups || [])
    .map((group) => (typeof group === "string" ? group.trim() : ""))
    .filter(Boolean);

  return next();
});

memberSchema.index({ branchId: 1, status: 1 });
memberSchema.index({ branchId: 1, ecclesiaId: 1 });
memberSchema.index({ branchId: 1, buscellId: 1 });
memberSchema.index({ ecclesiaId: 1, buscellId: 1 });
memberSchema.index({ branchId: 1, joinDate: -1 });
memberSchema.index({ ecclesiaId: 1, status: 1 });
memberSchema.index({ buscellId: 1, status: 1 });

const Member = mongoose.model("Member", memberSchema);

export default Member;
