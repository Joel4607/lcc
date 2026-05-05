import { canonicalizeRole } from "../../shared/utils/roleAccess.js";

function getReferenceId(value) {
  if (!value) {
    return null;
  }

  return value?._id ? value._id.toString() : value.toString();
}

export default function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const branch = user.branchId?._id
    ? {
        id: user.branchId._id.toString(),
        name: user.branchId.name,
        code: user.branchId.code,
      }
    : null;

  const buscell = user.buscellId?._id
    ? {
        id: user.buscellId._id.toString(),
        name: user.buscellId.name,
      }
    : null;
  const ecclesia = user.ecclesiaId?._id
    ? {
        id: user.ecclesiaId._id.toString(),
        name: user.ecclesiaId.name,
      }
    : null;

  return {
    id: user._id?.toString(),
    name: user.name,
    email: user.email,
    role: canonicalizeRole(user.role),
    branchId: getReferenceId(user.branchId),
    buscellId: getReferenceId(user.buscellId),
    ecclesiaId: getReferenceId(user.ecclesiaId),
    branch,
    buscell,
    ecclesia,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
