import express from "express";
import { MEMBER_STATUS_VALUES, MemberStatuses } from "./memberStatus.constants.js";
import { ROLES } from "../../shared/constants/roles.js";
import { applyBranchIsolation } from "../../shared/middleware/branchIsolation.js";
import { requireRole, verifyToken } from "../../shared/middleware/auth.js";
import Branch from "../branches/branch.model.js";
import Buscell from "../buscells/buscell.model.js";
import Ecclesia from "../ecclesias/ecclesia.model.js";
import Member from "./member.model.js";
import createHttpError from "../../shared/utils/httpError.js";
import logger from "../../shared/utils/logger.js";
import { assertMemberWithinScope, normalizeUmid } from "./memberScope.js";
import { idsMatch, normalizeObjectId } from "../../shared/utils/objectId.js";
import respondWithError from "../../shared/utils/respondWithError.js";
import serializeMember from "./member.serializer.js";
import generateUmid from "./umid.js";
import { assertValidEmail } from "../../shared/utils/validation.js";

const router = express.Router();

const MEMBER_POPULATE = [
  { path: "branchId", select: "name code" },
  { path: "ecclesiaId", select: "name branchId" },
  { path: "buscellId", select: "name branchId ecclesiaId" },
];

router.use(verifyToken, applyBranchIsolation);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeStatus(value) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (!normalized) {
    return "";
  }

  if (!MEMBER_STATUS_VALUES.includes(normalized)) {
    throw createHttpError(400, "Invalid member status.", "INVALID_MEMBER_STATUS");
  }

  return normalized;
}

function normalizeMemberPayload(body = {}) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (email) {
    assertValidEmail(email);
  }

  return {
    firstName: typeof body.firstName === "string" ? body.firstName.trim() : "",
    lastName: typeof body.lastName === "string" ? body.lastName.trim() : "",
    phone: typeof body.phone === "string" ? body.phone.trim() : "",
    email: email || null,
    gender:
      typeof body.gender === "string" && body.gender.trim()
        ? body.gender.trim().toUpperCase()
        : null,
    address: typeof body.address === "string" ? body.address.trim() : "",
    dateOfBirth: body.dateOfBirth || null,
    maritalStatus:
      typeof body.maritalStatus === "string" && body.maritalStatus.trim()
        ? body.maritalStatus.trim().toUpperCase()
        : null,
    joinDate: body.joinDate || null,
    familyGroup: typeof body.familyGroup === "string" ? body.familyGroup.trim() : "",
    ministryGroups: Array.isArray(body.ministryGroups) ? body.ministryGroups : [],
    status: normalizeStatus(body.status) || MemberStatuses.ACTIVE,
  };
}

function buildSearchFilter(searchValue) {
  const search = typeof searchValue === "string" ? searchValue.trim() : "";

  if (!search) {
    return {};
  }

  const regex = new RegExp(escapeRegex(search), "i");

  return {
    $or: [
      { firstName: regex },
      { lastName: regex },
      { fullName: regex },
      { phone: regex },
      { umid: regex },
    ],
  };
}

async function loadMemberById(memberId) {
  return Member.findById(memberId).populate(MEMBER_POPULATE);
}

async function loadMemberByUmid(umid) {
  return Member.findOne({ umid }).populate(MEMBER_POPULATE);
}

async function resolveHierarchyAssignments({ branchId, ecclesiaId, buscellId }) {
  const normalizedBranchId = normalizeObjectId(branchId);
  const normalizedEcclesiaId = normalizeObjectId(ecclesiaId);
  const normalizedBuscellId = normalizeObjectId(buscellId);

  if (!normalizedBranchId) {
    throw createHttpError(400, "branchId is required.", "MISSING_BRANCH");
  }

  if (!normalizedEcclesiaId) {
    throw createHttpError(400, "ecclesiaId is required.", "MISSING_ECCLESIA");
  }

  if (!normalizedBuscellId) {
    throw createHttpError(400, "buscellId is required.", "MISSING_BUSCELL");
  }

  const [branch, ecclesia, buscell] = await Promise.all([
    Branch.findById(normalizedBranchId).select("name code"),
    Ecclesia.findById(normalizedEcclesiaId).select("name branchId"),
    Buscell.findById(normalizedBuscellId).select("name branchId ecclesiaId"),
  ]);

  if (!branch) {
    throw createHttpError(404, "Branch not found.", "BRANCH_NOT_FOUND");
  }

  if (!ecclesia) {
    throw createHttpError(404, "Ecclesia not found.", "ECCLESIA_NOT_FOUND");
  }

  if (!buscell) {
    throw createHttpError(404, "Buscell not found.", "BUSCELL_NOT_FOUND");
  }

  if (!idsMatch(ecclesia.branchId, branch._id)) {
    throw createHttpError(
      400,
      "Selected Ecclesia must belong to the selected branch.",
      "ECCLESIA_BRANCH_MISMATCH"
    );
  }

  if (!idsMatch(buscell.branchId, branch._id)) {
    throw createHttpError(
      400,
      "Selected buscell must belong to the selected branch.",
      "BUSCELL_BRANCH_MISMATCH"
    );
  }

  if (!idsMatch(buscell.ecclesiaId, ecclesia._id)) {
    throw createHttpError(
      400,
      "Selected buscell must belong to the selected Ecclesia.",
      "BUSCELL_ECCLESIA_MISMATCH"
    );
  }

  return {
    branch,
    ecclesia,
    buscell,
  };
}

async function resolveScopedMemberFilters(req, query = {}) {
  const requestedBranchId = normalizeObjectId(query.branchId);
  const requestedEcclesiaId = normalizeObjectId(query.ecclesiaId);
  const requestedBuscellId = normalizeObjectId(query.buscellId);

  if (query.branchId && !requestedBranchId) {
    throw createHttpError(400, "Invalid branchId.", "INVALID_BRANCH");
  }

  if (query.ecclesiaId && !requestedEcclesiaId) {
    throw createHttpError(400, "Invalid ecclesiaId.", "INVALID_ECCLESIA");
  }

  if (query.buscellId && !requestedBuscellId) {
    throw createHttpError(400, "Invalid buscellId.", "INVALID_BUSCELL");
  }

  const status = normalizeStatus(query.status);
  const filter = {};

  if (status) {
    filter.status = status;
  }

  Object.assign(filter, buildSearchFilter(query.search));

  let scopedBranchId = requestedBranchId || null;
  let scopedEcclesiaId = requestedEcclesiaId || null;
  let scopedBuscellId = requestedBuscellId || null;

  if (!req.accessScope?.isSuperAdmin) {
    scopedBranchId = req.accessScope.branchId;

    if (requestedBranchId && !idsMatch(requestedBranchId, req.accessScope.branchId)) {
      throw createHttpError(403, "You can only access members in your branch.", "FORBIDDEN");
    }

    if (req.user.role === ROLES.ECCLESIA_LEADER) {
      if (!req.accessScope.ecclesiaId) {
        throw createHttpError(
          403,
          "This Ecclesia Leader account is not assigned to an Ecclesia.",
          "FORBIDDEN"
        );
      }

      if (requestedEcclesiaId && !idsMatch(requestedEcclesiaId, req.accessScope.ecclesiaId)) {
        throw createHttpError(403, "You can only access members in your Ecclesia.", "FORBIDDEN");
      }

      scopedEcclesiaId = req.accessScope.ecclesiaId;
    }
  }

  let scopedEcclesia = null;

  if (scopedEcclesiaId) {
    scopedEcclesia = await Ecclesia.findById(scopedEcclesiaId).select("name branchId");

    if (!scopedEcclesia) {
      throw createHttpError(404, "Ecclesia not found.", "ECCLESIA_NOT_FOUND");
    }

    if (scopedBranchId && !idsMatch(scopedEcclesia.branchId, scopedBranchId)) {
      throw createHttpError(
        400,
        "Selected Ecclesia must belong to the selected branch.",
        "ECCLESIA_BRANCH_MISMATCH"
      );
    }
  }

  if (scopedBuscellId) {
    const buscell = await Buscell.findById(scopedBuscellId).select("branchId ecclesiaId");

    if (!buscell) {
      throw createHttpError(404, "Buscell not found.", "BUSCELL_NOT_FOUND");
    }

    if (scopedBranchId && !idsMatch(buscell.branchId, scopedBranchId)) {
      throw createHttpError(
        400,
        "Selected buscell must belong to the selected branch.",
        "BUSCELL_BRANCH_MISMATCH"
      );
    }

    if (scopedEcclesia && !idsMatch(buscell.ecclesiaId, scopedEcclesia._id)) {
      throw createHttpError(
        400,
        "Selected buscell must belong to the selected Ecclesia.",
        "BUSCELL_ECCLESIA_MISMATCH"
      );
    }

    if (req.user.role === ROLES.ECCLESIA_LEADER && !idsMatch(buscell.ecclesiaId, req.accessScope.ecclesiaId)) {
      throw createHttpError(403, "You can only access members in your Ecclesia.", "FORBIDDEN");
    }
  }

  if (scopedBranchId) {
    filter.branchId = scopedBranchId;
  }

  if (scopedEcclesiaId) {
    filter.ecclesiaId = scopedEcclesiaId;
  }

  if (scopedBuscellId) {
    filter.buscellId = scopedBuscellId;
  }

  return filter;
}

router.get(
  "/lookup/:umid",
  requireRole([
    ROLES.SUPER_ADMIN,
    ROLES.BRANCH_ADMIN,
    ROLES.ECCLESIA_LEADER,
    ROLES.FINANCE_ADMIN,
  ]),
  async (req, res) => {
    try {
      const umid = normalizeUmid(req.params.umid);

      if (!umid) {
        return res.status(400).json({ message: "Invalid UMID." });
      }

      const member = await loadMemberByUmid(umid);

      if (!member) {
        return res.status(404).json({ message: "Member not found." });
      }

      assertMemberWithinScope(req, member, {
        branchMessage: "You can only look up members in your branch.",
        ecclesiaMessage: "You can only look up members in your Ecclesia.",
      });

      return res.status(200).json({
        fullName: member.fullName,
        umid: member.umid,
        branchId: member.branchId?._id
          ? member.branchId._id.toString()
          : member.branchId?.toString(),
        ecclesiaId: member.ecclesiaId?._id
          ? member.ecclesiaId._id.toString()
          : member.ecclesiaId?.toString(),
        buscellId: member.buscellId?._id
          ? member.buscellId._id.toString()
          : member.buscellId?.toString(),
        status: member.status,
        branch: member.branchId?._id
          ? {
              id: member.branchId._id.toString(),
              name: member.branchId.name,
              code: member.branchId.code,
            }
          : null,
        ecclesia: member.ecclesiaId?._id
          ? {
              id: member.ecclesiaId._id.toString(),
              name: member.ecclesiaId.name,
            }
          : null,
        buscell: member.buscellId?._id
          ? {
              id: member.buscellId._id.toString(),
              name: member.buscellId.name,
            }
          : null,
      });
    } catch (error) {
      return respondWithError(res, error, "Unable to look up member.");
    }
  }
);

router.get(
  "/",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const filter = await resolveScopedMemberFilters(req, req.query);
      const members = await Member.find(filter).sort({ fullName: 1 }).populate(MEMBER_POPULATE);

      return res.status(200).json(members.map(serializeMember));
    } catch (error) {
      return respondWithError(res, error, "Unable to fetch members.");
    }
  }
);

router.get(
  "/:id",
  requireRole([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER]),
  async (req, res) => {
    try {
      const memberId = normalizeObjectId(req.params.id);

      if (!memberId) {
        return res.status(400).json({ message: "Invalid member id." });
      }

      const member = await loadMemberById(memberId);

      if (!member) {
        return res.status(404).json({ message: "Member not found." });
      }

      assertMemberWithinScope(req, member, {
        branchMessage: "You can only access members in your branch.",
        ecclesiaMessage: "You can only access members in your Ecclesia.",
      });

      return res.status(200).json(serializeMember(member));
    } catch (error) {
      return respondWithError(res, error, "Unable to fetch member.");
    }
  }
);

router.post("/", requireRole([ROLES.SUPER_ADMIN]), async (req, res) => {
  try {
    const normalizedPayload = normalizeMemberPayload(req.body);

    if (
      !normalizedPayload.firstName ||
      !normalizedPayload.lastName ||
      !normalizedPayload.phone ||
      !normalizedPayload.joinDate
    ) {
      return res.status(400).json({
        message: "firstName, lastName, phone, joinDate, branchId, ecclesiaId, and buscellId are required.",
      });
    }

    const { branch, ecclesia, buscell } = await resolveHierarchyAssignments({
      branchId: req.body.branchId,
      ecclesiaId: req.body.ecclesiaId,
      buscellId: req.body.buscellId,
    });

    const member = await Member.create({
      ...normalizedPayload,
      branchId: branch._id,
      ecclesiaId: ecclesia._id,
      buscellId: buscell._id,
      umid: await generateUmid(branch._id.toString()),
    });

    const savedMember = await loadMemberById(member._id);

    logger.info("Member created", {
      actorUserId: req.user._id?.toString(),
      actorRole: req.user.role,
      memberId: member._id?.toString(),
      umid: member.umid,
      branchId: branch._id?.toString(),
      ecclesiaId: ecclesia._id?.toString(),
      buscellId: buscell._id?.toString(),
    });

    return res.status(201).json({
      message: "Member created successfully.",
      member: serializeMember(savedMember),
    });
  } catch (error) {
    return respondWithError(res, error, "Unable to create member.");
  }
});

router.put("/:id", requireRole([ROLES.SUPER_ADMIN]), async (req, res) => {
  try {
    const memberId = normalizeObjectId(req.params.id);

    if (!memberId) {
      return res.status(400).json({ message: "Invalid member id." });
    }

    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    const normalizedPayload = normalizeMemberPayload(req.body);
    const assignment = await resolveHierarchyAssignments({
      branchId:
        Object.prototype.hasOwnProperty.call(req.body, "branchId") && req.body.branchId
          ? req.body.branchId
          : member.branchId,
      ecclesiaId:
        Object.prototype.hasOwnProperty.call(req.body, "ecclesiaId") && req.body.ecclesiaId
          ? req.body.ecclesiaId
          : member.ecclesiaId,
      buscellId:
        Object.prototype.hasOwnProperty.call(req.body, "buscellId") && req.body.buscellId
          ? req.body.buscellId
          : member.buscellId,
    });

    Object.assign(member, normalizedPayload, {
      branchId: assignment.branch._id,
      ecclesiaId: assignment.ecclesia._id,
      buscellId: assignment.buscell._id,
      umid: member.umid,
    });

    await member.save();

    const updatedMember = await loadMemberById(member._id);

    logger.info("Member updated", {
      actorUserId: req.user._id?.toString(),
      actorRole: req.user.role,
      memberId: member._id?.toString(),
      umid: member.umid,
      branchId: assignment.branch._id?.toString(),
      ecclesiaId: assignment.ecclesia._id?.toString(),
      buscellId: assignment.buscell._id?.toString(),
    });

    return res.status(200).json({
      message: "Member updated successfully.",
      member: serializeMember(updatedMember),
    });
  } catch (error) {
    return respondWithError(res, error, "Unable to update member.");
  }
});

router.delete("/:id", requireRole([ROLES.SUPER_ADMIN]), async (req, res) => {
  try {
    const memberId = normalizeObjectId(req.params.id);

    if (!memberId) {
      return res.status(400).json({ message: "Invalid member id." });
    }

    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    await Member.findByIdAndDelete(memberId);

    logger.info("Member deleted", {
      actorUserId: req.user._id?.toString(),
      actorRole: req.user.role,
      memberId: member._id?.toString(),
      umid: member.umid,
    });

    return res.status(200).json({ message: "Member deleted successfully." });
  } catch (error) {
    return respondWithError(res, error, "Unable to delete member.");
  }
});

export default router;
