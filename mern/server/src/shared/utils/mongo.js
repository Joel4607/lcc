export function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

export function getDuplicateField(error) {
  return Object.keys(error?.keyPattern || error?.keyValue || {})[0] || "value";
}
