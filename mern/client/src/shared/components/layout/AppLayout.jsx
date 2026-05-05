import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../../features/auth/context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getBranchLabel, getEcclesiaLabel } from "../../lib/data";
import { getNavItems } from "../../constants/roles";

export default function AppLayout() {
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigationItems = getNavItems(user.role);
  const currentItem =
    navigationItems.find((item) => location.pathname.startsWith(item.path)) || navigationItems[0];

  return (
    <main className="min-h-screen bg-slate-300/80 p-3 lg:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1480px] flex-col overflow-hidden rounded-2xl border border-slate-300/70 bg-slate-100 shadow-[0_25px_90px_-55px_rgba(15,23,42,0.5)] lg:min-h-[calc(100vh-2.5rem)] lg:flex-row">
        <aside className="flex w-full flex-col border-b border-slate-200 bg-slate-100/80 p-3 lg:w-64 lg:border-b-0 lg:border-r lg:p-4">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-600 text-lg font-extrabold text-white">
              R
            </div>
            <div>
              <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.2em] text-slate-500">
                LCC Admin
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Operations Suite</p>
            </div>
          </div>

          <label className="mt-4 block">
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              placeholder="Search pages..."
              type="text"
            />
          </label>

          <nav className="mt-4 grid flex-1 grid-cols-2 gap-1 overflow-auto pr-1 sm:grid-cols-3 lg:flex lg:flex-col">
            {navigationItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-white text-sky-700 shadow-[0_12px_24px_-18px_rgba(2,132,199,0.8)]"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  }`
                }
                key={item.path}
                to={item.path}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="mt-1 text-xs text-slate-500">{user.role}</p>
            <p className="mt-1 text-xs text-slate-500">{getBranchLabel(user.branch)}</p>
            {user.ecclesia?.name ? (
              <p className="mt-1 text-xs text-slate-500">Ecclesia: {getEcclesiaLabel(user.ecclesia)}</p>
            ) : null}
            <button
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
              onClick={logout}
              type="button"
            >
              Sign out
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1 bg-white px-3 py-3 lg:px-5 lg:py-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-sm font-semibold text-slate-900">{currentItem?.label || "Dashboard"}</p>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
                onClick={toggleTheme}
                type="button"
              >
                {isDark ? "Light mode" : "Dark mode"}
              </button>
              <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500">
                {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <Outlet />
          </div>
        </section>
      </div>
    </main>
  );
}
