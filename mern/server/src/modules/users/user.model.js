import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { ROLE_VALUES, ROLES } from "../../shared/constants/roles.js";
import { canonicalizeRole } from "../../shared/utils/roleAccess.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ROLE_VALUES,
      default: ROLES.ECCLESIA_LEADER,
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },
    buscellId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Buscell",
      default: null,
    },
    ecclesiaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ecclesia",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ role: 1, branchId: 1 });
userSchema.index({ role: 1, ecclesiaId: 1 });

userSchema.pre("validate", function normalizeLegacyRole(next) {
  this.role = canonicalizeRole(this.role);
  return next();
});

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
