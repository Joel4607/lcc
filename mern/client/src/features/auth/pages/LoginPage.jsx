import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../../../shared/context/ThemeContext";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const { getApiErrorMessage, login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setFieldErrors({});

    const nextFieldErrors = {};

    if (!emailPattern.test(formData.email.trim())) {
      nextFieldErrors.email = "Enter a valid email address.";
    }

    if (formData.password.length < 8) {
      nextFieldErrors.password = "Password must be at least 8 characters.";
    }

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      await login(formData);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Login failed. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center bg-slate-300/80 px-6 py-8 lg:px-10">
      <div className="mx-auto grid w-full max-w-[1280px] overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.5)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="border-b border-slate-200 bg-slate-100 px-8 py-10 lg:border-b-0 lg:border-r">
          <div className="inline-flex items-center gap-3 rounded-xl bg-white px-3 py-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-sky-600 text-sm font-extrabold text-white">
              R
            </div>
            <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.2em] text-slate-500">
              LCC Admin Access
            </p>
          </div>
          <h1 className="mt-7 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Welcome to your church operations workspace
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Manage hierarchy, weekly records, attendance, finance, and reporting from one unified
            control center.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">System</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">Role-based + Branch-safe</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Data Layer</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">MongoDB + Weekly Engine</p>
            </div>
          </div>
        </section>

        <section className="bg-white p-8 lg:p-10">
          <div className="flex items-center justify-between gap-3">
            <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
              Sign In
            </p>
            <button
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
              onClick={toggleTheme}
              type="button"
            >
              {isDark ? "Light mode" : "Dark mode"}
            </button>
          </div>
          <h2 className="mt-3 text-2xl font-bold text-slate-950">Welcome back</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Enter your credentials to continue to your role dashboard.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <input
                autoComplete="email"
                className={`w-full rounded-xl bg-white px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-sky-100 ${
                  fieldErrors.email
                    ? "border border-rose-300 focus:border-rose-400"
                    : "border border-slate-300 focus:border-sky-400"
                }`}
                name="email"
                onChange={handleChange}
                placeholder="superadmin@lcc.local"
                required
                type="email"
                value={formData.email}
              />
              {fieldErrors.email ? (
                <span className="mt-2 block text-xs font-medium text-rose-600">{fieldErrors.email}</span>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <input
                autoComplete="current-password"
                className={`w-full rounded-xl bg-white px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-sky-100 ${
                  fieldErrors.password
                    ? "border border-rose-300 focus:border-rose-400"
                    : "border border-slate-300 focus:border-sky-400"
                }`}
                name="password"
                onChange={handleChange}
                placeholder="Enter your password"
                required
                type="password"
                value={formData.password}
              />
              {fieldErrors.password ? (
                <span className="mt-2 block text-xs font-medium text-rose-600">
                  {fieldErrors.password}
                </span>
              ) : null}
            </label>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
