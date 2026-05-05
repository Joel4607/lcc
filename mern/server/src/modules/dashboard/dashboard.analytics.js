import mongoose from "mongoose";
import {
  ATTENDANCE_MEETING_TYPE_VALUES,
  ATTENDANCE_STATUS_VALUES,
} from "../attendance/attendance.constants.js";
import {
  FINANCE_PAYMENT_METHOD_VALUES,
  FINANCE_TRANSACTION_TYPE_VALUES,
} from "../finance/finance.constants.js";
import { MEMBER_STATUS_VALUES } from "../members/memberStatus.constants.js";
import { ROLES } from "../../shared/constants/roles.js";
import Buscell from "../buscells/buscell.model.js";
import Member from "../members/member.model.js";
import createHttpError from "../../shared/utils/httpError.js";
import { buildDateRangeFilter } from "../../shared/utils/date.js";
import { normalizeUmid } from "../members/memberScope.js";
import { idsMatch, normalizeObjectId } from "../../shared/utils/objectId.js";

export function hasOwnProperty(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toObjectId(value) {
  if (!value) {
    return null;
  }

  return new mongoose.Types.ObjectId(value);
}

export function normalizeOptionalEnum(value, allowedValues, fieldName) {
  if (!value) {
    return "";
  }

  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (!allowedValues.includes(normalized)) {
    throw createHttpError(400, `${fieldName} is invalid.`);
  }

  return normalized;
}

export function normalizeOptionalUmid(value) {
  const normalized = normalizeUmid(value);

  if (value && !normalized) {
    throw createHttpError(400, "Invalid UMID.");
  }

  return normalized;
}

export function parsePagination(query, { defaultLimit = 25, maxLimit = 100 } = {}) {
  const page = hasOwnProperty(query, "page") ? Number(query.page) : 1;
  const limit = hasOwnProperty(query, "limit") ? Number(query.limit) : defaultLimit;

  if (!Number.isInteger(page) || page < 1) {
    throw createHttpError(400, "page must be a positive integer.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    throw createHttpError(400, `limit must be an integer between 1 and ${maxLimit}.`);
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function applySearchFilter(filter, searchValue, fields = []) {
  const search = typeof searchValue === "string" ? searchValue.trim() : "";

  if (!search || !fields.length) {
    return filter;
  }

  const regex = new RegExp(escapeRegex(search), "i");

  return {
    ...filter,
    $or: fields.map((field) => ({
      [field]: regex,
    })),
  };
}

function isEcclesiaLeader(req) {
  return req.accessScope?.role === ROLES.ECCLESIA_LEADER;
}

function requireEcclesiaLeaderEcclesiaId(
  req,
  message = "This Ecclesia Leader account is not assigned to an Ecclesia."
) {
  if (!isEcclesiaLeader(req)) {
    return null;
  }

  if (!req.accessScope.ecclesiaId) {
    throw createHttpError(403, message);
  }

  return req.accessScope.ecclesiaId;
}

async function getEcclesiaMemberIds(req, { buscellId = null } = {}) {
  const ecclesiaId = requireEcclesiaLeaderEcclesiaId(req);

  if (!ecclesiaId) {
    return null;
  }

  return Member.distinct("_id", {
    branchId: toObjectId(req.accessScope.branchId),
    ecclesiaId: toObjectId(ecclesiaId),
    ...(buscellId ? { buscellId: toObjectId(buscellId) } : {}),
  });
}

export function resolveScopedBranchId(
  req,
  value,
  {
    required = false,
    requiredMessage = "branchId is required.",
    forbiddenMessage = "You can only access data in your branch.",
  } = {}
) {
  const branchId = normalizeObjectId(value);

  if (value && !branchId) {
    throw createHttpError(400, "Invalid branchId.");
  }

  if (req.accessScope?.isSuperAdmin) {
    if (required && !branchId) {
      throw createHttpError(400, requiredMessage);
    }

    return branchId || null;
  }

  if (branchId && !idsMatch(branchId, req.accessScope.branchId)) {
    throw createHttpError(403, forbiddenMessage);
  }

  return req.accessScope.branchId;
}

export async function resolveScopedBuscellId(
  req,
  value,
  {
    branchId = null,
    required = false,
    requiredMessage = "buscellId is required.",
    forbiddenMessage = "You can only access data in your own Ecclesia.",
    branchMismatchMessage = "Selected buscell does not belong to the requested branch.",
    missingAssignmentMessage = "This Ecclesia Leader account is not assigned to an Ecclesia.",
  } = {}
) {
  const requestedBuscellId = normalizeObjectId(value);

  if (value && !requestedBuscellId) {
    throw createHttpError(400, "Invalid buscellId.");
  }

  if (isEcclesiaLeader(req)) {
    const ecclesiaId = requireEcclesiaLeaderEcclesiaId(req, missingAssignmentMessage);

    if (required && !requestedBuscellId) {
      throw createHttpError(400, requiredMessage);
    }

    if (!requestedBuscellId) {
      return {
        buscellId: null,
        buscell: null,
      };
    }

    const buscell = await Buscell.findById(requestedBuscellId).select("_id branchId ecclesiaId name");

    if (!buscell) {
      throw createHttpError(404, "Buscell not found.");
    }

    if (!idsMatch(buscell.branchId, req.accessScope.branchId)) {
      throw createHttpError(403, branchMismatchMessage);
    }

    if (!idsMatch(buscell.ecclesiaId, ecclesiaId)) {
      throw createHttpError(403, forbiddenMessage);
    }

    return {
      buscellId: requestedBuscellId,
      buscell,
    };
  }

  if (required && !requestedBuscellId) {
    throw createHttpError(400, requiredMessage);
  }

  if (!requestedBuscellId) {
    return {
      buscellId: null,
      buscell: null,
    };
  }

  const buscell = await Buscell.findById(requestedBuscellId).select("_id branchId ecclesiaId name");

  if (!buscell) {
    throw createHttpError(404, "Buscell not found.");
  }

  const scopedBranchId = branchId || (!req.accessScope?.isSuperAdmin ? req.accessScope.branchId : null);

  if (scopedBranchId && !idsMatch(buscell.branchId, scopedBranchId)) {
    throw createHttpError(req.accessScope?.isSuperAdmin ? 400 : 403, branchMismatchMessage);
  }

  return {
    buscellId: requestedBuscellId,
    buscell,
  };
}

export function buildScopedMatch(
  req,
  {
    branchId = null,
    buscellId = null,
    branchField = "branchId",
    buscellField = "buscellId",
  } = {}
) {
  const match = {};
  const effectiveBranchId = req.accessScope?.isSuperAdmin ? branchId : req.accessScope?.branchId;
  const effectiveBuscellId = buscellId;

  if (effectiveBranchId) {
    match[branchField] = toObjectId(effectiveBranchId);
  }

  if (effectiveBuscellId) {
    match[buscellField] = toObjectId(effectiveBuscellId);
  }

  return match;
}

export async function buildMemberMatch(
  req,
  query = {},
  {
    allowBranchQuery = true,
    allowBuscellQuery = true,
    allowSearch = true,
    searchFields = ["firstName", "lastName", "fullName", "umid", "phone", "email"],
    dateField = null,
  } = {}
) {
  const branchId = allowBranchQuery
    ? resolveScopedBranchId(req, query.branchId, {
        forbiddenMessage: "You can only access members in your branch.",
      })
    : req.accessScope?.isSuperAdmin
      ? null
      : req.accessScope.branchId;

  const { buscellId } = allowBuscellQuery
    ? await resolveScopedBuscellId(req, query.buscellId, {
        branchId,
        forbiddenMessage: "You can only access members in your own Ecclesia.",
        branchMismatchMessage: "Selected buscell does not belong to the allowed branch.",
      })
    : { buscellId: null };

  let match = buildScopedMatch(req, { branchId, buscellId });

  if (isEcclesiaLeader(req)) {
    match.ecclesiaId = toObjectId(requireEcclesiaLeaderEcclesiaId(req));
  }

  const umid = normalizeOptionalUmid(query.umid);

  if (umid) {
    match.umid = umid;
  }

  const status = normalizeOptionalEnum(query.status, MEMBER_STATUS_VALUES, "status");

  if (status) {
    match.status = status;
  }

  if (allowSearch) {
    match = applySearchFilter(match, query.search, searchFields);
  }

  if (dateField) {
    match = {
      ...match,
      ...buildDateRangeFilter(dateField, query),
    };
  }

  return {
    match,
    branchId,
    buscellId,
  };
}

export async function buildAttendanceMatch(
  req,
  query = {},
  { allowBranchQuery = true, allowBuscellQuery = true } = {}
) {
  const branchId = allowBranchQuery
    ? resolveScopedBranchId(req, query.branchId, {
        forbiddenMessage: "You can only access attendance records in your branch.",
      })
    : req.accessScope?.isSuperAdmin
      ? null
      : req.accessScope.branchId;

  const { buscellId } = allowBuscellQuery
    ? await resolveScopedBuscellId(req, query.buscellId, {
        branchId,
        forbiddenMessage: "You can only access attendance records in your own Ecclesia.",
        branchMismatchMessage: "Selected buscell does not belong to the allowed branch.",
      })
    : { buscellId: null };

  const match = {
    ...buildScopedMatch(req, {
      branchId,
      buscellId,
    }),
    ...buildDateRangeFilter("date", query),
  };
  const ecclesiaMemberIds = await getEcclesiaMemberIds(req, { buscellId });

  if (ecclesiaMemberIds) {
    match.memberId = { $in: ecclesiaMemberIds };
  }

  const umid = normalizeOptionalUmid(query.umid);

  if (umid) {
    match.umid = umid;
  }

  const meetingType = normalizeOptionalEnum(
    query.meetingType,
    ATTENDANCE_MEETING_TYPE_VALUES,
    "meetingType"
  );

  if (meetingType) {
    match.meetingType = meetingType;
  }

  const status = normalizeOptionalEnum(query.status, ATTENDANCE_STATUS_VALUES, "status");

  if (status) {
    match.status = status;
  }

  return {
    match,
    branchId,
    buscellId,
  };
}

export async function buildFinanceMatch(
  req,
  query = {},
  { allowBranchQuery = true, allowBuscellQuery = true } = {}
) {
  const branchId = allowBranchQuery
    ? resolveScopedBranchId(req, query.branchId, {
        forbiddenMessage: "You can only access finance records in your branch.",
      })
    : req.accessScope?.isSuperAdmin
      ? null
      : req.accessScope.branchId;

  const { buscellId } = allowBuscellQuery
    ? await resolveScopedBuscellId(req, query.buscellId, {
        branchId,
        forbiddenMessage: "You can only access finance records in your own Ecclesia.",
        branchMismatchMessage: "Selected buscell does not belong to the allowed branch.",
      })
    : { buscellId: null };

  const match = {
    ...buildScopedMatch(req, {
      branchId,
      buscellId,
    }),
    ...buildDateRangeFilter("date", query),
  };
  const ecclesiaMemberIds = await getEcclesiaMemberIds(req, { buscellId });

  if (ecclesiaMemberIds) {
    match.memberId = { $in: ecclesiaMemberIds };
  }

  const umid = normalizeOptionalUmid(query.umid);

  if (umid) {
    match.umid = umid;
  }

  const transactionType = normalizeOptionalEnum(
    query.transactionType,
    FINANCE_TRANSACTION_TYPE_VALUES,
    "transactionType"
  );

  if (transactionType) {
    match.transactionType = transactionType;
  }

  const paymentMethod = normalizeOptionalEnum(
    query.paymentMethod,
    FINANCE_PAYMENT_METHOD_VALUES,
    "paymentMethod"
  );

  if (paymentMethod) {
    match.paymentMethod = paymentMethod;
  }

  return {
    match,
    branchId,
    buscellId,
  };
}

export function createDateBucketExpression(fieldName = "$date") {
  return {
    $dateToString: {
      format: "%Y-%m-%d",
      date: fieldName,
    },
  };
}
