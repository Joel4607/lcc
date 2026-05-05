import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../../shared/api/client";
import { useAuth } from "../../auth/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import { getBranchLabel, getEcclesiaLabel, getReferenceId } from "../../../shared/lib/data";
import { ROLES } from "../../../shared/constants/roles";

const emptyBuscellForm = {
  name: "",
  branchId: "",
  ecclesiaId: "",
  meetingDay: "",
  description: "",
};

const panelClass =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.3)]";

export default function BuscellsPage() {
  const { getApiErrorMessage, user } = useAuth();
  const { showToast } = useToast();
  const [buscells, setBuscells] = useState([]);
  const [branches, setBranches] = useState([]);
  const [ecclesias, setEcclesias] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    ...emptyBuscellForm,
    branchId: user.role === ROLES.BRANCH_ADMIN ? user.branchId || "" : "",
  });
  const [editingBuscellId, setEditingBuscellId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedBranchId = user.role === ROLES.BRANCH_ADMIN ? user.branchId : form.branchId;
  const availableEcclesias = useMemo(
    () =>
      ecclesias.filter((ecclesia) => {
        const ecclesiaBranchId = getReferenceId(ecclesia.branch) || ecclesia.branchId;
        return !selectedBranchId || ecclesiaBranchId === selectedBranchId;
      }),
    [ecclesias, selectedBranchId]
  );
  const filteredBuscells = buscells.filter((buscell) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    const haystack = [
      buscell.name,
      getBranchLabel(buscell.branch),
      getEcclesiaLabel(buscell.ecclesia),
      buscell.ecclesia?.leader?.name || "",
      buscell.meetingDay || "",
      buscell.description || "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  const loadPageData = useCallback(async () => {
    try {
      setIsLoading(true);
      const requests = [
        api.get("/buscells"),
        api.get("/ecclesias"),
        user.role === ROLES.SUPER_ADMIN ? api.get("/branches") : Promise.resolve({ data: [] }),
      ];
      const [buscellsResponse, ecclesiasResponse, branchesResponse] = await Promise.all(requests);

      setBuscells(buscellsResponse.data);
      setEcclesias(ecclesiasResponse.data);
      setBranches(
        user.role === ROLES.SUPER_ADMIN
          ? branchesResponse.data
          : [{ id: user.branchId, name: getBranchLabel(user.branch), code: user.branch?.code }]
      );
    } catch (error) {
      showToast({
        type: "error",
        title: "Buscells",
        message: getApiErrorMessage(error, "Unable to load buscells page."),
      });
    } finally {
      setIsLoading(false);
    }
  }, [getApiErrorMessage, showToast, user.branch, user.branchId, user.role]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const resetForm = useCallback(() => {
    setEditingBuscellId("");
    setForm({
      ...emptyBuscellForm,
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
      ...(name === "branchId" ? { ecclesiaId: "" } : {}),
    }));
  }

  function handleEdit(buscell) {
    setEditingBuscellId(buscell.id);
    setForm({
      name: buscell.name,
      branchId: getReferenceId(buscell.branch) || buscell.branchId || user.branchId || "",
      ecclesiaId: getReferenceId(buscell.ecclesia) || buscell.ecclesiaId || "",
      meetingDay: buscell.meetingDay || "",
      description: buscell.description || "",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    const payload = {
      name: form.name,
      branchId: user.role === ROLES.BRANCH_ADMIN ? user.branchId : form.branchId,
      ecclesiaId: form.ecclesiaId,
      meetingDay: form.meetingDay,
      description: form.description,
    };

    try {
      if (editingBuscellId) {
        await api.put(`/buscells/${editingBuscellId}`, payload);
        showToast({
          title: "Buscell updated",
          message: "The buscell details were updated.",
        });
      } else {
        await api.post("/buscells", payload);
        showToast({
          title: "Buscell created",
          message: "A new buscell is ready for weekly reporting.",
        });
      }

      resetForm();
      await loadPageData();
    } catch (error) {
      showToast({
        type: "error",
        title: "Buscells",
        message: getApiErrorMessage(error, "Unable to save buscell."),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(buscell) {
    if (!window.confirm(`Delete ${buscell.name}? Reassign any linked members first.`)) {
      return;
    }

    try {
      await api.delete(`/buscells/${buscell.id}`);
      showToast({
        title: "Buscell deleted",
        message: `${buscell.name} was removed.`,
      });

      if (editingBuscellId === buscell.id) {
        resetForm();
      }

      await loadPageData();
    } catch (error) {
      showToast({
        type: "error",
        title: "Buscells",
        message: getApiErrorMessage(error, "Unable to delete buscell."),
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
          {user.role === ROLES.BRANCH_ADMIN ? "Buscell Structure" : "Buscell Management"}
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
          Organize each branch into Ecclesia-linked buscells
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Every buscell now sits inside one Ecclesia, keeping weekly data entry and review aligned
          with the new church structure layer.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
        <form className={panelClass} onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
                {editingBuscellId ? "Edit Buscell" : "New Buscell"}
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">
                {editingBuscellId ? "Update buscell details" : "Add a buscell"}
              </h3>
            </div>
            {editingBuscellId ? (
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
                disabled={user.role === ROLES.BRANCH_ADMIN || Boolean(editingBuscellId)}
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
                  Create an Ecclesia in this branch first before adding buscells to it.
                </p>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Meeting Day</span>
              <input
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                name="meetingDay"
                onChange={handleChange}
                placeholder="Wednesday"
                value={form.meetingDay}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Description</span>
              <textarea
                className="min-h-[120px] w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                name="description"
                onChange={handleChange}
                value={form.description}
              />
            </label>
          </div>

          <button
            className="mt-4 w-full rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Saving..." : editingBuscellId ? "Update buscell" : "Create buscell"}
          </button>
        </form>

        <section className={panelClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
                Buscell List
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">Current buscells</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              {filteredBuscells.length} shown
            </span>
          </div>

          <div className="mt-4">
            <input
              className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by buscell, branch, Ecclesia, or meeting day"
              value={search}
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Branch</th>
                  <th className="pb-3 pr-4">Ecclesia</th>
                  <th className="pb-3 pr-4">Leader</th>
                  <th className="pb-3 pr-4">Meeting Day</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {!isLoading && !filteredBuscells.length ? (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={6}>
                      {search ? "No buscells match your search." : "No buscells found."}
                    </td>
                  </tr>
                ) : null}

                {filteredBuscells.map((buscell) => (
                  <tr key={buscell.id}>
                    <td className="py-3 pr-4 font-semibold text-slate-950">{buscell.name}</td>
                    <td className="py-3 pr-4">{getBranchLabel(buscell.branch)}</td>
                    <td className="py-3 pr-4">{getEcclesiaLabel(buscell.ecclesia)}</td>
                    <td className="py-3 pr-4">{buscell.ecclesia?.leader?.name || "Not assigned"}</td>
                    <td className="py-3 pr-4">{buscell.meetingDay || "Not set"}</td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                          onClick={() => handleEdit(buscell)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
                          onClick={() => handleDelete(buscell)}
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
                    <td className="py-4 text-slate-500" colSpan={6}>
                      Loading buscells...
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
