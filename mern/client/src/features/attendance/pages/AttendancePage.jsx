import { startTransition, useCallback, useDeferredValue, useEffect, useState } from "react";
import api from "../../../shared/api/client";
import { ATTENDANCE_MEETING_TYPES, ATTENDANCE_STATUSES } from "../../../shared/lib/attendance";
import { useAuth } from "../../auth/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import {
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

function getRelevantMembers({ form, members }) {
  if (form.buscellId) {
    return members.filter((member) => getReferenceId(member.buscell) === form.buscellId);
  }

  if (form.meetingType === "BUSCELL_WEEKLY") {
    return [];
  }

  return members;
}

export default function AttendancePage({ hideHeader = false }) {
  const { getApiErrorMessage, user } = useAuth();
  const { showToast } = useToast();
  const [branches, setBranches] = useState([]);
  const [buscells, setBuscells] = useState([]);
  const [members, setMembers] = useState([]);
  const [records, setRecords] = useState([]);
  const [batchStatuses, setBatchStatuses] = useState({});
  const [form, setForm] = useState({
    date: getTodayInput(),
    meetingType: "SUNDAY_SERVICE",
    eventId: "",
    branchId: user.branchId || "",
    buscellId: "",
  });
  const [filters, setFilters] = useState({
    umid: "",
    branchId: user.role === ROLES.SUPER_ADMIN ? "" : user.branchId || "",
    buscellId: "",
    meetingType: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });
  const [editingRecordId, setEditingRecordId] = useState("");
  const [editingForm, setEditingForm] = useState({
    date: getTodayInput(),
    meetingType: "SUNDAY_SERVICE",
    status: "PRESENT",
    eventId: "",
  });
  const [isLoadingReferences, setIsLoadingReferences] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const deferredUmid = useDeferredValue(filters.umid);
  const selectedBranchId = user.role === ROLES.SUPER_ADMIN ? form.branchId : user.branchId || "";
  const availableBuscells = buscells.filter((buscell) =>
    selectedBranchId ? getReferenceId(buscell.branch) === selectedBranchId : true
  );
  const relevantMembers = getRelevantMembers({ form, members });

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
        title: "Attendance",
        message: getApiErrorMessage(error, "Unable to load attendance references."),
      });
    } finally {
      setIsLoadingReferences(false);
    }
  }, [getApiErrorMessage, showToast, user.branch, user.branchId, user.role]);

  const loadMembers = useCallback(async () => {
    try {
      setIsLoadingMembers(true);

      if (!selectedBranchId) {
        setMembers([]);
        return;
      }

      const response = await api.get("/members", {
        params: {
          branchId: selectedBranchId,
        },
      });
      setMembers(response.data);
    } catch (error) {
      showToast({
        type: "error",
        title: "Attendance",
        message: getApiErrorMessage(error, "Unable to load members for attendance."),
      });
    } finally {
      setIsLoadingMembers(false);
    }
  }, [getApiErrorMessage, selectedBranchId, showToast]);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const response = await api.get("/attendance", {
        params: {
          umid: deferredUmid || undefined,
          branchId: user.role === ROLES.SUPER_ADMIN ? filters.branchId || undefined : undefined,
          buscellId: filters.buscellId || undefined,
          meetingType: filters.meetingType || undefined,
          status: filters.status || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        },
      });
      setRecords(response.data);
    } catch (error) {
      showToast({
        type: "error",
        title: "Attendance",
        message: getApiErrorMessage(error, "Unable to load attendance history."),
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
    filters.meetingType,
    filters.status,
    getApiErrorMessage,
    showToast,
    user.role,
  ]);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setBatchStatuses((currentStatuses) => {
      const nextStatuses = {};

      relevantMembers.forEach((member) => {
        nextStatuses[member.umid] = currentStatuses[member.umid] || "ABSENT";
      });

      return nextStatuses;
    });
  }, [relevantMembers]);

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
      ...(name === "branchId" ? { buscellId: "" } : {}),
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

  function handleBatchStatusChange(umid, status) {
    setBatchStatuses((currentStatuses) => ({
      ...currentStatuses,
      [umid]: status,
    }));
  }

  function applyStatusToAll(status) {
    startTransition(() => {
      setBatchStatuses(Object.fromEntries(relevantMembers.map((member) => [member.umid, status])));
    });
  }

  function beginEdit(record) {
    setEditingRecordId(record.id);
    setEditingForm({
      date: record.date ? new Date(record.date).toISOString().slice(0, 10) : getTodayInput(),
      meetingType: record.meetingType,
      status: record.status,
      eventId: record.eventId || "",
    });
  }

  function cancelEdit() {
    setEditingRecordId("");
    setEditingForm({
      date: getTodayInput(),
      meetingType: "SUNDAY_SERVICE",
      status: "PRESENT",
      eventId: "",
    });
  }

  function handleEditingFormChange(event) {
    const { name, value } = event.target;

    setEditingForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleSubmitBatch(event) {
    event.preventDefault();

    if (!relevantMembers.length) {
      return;
    }

    setIsSubmittingBatch(true);

    try {
      await api.post("/attendance/batch", {
        date: form.date,
        meetingType: form.meetingType,
        eventId: form.eventId || null,
        records: relevantMembers.map((member) => ({
          umid: member.umid,
          status: batchStatuses[member.umid] || "ABSENT",
        })),
      });

      showToast({
        title: "Attendance saved",
        message: `Saved ${relevantMembers.length} attendance records.`,
      });

      await loadHistory();
    } catch (error) {
      showToast({
        type: "error",
        title: "Attendance",
        message: getApiErrorMessage(error, "Unable to submit attendance batch."),
      });
    } finally {
      setIsSubmittingBatch(false);
    }
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    setIsSavingEdit(true);

    try {
      await api.put(`/attendance/${editingRecordId}`, {
        date: editingForm.date,
        meetingType: editingForm.meetingType,
        status: editingForm.status,
        eventId: editingForm.eventId || null,
      });

      showToast({
        title: "Attendance updated",
        message: "The attendance record was updated.",
      });

      cancelEdit();
      await loadHistory();
    } catch (error) {
      showToast({
        type: "error",
        title: "Attendance",
        message: getApiErrorMessage(error, "Unable to update attendance."),
      });
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDeleteRecord(record) {
    if (!window.confirm(`Delete the ${formatEnumLabel(record.meetingType)} record for ${record.member?.fullName || record.umid}?`)) {
      return;
    }

    try {
      await api.delete(`/attendance/${record.id}`);
      showToast({
        title: "Attendance deleted",
        message: "The attendance record was removed.",
      });

      if (editingRecordId === record.id) {
        cancelEdit();
      }

      await loadHistory();
    } catch (error) {
      showToast({
        type: "error",
        title: "Attendance",
        message: getApiErrorMessage(error, "Unable to delete attendance."),
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {hideHeader ? null : (
        <header className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
            Attendance
          </p>
          <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
            Capture meeting attendance with scoped batch entry
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Capture branch-safe attendance in one place, with optional buscell selection for weekly
            meetings.
          </p>
        </header>
      )}

      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <form className={panelClass} onSubmit={handleSubmitBatch}>
            <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
              Batch Capture
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">Take attendance for one meeting</h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Date</span>
                <input
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  name="date"
                  onChange={handleFormChange}
                  type="date"
                  value={form.date}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Meeting Type</span>
                <select
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  name="meetingType"
                  onChange={handleFormChange}
                  value={form.meetingType}
                >
                  {ATTENDANCE_MEETING_TYPES.map((meetingType) => (
                    <option key={meetingType} value={meetingType}>
                      {formatEnumLabel(meetingType)}
                    </option>
                  ))}
                </select>
              </label>

              {user.role === ROLES.SUPER_ADMIN ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Branch</span>
                  <select
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    name="branchId"
                    onChange={handleFormChange}
                    value={form.branchId}
                  >
                    <option value="">Select branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Buscell</span>
                <select
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  name="buscellId"
                  onChange={handleFormChange}
                  value={form.buscellId}
                >
                  <option value="">All relevant members</option>
                  {availableBuscells.map((buscell) => (
                    <option key={buscell.id} value={buscell.id}>
                      {buscell.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Event ID (optional)
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  name="eventId"
                  onChange={handleFormChange}
                  placeholder="Revival-night-1"
                  value={form.eventId}
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                onClick={() => applyStatusToAll("PRESENT")}
                type="button"
              >
                Mark All Present
              </button>
              <button
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                onClick={() => applyStatusToAll("ABSENT")}
                type="button"
              >
                Mark All Absent
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {!relevantMembers.length && !isLoadingMembers ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  {form.meetingType === "BUSCELL_WEEKLY" && !form.buscellId
                    ? "Select a buscell to capture BUSCELL_WEEKLY attendance."
                    : "No members are available for this attendance batch."}
                </div>
              ) : null}

              {relevantMembers.map((member) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-3 py-2.5"
                  key={member.id}
                >
                  <div>
                    <p className="font-semibold text-slate-950">{member.fullName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {member.umid} · {member.phone} · {getBuscellLabel(member.buscell)}
                    </p>
                  </div>
                  <div className="flex rounded-full border border-slate-300 p-1">
                    {ATTENDANCE_STATUSES.map((status) => (
                      <button
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                          batchStatuses[member.umid] === status
                            ? "bg-slate-950 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                        key={status}
                        onClick={() => handleBatchStatusChange(member.umid, status)}
                        type="button"
                      >
                        {formatEnumLabel(status)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {isLoadingMembers ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Loading members...
                </div>
              ) : null}
            </div>

            <button
              className="mt-4 w-full rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmittingBatch || !relevantMembers.length || isLoadingReferences}
              type="submit"
            >
              {isSubmittingBatch ? "Saving..." : `Submit ${relevantMembers.length || ""} Attendance Records`}
            </button>
          </form>

          {editingRecordId ? (
            <form className={panelClass} onSubmit={handleSaveEdit}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
                    Edit Record
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-slate-950">Update attendance details</h3>
                </div>
                <button
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                  onClick={cancelEdit}
                  type="button"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Date</span>
                  <input
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    name="date"
                    onChange={handleEditingFormChange}
                    type="date"
                    value={editingForm.date}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Meeting Type</span>
                  <select
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    name="meetingType"
                    onChange={handleEditingFormChange}
                    value={editingForm.meetingType}
                  >
                    {ATTENDANCE_MEETING_TYPES.map((meetingType) => (
                      <option key={meetingType} value={meetingType}>
                        {formatEnumLabel(meetingType)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
                  <select
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    name="status"
                    onChange={handleEditingFormChange}
                    value={editingForm.status}
                  >
                    {ATTENDANCE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {formatEnumLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Event ID (optional)
                  </span>
                  <input
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    name="eventId"
                    onChange={handleEditingFormChange}
                    value={editingForm.eventId}
                  />
                </label>
              </div>

              <button
                className="mt-4 w-full rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSavingEdit}
                type="submit"
              >
                {isSavingEdit ? "Saving..." : "Update Attendance Record"}
              </button>
            </form>
          ) : null}
        </div>

        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
                Attendance History
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">Recorded attendance entries</h3>
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
              name="meetingType"
              onChange={handleFilterChange}
              value={filters.meetingType}
            >
              <option value="">All meeting types</option>
              {ATTENDANCE_MEETING_TYPES.map((meetingType) => (
                <option key={meetingType} value={meetingType}>
                  {formatEnumLabel(meetingType)}
                </option>
              ))}
            </select>

            <select
              className="rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              name="status"
              onChange={handleFilterChange}
              value={filters.status}
            >
              <option value="">All statuses</option>
              {ATTENDANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatEnumLabel(status)}
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
                  <th className="pb-3 pr-4">Member</th>
                  <th className="pb-3 pr-4">Meeting</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Branch</th>
                  <th className="pb-3 pr-4">Buscell</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {!isLoadingHistory && !records.length ? (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={7}>
                      No attendance records match the current filters.
                    </td>
                  </tr>
                ) : null}

                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-950">{record.member?.fullName || record.umid}</p>
                      <p className="mt-1 text-xs text-slate-500">{record.umid}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p>{formatEnumLabel(record.meetingType)}</p>
                      <p className="mt-1 text-xs text-slate-500">{record.eventId || "No event id"}</p>
                    </td>
                    <td className="py-3 pr-4">{formatDate(record.date)}</td>
                    <td className="py-3 pr-4">{formatEnumLabel(record.status)}</td>
                    <td className="py-3 pr-4">{getBranchLabel(record.branch)}</td>
                    <td className="py-3 pr-4">{getBuscellLabel(record.buscell)}</td>
                    <td className="py-4">
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
                          onClick={() => handleDeleteRecord(record)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {isLoadingHistory ? (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={7}>
                      Loading attendance history...
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
