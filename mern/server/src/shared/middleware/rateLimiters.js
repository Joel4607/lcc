import rateLimit from "express-rate-limit";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please try again later.",
      errorCode: "RATE_LIMITED",
    }),
});
