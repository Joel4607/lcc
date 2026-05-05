import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    sequence: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Counter = mongoose.model("Counter", counterSchema);

export default Counter;
