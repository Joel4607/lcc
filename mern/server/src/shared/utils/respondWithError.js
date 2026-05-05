import { createErrorResponse } from "./errorResponse.js";
import logger from "./logger.js";

export default function respondWithError(res, error, fallbackMessage) {
  const { statusCode, body } = createErrorResponse(error, fallbackMessage);

  logger.error("Handled request error", {
    statusCode,
    errorCode: body.errorCode,
    message: body.message,
    stack: error?.stack,
  });

  return res.status(statusCode).json(body);
}
