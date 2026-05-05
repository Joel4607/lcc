import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../features/auth/context/AuthContext";
import { canAccessRole } from "../../constants/roles";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { isBootstrapping, token, user } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="rounded-3xl border border-slate-200 bg-white/90 px-8 py-6 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]">
          <p className="font-['Space_Grotesk'] text-sm uppercase tracking-[0.22em] text-slate-500">
            Loading Session
          </p>
          <p className="mt-3 text-sm text-slate-600">Checking your authentication status.</p>
        </div>
      </main>
    );
  }

  if (!token || !user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (!canAccessRole(user.role, allowedRoles)) {
    return <Navigate replace to="/dashboard" />;
  }

  return children;
}
