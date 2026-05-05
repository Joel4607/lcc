import {
  formatDate,
  getBranchLabel,
  getBuscellLabel,
  getEcclesiaLabel,
} from "../../../shared/lib/data";
import { getMemberStatusBadgeClass, memberDirectoryPanelClass } from "../../../shared/lib/memberDirectory";

export default function MemberDetailsPanel({ member }) {
  return (
    <aside className={memberDirectoryPanelClass}>
      <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
        Member Details
      </p>
      {member ? (
        <>
          <h3 className="mt-2 text-xl font-bold text-slate-950">{member.fullName}</h3>
          <p className="mt-2 text-sm text-slate-500">{member.umid}</p>

          <div className="mt-4 space-y-4 text-sm text-slate-700">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Assignment</p>
              <p className="mt-2 font-semibold text-slate-950">
                {getBranchLabel(member.branch || member.branchName)}
              </p>
              <p className="mt-1">{getEcclesiaLabel(member.ecclesia || member.ecclesiaName)}</p>
              <p className="mt-1">{getBuscellLabel(member.buscell || member.buscellName)}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contact</p>
              <p className="mt-2">{member.phone || "Not set"}</p>
              <p className="mt-1">{member.email || "No email on file"}</p>
              <p className="mt-1">{member.address || "No address on file"}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Profile</p>
              <p className="mt-2">Join Date: {formatDate(member.joinDate)}</p>
              <p className="mt-1">Date of Birth: {formatDate(member.dateOfBirth)}</p>
              <p className="mt-1">Gender: {member.gender || "Not set"}</p>
              <p className="mt-1">Marital Status: {member.maritalStatus || "Not set"}</p>
              <p className="mt-1">
                Status:
                <span
                  className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getMemberStatusBadgeClass(
                    member.status
                  )}`}
                >
                  {member.status}
                </span>
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-3xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          Select a member to review their branch, Ecclesia, and buscell assignment.
        </div>
      )}
    </aside>
  );
}
