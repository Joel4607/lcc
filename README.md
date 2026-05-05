# LCC Church Management System

A full-stack MERN application for church administration, Ecclesia structure management, weekly records, attendance, finance, analytics, reporting, and CSV export.

## Tech Stack

- Backend: Node.js, Express, MongoDB Atlas, Mongoose, JWT, Winston
- Frontend: React, Vite, Tailwind CSS, React Router, React Query, Recharts

## Current Roles

- `SUPER_ADMIN`
- `BRANCH_ADMIN`
- `ECCLESIA_LEADER`
- `FINANCE_ADMIN`

The older `SHEPHERD` role is kept only as a compatibility alias in code where needed during the transition.

## Main Features

- Role-based authentication and tenant-safe access control
- Branch, Ecclesia, buscell, staff-user, and member management
- Automatic UMID generation for members
- Weekly 5-week-cycle record engine for Ecclesia reporting
- Attendance capture, including batch attendance
- Finance quick entry with UMID lookup and transaction IDs
- Role-safe dashboards, reports, and CSV export
- Centralized error handling, request sanitization, rate-limited login, and structured logging

## Project Structure

```text
lcc/
  README.md
  docs/
    project-structure.md
    qa-checklist.md
  mern/
    client/
      src/
        app/       app entry, providers, top-level routing
        features/  business-facing frontend domains
        shared/    reusable UI, API client, constants, helpers
    server/
      server.js    thin bootstrap file
      src/
        app/       backend startup and route mounting
        modules/   domain modules for each API area
        shared/    shared config, middleware, constants, utils
      scripts/     operational scripts such as seeding
```

Use [docs/project-structure.md](./docs/project-structure.md) for the fuller walkthrough of what belongs in each area and where to start reading.

## Environment Variables

### Backend

Create `mern/server/config.env` from `mern/server/config.env.example`.

Required:

- `PORT`
- `MONGODB_URI` or `ATLAS_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLIENT_URL`

Recommended:

- `DB_NAME`
- `LOG_LEVEL`
- `NODE_ENV`

### Frontend

Create `mern/client/.env` from `mern/client/.env.example`.

Required:

- `VITE_API_BASE_URL`

Use `/api` for local proxy-based development, or a full backend URL like `http://localhost:5050/api`.

## Local Setup

### 1. Install dependencies

```bash
cd mern/server
npm install

cd ../client
npm install
```

### 2. Seed initial data

```bash
cd mern/server
npm run seed
```

### 3. Start the backend

```bash
cd mern/server
npm run dev
```

### 4. Start the frontend

```bash
cd mern/client
npm run dev
```

## Core Workflows

### Super Admin

- manages branches, Ecclesias, users, buscells, and members across all branches
- accesses global analytics, all reports, and all exports

### Branch Admin

- manages Ecclesias, staff, buscells, and members in their own branch
- reviews branch-safe dashboards, reports, and exports

### Ecclesia Leader

- operates only inside their assigned Ecclesia
- captures weekly buscell-level records in the 5-week cycle engine
- reviews their Ecclesia reporting dashboard

### Finance Admin

- records and manages finance data in their own branch
- accesses finance summaries and finance reports in their own branch

## API Modules

Main backend route groups:

- `/api/auth`
- `/api/branches`
- `/api/ecclesias`
- `/api/users`
- `/api/buscells`
- `/api/members`
- `/api/record-weeks`
- `/api/records`
- `/api/attendance`
- `/api/finance`
- `/api/dashboard`
- `/api/reports`
- `/api/export`

Use `docs/qa-checklist.md` as the review checklist for manual role testing and API verification in Postman or Thunder Client.

## Verification Commands

Backend syntax check:

```bash
cd mern/server
Get-ChildItem -Path src,scripts -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Frontend lint:

```bash
cd mern/client
npm run lint
```

Frontend production build:

```bash
cd mern/client
npm run build
```
