import createHttpError from "./httpError.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UMID_PATTERN = /^[A-Z0-9]+-\d{2}-\d{4}$/;

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(value);
}

export function assertValidEmail(value, fieldName = "email") {
  if (!isValidEmail(value)) {
    throw createHttpError(400, `${fieldName} must be a valid email address.`, "INVALID_EMAIL");
  }
}

export function isStrongPassword(value) {
  return (
    typeof value === "string" &&
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

export function assertStrongPassword(value) {
  if (!isStrongPassword(value)) {
    throw createHttpError(
      400,
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      "WEAK_PASSWORD"
    );
  }
}

export function isValidUmid(value) {
  return UMID_PATTERN.test(value);
}

export function assertValidUmid(value, fieldName = "umid") {
  if (!isValidUmid(value)) {
    throw createHttpError(400, `${fieldName} is invalid.`, "INVALID_UMID");
  }
}

export function assertPositiveAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw createHttpError(400, "amount must be greater than 0.", "INVALID_AMOUNT");
  }

  return amount;
}

export function assertRequiredString(value, fieldName) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw createHttpError(400, `${fieldName} is required.`, "REQUIRED_FIELD");
  }

  return normalized;
}
