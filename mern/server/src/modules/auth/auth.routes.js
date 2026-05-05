import express from "express";
import { ROLES } from "../../shared/constants/roles.js";
import { requireRole, verifyToken } from "../../shared/middleware/auth.js";
import { loginRateLimiter } from "../../shared/middleware/rateLimiters.js";
import User from "../users/user.model.js";
import { createManagedUser, populateUser } from "../users/userManagement.service.js";
import generateToken from "./generateToken.js";
import createHttpError from "../../shared/utils/httpError.js";
import logger from "../../shared/utils/logger.js";
import respondWithError from "../../shared/utils/respondWithError.js";
import { normalizeEmail } from "../../shared/utils/roleAccess.js";
import sanitizeUser from "../users/sanitizeUser.js";

const router = express.Router();

router.post(
  "/register",
  verifyToken,
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN]),
  async (req, res) => {
    try {
      const user = await createManagedUser(req.user, req.body);

      logger.info("User registered through auth register endpoint", {
        actorUserId: req.user._id?.toString(),
        actorRole: req.user.role,
        createdUserId: user._id?.toString(),
        createdUserRole: user.role,
      });

      return res.status(201).json({
        message: "User registered successfully.",
        user: sanitizeUser(user),
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to register user.");
    }
  }
);

router.post("/login", loginRateLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;

    if (!email || !password) {
      throw createHttpError(
        400,
        "A valid email and password are required.",
        "INVALID_LOGIN_INPUT"
      );
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      logger.warn("Failed login attempt", {
        email,
        reason: "user_not_found",
      });
      throw createHttpError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
    }

    const passwordMatches = await user.comparePassword(password);

    if (!passwordMatches) {
      logger.warn("Failed login attempt", {
        email,
        userId: user._id?.toString(),
        reason: "password_mismatch",
      });
      throw createHttpError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
    }

    await populateUser(user);

    logger.info("User logged in", {
      userId: user._id?.toString(),
      email: user.email,
      role: user.role,
      branchId: user.branchId?._id?.toString() || user.branchId?.toString() || null,
    });

    return res.status(200).json({
      token: generateToken(user._id.toString()),
      user: sanitizeUser(user),
    });
  } catch (error) {
    return respondWithError(res, error, "Unable to login.");
  }
});

router.get("/me", verifyToken, async (req, res) => {
  const currentUser = await populateUser(req.user);

  return res.status(200).json({
    user: sanitizeUser(currentUser),
  });
});

export default router;
