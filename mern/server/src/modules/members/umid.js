import Branch from "../branches/branch.model.js";
import Counter from "../users/counter.model.js";
import createHttpError from "../../shared/utils/httpError.js";

export default async function generateUmid(branchId) {
  const branch = await Branch.findById(branchId).select("code");

  if (!branch) {
    throw createHttpError(404, "Branch not found.");
  }

  const currentYear = new Date().getFullYear().toString().slice(-2);
  const counterKey = `UMID:${branch.code}:${currentYear}`;
  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { sequence: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  const serial = String(counter.sequence).padStart(4, "0");

  return `${branch.code}-${currentYear}-${serial}`;
}
