import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../../shared/api/client";
import { useAuth } from "../../auth/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import {
  formatEnumLabel,
  getBranchLabel,
  getEcclesiaLabel,
  getReferenceId,
} from "../../../shared/lib/data";
import { getRoleOptionsForActor, ROLES } from "../../../shared/constants/roles";

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  role: ROLES.ECCLESIA_LEADER,
  branchId: "",
  ecclesiaId: "",
};

const panelClass =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.3)]";

function createEmptyFormForActor(actor) {
  const roleOptions = getRoleOptionsForActor(actor.role);

  return {
    ...emptyUserForm,
    role: roleOptions[0] || ROLES.ECCLESIA_LEADER,
    branchId: actor.role === ROLES.BRANCH_ADMIN ? actor.branchId || "" : "",
  };
}

export default function UsersPage() {
  const { getApiErrorMessage, user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [ecclesias, setEcclesias] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(() => createEmptyFormForActor(user));
  const [editingUserId, setEditingUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleOptions = useMemo(() => getRoleOptionsForActor(user.role), [user.role]);
  const selectedBranchId = user.role === ROLES.BRANCH_ADMIN ? user.branchId : form.branchId;
  const availableEcclesias = useMemo(
    () =>
      ecclesias.filter((ecclesia) => {
        const ecclesiaBranchId = getReferenceId(ecclesia.branch) || ecclesia.branchId;
        return !selectedBranchId || ecclesiaBranchId === selectedBranchId;
      }),
    [ecclesias, selectedBranchId]
  );
  const filteredUsers = users.filter((listedUser) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    const haystack = [
      listedUser.name,
      listedUser.email,
      formatEnumLabel(listedUser.role),
      getBranchLabel(listedUser.branch),
      getEcclesiaLabel(listedUser.ecclesia),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  const loadPageData = useCallback(async () => {
    try {
      setIsLoading(true);
      const requests = [
        api.get("/users"),
        api.get("/ecclesias"),
        user.role === ROLES.SUPER_ADMIN ? api.get("/branches") : Promise.resolve({ data: [] }),
      ];
      const [usersResponse, ecclesiasResponse, branchesResponse] = await Promise.all(requests);

      setUsers(usersResponse.data);
      setEcclesias(ecclesiasResponse.data);
      setBranches(
        user.role === ROLES.SUPER_ADMIN
          ? branchesResponse.data
          : [{ id: user.branchId, name: getBranchLabel(user.branch), code: user.branch?.code }]
      );
    } catch (error) {
      showToast({
        type: "error",
        title: "Users",
        message: getApiErrorMessage(error, "Unable to load users page."),
      });
    } finally {
      setIsLoading(false);
    }
  }, [getApiErrorMessage, showToast, user.branch, user.branchId, user.role]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const resetForm = useCallback(() => {
    setEditingUserId("");
    setForm(
      createEmptyFormForActor({
        role: user.role,
        branchId: user.branchId,
      })
    );
  }, [user.branchId, user.role]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => {
      const nextForm = {
        ...currentForm,
        [name]: value,
      };

      if (name === "role" && value !== ROLES.ECCLESIA_LEADER) {
        nextForm.ecclesiaId = "";
      }

      if (name === "branchId") {
        nextForm.ecclesiaId = "";
      }

      return nextForm;
    });
  }

  function canManageListedUser(listedUser) {
    if (user.role === ROLES.SUPER_ADMIN) {
      return listedUser.role !== ROLES.SUPER_ADMIN && listedUser.id !== user.id;
    }

    return [ROLES.ECCLESIA_LEADER, ROLES.FINANCE_ADMIN].includes(listedUser.role);
  }

  function handleEdit(listedUser) {
    setEditingUserId(listedUser.id);
    setForm({
      name: listedUser.name,
      email: listedUser.email,
      password: "",
      role: listedUser.role,
      branchId: getReferenceId(listedUser.branch) || listedUser.branchId || user.branchId || "",
      ecclesiaId: getReferenceId(listedUser.ecclesia) || listedUser.ecclesiaId || "",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      branchId: user.role === ROLES.BRANCH_ADMIN ? user.branchId : form.branchId,
      ecclesiaId: form.role === ROLES.ECCLESIA_LEADER ? form.ecclesiaId || null : null,
    };

    if (form.password) {
      payload.password = form.password;
    }

    try {
      if (editingUserId) {
        await api.put(`/users/${editingUserId}`, payload);
        showToast({
          title: "User updated",
          message: "The staff account was updated.",
        });
      } else {
        await api.post("/users", payload);
        showToast({
          title: "User created",
          message: "The new staff account can now sign in.",
        });
      }

      resetForm();
      await loadPageData();
    } catch (error) {
      showToast({
        type: "error",
        title: "Users",
        message: getApiErrorMessage(error, "Unable to save user."),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(listedUser) {
    if (!window.confirm(`Delete ${listedUser.name}?`)) {
      return;
    }

    try {
      await api.delete(`/users/${listedUser.id}`);
      showToast({
        title: "User deleted",
        message: `${listedUser.name} was removed.`,
      });

      if (editingUserId === listedUser.id) {
        resetForm();
      }

      await loadPageData();
    } catch (error) {
      showToast({
        type: "error",
        title: "Users",
        message: getApiErrorMessage(error, "Unable to delete user."),
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
          {user.role === ROLES.BRANCH_ADMIN ? "Staff Management" : "User Management"}
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
          Create and maintain internal leadership accounts
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Public sign-up stays disabled. Branch admins can create Ecclesia Leaders and Finance
          Admins only inside their own branch, while super admins keep global control and branch
          admin creation.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
        <form className={panelClass} onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
                {editingUserId ? "Edit User" : "New User"}
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">
                {editingUserId ? "Update staff access" : "Add a staff user"}
              </h3>
            </div>
            {editingUserId ? (
              <button
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                onClick={resetForm}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Name</span>
              <input
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                name="name"
                onChange={handleChange}
                value={form.name}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <input
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                name="email"
                onChange={handleChange}
                type="email"
                value={form.email}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Password {editingUserId ? "(leave blank to keep current password)" : ""}
              </span>
              <input
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                name="password"
                onChange={handleChange}
                type="password"
                value={form.password}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Role</span>
              <select
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                name="role"
                onChange={handleChange}
                value={form.role}
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {formatEnumLabel(role)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Branch</span>
              <select
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
                disabled={user.role === ROLES.BRANCH_ADMIN}
                name="branchId"
                onChange={handleChange}
                value={selectedBranchId || ""}
              >
                <option value="">Select branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
              </select>
            </label>

            {form.role === ROLES.ECCLESIA_LEADER ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Ecclesia</span>
                <select
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  name="ecclesiaId"
                  onChange={handleChange}
                  value={form.ecclesiaId}
                >
                  <option value="">Select Ecclesia</option>
                  {availableEcclesias.map((ecclesia) => (
                    <option key={ecclesia.id} value={ecclesia.id}>
                      {ecclesia.name}
                    </option>
                  ))}
                </select>
                {!availableEcclesias.length ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Create the branch Ecclesia first so this leader can be assigned correctly.
                  </p>
                ) : null}
              </label>
            ) : null}
          </div>

          <button
            className="mt-4 w-full rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Saving..." : editingUserId ? "Update user" : "Create user"}
          </button>
        </form>

        <section className={panelClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
                User List
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">Current staff accounts</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              {filteredUsers.length} shown
            </span>
          </div>

          <div className="mt-4">
            <input
              className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, role, branch, or Ecclesia"
              value={search}
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Branch</th>
                  <th className="pb-3 pr-4">Ecclesia</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {!isLoading && !filteredUsers.length ? (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={5}>
                      {search ? "No users match your search." : "No users found."}
                    </td>
                  </tr>
                ) : null}

                {filteredUsers.map((listedUser) => (
                  <tr key={listedUser.id}>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-950">{listedUser.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{listedUser.email}</p>
                    </td>
                    <td className="py-3 pr-4">{formatEnumLabel(listedUser.role)}</td>
                    <td className="py-3 pr-4">{getBranchLabel(listedUser.branch)}</td>
                    <td className="py-3 pr-4">{getEcclesiaLabel(listedUser.ecclesia)}</td>
                    <td className="py-4">
                      {canManageListedUser(listedUser) ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                            onClick={() => handleEdit(listedUser)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
                            onClick={() => handleDelete(listedUser)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Protected</span>
                      )}
                    </td>
                  </tr>
                ))}

                {isLoading ? (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={5}>
                      Loading users...
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
}
