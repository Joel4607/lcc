export default function standardizeErrorResponses(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (
      res.statusCode >= 400 &&
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      body.success !== false
    ) {
      return originalJson({
        success: false,
        message: body.message || "Request failed.",
        ...(body.errorCode ? { errorCode: body.errorCode } : {}),
        ...(body.fieldErrors ? { fieldErrors: body.fieldErrors } : {}),
      });
    }

    return originalJson(body);
  };

  next();
}
