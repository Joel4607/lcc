export function getReferenceId(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return value.id || value._id || "";
}

export function getBranchLabel(value) {
  if (!value) {
    return "Not assigned";
  }

  if (typeof value === "string") {
    return value;
  }

  return value.name || value.code || value.id || value._id || "Not assigned";
}

export function getBuscellLabel(value) {
  if (!value) {
    return "Not assigned";
  }

  if (typeof value === "string") {
    return value;
  }

  return value.name || value.id || value._id || "Not assigned";
}

export function getEcclesiaLabel(value) {
  if (!value) {
    return "Not assigned";
  }

  if (typeof value === "string") {
    return value;
  }

  return value.name || value.id || value._id || "Not assigned";
}

export function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatCurrency(value) {
  if (typeof value !== "number") {
    return "GHS 0.00";
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatEnumLabel(value) {
  if (!value) {
    return "Not set";
  }

  return value
    .toString()
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
