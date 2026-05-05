import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import api from "../../../shared/api/client";
import MemberDetailsPanel from "../components/MemberDetailsPanel";
import MemberDirectoryTable from "../components/MemberDirectoryTable";
import MemberFormPanel from "../components/MemberFormPanel";
import { useAuth } from "../../auth/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import { getBranchLabel, getReferenceId } from "../../../shared/lib/data";
import {
  createEmptyMemberForm,
  getMemberDirectoryHeader,
  memberDirectoryPageSize,
  toDateInput,
} from "../../../shared/lib/memberDirectory";
import { ROLES } from "../../../shared/constants/roles";

export default function MembersPage() {
  const { getApiErrorMessage, user } = useAuth();
  const { showToast } = useToast();
  const [members, setMembers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [ecclesias, setEcclesias] = useState([]);
  const [buscells, setBuscells] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    branchId: "",
    ecclesiaId: "",
    buscellId: "",
    status: "",
  });
  const [form, setForm] = useState(createEmptyMemberForm);
  const [editingMemberId, setEditingMemberId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingReferences, setIsLoadingReferences] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deferredSearch = useDeferredValue(filters.search);
  const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;
  const isEcclesiaLeader = user.role === ROLES.ECCLESIA_LEADER;
  const header = getMemberDirectoryHeader(user.role);

  const selectedFilterBranchId = isSuperAdmin ? filters.branchId : user.branchId || "";
  const selectedFilterEcclesiaId = isEcclesiaLeader ? user.ecclesiaId || "" : filters.ecclesiaId;

  const availableFilterEcclesias = useMemo(
    () =>
      ecclesias.filter((ecclesia) => {
        const ecclesiaBranchId = getReferenceId(ecclesia.branch) || ecclesia.branchId;
        return !selectedFilterBranchId || ecclesiaBranchId === selectedFilterBranchId;
      }),
    [ecclesias, selectedFilterBranchId]
  );

  const availableFilterBuscells = useMemo(
    () =>
      buscells.filter((buscell) => {
        const buscellBranchId = getReferenceId(buscell.branch) || buscell.branchId;
        const buscellEcclesiaId = getReferenceId(buscell.ecclesia) || buscell.ecclesiaId;

        if (selectedFilterBranchId && buscellBranchId !== selectedFilterBranchId) {
          return false;
        }

        if (selectedFilterEcclesiaId && buscellEcclesiaId !== selectedFilterEcclesiaId) {
          return false;
        }

        return true;
      }),
    [buscells, selectedFilterBranchId, selectedFilterEcclesiaId]
  );

  const availableFormEcclesias = useMemo(
    () =>
      ecclesias.filter((ecclesia) => {
        const ecclesiaBranchId = getReferenceId(ecclesia.branch) || ecclesia.branchId;
        return !form.branchId || ecclesiaBranchId === form.branchId;
      }),
    [ecclesias, form.branchId]
  );

  const availableFormBuscells = useMemo(
    () =>
      buscells.filter((buscell) => {
        const buscellBranchId = getReferenceId(buscell.branch) || buscell.branchId;
        const buscellEcclesiaId = getReferenceId(buscell.ecclesia) || buscell.ecclesiaId;

        if (form.branchId && buscellBranchId !== form.branchId) {
          return false;
        }

        if (form.ecclesiaId && buscellEcclesiaId !== form.ecclesiaId) {
          return false;
        }

        return true;
      }),
    [buscells, form.branchId, form.ecclesiaId]
  );

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) || null,
    [members, selectedMemberId]
  );
  const totalPages = Math.max(1, Math.ceil(members.length / memberDirectoryPageSize));
  const paginatedMembers = useMemo(
    () =>
      members.slice(
        (currentPage - 1) * memberDirectoryPageSize,
        currentPage * memberDirectoryPageSize
      ),
    [currentPage, members]
  );

  const loadReferences = useCallback(async () => {
    try {
      setIsLoadingReferences(true);
      const requests = [
        api.get("/ecclesias"),
        api.get("/buscells"),
        isSuperAdmin ? api.get("/branches") : Promise.resolve({ data: [] }),
      ];
      const [ecclesiasResponse, buscellsResponse, branchesResponse] = await Promise.all(requests);

      setEcclesias(ecclesiasResponse.data);
      setBuscells(buscellsResponse.data);
      setBranches(
        isSuperAdmin
          ? branchesResponse.data
          : [{ id: user.branchId, name: getBranchLabel(user.branch), code: user.branch?.code }]
      );
    } catch (error) {
      showToast({
        type: "error",
        title: "Member directory",
        message: getApiErrorMessage(error, "Unable to load member directory references."),
      });
    } finally {
      setIsLoadingReferences(false);
    }
  }, [getApiErrorMessage, isSuperAdmin, showToast, user.branch, user.branchId]);

  const loadMembers = useCallback(async () => {
    try {
      setIsLoadingMembers(true);
      const params = {};

      if (deferredSearch.trim()) {
        params.search = deferredSearch.trim();
      }

      if (filters.status) {
        params.status = filters.status;
      }

      if (isSuperAdmin && filters.branchId) {
        params.branchId = filters.branchId;
      }

      if (!isEcclesiaLeader && filters.ecclesiaId) {
        params.ecclesiaId = filters.ecclesiaId;
      }

      if (filters.buscellId) {
        params.buscellId = filters.buscellId;
      }

      const response = await api.get("/members", { params });
      setMembers(response.data);
    } catch (error) {
      showToast({
        type: "error",
        title: "Member directory",
        message: getApiErrorMessage(error, "Unable to load members."),
      });
    } finally {
      setIsLoadingMembers(false);
    }
  }, [
    deferredSearch,
    filters.branchId,
    filters.buscellId,
    filters.ecclesiaId,
    filters.status,
    getApiErrorMessage,
    isEcclesiaLeader,
    isSuperAdmin,
    showToast,
  ]);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (!members.length) {
      setSelectedMemberId("");
      return;
    }

    if (!members.some((member) => member.id === selectedMemberId)) {
      setSelectedMemberId(members[0].id);
    }
  }, [members, selectedMemberId]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  function resetForm() {
    setEditingMemberId("");
    setForm(createEmptyMemberForm());
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
      ...(name === "branchId" ? { ecclesiaId: "", buscellId: "" } : {}),
      ...(name === "ecclesiaId" ? { buscellId: "" } : {}),
    }));
    setCurrentPage(1);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
      ...(name === "branchId" ? { ecclesiaId: "", buscellId: "" } : {}),
      ...(name === "ecclesiaId" ? { buscellId: "" } : {}),
    }));
  }

  function handleEdit(member) {
    setEditingMemberId(member.id);
    setSelectedMemberId(member.id);
    setForm({
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      phone: member.phone || "",
      email: member.email || "",
      gender: member.gender || "",
      address: member.address || "",
      dateOfBirth: toDateInput(member.dateOfBirth),
      maritalStatus: member.maritalStatus || "",
      joinDate: toDateInput(member.joinDate),
      familyGroup: member.familyGroup || "",
      ministryGroups: Array.isArray(member.ministryGroups)
        ? member.ministryGroups.join(", ")
        : "",
      branchId: getReferenceId(member.branch) || member.branchId || "",
      ecclesiaId: getReferenceId(member.ecclesia) || member.ecclesiaId || "",
      buscellId: getReferenceId(member.buscell) || member.buscellId || "",
      status: member.status || "ACTIVE",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      email: form.email || null,
      gender: form.gender || null,
      address: form.address,
      dateOfBirth: form.dateOfBirth || null,
      maritalStatus: form.maritalStatus || null,
      joinDate: form.joinDate,
      familyGroup: form.familyGroup,
      ministryGroups: form.ministryGroups
        .split(",")
        .map((group) => group.trim())
        .filter(Boolean),
      branchId: form.branchId,
      ecclesiaId: form.ecclesiaId,
      buscellId: form.buscellId,
      status: form.status,
    };

    try {
      if (editingMemberId) {
        const response = await api.put(`/members/${editingMemberId}`, payload);
        showToast({
          title: "Member updated",
          message: "The member assignment and profile were updated.",
        });
        setSelectedMemberId(response.data.member.id);
      } else {
        const response = await api.post("/members", payload);
        showToast({
          title: "Member created",
          message: "The member was created and assigned into the church hierarchy.",
        });
        setSelectedMemberId(response.data.member.id);
      }

      resetForm();
      await loadMembers();
    } catch (error) {
      showToast({
        type: "error",
        title: "Member directory",
        message: getApiErrorMessage(error, "Unable to save member."),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(member) {
    const confirmed = window.confirm(`Delete ${member.fullName}?`);

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/members/${member.id}`);
      showToast({
        title: "Member deleted",
        message: `${member.fullName} was removed from the directory.`,
      });

      if (editingMemberId === member.id) {
        resetForm();
      }

      await loadMembers();
    } catch (error) {
      showToast({
        type: "error",
        title: "Member directory",
        message: getApiErrorMessage(error, "Unable to delete member."),
      });
    }
  }

  const tableColumnCount =
    5 + (isSuperAdmin ? 1 : 0) + (!isEcclesiaLeader ? 1 : 0) + (isSuperAdmin ? 1 : 0);
  const memberTableProps = {
    availableFilterEcclesias,
    branches,
    buscells: availableFilterBuscells,
    currentPage,
    filters,
    isEcclesiaLeader,
    isLoadingMembers,
    isSuperAdmin,
    members,
    onDelete: handleDelete,
    onEdit: handleEdit,
    onFilterChange: handleFilterChange,
    onPageChange: setCurrentPage,
    onSelectMember: setSelectedMemberId,
    paginatedMembers,
    selectedMemberId,
    tableColumnCount,
    totalPages,
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
          {header.eyebrow}
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-950">{header.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{header.description}</p>
      </header>

      {isSuperAdmin ? (
        <section className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
          <MemberFormPanel
            availableFormBuscells={availableFormBuscells}
            availableFormEcclesias={availableFormEcclesias}
            branches={branches}
            editingMemberId={editingMemberId}
            form={form}
            isLoadingReferences={isLoadingReferences}
            isSubmitting={isSubmitting}
            onChange={handleFormChange}
            onReset={resetForm}
            onSubmit={handleSubmit}
          />

          <div className="flex flex-col gap-4">
            <MemberDirectoryTable {...memberTableProps} />
            <MemberDetailsPanel member={selectedMember} />
          </div>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <MemberDirectoryTable {...memberTableProps} />
          <MemberDetailsPanel member={selectedMember} />
        </section>
      )}
    </div>
  );
}
