function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
    if (key.startsWith("$") || key.includes(".")) {
      return accumulator;
    }

    accumulator[key] = sanitizeValue(nestedValue);
    return accumulator;
  }, {});
}

export default function sanitizeRequest(req, _res, next) {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
}
