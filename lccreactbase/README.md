# LCC React Router Base

React Router + shadcn/ui rebuild of the LCC church management system, with Supabase as the backend.

## Stack

- React Router 7
- React 19
- shadcn/ui with the requested preset
- Tailwind CSS 4
- Supabase Auth, Postgres, and RLS

## Local Setup

```bash
npm install
npm run dev
```

## Supabase Setup

The core schema is in `supabase/migrations/20260527143000_lcc_core_schema.sql`, and starter branch/week data is in `supabase/seed.sql`.

To create the first real login, set a strong `SEED_SUPER_ADMIN_PASSWORD` in `.env.local`, then run:

```bash
npm run seed:admin
```

The browser app only reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Secret keys stay server-only for scripts.
