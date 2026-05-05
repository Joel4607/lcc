function getReferenceId(value) {
  if (!value) {
    return null;
  }

  return value?._id ? value._id.toString() : value.toString();
}

export default function serializeMember(member) {
  if (!member) {
    return null;
  }

  return {
    id: member._id?.toString(),
    firstName: member.firstName,
    lastName: member.lastName,
    fullName: member.fullName,
    phone: member.phone,
    email: member.email,
    gender: member.gender,
    address: member.address || "",
    dateOfBirth: member.dateOfBirth,
    maritalStatus: member.maritalStatus,
    joinDate: member.joinDate,
    familyGroup: member.familyGroup || "",
    ministryGroups: member.ministryGroups || [],
    branchId: getReferenceId(member.branchId),
    ecclesiaId: getReferenceId(member.ecclesiaId),
    buscellId: getReferenceId(member.buscellId),
    branch: member.branchId?._id
      ? {
          id: member.branchId._id.toString(),
          name: member.branchId.name,
          code: member.branchId.code,
        }
      : null,
    ecclesia: member.ecclesiaId?._id
      ? {
          id: member.ecclesiaId._id.toString(),
          name: member.ecclesiaId.name,
          branchId: getReferenceId(member.ecclesiaId.branchId),
        }
      : null,
    buscell: member.buscellId?._id
      ? {
          id: member.buscellId._id.toString(),
          name: member.buscellId.name,
          branchId: getReferenceId(member.buscellId.branchId),
          ecclesiaId: getReferenceId(member.buscellId.ecclesiaId),
        }
      : null,
    branchName: member.branchId?._id ? member.branchId.name : "",
    ecclesiaName: member.ecclesiaId?._id ? member.ecclesiaId.name : "",
    buscellName: member.buscellId?._id ? member.buscellId.name : "",
    umid: member.umid,
    status: member.status,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}
