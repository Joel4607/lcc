import createHttpError from "./httpError.js";

export function normalizeDateOnly(value, fieldName = "date") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createHttpError(400, `${fieldName} is invalid.`);
  }

  date.setUTCHours(0, 0, 0, 0);

  return date;
}

export function buildDateRangeFilter(fieldName, { dateFrom, dateTo }) {
  const range = {};

  if (dateFrom) {
    range.$gte = normalizeDateOnly(dateFrom, "dateFrom");
  }

  if (dateTo) {
    range.$lte = normalizeDateOnly(dateTo, "dateTo");
  }

  if (!Object.keys(range).length) {
    return {};
  }

  return {
    [fieldName]: range,
  };
}
