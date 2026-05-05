import express from "express";
import { ROLES } from "../../shared/constants/roles.js";
import { requireRole, verifyToken } from "../../shared/middleware/auth.js";
import Branch from "./branch.model.js";
import Buscell from "../buscells/buscell.model.js";
import Member from "../members/member.model.js";
import User from "../users/user.model.js";
import respondWithError from "../../shared/utils/respondWithError.js";
import serializeBranch from "./branch.serializer.js";
import { normalizeObjectId } from "../../shared/utils/objectId.js";

const router = express.Router();

router.use(verifyToken, requireRole([ROLES.SUPER_ADMIN]));

router.get("/", async (_req, res) => {
  try {
    const branches = await Branch.find({}).sort({ name: 1 });

    return res.status(200).json(branches.map(serializeBranch));
  } catch (error) {
    return respondWithError(res, error, "Unable to fetch branches.");
  }
});

router.post("/", async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const code = typeof req.body.code === "string" ? req.body.code.trim().toUpperCase() : "";

    if (!name || !code) {
      return res.status(400).json({ message: "Name and code are required." });
    }

    const branch = await Branch.create({
      name,
      code,
      address: typeof req.body.address === "string" ? req.body.address.trim() : "",
      phone: typeof req.body.phone === "string" ? req.body.phone.trim() : "",
    });

    return res.status(201).json(serializeBranch(branch));
  } catch (error) {
    return respondWithError(res, error, "Unable to create branch.");
  }
});

router.put("/:id", async (req, res) => {
  try {
    const branchId = normalizeObjectId(req.params.id);

    if (!branchId) {
      return res.status(400).json({ message: "Invalid branch id." });
    }

    const branch = await Branch.findById(branchId);

    if (!branch) {
      return res.status(404).json({ message: "Branch not found." });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
      const name = typeof req.body.name === "string" ? req.body.name.trim() : "";

      if (!name) {
        return res.status(400).json({ message: "Name cannot be empty." });
      }

      branch.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "code")) {
      const code = typeof req.body.code === "string" ? req.body.code.trim().toUpperCase() : "";

      if (!code) {
        return res.status(400).json({ message: "Code cannot be empty." });
      }

      branch.code = code;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "address")) {
      branch.address = typeof req.body.address === "string" ? req.body.address.trim() : "";
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "phone")) {
      branch.phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
    }

    await branch.save();

    return res.status(200).json(serializeBranch(branch));
  } catch (error) {
    return respondWithError(res, error, "Unable to update branch.");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const branchId = normalizeObjectId(req.params.id);

    if (!branchId) {
      return res.status(400).json({ message: "Invalid branch id." });
    }

    const branch = await Branch.findById(branchId);

    if (!branch) {
      return res.status(404).json({ message: "Branch not found." });
    }

    const [userCount, buscellCount, memberCount] = await Promise.all([
      User.countDocuments({ branchId }),
      Buscell.countDocuments({ branchId }),
      Member.countDocuments({ branchId }),
    ]);

    if (userCount || buscellCount || memberCount) {
      return res.status(409).json({
        message: "Delete or reassign related users, buscells, and members before deleting a branch.",
      });
    }

    await Branch.findByIdAndDelete(branchId);

    return res.status(200).json({ message: "Branch deleted successfully." });
  } catch (error) {
    return respondWithError(res, error, "Unable to delete branch.");
  }
});

export default router;
