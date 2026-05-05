import RecordWeek from "./recordWeek.model.js";
import createHttpError from "../../shared/utils/httpError.js";
import { normalizeObjectId } from "../../shared/utils/objectId.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEK_IN_MS = 7 * DAY_IN_MS;
const CYCLE_LENGTH = 5;
const ANCHOR_DATE = new Date("2026-01-05T00:00:00.000Z");

function normalizeDateInput(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createHttpError(400, "Invalid date provided.", "INVALID_DATE");
  }

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getWeekStart(date) {
  const day = date.getUTCDay();
  const difference = day === 0 ? -6 : 1 - day;

  return new Date(date.getTime() + difference * DAY_IN_MS);
}

function getCycleMetadata(date) {
  const weekStart = getWeekStart(date);
  const diffInWeeks = Math.floor((weekStart.getTime() - ANCHOR_DATE.getTime()) / WEEK_IN_MS);
  const cycleIndex = Math.floor(diffInWeeks / CYCLE_LENGTH);
  const weekOffset = ((diffInWeeks % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH;
  const cycleStart = new Date(ANCHOR_DATE.getTime() + cycleIndex * CYCLE_LENGTH * WEEK_IN_MS);
  const cycleId = `CYCLE-${cycleStart.toISOString().slice(0, 10)}`;

  return {
    cycleId,
    cycleStart,
    weekNumber: weekOffset + 1,
    startDate: weekStart,
    endDate: new Date(weekStart.getTime() + 6 * DAY_IN_MS),
  };
}

function buildWeekSequence(referenceDate, limit) {
  const normalizedLimit = Math.max(1, Math.min(Number(limit) || 8, 20));
  const normalizedDate = normalizeDateInput(referenceDate);
  const currentWeekStart = getWeekStart(normalizedDate);

  return Array.from({ length: normalizedLimit }, (_, index) =>
    getCycleMetadata(new Date(currentWeekStart.getTime() - index * WEEK_IN_MS))
  );
}

export async function getOrCreateCurrentRecordWeek(value = new Date()) {
  const date = normalizeDateInput(value);
  const metadata = getCycleMetadata(date);

  let week = await RecordWeek.findOne({
    cycleId: metadata.cycleId,
    weekNumber: metadata.weekNumber,
  });

  if (!week) {
    week = await RecordWeek.create({
      cycleId: metadata.cycleId,
      weekNumber: metadata.weekNumber,
      startDate: metadata.startDate,
      endDate: metadata.endDate,
    });
  }

  return week;
}

export async function resolveRecordWeek({ weekId = null, date = null } = {}) {
  const normalizedWeekId = normalizeObjectId(weekId);

  if (normalizedWeekId) {
    const week = await RecordWeek.findById(normalizedWeekId);

    if (!week) {
      throw createHttpError(404, "Record week not found.", "RECORD_WEEK_NOT_FOUND");
    }

    return week;
  }

  return getOrCreateCurrentRecordWeek(date || new Date());
}

export function getWeekPreview(value = new Date()) {
  return getCycleMetadata(normalizeDateInput(value));
}

export async function ensureRecordWeeksWindow({ referenceDate = new Date(), limit = 8 } = {}) {
  const previews = buildWeekSequence(referenceDate, limit);

  await RecordWeek.bulkWrite(
    previews.map((preview) => ({
      updateOne: {
        filter: {
          cycleId: preview.cycleId,
          weekNumber: preview.weekNumber,
        },
        update: {
          $setOnInsert: {
            cycleId: preview.cycleId,
            weekNumber: preview.weekNumber,
            startDate: preview.startDate,
            endDate: preview.endDate,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  const recordWeeks = await RecordWeek.find({
    $or: previews.map((preview) => ({
      cycleId: preview.cycleId,
      weekNumber: preview.weekNumber,
    })),
  }).sort({ startDate: -1 });

  return recordWeeks;
}
