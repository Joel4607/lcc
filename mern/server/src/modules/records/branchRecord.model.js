import mongoose from "mongoose";

const nullableNumber = {
  type: Number,
  default: null,
  min: 0,
};

const branchRecordSchema = new mongoose.Schema(
  {
    weekId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecordWeek",
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    totalSundayOffering: nullableNumber,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

branchRecordSchema.index({ weekId: 1, branchId: 1 }, { unique: true });

const BranchRecord = mongoose.model("BranchRecord", branchRecordSchema);

export default BranchRecord;
