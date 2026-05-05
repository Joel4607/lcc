export default function serializeBranch(branch) {
  if (!branch) {
    return null;
  }

  return {
    id: branch._id?.toString(),
    name: branch.name,
    code: branch.code,
    address: branch.address || "",
    phone: branch.phone || "",
    createdAt: branch.createdAt,
    updatedAt: branch.updatedAt,
  };
}
