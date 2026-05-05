import logger from "../utils/logger.js";
import { createErrorResponse } from "../utils/errorResponse.js";

export default function errorHandler(error, req, res, _next) {
  const { statusCode, body } = createErrorResponse(error);

  logger.error("Unhandled request error", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    errorCode: body.errorCode,
    message: body.message,
    stack: error?.stack,
  });

  return res.status(statusCode).json(body);
}
