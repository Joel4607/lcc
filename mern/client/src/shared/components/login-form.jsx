import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { cn } from "@/shared/lib/utils"

export function LoginForm({
  className,
  error,
  fieldErrors = {},
  formData,
  isSubmitting = false,
  onChange,
  onSubmit,
  ...props
}) {
  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={onSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Sign in to continue to your LCC operations dashboard.
        </p>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            aria-invalid={Boolean(fieldErrors.email)}
            autoComplete="email"
            id="email"
            name="email"
            onChange={onChange}
            placeholder="superadmin@lcc.local"
            required
            type="email"
            value={formData.email}
          />
          {fieldErrors.email ? (
            <p className="text-sm font-medium text-destructive" id="email-error">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
          </div>
          <Input
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            aria-invalid={Boolean(fieldErrors.password)}
            autoComplete="current-password"
            id="password"
            name="password"
            onChange={onChange}
            placeholder="Enter your password"
            required
            type="password"
            value={formData.password}
          />
          {fieldErrors.password ? (
            <p className="text-sm font-medium text-destructive" id="password-error">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : null}

        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </div>
      <div className="text-center text-sm text-muted-foreground">
        Access is managed by your LCC system administrator.
      </div>
    </form>
  );
}
