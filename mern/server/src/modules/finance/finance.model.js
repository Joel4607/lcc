import mongoose from "mongoose";
import {
  FINANCE_PAYMENT_METHOD_VALUES,
  FINANCE_TRANSACTION_TYPE_VALUES,
} from "./finance.constants.js";

const financeSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
      immutable: true,
    },
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
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    transactionType: {
      type: String,
      required: true,
      enum: FINANCE_TRANSACTION_TYPE_VALUES,
      index: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: FINANCE_PAYMENT_METHOD_VALUES,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
  },
  {
    timestamps: true,
  }
);

financeSchema.index({ branchId: 1, date: -1 });
financeSchema.index({ buscellId: 1, date: -1 });
financeSchema.index({ umid: 1, date: -1 });
financeSchema.index({ branchId: 1, transactionType: 1, date: -1 });
financeSchema.index({ branchId: 1, paymentMethod: 1, date: -1 });
financeSchema.index({ buscellId: 1, transactionType: 1, date: -1 });

const Finance = mongoose.model("Finance", financeSchema);

export default Finance;
