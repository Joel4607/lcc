import Counter from "../users/counter.model.js";

export default async function generateTransactionId() {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const counterKey = `TXN:${currentYear}`;
  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { sequence: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  const serial = String(counter.sequence).padStart(6, "0");

  return `TXN-${currentYear}-${serial}`;
}
