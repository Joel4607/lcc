import express from "express";
import { verifyToken } from "../../shared/middleware/auth.js";
import sanitizeUser from "../users/sanitizeUser.js";

const router = express.Router();

router.get("/protected", verifyToken, (req, res) => {
  res.status(200).json({
    message: "Protected route access granted.",
    user: sanitizeUser(req.user),
  });
});

export default router;
