export const ROLES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  BRANCH_ADMIN: "BRANCH_ADMIN",
  ECCLESIA_LEADER: "ECCLESIA_LEADER",
  FINANCE_ADMIN: "FINANCE_ADMIN",
});

export function canAccessRole(role, allowedRoles = []) {
  if (!allowedRoles.length) {
    return true;
  }

  return allowedRoles.includes(role);
}

export function getRoleOptionsForActor(role) {
  if (role === ROLES.SUPER_ADMIN) {
    return [ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER, ROLES.FINANCE_ADMIN];
  }

  if (role === ROLES.BRANCH_ADMIN) {
    return [ROLES.ECCLESIA_LEADER, ROLES.FINANCE_ADMIN];
  }

  return [];
}

export function getNavItems(role) {
  const items = [
    {
      label: "Dashboard",
      path: "/dashboard",
      roles: [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER, ROLES.FINANCE_ADMIN],
    },
    {
      label: "Branches",
      path: "/branches",
      roles: [ROLES.SUPER_ADMIN],
    },
    {
      label: "Staff Management",
      path: "/users",
      roles: [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN],
    },
    {
      label: "Ecclesias",
      path: "/ecclesias",
      roles: [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN],
    },
    {
      label: "Buscells",
      path: "/buscells",
      roles: [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN],
    },
    {
      label: "Members",
      path: "/members",
      roles: [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER],
    },
    {
      label: "Operations",
      path: "/operations",
      roles: [ROLES.ECCLESIA_LEADER],
    },
    {
      label: "Finance",
      path: "/finance",
      roles: [ROLES.FINANCE_ADMIN],
    },
    {
      label: "Member Lookup",
      path: "/member-lookup",
      roles: [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.FINANCE_ADMIN],
    },
    {
      label: "Reports",
      path: "/reports",
      roles: [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.FINANCE_ADMIN],
    },
    {
      label: "Weekly Records",
      path: "/weekly-records",
      roles: [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ECCLESIA_LEADER],
    },
  ];

  return items.filter((item) => canAccessRole(role, item.roles));
}
