import "dotenv/config"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { config as loadDotEnv } from "dotenv"
import { createClient } from "@supabase/supabase-js"

const localEnv = resolve(process.cwd(), ".env.local")

if (existsSync(localEnv)) {
  loadDotEnv({ path: localEnv })
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
const email = process.env.SEED_SUPER_ADMIN_EMAIL || "superadmin@lcc.local"
const password = process.env.SEED_SUPER_ADMIN_PASSWORD
const name = process.env.SEED_SUPER_ADMIN_NAME || "System Super Admin"

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.")
}

if (!password || password.length < 12) {
  throw new Error("Set SEED_SUPER_ADMIN_PASSWORD in .env.local to a strong password with at least 12 characters.")
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name },
})

let userId = created.user?.id

if (createError) {
  if (!createError.message.toLowerCase().includes("already")) {
    throw createError
  }

  const { data: users, error: listError } = await admin.auth.admin.listUsers()
  if (listError) throw listError

  userId = users.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id
}

if (!userId) {
  throw new Error(`Could not resolve Supabase Auth user for ${email}.`)
}

const { data: branch, error: branchError } = await admin
  .from("branches")
  .select("id")
  .eq("code", "HQ")
  .maybeSingle()

if (branchError) throw branchError

const { error: profileError } = await admin.from("profiles").upsert({
  id: userId,
  name,
  email,
  role: "SUPER_ADMIN",
  branch_id: branch?.id || null,
  ekklesia_id: null,
  buscell_id: null,
})

if (profileError) throw profileError

console.log(`Super Admin ready: ${email}`)
