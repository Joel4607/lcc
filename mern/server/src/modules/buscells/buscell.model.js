import mongoose from "mongoose";

const buscellSchema = new mongoose.Schema(
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
    ecclesiaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ecclesia",
      required: true,
      index: true,
    },
    meetingDay: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

buscellSchema.index({ branchId: 1, ecclesiaId: 1, name: 1 }, { unique: true });

const Buscell = mongoose.model("Buscell", buscellSchema);

export default Buscell;
