import {
  formatDate,
  getBranchLabel,
  getBuscellLabel,
  getEcclesiaLabel,
} from "../../../shared/lib/data";
import {
  getMemberStatusBadgeClass,
  memberDirectoryPanelClass,
  memberStatusOptions,
} from "../../../shared/lib/memberDirectory";

export default function MemberDirectoryTable({
  branches,
  buscells,
  currentPage,
  filters,
  isEcclesiaLeader,
  isLoadingMembers,
  isSuperAdmin,
  members,
  onDelete,
  onEdit,
  onFilterChange,
  onPageChange,
  onSelectMember,
  paginatedMembers,
  selectedMemberId,
  tableColumnCount,
  totalPages,
  availableFilterEcclesias,
}) {
  return (
    <section className={memberDirectoryPanelClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
            Member Directory
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-950">
            {isSuperAdmin
              ? "All church members"
              : isEcclesiaLeader
                ? "Members in your Ecclesia"
                : "Members in your branch"}
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
          {members.length} total
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
        <input
          className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 xl:col-span-2"
          name="search"
          onChange={onFilterChange}
          placeholder="Search by name, UMID, or phone"
          value={filters.search}
        />

        {isSuperAdmin ? (
          <select
            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="branchId"
            onChange={onFilterChange}
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

        {!isEcclesiaLeader ? (
          <select
            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="ecclesiaId"
            onChange={onFilterChange}
            value={filters.ecclesiaId}
          >
            <option value="">All Ecclesias</option>
            {availableFilterEcclesias.map((ecclesia) => (
              <option key={ecclesia.id} value={ecclesia.id}>
                {ecclesia.name}
              </option>
            ))}
          </select>
        ) : null}

        <select
          className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          name="buscellId"
          onChange={onFilterChange}
          value={filters.buscellId}
        >
          <option value="">All buscells</option>
          {buscells.map((buscell) => (
            <option key={buscell.id} value={buscell.id}>
              {buscell.name}
            </option>
          ))}
        </select>

        <select
          className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          name="status"
          onChange={onFilterChange}
          value={filters.status}
        >
          <option value="">All statuses</option>
          {memberStatusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
              <th className="pb-3 pr-4">Member</th>
              <th className="pb-3 pr-4">UMID</th>
              {isSuperAdmin ? <th className="pb-3 pr-4">Branch</th> : null}
              {!isEcclesiaLeader ? <th className="pb-3 pr-4">Ecclesia</th> : null}
              <th className="pb-3 pr-4">Buscell</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-4">Join Date</th>
              {isSuperAdmin ? <th className="pb-3">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {!isLoadingMembers && !paginatedMembers.length ? (
              <tr>
                <td className="py-4 text-slate-500" colSpan={tableColumnCount}>
                  No members match the current filters.
                </td>
              </tr>
            ) : null}

            {paginatedMembers.map((member) => (
              <tr
                className={`cursor-pointer transition hover:bg-slate-100/60 ${
                  selectedMemberId === member.id ? "bg-slate-100/70" : ""
                }`}
                key={member.id}
                onClick={() => onSelectMember(member.id)}
              >
                <td className="py-3 pr-4">
                  <p className="font-semibold text-slate-950">{member.fullName}</p>
                  <p className="mt-1 text-xs text-slate-500">{member.phone}</p>
                </td>
                <td className="py-3 pr-4 font-semibold text-slate-500">{member.umid}</td>
                {isSuperAdmin ? (
                  <td className="py-3 pr-4">{getBranchLabel(member.branch || member.branchName)}</td>
                ) : null}
                {!isEcclesiaLeader ? (
                  <td className="py-3 pr-4">
                    {getEcclesiaLabel(member.ecclesia || member.ecclesiaName)}
                  </td>
                ) : null}
                <td className="py-3 pr-4">{getBuscellLabel(member.buscell || member.buscellName)}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getMemberStatusBadgeClass(
                      member.status
                    )}`}
                  >
                    {member.status}
                  </span>
                </td>
                <td className="py-3 pr-4">{formatDate(member.joinDate)}</td>
                {isSuperAdmin ? (
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(member);
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(member);
                        }}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}

            {isLoadingMembers ? (
              <tr>
                <td className="py-4 text-slate-500" colSpan={tableColumnCount}>
                  Loading members...
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
        <p>
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            className="rounded-full border border-slate-300 px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage === 1}
            onClick={() => onPageChange((page) => Math.max(1, page - 1))}
            type="button"
          >
            Previous
          </button>
          <button
            className="rounded-full border border-slate-300 px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange((page) => Math.min(totalPages, page + 1))}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
