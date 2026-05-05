function getReferenceId(value) {
  if (!value) {
    return null;
  }

  return value?._id ? value._id.toString() : value.toString();
}

export default function serializeFinance(finance) {
  if (!finance) {
    return null;
  }

  return {
    id: finance._id?.toString(),
    transactionId: finance.transactionId,
    umid: finance.umid,
    memberId: getReferenceId(finance.memberId),
    branchId: getReferenceId(finance.branchId),
    buscellId: getReferenceId(finance.buscellId),
    member: finance.memberId?._id
      ? {
          id: finance.memberId._id.toString(),
          fullName: finance.memberId.fullName,
          umid: finance.memberId.umid,
          phone: finance.memberId.phone,
        }
      : null,
    branch: finance.branchId?._id
      ? {
          id: finance.branchId._id.toString(),
          name: finance.branchId.name,
          code: finance.branchId.code,
        }
      : null,
    buscell: finance.buscellId?._id
      ? {
          id: finance.buscellId._id.toString(),
          name: finance.buscellId.name,
        }
      : null,
    recordedBy: finance.recordedBy?._id
      ? {
          id: finance.recordedBy._id.toString(),
          name: finance.recordedBy.name,
          email: finance.recordedBy.email,
          role: finance.recordedBy.role,
        }
      : null,
    amount: finance.amount,
    transactionType: finance.transactionType,
    paymentMethod: finance.paymentMethod,
    date: finance.date,
    notes: finance.notes || "",
    createdAt: finance.createdAt,
    updatedAt: finance.updatedAt,
  };
}
