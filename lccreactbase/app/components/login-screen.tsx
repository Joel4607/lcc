import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChurchIcon, DatabaseLockedIcon, ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons"

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { isSupabaseConfigured, supabase } from "~/lib/supabase"

export const DEMO_STORAGE_KEY = "lccreactbase.demo"

export function LoginScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate("/dashboard", { replace: true })
      }
    })
  }, [navigate])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    window.localStorage.removeItem(DEMO_STORAGE_KEY)
    navigate("/dashboard", { replace: true })
  }

  function openDemo() {
    window.localStorage.setItem(DEMO_STORAGE_KEY, "1")
    navigate("/dashboard", { replace: true })
  }

  return (
    <main className="h-dvh overflow-y-auto bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_20%,transparent),transparent_32rem),linear-gradient(135deg,color-mix(in_oklch,var(--background)_92%,white),var(--background))] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
          <section className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <HugeiconsIcon icon={ChurchIcon} />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">LCC Admin</p>
                <h1 className="text-3xl font-semibold tracking-normal text-foreground md:text-5xl">
                  Church operations, records, and finance in one workspace.
                </h1>
              </div>
            </div>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              A React Router rebuild of the LCC management system with role-aware navigation,
              Supabase-backed data, shadcn components, reports, and dashboards.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {["Branch-safe records", "Buscell operations", "Finance reporting"].map((item) => (
                <div className="rounded-2xl border bg-card p-4 text-sm font-medium shadow-sm" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>Use a Supabase Auth account linked to an LCC profile.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!isSupabaseConfigured ? (
                <Alert>
                  <HugeiconsIcon icon={DatabaseLockedIcon} />
                  <AlertTitle>Supabase env is missing</AlertTitle>
                  <AlertDescription>Add the public URL and publishable key before signing in.</AlertDescription>
                </Alert>
              ) : null}

              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Login failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      type="email"
                      value={email}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <div className="relative">
                      <Input
                        className="pe-11"
                        id="password"
                        name="password"
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        type={showPassword ? "text" : "password"}
                        value={password}
                      />
                      <Button
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute end-1 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword((value) => !value)}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <HugeiconsIcon data-icon="inline-start" icon={showPassword ? ViewOffSlashIcon : ViewIcon} />
                      </Button>
                    </div>
                  </Field>
                </FieldGroup>

                <Button disabled={loading || !isSupabaseConfigured} type="submit">
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>

              <Button onClick={openDemo} type="button" variant="outline">
                Open demo workspace
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
