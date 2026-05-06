import assert from "node:assert/strict";
import test from "node:test";
import { ROLES } from "../../shared/constants/roles.js";
import { assertMemberWithinScope } from "./memberScope.js";

const branchId = "64f000000000000000000001";
const otherBranchId = "64f000000000000000000002";
const ecclesiaId = "64f000000000000000000003";
const otherEcclesiaId = "64f000000000000000000004";
const buscellId = "64f000000000000000000005";
const otherBuscellId = "64f000000000000000000006";

function createRequest(overrides = {}) {
  return {
    accessScope: {
      isSuperAdmin: false,
      role: ROLES.ECCLESIA_LEADER,
      branchId,
      ecclesiaId,
      buscellId: null,
      ...overrides,
    },
  };
}

function createMember(overrides = {}) {
  return {
    branchId,
    ecclesiaId,
    buscellId: otherBuscellId,
    ...overrides,
  };
}

test("Ecclesia Leaders can view member summaries inside their Ecclesia without buscell-only scope", () => {
  assert.equal(assertMemberWithinScope(createRequest(), createMember()), true);
});

test("Ecclesia Leaders cannot view members from another Ecclesia", () => {
  assert.throws(
    () => assertMemberWithinScope(createRequest(), createMember({ ecclesiaId: otherEcclesiaId })),
    { statusCode: 403 }
  );
});

test("Ecclesia Leaders cannot view members from another branch", () => {
  assert.throws(
    () => assertMemberWithinScope(createRequest(), createMember({ branchId: otherBranchId })),
    { statusCode: 403 }
  );
});

test("Buscell-only checks still reject Ecclesia Leaders without a matching buscell", () => {
  assert.throws(
    () =>
      assertMemberWithinScope(
        createRequest({ buscellId }),
        createMember({ buscellId: otherBuscellId }),
        { ecclesiaLeaderOwnBuscellOnly: true }
      ),
    { statusCode: 403 }
  );
});
