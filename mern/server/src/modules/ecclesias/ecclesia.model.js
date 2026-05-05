import mongoose from "mongoose";

const ecclesiaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    leaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ecclesiaSchema.index({ branchId: 1, name: 1 }, { unique: true });
ecclesiaSchema.index(
  { leaderId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      leaderId: { $type: "objectId" },
    },
  }
);

const Ecclesia = mongoose.model("Ecclesia", ecclesiaSchema);

export default Ecclesia;
