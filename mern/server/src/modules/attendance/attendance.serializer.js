function getReferenceId(value) {
  if (!value) {
    return null;
  }

  return value?._id ? value._id.toString() : value.toString();
}

export default function serializeAttendance(attendance) {
  if (!attendance) {
    return null;
  }

  return {
    id: attendance._id?.toString(),
    umid: attendance.umid,
    memberId: getReferenceId(attendance.memberId),
    branchId: getReferenceId(attendance.branchId),
    buscellId: getReferenceId(attendance.buscellId),
    member: attendance.memberId?._id
      ? {
          id: attendance.memberId._id.toString(),
          fullName: attendance.memberId.fullName,
          umid: attendance.memberId.umid,
          phone: attendance.memberId.phone,
        }
      : null,
    branch: attendance.branchId?._id
      ? {
          id: attendance.branchId._id.toString(),
          name: attendance.branchId.name,
          code: attendance.branchId.code,
        }
      : null,
    buscell: attendance.buscellId?._id
      ? {
          id: attendance.buscellId._id.toString(),
          name: attendance.buscellId.name,
        }
      : null,
    recordedBy: attendance.recordedBy?._id
      ? {
          id: attendance.recordedBy._id.toString(),
          name: attendance.recordedBy.name,
          email: attendance.recordedBy.email,
          role: attendance.recordedBy.role,
        }
      : null,
    date: attendance.date,
    meetingType: attendance.meetingType,
    status: attendance.status,
    eventId: attendance.eventId,
    createdAt: attendance.createdAt,
    updatedAt: attendance.updatedAt,
  };
}
