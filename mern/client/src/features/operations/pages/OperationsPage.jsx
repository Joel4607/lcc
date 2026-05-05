import { useState } from "react";
import AttendancePage from "../../attendance/pages/AttendancePage";
import FinancePage from "../../finance/pages/FinancePage";

const tabs = [
  { id: "attendance", label: "Attendance" },
  { id: "finance", label: "Buscell Offering" },
];

export default function OperationsPage() {
  const [activeTab, setActiveTab] = useState("attendance");

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
          Ecclesia Operations
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
          Attendance and buscell offering entry
        </h2>
        <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {tabs.map((tab) => (
            <button
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-sky-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "attendance" ? <AttendancePage hideHeader /> : <FinancePage hideHeader />}
    </div>
  );
}
