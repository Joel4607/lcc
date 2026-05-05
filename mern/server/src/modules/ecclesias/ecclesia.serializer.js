function getReferenceId(value) {
  if (!value) {
    return null;
  }

  return value?._id ? value._id.toString() : value.toString();
}

export default function serializeEcclesia(ecclesia) {
  if (!ecclesia) {
    return null;
  }

  return {
    id: ecclesia._id?.toString(),
    name: ecclesia.name,
    branchId: getReferenceId(ecclesia.branchId),
    leaderId: getReferenceId(ecclesia.leaderId),
    branch: ecclesia.branchId?._id
      ? {
          id: ecclesia.branchId._id.toString(),
          name: ecclesia.branchId.name,
          code: ecclesia.branchId.code,
        }
      : null,
    leader: ecclesia.leaderId?._id
      ? {
          id: ecclesia.leaderId._id.toString(),
          name: ecclesia.leaderId.name,
          email: ecclesia.leaderId.email,
          role: ecclesia.leaderId.role,
        }
      : null,
    createdAt: ecclesia.createdAt,
    updatedAt: ecclesia.updatedAt,
  };
}
