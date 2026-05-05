import mongoose from "mongoose";

const recordWeekSchema = new mongoose.Schema(
  {
    weekNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    cycleId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

recordWeekSchema.index({ cycleId: 1, weekNumber: 1 }, { unique: true });
recordWeekSchema.index({ startDate: 1, endDate: 1 }, { unique: true });

const RecordWeek = mongoose.model("RecordWeek", recordWeekSchema);

export default RecordWeek;
