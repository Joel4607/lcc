export default function createHttpError(statusCode, message, errorCode, extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  Object.assign(error, extra);
  return error;
}
