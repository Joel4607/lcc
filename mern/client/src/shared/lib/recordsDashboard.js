import { formatDate } from "./data";

export const emptyBuscellRecordForm = Object.freeze({
  sundayAttendance: "",
  buscellAttendance: "",
  buscellOffering: "",
});

export function weekLabel(week) {
  if (!week) {
    return "Select week";
  }

  return `Week ${week.weekNumber} - ${formatDate(week.startDate)} to ${formatDate(week.endDate)}`;
}

export function displayMetric(value, formatter = (item) => item) {
  return value === null || value === undefined ? "N/A" : formatter(value);
}

export function toValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

export function toNumberOrNull(value) {
  return value === "" ? null : Number(value);
}
