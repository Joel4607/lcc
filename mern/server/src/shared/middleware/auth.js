import jwt from "jsonwebtoken";
import User from "../../modules/users/user.model.js";
import createHttpError from "../utils/httpError.js";
import { getRequiredEnv } from "../utils/env.js";
import { canonicalizeRole } from "../utils/roleAccess.js";

function getJwtSecret() {
  return getRequiredEnv("JWT_SECRET");
}

export async function verifyToken(req, _res, next) {
  const authorizationHeader = req.headers.authorization || "";
  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(
      createHttpError(401, "Authorization token is required.", "AUTH_REQUIRED")
    );
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(createHttpError(401, "Invalid or expired token.", "INVALID_TOKEN"));
    }

    user.role = canonicalizeRole(user.role);
    req.user = user;
    return next();
  } catch (_error) {
    return next(createHttpError(401, "Invalid or expired token.", "INVALID_TOKEN"));
  }
}

export function requireRole(roles = []) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(createHttpError(401, "Authentication required.", "AUTH_REQUIRED"));
    }

    const userRole = canonicalizeRole(req.user.role);

    if (!roles.length || roles.includes(userRole)) {
      req.user.role = userRole;
      return next();
    }

    return next(createHttpError(403, "You do not have access to this resource.", "FORBIDDEN"));
  };
}
