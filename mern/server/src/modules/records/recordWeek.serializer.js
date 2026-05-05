export default function serializeRecordWeek(week) {
  if (!week) {
    return null;
  }

  return {
    id: week._id?.toString(),
    weekNumber: week.weekNumber,
    startDate: week.startDate,
    endDate: week.endDate,
    cycleId: week.cycleId,
    createdAt: week.createdAt,
    updatedAt: week.updatedAt,
  };
}
