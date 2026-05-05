import express from "express";
import { ROLES } from "../../shared/constants/roles.js";
import { applyBranchIsolation, assertBranchAccess, buildBranchScopedFilter } from "../../shared/middleware/branchIsolation.js";
import { requireRole, verifyToken } from "../../shared/middleware/auth.js";
import User from "./user.model.js";
import { createManagedUser, deleteManagedUser, populateUser, updateManagedUser } from "./userManagement.service.js";
import respondWithError from "../../shared/utils/respondWithError.js";
import sanitizeUser from "./sanitizeUser.js";
import { normalizeObjectId } from "../../shared/utils/objectId.js";

const router = express.Router();

router.use(verifyToken, applyBranchIsolation, requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN]));

router.get("/", async (req, res) => {
  try {
    const users = await User.find(buildBranchScopedFilter(req)).sort({ createdAt: -1 }).populate([
      { path: "branchId", select: "name code" },
      { path: "buscellId", select: "name" },
      { path: "ecclesiaId", select: "name branchId" },
    ]);

    return res.status(200).json(users.map(sanitizeUser));
  } catch (error) {
    return respondWithError(res, error, "Unable to fetch users.");
  }
});

router.post("/", async (req, res) => {
  try {
    const user = await createManagedUser(req.user, req.body);

    return res.status(201).json({
      message: "User created successfully.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return respondWithError(res, error, "Unable to create user.");
  }
});

router.put("/:id", async (req, res) => {
  try {
    const userId = normalizeObjectId(req.params.id);

    if (!userId) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!req.accessScope.isSuperAdmin) {
      assertBranchAccess(req, user.branchId, "You can only manage users in your branch.");
    }

    const updatedUser = await updateManagedUser(req.user, user, req.body);

    return res.status(200).json({
      message: "User updated successfully.",
      user: sanitizeUser(await populateUser(updatedUser)),
    });
  } catch (error) {
    return respondWithError(res, error, "Unable to update user.");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const userId = normalizeObjectId(req.params.id);

    if (!userId) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!req.accessScope.isSuperAdmin) {
      assertBranchAccess(req, user.branchId, "You can only manage users in your branch.");
    }

    await deleteManagedUser(req.user, user);

    return res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    return respondWithError(res, error, "Unable to delete user.");
  }
});

export default router;
