# QA Checklist

Use this checklist for supervisor review, manual role validation, and API verification in Postman or Thunder Client.

## Environment

- Backend env is present in `mern/server/config.env`
- Frontend env is present in `mern/client/.env`
- MongoDB Atlas connection succeeds
- Seed data exists or test users are available

## Roles To Test

- `SUPER_ADMIN`
- `BRANCH_ADMIN`
- `ECCLESIA_LEADER`
- `FINANCE_ADMIN`

## Authentication

- Login succeeds for every valid role
- Invalid password returns `401`
- Missing token blocks protected endpoints
- Expired or invalid token returns `401`
- Repeated bad login attempts trigger rate limiting
- Logout clears the frontend session and protected routes redirect correctly

## Access Control

- `SUPER_ADMIN` can access global and cross-branch features
- `BRANCH_ADMIN` stays inside their own branch
- `ECCLESIA_LEADER` stays inside their own Ecclesia scope
- `FINANCE_ADMIN` stays inside their own branch and finance scope
- Unauthorized access returns `403`

## Structure Workflows

- Branch CRUD works for super admin only
- Ecclesia CRUD works for super admin and branch admin only
- Buscell CRUD respects branch ownership and Ecclesia assignment
- User creation enforces valid role assignment
- Member creation generates a UMID once and keeps it immutable

## Weekly Records

- Current record week resolves correctly
- Week numbers follow the 5-week cycle
- Ecclesia leader can submit one buscell record in their Ecclesia
- Ecclesia leader cannot submit outside their Ecclesia
- Ecclesia summary view shows `N/A` when a buscell has no record yet

## Attendance

- Single attendance entry works
- Batch attendance works
- Duplicate attendance submission updates the same meeting record correctly
- Invalid UMID is rejected
- Attendance history and reports stay scoped correctly

## Finance

- UMID lookup succeeds inside allowed scope
- Finance entry auto-attaches member, branch, buscell, and recorder
- Invalid amount such as `0` or negative numbers is rejected
- Finance history, reports, and exports stay scoped correctly

## Dashboards And Reports

- Global dashboard loads for super admin
- Branch dashboard loads for branch admin
- Ecclesia dashboard loads for Ecclesia leader
- Finance summary loads for finance admin
- Reports filter correctly by date, branch, buscell, UMID, status, and type
- Pagination works for report tables
- Empty states render cleanly when no data matches

## Export

- Members CSV exports with readable headers
- Attendance CSV exports with readable headers
- Finance CSV exports with readable headers
- Branch summary export respects scope
- Buscell summary export respects scope

## Error Handling

- Error responses follow:

```json
{
  "success": false,
  "message": "Error message",
  "errorCode": "OPTIONAL_CODE"
}
```

- Validation errors are understandable
- Permission errors are understandable
- Duplicate values return a conflict-style response
- Database connection failures are logged

## Frontend Review

- Toasts appear for success and failure cases
- Tables scroll on smaller screens
- Attendance, finance, dashboards, and weekly records remain usable on mobile widths
- No major browser console errors appear during normal workflows

## Recommended API Smoke Tests

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/branches`
- `GET /api/ecclesias`
- `GET /api/users`
- `GET /api/record-weeks/current`
- `POST /api/records/buscell`
- `GET /api/records/ecclesia/:ecclesiaId`
- `POST /api/attendance/batch`
- `POST /api/finance/entry`
- `GET /api/dashboard/global`
- `GET /api/export/members`
