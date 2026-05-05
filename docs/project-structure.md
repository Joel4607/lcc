# Project Structure Guide

This repo is now organized around one simple idea:

- `app` = where the application starts
- `features` or `modules` = business domains
- `shared` = reusable code that is not owned by just one domain

## Frontend mental model

Start here when you want to understand the React app:

```text
mern/client/src/
  app/
    App.jsx
    main.jsx
    providers/
  features/
    attendance/
    auth/
    dashboard/
    finance/
    members/
    operations/
    records/
    reports/
    structure/
    users/
  shared/
    api/
    assets/
    components/
    constants/
    context/
    lib/
```

### What each frontend folder means

- `app/`: the boot sequence. Open this first if you want to know how the client starts, which providers are wrapped around the app, and where the routes live.
- `features/`: the actual product areas. If you want to work on members, finance, records, or dashboards, go straight here.
- `shared/`: code reused by multiple features, such as the API client, layout shell, toast UI, theme state, and shared helpers.

### Where to look for common tasks on the frontend

- Login and auth state: `mern/client/src/features/auth/`
- Dashboards and analytics screens: `mern/client/src/features/dashboard/`
- Church structure management like branches, Ecclesias, and buscells: `mern/client/src/features/structure/`
- Member management and lookup: `mern/client/src/features/members/`
- Shared page chrome and route guards: `mern/client/src/shared/components/`
- Shared role logic and navigation rules: `mern/client/src/shared/constants/roles.js`

## Backend mental model

Start here when you want to understand the Express API:

```text
mern/server/
  server.js
  scripts/
  src/
    app/
      server.js
    modules/
      attendance/
      auth/
      branches/
      buscells/
      dashboard/
      diagnostics/
      ecclesias/
      exports/
      finance/
      members/
      records/
      reports/
      users/
    shared/
      config/
      constants/
      middleware/
      utils/
```

### What each backend folder means

- `server.js`: very small bootstrap file so startup remains easy to find from the project root.
- `src/app/`: the real backend entry point. This is where Express is created, middleware is mounted, and route modules are registered.
- `src/modules/`: each backend business area owns its own routes and nearby models or helpers.
- `src/shared/`: cross-cutting backend code such as database config, auth middleware, role constants, logging, validation, and generic utilities.
- `scripts/`: one-off operational scripts like database seeding.

### Where to look for common tasks on the backend

- JWT login and auth endpoints: `mern/server/src/modules/auth/`
- User model and user management rules: `mern/server/src/modules/users/`
- Role checks and branch isolation middleware: `mern/server/src/shared/middleware/`
- Shared env, logging, validation, and error utilities: `mern/server/src/shared/utils/`
- Domain APIs like members, finance, records, and reports: `mern/server/src/modules/`

## Quick reading order

If you are brand new to the project, this order should make the codebase feel much less overwhelming:

1. Read `README.md` for the product and role overview.
2. Open `mern/client/src/app/` to understand the frontend entry flow.
3. Open `mern/server/src/app/server.js` to understand the backend entry flow.
4. Pick one domain, like `members` or `finance`, and trace that same domain in both `client/src/features/` and `server/src/modules/`.
5. Use `shared/` folders only after you know which feature is calling into them.

## Rule of thumb for future files

- Put it in `app` if it wires the application together.
- Put it in a feature or module if it mainly serves one business domain.
- Put it in `shared` only if at least two areas genuinely reuse it.
