import jwt from "jsonwebtoken";
import { getRequiredEnv } from "../../shared/utils/env.js";

function getJwtSecret() {
  return getRequiredEnv("JWT_SECRET");
}

export default function generateToken(userId) {
  return jwt.sign({ userId }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}
