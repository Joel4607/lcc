import { useCallback, useEffect, useState } from "react";
import api from "../../../shared/api/client";
import { useAuth } from "../../auth/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";

const emptyBranchForm = {
  name: "",
  code: "",
  address: "",
  phone: "",
};

const panelClass =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.3)]";

export default function BranchesPage() {
  const { getApiErrorMessage } = useAuth();
  const { showToast } = useToast();
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(emptyBranchForm);
  const [editingBranchId, setEditingBranchId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBranches = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/branches");
      setBranches(response.data);
    } catch (error) {
      showToast({
        type: "error",
        title: "Branches",
        message: getApiErrorMessage(error, "Unable to load branches."),
      });
    } finally {
      setIsLoading(false);
    }
  }, [getApiErrorMessage, showToast]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(emptyBranchForm);
    setEditingBranchId("");
  }

  function handleEdit(branch) {
    setEditingBranchId(branch.id);
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address || "",
      phone: branch.phone || "",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingBranchId) {
        await api.put(`/branches/${editingBranchId}`, form);
        showToast({
          title: "Branch updated",
          message: "The branch was updated successfully.",
        });
      } else {
        await api.post("/branches", form);
        showToast({
          title: "Branch created",
          message: "A new branch is ready for assignments.",
        });
      }

      resetForm();
      await loadBranches();
    } catch (error) {
      showToast({
        type: "error",
        title: "Branches",
        message: getApiErrorMessage(error, "Unable to save branch."),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(branch) {
    const confirmed = window.confirm(
      `Delete ${branch.name}? This only works when no users, buscells, or members still depend on it.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/branches/${branch.id}`);
      showToast({
        title: "Branch deleted",
        message: `${branch.name} was removed.`,
      });

      if (editingBranchId === branch.id) {
        resetForm();
      }

      await loadBranches();
    } catch (error) {
      showToast({
        type: "error",
        title: "Branches",
        message: getApiErrorMessage(error, "Unable to delete branch."),
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
          Branch Management
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-950">Create and maintain branches</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Branches are the base isolation unit for users, buscells, and members.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <form className={panelClass} onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
                {editingBranchId ? "Edit Branch" : "New Branch"}
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">
                {editingBranchId ? "Update branch details" : "Add a branch"}
              </h3>
            </div>
            {editingBranchId ? (
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
              <span className="mb-2 block text-sm font-medium text-slate-700">Code</span>
              <input
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 uppercase outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                name="code"
                onChange={handleChange}
                value={form.code}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Address</span>
              <textarea
                className="min-h-[110px] w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                name="address"
                onChange={handleChange}
                value={form.address}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Phone</span>
              <input
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                name="phone"
                onChange={handleChange}
                value={form.phone}
              />
            </label>
          </div>

          <button
            className="mt-4 w-full rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Saving..." : editingBranchId ? "Update branch" : "Create branch"}
          </button>
        </form>

        <section className={panelClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
                Branch List
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">Available branches</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              {branches.length} total
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Code</th>
                  <th className="pb-3 pr-4">Phone</th>
                  <th className="pb-3 pr-4">Address</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {!isLoading && !branches.length ? (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={5}>
                      No branches yet.
                    </td>
                  </tr>
                ) : null}

                {branches.map((branch) => (
                  <tr key={branch.id}>
                    <td className="py-3 pr-4 font-semibold text-slate-950">{branch.name}</td>
                    <td className="py-3 pr-4">{branch.code}</td>
                    <td className="py-3 pr-4">{branch.phone || "Not set"}</td>
                    <td className="py-3 pr-4">{branch.address || "Not set"}</td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                          onClick={() => handleEdit(branch)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
                          onClick={() => handleDelete(branch)}
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
                      Loading branches...
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
