import mongoose from "mongoose";

const nullableNumber = {
  type: Number,
  default: null,
  min: 0,
};

const buscellRecordSchema = new mongoose.Schema(
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
    sundayAttendance: nullableNumber,
    buscellAttendance: nullableNumber,
    buscellOffering: nullableNumber,
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

buscellRecordSchema.index({ weekId: 1, buscellId: 1 }, { unique: true });
buscellRecordSchema.index({ ecclesiaId: 1, weekId: 1 });
buscellRecordSchema.index({ branchId: 1, weekId: 1 });

const BuscellRecord = mongoose.model("BuscellRecord", buscellRecordSchema);

export default BuscellRecord;
