function getReferenceId(value) {
  if (!value) {
    return null;
  }

  return value?._id ? value._id.toString() : value.toString();
}

export default function serializeBuscellRecord(record) {
  if (!record) {
    return null;
  }

  return {
    id: record._id?.toString(),
    weekId: getReferenceId(record.weekId),
    branchId: getReferenceId(record.branchId),
    ecclesiaId: getReferenceId(record.ecclesiaId),
    buscellId: getReferenceId(record.buscellId),
    week: record.weekId?._id
      ? {
          id: record.weekId._id.toString(),
          weekNumber: record.weekId.weekNumber,
          startDate: record.weekId.startDate,
          endDate: record.weekId.endDate,
          cycleId: record.weekId.cycleId,
        }
      : null,
    branch: record.branchId?._id
      ? {
          id: record.branchId._id.toString(),
          name: record.branchId.name,
          code: record.branchId.code,
        }
      : null,
    ecclesia: record.ecclesiaId?._id
      ? {
          id: record.ecclesiaId._id.toString(),
          name: record.ecclesiaId.name,
        }
      : null,
    buscell: record.buscellId?._id
      ? {
          id: record.buscellId._id.toString(),
          name: record.buscellId.name,
        }
      : null,
    recordedBy: record.recordedBy?._id
      ? {
          id: record.recordedBy._id.toString(),
          name: record.recordedBy.name,
          email: record.recordedBy.email,
          role: record.recordedBy.role,
        }
      : null,
    sundayAttendance: record.sundayAttendance,
    buscellAttendance: record.buscellAttendance,
    buscellOffering: record.buscellOffering,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
