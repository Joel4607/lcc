import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../../../shared/context/ThemeContext";
import { LoginForm } from "../../../shared/components/login-form";
import { Button } from "../../../shared/components/ui/button";
import { Card, CardContent } from "../../../shared/components/ui/card";
import { Moon, ShieldCheck, Sparkles, Sun } from "lucide-react";

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
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground md:p-10">
      <Card className="w-full max-w-5xl overflow-hidden shadow-2xl">
        <CardContent className="grid p-0 md:grid-cols-2">
          <section className="flex flex-col gap-6 p-6 md:p-10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-primary text-sm font-extrabold text-primary-foreground shadow-sm">
                  L
                </div>
                <div>
                  <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    LCC Admin
                  </p>
                  <p className="text-sm font-semibold text-foreground">Operations Suite</p>
                </div>
              </div>
              <Button onClick={toggleTheme} size="icon" type="button" variant="outline">
                {isDark ? <Sun /> : <Moon />}
                <span className="sr-only">{isDark ? "Use light mode" : "Use dark mode"}</span>
              </Button>
            </div>

            <div className="flex flex-1 items-center justify-center">
              <LoginForm
                className="w-full max-w-sm"
                error={error}
                fieldErrors={fieldErrors}
                formData={formData}
                isSubmitting={isSubmitting}
                onChange={handleChange}
                onSubmit={handleSubmit}
              />
            </div>
          </section>

          <section className="relative hidden min-h-[560px] overflow-hidden border-l bg-muted md:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.28),transparent_32%),radial-gradient(circle_at_80%_15%,hsl(var(--chart-2)/0.2),transparent_26%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)))]" />
            <div className="relative flex h-full flex-col justify-between p-10">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
                <ShieldCheck />
                Secure role-based access
              </div>

              <div className="grid gap-4">
                <div className="rounded-xl border bg-background/85 p-5 shadow-lg backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                      <Sparkles />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Unified ministry data</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Branches, buscells, records, attendance, and finance in one workspace.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border bg-background/85 p-4 shadow-sm backdrop-blur">
                    <p className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Access
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">Branch-safe</p>
                  </div>
                  <div className="rounded-xl border bg-background/85 p-4 shadow-sm backdrop-blur">
                    <p className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Records
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">Weekly-ready</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
