function getReferenceId(value) {
  if (!value) {
    return null;
  }

  return value?._id ? value._id.toString() : value.toString();
}

export default function serializeBuscell(buscell) {
  if (!buscell) {
    return null;
  }

  return {
    id: buscell._id?.toString(),
    name: buscell.name,
    branchId: getReferenceId(buscell.branchId),
    ecclesiaId: getReferenceId(buscell.ecclesiaId),
    branch: buscell.branchId?._id
      ? {
          id: buscell.branchId._id.toString(),
          name: buscell.branchId.name,
          code: buscell.branchId.code,
        }
      : null,
    ecclesia: buscell.ecclesiaId?._id
      ? {
          id: buscell.ecclesiaId._id.toString(),
          name: buscell.ecclesiaId.name,
          leader: buscell.ecclesiaId.leaderId?._id
            ? {
                id: buscell.ecclesiaId.leaderId._id.toString(),
                name: buscell.ecclesiaId.leaderId.name,
                email: buscell.ecclesiaId.leaderId.email,
                role: buscell.ecclesiaId.leaderId.role,
              }
            : null,
        }
      : null,
    meetingDay: buscell.meetingDay || "",
    description: buscell.description || "",
    createdAt: buscell.createdAt,
    updatedAt: buscell.updatedAt,
  };
}
