import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../../shared/api/client";
import { useAuth } from "../../auth/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import { formatDate, formatEnumLabel, getBranchLabel, getReferenceId } from "../../../shared/lib/data";
import { ROLES } from "../../../shared/constants/roles";

const emptyEcclesiaForm = {
  name: "",
  branchId: "",
  leaderId: "",
};

const panelClass =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.3)]";

export default function EcclesiasPage() {
  const { getApiErrorMessage, user } = useAuth();
  const { showToast } = useToast();
  const [ecclesias, setEcclesias] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    ...emptyEcclesiaForm,
    branchId: user.role === ROLES.BRANCH_ADMIN ? user.branchId || "" : "",
  });
  const [editingEcclesiaId, setEditingEcclesiaId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedBranchId = user.role === ROLES.BRANCH_ADMIN ? user.branchId : form.branchId;
  const leaderOptions = useMemo(
    () =>
      users.filter((listedUser) => {
        const listedBranchId = getReferenceId(listedUser.branch) || listedUser.branchId;
        const currentEcclesiaId =
          getReferenceId(listedUser.ecclesia) || listedUser.ecclesiaId || "";

        if (listedUser.role !== ROLES.ECCLESIA_LEADER) {
          return false;
        }

        if (selectedBranchId && listedBranchId !== selectedBranchId) {
          return false;
        }

        return !currentEcclesiaId || currentEcclesiaId === editingEcclesiaId;
      }),
    [editingEcclesiaId, selectedBranchId, users]
  );
  const filteredEcclesias = ecclesias.filter((ecclesia) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    const haystack = [
      ecclesia.name,
      getBranchLabel(ecclesia.branch),
      ecclesia.leader?.name || "",
      ecclesia.leader?.email || "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  const loadPageData = useCallback(async () => {
    try {
      setIsLoading(true);
      const requests = [
        api.get("/ecclesias"),
        api.get("/users"),
        user.role === ROLES.SUPER_ADMIN ? api.get("/branches") : Promise.resolve({ data: [] }),
      ];
      const [ecclesiasResponse, usersResponse, branchesResponse] = await Promise.all(requests);

      setEcclesias(ecclesiasResponse.data);
      setUsers(usersResponse.data);
      setBranches(
        user.role === ROLES.SUPER_ADMIN
          ? branchesResponse.data
          : [{ id: user.branchId, name: getBranchLabel(user.branch), code: user.branch?.code }]
      );
    } catch (error) {
      showToast({
        type: "error",
        title: "Ecclesias",
        message: getApiErrorMessage(error, "Unable to load ecclesias page."),
      });
    } finally {
      setIsLoading(false);
    }
  }, [getApiErrorMessage, showToast, user.branch, user.branchId, user.role]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const resetForm = useCallback(() => {
    setEditingEcclesiaId("");
    setForm({
      ...emptyEcclesiaForm,
      branchId: user.role === ROLES.BRANCH_ADMIN ? user.branchId || "" : "",
    });
  }, [user.branchId, user.role]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
      ...(name === "branchId" ? { leaderId: "" } : {}),
    }));
  }

  function handleEdit(ecclesia) {
    setEditingEcclesiaId(ecclesia.id);
    setForm({
      name: ecclesia.name,
      branchId: getReferenceId(ecclesia.branch) || ecclesia.branchId || user.branchId || "",
      leaderId: getReferenceId(ecclesia.leader) || ecclesia.leaderId || "",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    const payload = {
      name: form.name,
      branchId: user.role === ROLES.BRANCH_ADMIN ? user.branchId : form.branchId,
      leaderId: form.leaderId || null,
    };

    try {
      if (editingEcclesiaId) {
        await api.put(`/ecclesias/${editingEcclesiaId}`, payload);
        showToast({
          title: "Ecclesia updated",
          message: "The Ecclesia details were updated.",
        });
      } else {
        await api.post("/ecclesias", payload);
        showToast({
          title: "Ecclesia created",
          message: "The new Ecclesia is ready for buscell assignments.",
        });
      }

      resetForm();
      await loadPageData();
    } catch (error) {
      showToast({
        type: "error",
        title: "Ecclesias",
        message: getApiErrorMessage(error, "Unable to save Ecclesia."),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(ecclesia) {
    const confirmed = window.confirm(
      `Delete ${ecclesia.name}? This only works after its buscells have been removed or reassigned.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/ecclesias/${ecclesia.id}`);
      showToast({
        title: "Ecclesia deleted",
        message: `${ecclesia.name} was removed.`,
      });

      if (editingEcclesiaId === ecclesia.id) {
        resetForm();
      }

      await loadPageData();
    } catch (error) {
      showToast({
        type: "error",
        title: "Ecclesias",
        message: getApiErrorMessage(error, "Unable to delete Ecclesia."),
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
          Ecclesia Management
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
          Create the middle layer between branches and buscells
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Ecclesias group buscell operations inside each branch. Branch admins can manage them
          safely in their own branch, while Ecclesia Leaders stay focused on data entry only.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
        <form className={panelClass} onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
                {editingEcclesiaId ? "Edit Ecclesia" : "New Ecclesia"}
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">
                {editingEcclesiaId ? "Update Ecclesia details" : "Add an Ecclesia"}
              </h3>
            </div>
            {editingEcclesiaId ? (
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
              <span className="mb-2 block text-sm font-medium text-slate-700">Branch</span>
              <select
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
                disabled={user.role === ROLES.BRANCH_ADMIN || Boolean(editingEcclesiaId)}
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

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Ecclesia Leader
              </span>
              <select
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                name="leaderId"
                onChange={handleChange}
                value={form.leaderId}
              >
                <option value="">No leader assigned yet</option>
                {leaderOptions.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name} · {formatEnumLabel(leader.role)}
                  </option>
                ))}
              </select>
              {!leaderOptions.length ? (
                <p className="mt-2 text-xs text-slate-500">
                  Create an Ecclesia Leader in this branch first if you want to assign one now.
                </p>
              ) : null}
            </label>
          </div>

          <button
            className="mt-4 w-full rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Saving..." : editingEcclesiaId ? "Update Ecclesia" : "Create Ecclesia"}
          </button>
        </form>

        <section className={panelClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
                Ecclesia List
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">Current Ecclesias</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              {filteredEcclesias.length} shown
            </span>
          </div>

          <div className="mt-4">
            <input
              className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by Ecclesia, branch, or leader"
              value={search}
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Branch</th>
                  <th className="pb-3 pr-4">Leader</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {!isLoading && !filteredEcclesias.length ? (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={5}>
                      {search ? "No Ecclesias match your search." : "No Ecclesias found yet."}
                    </td>
                  </tr>
                ) : null}

                {filteredEcclesias.map((ecclesia) => (
                  <tr key={ecclesia.id}>
                    <td className="py-3 pr-4 font-semibold text-slate-950">{ecclesia.name}</td>
                    <td className="py-3 pr-4">{getBranchLabel(ecclesia.branch)}</td>
                    <td className="py-3 pr-4">{ecclesia.leader?.name || "Not assigned"}</td>
                    <td className="py-3 pr-4">{formatDate(ecclesia.createdAt)}</td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                          onClick={() => handleEdit(ecclesia)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
                          onClick={() => handleDelete(ecclesia)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {isLoading ? (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={5}>
                      Loading Ecclesias...
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
