import mongoose from "mongoose";
import { getDuplicateField, isDuplicateKeyError } from "./mongo.js";

function getStatusCode(error) {
  if (error?.statusCode) {
    return error.statusCode;
  }

  if (isDuplicateKeyError(error)) {
    return 409;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return 400;
  }

  if (error instanceof mongoose.Error.CastError) {
    return 400;
  }

  return 500;
}

function getErrorCode(error, statusCode) {
  if (error?.errorCode) {
    return error.errorCode;
  }

  if (isDuplicateKeyError(error)) {
    return "DUPLICATE_VALUE";
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return "VALIDATION_ERROR";
  }

  if (statusCode === 401) {
    return "UNAUTHORIZED";
  }

  if (statusCode === 400) {
    return "BAD_REQUEST";
  }

  if (statusCode === 403) {
    return "FORBIDDEN";
  }

  if (statusCode === 404) {
    return "NOT_FOUND";
  }

  if (statusCode === 409) {
    return "CONFLICT";
  }

  if (statusCode === 429) {
    return "RATE_LIMITED";
  }

  return "INTERNAL_ERROR";
}

function getMessage(error, statusCode, fallbackMessage) {
  if (isDuplicateKeyError(error)) {
    return `${getDuplicateField(error)} already exists.`;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(error.errors || {}).map((item) => item.message);
    return messages[0] || "Validation failed.";
  }

  if (error instanceof mongoose.Error.CastError) {
    return `${error.path || "value"} is invalid.`;
  }

  if (error?.message) {
    return error.message;
  }

  return statusCode >= 500 ? fallbackMessage : "Request failed.";
}

function getFieldErrors(error) {
  if (!(error instanceof mongoose.Error.ValidationError)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(error.errors || {}).map(([key, value]) => [key, value.message])
  );
}

export function createErrorResponse(error, fallbackMessage = "Internal server error.") {
  const statusCode = getStatusCode(error);

  return {
    statusCode,
    body: {
      success: false,
      message: getMessage(error, statusCode, fallbackMessage),
      errorCode: getErrorCode(error, statusCode),
      ...(getFieldErrors(error) ? { fieldErrors: getFieldErrors(error) } : {}),
    },
  };
}
