import mongoose from "mongoose";

export function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function toComparableId(value) {
  if (!value) {
    return null;
  }

  if (value?._id) {
    return value._id.toString();
  }

  return value.toString();
}

export function normalizeObjectId(value) {
  if (!value) {
    return null;
  }

  return isValidObjectId(value) ? value.toString() : null;
}

export function idsMatch(left, right) {
  const comparableLeft = toComparableId(left);
  const comparableRight = toComparableId(right);

  if (!comparableLeft || !comparableRight) {
    return false;
  }

  return comparableLeft === comparableRight;
}
