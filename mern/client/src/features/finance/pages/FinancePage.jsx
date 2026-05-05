import { useCallback, useDeferredValue, useEffect, useState } from "react";
import api from "../../../shared/api/client";
import { FINANCE_PAYMENT_METHODS, FINANCE_TRANSACTION_TYPES } from "../../../shared/lib/finance";
import { useAuth } from "../../auth/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import {
  formatCurrency,
  formatDate,
  formatEnumLabel,
  getBranchLabel,
  getBuscellLabel,
  getReferenceId,
} from "../../../shared/lib/data";
import { ROLES } from "../../../shared/constants/roles";

const panelClass =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.3)]";

function getTodayInput() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultTransactionType(role) {
  return role === ROLES.ECCLESIA_LEADER ? "BUSCELL_OFFERING" : "TITHE";
}

function getTransactionTypeOptions(role) {
  if (role === ROLES.ECCLESIA_LEADER) {
    return ["BUSCELL_OFFERING"];
  }

  if (role === ROLES.FINANCE_ADMIN) {
    return FINANCE_TRANSACTION_TYPES.filter(
      (transactionType) => transactionType !== "BUSCELL_OFFERING"
    );
  }

  return FINANCE_TRANSACTION_TYPES;
}

export default function FinancePage({ hideHeader = false }) {
  const { getApiErrorMessage, user } = useAuth();
  const { showToast } = useToast();
  const [branches, setBranches] = useState([]);
  const [buscells, setBuscells] = useState([]);
  const [records, setRecords] = useState([]);
  const [lookup, setLookup] = useState(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isLoadingReferences, setIsLoadingReferences] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    umid: "",
    amount: "",
    transactionType: getDefaultTransactionType(user.role),
    paymentMethod: "CASH",
    date: getTodayInput(),
    notes: "",
  });
  const [editingRecordId, setEditingRecordId] = useState("");
  const [filters, setFilters] = useState({
    umid: "",
    branchId: user.role === ROLES.SUPER_ADMIN ? "" : user.branchId || "",
    buscellId: "",
    transactionType: "",
    paymentMethod: "",
    dateFrom: "",
    dateTo: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const deferredUmid = useDeferredValue(filters.umid);
  const canManageHistory = user.role === ROLES.FINANCE_ADMIN;
  const transactionTypeOptions = getTransactionTypeOptions(user.role);

  const loadReferences = useCallback(async () => {
    try {
      setIsLoadingReferences(true);
      const requests = [
        api.get("/buscells"),
        user.role === ROLES.SUPER_ADMIN ? api.get("/branches") : Promise.resolve({ data: [] }),
      ];
      const [buscellsResponse, branchesResponse] = await Promise.all(requests);

      setBuscells(buscellsResponse.data);
      setBranches(
        user.role === ROLES.SUPER_ADMIN
          ? branchesResponse.data
          : [{ id: user.branchId, name: getBranchLabel(user.branch), code: user.branch?.code }]
      );
    } catch (error) {
      showToast({
        type: "error",
        title: "Finance",
        message: getApiErrorMessage(error, "Unable to load finance references."),
      });
    } finally {
      setIsLoadingReferences(false);
    }
  }, [getApiErrorMessage, showToast, user.branch, user.branchId, user.role]);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const response = await api.get("/finance", {
        params: {
          umid: deferredUmid || undefined,
          branchId: user.role === ROLES.SUPER_ADMIN ? filters.branchId || undefined : undefined,
          buscellId: filters.buscellId || undefined,
          transactionType: filters.transactionType || undefined,
          paymentMethod: filters.paymentMethod || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        },
      });
      setRecords(response.data);
    } catch (error) {
      showToast({
        type: "error",
        title: "Finance",
        message: getApiErrorMessage(error, "Unable to load finance history."),
      });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [
    deferredUmid,
    filters.branchId,
    filters.buscellId,
    filters.dateFrom,
    filters.dateTo,
    filters.paymentMethod,
    filters.transactionType,
    getApiErrorMessage,
    showToast,
    user.role,
  ]);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function resetEntryForm() {
    setEditingRecordId("");
    setLookup(null);
    setFieldErrors({});
    setForm({
      umid: "",
      amount: "",
      transactionType: getDefaultTransactionType(user.role),
      paymentMethod: "CASH",
      date: getTodayInput(),
      notes: "",
    });
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    if (!editingRecordId && name === "umid") {
      setLookup(null);
    }

    setFieldErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[name];
      return nextErrors;
    });

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
      ...(name === "branchId" ? { buscellId: "" } : {}),
    }));
  }

  async function handleLookup() {
    if (!form.umid.trim()) {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        umid: "UMID is required before lookup.",
      }));
      return;
    }

    setIsLookingUp(true);

    try {
      const response = await api.get(`/members/lookup/${form.umid.trim().toUpperCase()}`);
      setLookup(response.data);
      setFieldErrors((currentErrors) => {
        const nextErrors = { ...currentErrors };
        delete nextErrors.umid;
        return nextErrors;
      });
      showToast({
        title: "Member found",
        message: `${response.data.fullName} is ready for finance entry.`,
      });
    } catch (error) {
      setLookup(null);
      showToast({
        type: "error",
        title: "Finance lookup",
        message: getApiErrorMessage(error, "Unable to verify that UMID."),
      });
    } finally {
      setIsLookingUp(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextFieldErrors = {};

    if (!editingRecordId && !lookup) {
      nextFieldErrors.umid = "Look up a valid UMID before saving.";
    }

    if (!form.amount || Number(form.amount) <= 0) {
      nextFieldErrors.amount = "Amount must be greater than 0.";
    }

    if (!form.date) {
      nextFieldErrors.date = "Date is required.";
    }

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      if (editingRecordId) {
        await api.put(`/finance/${editingRecordId}`, {
          amount: Number(form.amount),
          transactionType: form.transactionType,
          paymentMethod: form.paymentMethod,
          date: form.date,
          notes: form.notes,
        });
        showToast({
          title: "Finance updated",
          message: "The finance record was updated.",
        });
      } else {
        await api.post("/finance/entry", {
          umid: form.umid.trim().toUpperCase(),
          amount: Number(form.amount),
          transactionType: form.transactionType,
          paymentMethod: form.paymentMethod,
          date: form.date,
          notes: form.notes,
        });
        showToast({
          title: "Finance saved",
          message: "The finance record was created successfully.",
        });
      }

      resetEntryForm();
      await loadHistory();
    } catch (error) {
      if (error?.response?.data?.fieldErrors) {
        setFieldErrors(error.response.data.fieldErrors);
      }

      showToast({
        type: "error",
        title: "Finance",
        message: getApiErrorMessage(error, "Unable to save the finance record."),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function beginEdit(record) {
    setEditingRecordId(record.id);
    setLookup({
      fullName: record.member?.fullName || record.umid,
      umid: record.umid,
      branch: record.branch,
      buscell: record.buscell,
      status: "ACTIVE",
    });
    setForm({
      umid: record.umid,
      amount: String(record.amount),
      transactionType: record.transactionType,
      paymentMethod: record.paymentMethod,
      date: record.date ? new Date(record.date).toISOString().slice(0, 10) : getTodayInput(),
      notes: record.notes || "",
    });
  }

  async function handleDelete(record) {
    if (!window.confirm(`Delete transaction ${record.transactionId}?`)) {
      return;
    }

    try {
      await api.delete(`/finance/${record.id}`);
      showToast({
        title: "Finance deleted",
        message: `${record.transactionId} was removed.`,
      });

      if (editingRecordId === record.id) {
        resetEntryForm();
      }

      await loadHistory();
    } catch (error) {
      showToast({
        type: "error",
        title: "Finance",
        message: getApiErrorMessage(error, "Unable to delete the finance record."),
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {hideHeader ? null : (
        <header className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
            Finance
          </p>
          <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
            Enter transactions quickly with UMID verification
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Records are attached automatically to the right member, branch, and buscell once the UMID
            is verified inside your allowed scope.
          </p>
        </header>
      )}

      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <form className={panelClass} onSubmit={handleSubmit}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
                  {editingRecordId ? "Edit Transaction" : "Quick Entry"}
                </p>
                <h3 className="mt-2 text-xl font-bold text-slate-950">
                  {editingRecordId ? "Update finance details" : "Record a finance transaction"}
                </h3>
              </div>
              {editingRecordId ? (
                <button
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                  onClick={resetEntryForm}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
            </div>

            {!editingRecordId ? (
              <div className="mt-4 flex gap-3">
                <input
                  className={`min-w-0 flex-1 rounded-2xl border px-3 py-2.5 outline-none focus:ring-2 ${
                    fieldErrors.umid
                      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                      : "border-slate-300 focus:border-sky-400 focus:ring-sky-100"
                  }`}
                  name="umid"
                  onChange={handleFormChange}
                  placeholder="Enter UMID"
                  value={form.umid}
                />
                <button
                  className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLookingUp || !form.umid.trim()}
                  onClick={handleLookup}
                  type="button"
                >
                  {isLookingUp ? "Checking..." : "Lookup"}
                </button>
              </div>
            ) : null}

            {!editingRecordId && fieldErrors.umid ? (
              <p className="mt-2 text-sm text-rose-600">{fieldErrors.umid}</p>
            ) : null}

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm">
              {lookup ? (
                <div className="space-y-1">
                  <p className="font-semibold text-slate-950">{lookup.fullName}</p>
                  <p className="text-slate-600">
                    {lookup.umid} · {getBranchLabel(lookup.branch)} · {getBuscellLabel(lookup.buscell)}
                  </p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Status: {lookup.status}
                  </p>
                </div>
              ) : (
                <p className="text-slate-600">
                  {editingRecordId
                    ? "Transaction is locked to this member."
                    : "Look up a UMID to verify the member before saving the transaction."}
                </p>
              )}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Amount</span>
                <input
                  className={`w-full rounded-2xl border px-3 py-2.5 outline-none focus:ring-2 ${
                    fieldErrors.amount
                      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                      : "border-slate-300 focus:border-sky-400 focus:ring-sky-100"
                  }`}
                  min="0.01"
                  name="amount"
                  onChange={handleFormChange}
                  step="0.01"
                  type="number"
                  value={form.amount}
                />
                {fieldErrors.amount ? (
                  <p className="mt-2 text-sm text-rose-600">{fieldErrors.amount}</p>
                ) : null}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Date</span>
                <input
                  className={`w-full rounded-2xl border px-3 py-2.5 outline-none focus:ring-2 ${
                    fieldErrors.date
                      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                      : "border-slate-300 focus:border-sky-400 focus:ring-sky-100"
                  }`}
                  name="date"
                  onChange={handleFormChange}
                  type="date"
                  value={form.date}
                />
                {fieldErrors.date ? (
                  <p className="mt-2 text-sm text-rose-600">{fieldErrors.date}</p>
                ) : null}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Transaction Type
                </span>
                <select
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  name="transactionType"
                  onChange={handleFormChange}
                  value={form.transactionType}
                >
                  {transactionTypeOptions.map((transactionType) => (
                    <option key={transactionType} value={transactionType}>
                      {formatEnumLabel(transactionType)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Payment Method</span>
                <select
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  name="paymentMethod"
                  onChange={handleFormChange}
                  value={form.paymentMethod}
                >
                  {FINANCE_PAYMENT_METHODS.map((paymentMethod) => (
                    <option key={paymentMethod} value={paymentMethod}>
                      {formatEnumLabel(paymentMethod)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">Notes</span>
                <textarea
                  className="min-h-[100px] w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  name="notes"
                  onChange={handleFormChange}
                  value={form.notes}
                />
              </label>
            </div>

            <button
              className="mt-4 w-full rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || (!editingRecordId && !lookup) || isLoadingReferences}
              type="submit"
            >
              {isSubmitting
                ? "Saving..."
                : editingRecordId
                  ? "Update Finance Record"
                  : "Create Finance Record"}
            </button>
          </form>
        </div>

        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
                Finance History
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">Recorded transactions</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              {records.length} loaded
            </span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <input
              className="rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              name="umid"
              onChange={handleFilterChange}
              placeholder="Filter by UMID"
              value={filters.umid}
            />

            {user.role === ROLES.SUPER_ADMIN ? (
              <select
                className="rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                name="branchId"
                onChange={handleFilterChange}
                value={filters.branchId}
              >
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
              </select>
            ) : null}

            <select
              className="rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              name="buscellId"
              onChange={handleFilterChange}
              value={filters.buscellId}
            >
              <option value="">All buscells</option>
              {buscells
                .filter((buscell) =>
                  user.role === ROLES.SUPER_ADMIN
                    ? !filters.branchId || getReferenceId(buscell.branch) === filters.branchId
                    : true
                )
                .map((buscell) => (
                  <option key={buscell.id} value={buscell.id}>
                    {buscell.name}
                  </option>
                ))}
            </select>

            <select
              className="rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              name="transactionType"
              onChange={handleFilterChange}
              value={filters.transactionType}
            >
              <option value="">All transaction types</option>
              {FINANCE_TRANSACTION_TYPES.map((transactionType) => (
                <option key={transactionType} value={transactionType}>
                  {formatEnumLabel(transactionType)}
                </option>
              ))}
            </select>

            <select
              className="rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              name="paymentMethod"
              onChange={handleFilterChange}
              value={filters.paymentMethod}
            >
              <option value="">All payment methods</option>
              {FINANCE_PAYMENT_METHODS.map((paymentMethod) => (
                <option key={paymentMethod} value={paymentMethod}>
                  {formatEnumLabel(paymentMethod)}
                </option>
              ))}
            </select>

            <input
              className="rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              name="dateFrom"
              onChange={handleFilterChange}
              type="date"
              value={filters.dateFrom}
            />
            <input
              className="rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              name="dateTo"
              onChange={handleFilterChange}
              type="date"
              value={filters.dateTo}
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <th className="pb-3 pr-4">Transaction</th>
                  <th className="pb-3 pr-4">Member</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Scope</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {!isLoadingHistory && !records.length ? (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={7}>
                      No finance records match the current filters.
                    </td>
                  </tr>
                ) : null}

                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-950">{record.transactionId}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatEnumLabel(record.paymentMethod)}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-950">{record.member?.fullName || record.umid}</p>
                      <p className="mt-1 text-xs text-slate-500">{record.umid}</p>
                    </td>
                    <td className="py-3 pr-4">{formatEnumLabel(record.transactionType)}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-500">
                      {formatCurrency(record.amount)}
                    </td>
                    <td className="py-3 pr-4">{formatDate(record.date)}</td>
                    <td className="py-3 pr-4">
                      <p>{getBranchLabel(record.branch)}</p>
                      <p className="mt-1 text-xs text-slate-500">{getBuscellLabel(record.buscell)}</p>
                    </td>
                    <td className="py-4">
                      {canManageHistory ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                            onClick={() => beginEdit(record)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
                            onClick={() => handleDelete(record)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Read only</span>
                      )}
                    </td>
                  </tr>
                ))}

                {isLoadingHistory ? (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={7}>
                      Loading finance history...
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
