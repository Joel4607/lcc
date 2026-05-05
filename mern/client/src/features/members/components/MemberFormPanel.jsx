import {
  memberDirectoryPanelClass,
  memberGenderOptions,
  memberMaritalStatusOptions,
  memberStatusOptions,
} from "../../../shared/lib/memberDirectory";

export default function MemberFormPanel({
  availableFormBuscells,
  availableFormEcclesias,
  branches,
  editingMemberId,
  form,
  isLoadingReferences,
  isSubmitting,
  onChange,
  onReset,
  onSubmit,
}) {
  return (
    <form className={memberDirectoryPanelClass} onSubmit={onSubmit}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
            {editingMemberId ? "Edit Member" : "New Member"}
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-950">
            {editingMemberId ? "Update assignment" : "Create a member"}
          </h3>
        </div>
        {editingMemberId ? (
          <button
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
            onClick={onReset}
            type="button"
          >
            Cancel
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">First Name</span>
          <input
            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="firstName"
            onChange={onChange}
            value={form.firstName}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Last Name</span>
          <input
            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="lastName"
            onChange={onChange}
            value={form.lastName}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Phone</span>
          <input
            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="phone"
            onChange={onChange}
            value={form.phone}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
          <input
            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="email"
            onChange={onChange}
            type="email"
            value={form.email}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Gender</span>
          <select
            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="gender"
            onChange={onChange}
            value={form.gender}
          >
            <option value="">Not set</option>
            {memberGenderOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Marital Status</span>
          <select
            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="maritalStatus"
            onChange={onChange}
            value={form.maritalStatus}
          >
            <option value="">Not set</option>
            {memberMaritalStatusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Date of Birth</span>
          <input
            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="dateOfBirth"
            onChange={onChange}
            type="date"
            value={form.dateOfBirth}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Join Date</span>
          <input
            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="joinDate"
            onChange={onChange}
            type="date"
            value={form.joinDate}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-700">Address</span>
          <textarea
            className="min-h-[90px] w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="address"
            onChange={onChange}
            value={form.address}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Family Group</span>
          <input
            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="familyGroup"
            onChange={onChange}
            value={form.familyGroup}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Ministry Groups</span>
          <input
            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="ministryGroups"
            onChange={onChange}
            placeholder="Choir, Ushering"
            value={form.ministryGroups}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Branch</span>
          <select
            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="branchId"
            onChange={onChange}
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

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Ecclesia</span>
          <select
            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="ecclesiaId"
            onChange={onChange}
            value={form.ecclesiaId}
          >
            <option value="">Select Ecclesia</option>
            {availableFormEcclesias.map((ecclesia) => (
              <option key={ecclesia.id} value={ecclesia.id}>
                {ecclesia.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Buscell</span>
          <select
            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="buscellId"
            onChange={onChange}
            value={form.buscellId}
          >
            <option value="">Select buscell</option>
            {availableFormBuscells.map((buscell) => (
              <option key={buscell.id} value={buscell.id}>
                {buscell.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
          <select
            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            name="status"
            onChange={onChange}
            value={form.status}
          >
            {memberStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        className="mt-4 w-full rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting || isLoadingReferences}
        type="submit"
      >
        {isSubmitting ? "Saving..." : editingMemberId ? "Update member" : "Create member"}
      </button>
    </form>
  );
}
