create extension if not exists pgcrypto;

do $$ begin
  create type public.lcc_role as enum ('SUPER_ADMIN', 'SUPER_FINANCE_ADMIN', 'BRANCH_ADMIN', 'EKKLESIA_LEADER', 'BUSCELL_PASTOR', 'FINANCE_ADMIN');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.member_status as enum ('ACTIVE', 'INACTIVE', 'TRANSFERRED', 'DECEASED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.attendance_meeting_type as enum ('BUSCELL_WEEKLY', 'SUNDAY_SERVICE', 'OVERCOMERS_SERVICE', 'OTHER');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.attendance_status as enum ('PRESENT', 'ABSENT', 'EXCUSED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.finance_record_type as enum ('income', 'expense');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.finance_scope as enum ('MEMBER', 'BRANCH');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.finance_service_type as enum ('BUSCELL_WEEKLY', 'SUNDAY_SERVICE', 'OVERCOMERS_SERVICE', 'OTHER');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.finance_payment_method as enum ('cash', 'momo', 'bank_transfer', 'cheque');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.finance_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  address text default '',
  phone text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ekklesias (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  branch_id uuid not null references public.branches(id) on delete cascade,
  leader_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, name)
);

create table if not exists public.buscells (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  branch_id uuid not null references public.branches(id) on delete cascade,
  ekklesia_id uuid not null references public.ekklesias(id) on delete cascade,
  meeting_day text default '',
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, ekklesia_id, name)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role public.lcc_role not null default 'EKKLESIA_LEADER',
  branch_id uuid references public.branches(id) on delete set null,
  ekklesia_id uuid references public.ekklesias(id) on delete set null,
  buscell_id uuid references public.buscells(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  full_name text not null,
  phone text not null,
  email text,
  gender text,
  address text default '',
  date_of_birth date,
  marital_status text,
  join_date date not null default current_date,
  family_group text default '',
  ministry_groups text[] not null default '{}',
  branch_id uuid not null references public.branches(id) on delete restrict,
  ekklesia_id uuid not null references public.ekklesias(id) on delete restrict,
  buscell_id uuid not null references public.buscells(id) on delete restrict,
  umid text not null unique,
  status public.member_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.record_weeks (
  id uuid primary key default gen_random_uuid(),
  week_number integer not null check (week_number between 1 and 5),
  start_date date not null,
  end_date date not null,
  cycle_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, week_number),
  unique (start_date, end_date)
);

create table if not exists public.buscell_records (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.record_weeks(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  ekklesia_id uuid not null references public.ekklesias(id) on delete cascade,
  buscell_id uuid not null references public.buscells(id) on delete cascade,
  sunday_attendance integer check (sunday_attendance >= 0),
  buscell_attendance integer check (buscell_attendance >= 0),
  buscell_offering numeric(12, 2) check (buscell_offering >= 0),
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_id, buscell_id)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  umid text not null,
  member_id uuid not null references public.members(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  buscell_id uuid references public.buscells(id) on delete set null,
  date date not null,
  meeting_type public.attendance_meeting_type not null,
  status public.attendance_status not null,
  recorded_by uuid references auth.users(id) on delete set null,
  event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (member_id, date, meeting_type, event_id)
);

create table if not exists public.finance_records (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null unique,
  record_type public.finance_record_type not null default 'income',
  umid text,
  member_id uuid references public.members(id) on delete set null,
  scope public.finance_scope not null default 'MEMBER',
  service_type public.finance_service_type not null default 'BUSCELL_WEEKLY',
  branch_id uuid not null references public.branches(id) on delete restrict,
  ekklesia_id uuid references public.ekklesias(id) on delete set null,
  buscell_id uuid references public.buscells(id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  transaction_type text not null,
  payment_method public.finance_payment_method not null,
  transaction_date date not null default current_date,
  expense_category text,
  donor_name text,
  donor_type text,
  giver_name text,
  notes text default '',
  description text default '',
  recorded_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  status public.finance_status not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role_branch on public.profiles(role, branch_id);
create index if not exists idx_ekklesias_branch on public.ekklesias(branch_id);
create index if not exists idx_buscells_branch_ekklesia on public.buscells(branch_id, ekklesia_id);
create index if not exists idx_members_branch_status on public.members(branch_id, status);
create index if not exists idx_members_ekklesia_buscell on public.members(ekklesia_id, buscell_id);
create index if not exists idx_attendance_branch_date on public.attendance_records(branch_id, date desc);
create index if not exists idx_attendance_buscell_date on public.attendance_records(buscell_id, date desc);
create index if not exists idx_finance_branch_date on public.finance_records(branch_id, transaction_date desc);
create index if not exists idx_finance_member_date on public.finance_records(member_id, transaction_date desc);
create index if not exists idx_buscell_records_week_branch on public.buscell_records(week_id, branch_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_branches_updated_at on public.branches;
create trigger set_branches_updated_at before update on public.branches for each row execute function public.set_updated_at();
drop trigger if exists set_ekklesias_updated_at on public.ekklesias;
create trigger set_ekklesias_updated_at before update on public.ekklesias for each row execute function public.set_updated_at();
drop trigger if exists set_buscells_updated_at on public.buscells;
create trigger set_buscells_updated_at before update on public.buscells for each row execute function public.set_updated_at();
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists set_members_updated_at on public.members;
create trigger set_members_updated_at before update on public.members for each row execute function public.set_updated_at();
drop trigger if exists set_record_weeks_updated_at on public.record_weeks;
create trigger set_record_weeks_updated_at before update on public.record_weeks for each row execute function public.set_updated_at();
drop trigger if exists set_buscell_records_updated_at on public.buscell_records;
create trigger set_buscell_records_updated_at before update on public.buscell_records for each row execute function public.set_updated_at();
drop trigger if exists set_attendance_records_updated_at on public.attendance_records;
create trigger set_attendance_records_updated_at before update on public.attendance_records for each row execute function public.set_updated_at();
drop trigger if exists set_finance_records_updated_at on public.finance_records;
create trigger set_finance_records_updated_at before update on public.finance_records for each row execute function public.set_updated_at();

create schema if not exists lcc_private;
grant usage on schema lcc_private to authenticated;

create or replace function lcc_private.current_role()
returns public.lcc_role
language sql
stable
security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function lcc_private.current_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select branch_id from public.profiles where id = auth.uid() $$;

create or replace function lcc_private.current_ekklesia_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select ekklesia_id from public.profiles where id = auth.uid() $$;

create or replace function lcc_private.current_buscell_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select buscell_id from public.profiles where id = auth.uid() $$;

create or replace function lcc_private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select coalesce(lcc_private.current_role() = 'SUPER_ADMIN', false) $$;

create or replace function lcc_private.is_finance_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(lcc_private.current_role() in ('SUPER_ADMIN', 'SUPER_FINANCE_ADMIN', 'BRANCH_ADMIN', 'FINANCE_ADMIN'), false)
$$;

create or replace function lcc_private.can_see_branch(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    lcc_private.current_role() in ('SUPER_ADMIN', 'SUPER_FINANCE_ADMIN') or lcc_private.current_branch_id() = target_branch_id,
    false
  )
$$;

grant execute on all functions in schema lcc_private to authenticated;

alter table public.branches enable row level security;
alter table public.ekklesias enable row level security;
alter table public.buscells enable row level security;
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.record_weeks enable row level security;
alter table public.buscell_records enable row level security;
alter table public.attendance_records enable row level security;
alter table public.finance_records enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.branches, public.ekklesias, public.buscells, public.profiles, public.members, public.record_weeks, public.buscell_records, public.attendance_records, public.finance_records to authenticated;

drop policy if exists "profiles_select_scoped" on public.profiles;
create policy "profiles_select_scoped" on public.profiles for select to authenticated using (
  id = auth.uid()
  or lcc_private.current_role() in ('SUPER_ADMIN', 'SUPER_FINANCE_ADMIN')
  or lcc_private.current_branch_id() = branch_id
  or lcc_private.current_ekklesia_id() = ekklesia_id
);

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles for insert to authenticated with check (
  lcc_private.current_role() in ('SUPER_ADMIN', 'SUPER_FINANCE_ADMIN', 'BRANCH_ADMIN', 'EKKLESIA_LEADER')
);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles for update to authenticated using (
  lcc_private.current_role() in ('SUPER_ADMIN', 'SUPER_FINANCE_ADMIN')
  or lcc_private.current_branch_id() = branch_id
  or lcc_private.current_ekklesia_id() = ekklesia_id
) with check (
  lcc_private.current_role() in ('SUPER_ADMIN', 'SUPER_FINANCE_ADMIN')
  or lcc_private.current_branch_id() = branch_id
  or lcc_private.current_ekklesia_id() = ekklesia_id
);

drop policy if exists "branches_select_scoped" on public.branches;
create policy "branches_select_scoped" on public.branches for select to authenticated using (
  lcc_private.current_role() in ('SUPER_ADMIN', 'SUPER_FINANCE_ADMIN') or lcc_private.current_branch_id() = id
);

drop policy if exists "branches_super_admin_mutate" on public.branches;
create policy "branches_super_admin_mutate" on public.branches for all to authenticated using (lcc_private.is_super_admin()) with check (lcc_private.is_super_admin());

drop policy if exists "ekklesias_select_scoped" on public.ekklesias;
create policy "ekklesias_select_scoped" on public.ekklesias for select to authenticated using (
  lcc_private.current_role() in ('SUPER_ADMIN', 'SUPER_FINANCE_ADMIN')
  or lcc_private.current_branch_id() = branch_id
  or lcc_private.current_ekklesia_id() = id
);

drop policy if exists "ekklesias_admin_mutate" on public.ekklesias;
create policy "ekklesias_admin_mutate" on public.ekklesias for all to authenticated using (
  lcc_private.current_role() = 'SUPER_ADMIN' or lcc_private.current_branch_id() = branch_id
) with check (
  lcc_private.current_role() = 'SUPER_ADMIN' or lcc_private.current_branch_id() = branch_id
);

drop policy if exists "buscells_select_scoped" on public.buscells;
create policy "buscells_select_scoped" on public.buscells for select to authenticated using (
  lcc_private.current_role() in ('SUPER_ADMIN', 'SUPER_FINANCE_ADMIN')
  or lcc_private.current_branch_id() = branch_id
  or lcc_private.current_ekklesia_id() = ekklesia_id
  or lcc_private.current_buscell_id() = id
);

drop policy if exists "buscells_admin_mutate" on public.buscells;
create policy "buscells_admin_mutate" on public.buscells for all to authenticated using (
  lcc_private.current_role() = 'SUPER_ADMIN' or lcc_private.current_branch_id() = branch_id
) with check (
  lcc_private.current_role() = 'SUPER_ADMIN' or lcc_private.current_branch_id() = branch_id
);

drop policy if exists "members_select_scoped" on public.members;
create policy "members_select_scoped" on public.members for select to authenticated using (
  lcc_private.current_role() in ('SUPER_ADMIN', 'SUPER_FINANCE_ADMIN')
  or lcc_private.current_branch_id() = branch_id
  or lcc_private.current_ekklesia_id() = ekklesia_id
  or lcc_private.current_buscell_id() = buscell_id
);

drop policy if exists "members_admin_mutate" on public.members;
create policy "members_admin_mutate" on public.members for all to authenticated using (
  lcc_private.current_role() = 'SUPER_ADMIN' or lcc_private.current_branch_id() = branch_id
) with check (
  lcc_private.current_role() = 'SUPER_ADMIN' or lcc_private.current_branch_id() = branch_id
);

drop policy if exists "record_weeks_select" on public.record_weeks;
create policy "record_weeks_select" on public.record_weeks for select to authenticated using (auth.uid() is not null);

drop policy if exists "record_weeks_admin_mutate" on public.record_weeks;
create policy "record_weeks_admin_mutate" on public.record_weeks for all to authenticated using (
  lcc_private.current_role() in ('SUPER_ADMIN', 'BRANCH_ADMIN')
) with check (
  lcc_private.current_role() in ('SUPER_ADMIN', 'BRANCH_ADMIN')
);

drop policy if exists "buscell_records_select_scoped" on public.buscell_records;
create policy "buscell_records_select_scoped" on public.buscell_records for select to authenticated using (
  lcc_private.current_role() in ('SUPER_ADMIN', 'SUPER_FINANCE_ADMIN')
  or lcc_private.current_branch_id() = branch_id
  or lcc_private.current_ekklesia_id() = ekklesia_id
  or lcc_private.current_buscell_id() = buscell_id
);

drop policy if exists "buscell_records_mutate_scoped" on public.buscell_records;
create policy "buscell_records_mutate_scoped" on public.buscell_records for all to authenticated using (
  lcc_private.current_role() = 'SUPER_ADMIN'
  or lcc_private.current_branch_id() = branch_id
  or lcc_private.current_ekklesia_id() = ekklesia_id
  or lcc_private.current_buscell_id() = buscell_id
) with check (
  lcc_private.current_role() = 'SUPER_ADMIN'
  or lcc_private.current_branch_id() = branch_id
  or lcc_private.current_ekklesia_id() = ekklesia_id
  or lcc_private.current_buscell_id() = buscell_id
);

drop policy if exists "attendance_select_scoped" on public.attendance_records;
create policy "attendance_select_scoped" on public.attendance_records for select to authenticated using (
  lcc_private.current_role() in ('SUPER_ADMIN', 'SUPER_FINANCE_ADMIN')
  or lcc_private.current_branch_id() = branch_id
  or lcc_private.current_buscell_id() = buscell_id
);

drop policy if exists "attendance_mutate_scoped" on public.attendance_records;
create policy "attendance_mutate_scoped" on public.attendance_records for all to authenticated using (
  lcc_private.current_role() = 'SUPER_ADMIN'
  or lcc_private.current_branch_id() = branch_id
  or lcc_private.current_buscell_id() = buscell_id
) with check (
  lcc_private.current_role() = 'SUPER_ADMIN'
  or lcc_private.current_branch_id() = branch_id
  or lcc_private.current_buscell_id() = buscell_id
);

drop policy if exists "finance_select_scoped" on public.finance_records;
create policy "finance_select_scoped" on public.finance_records for select to authenticated using (
  lcc_private.is_finance_admin() and lcc_private.can_see_branch(branch_id)
);

drop policy if exists "finance_mutate_scoped" on public.finance_records;
create policy "finance_mutate_scoped" on public.finance_records for all to authenticated using (
  lcc_private.is_finance_admin() and lcc_private.can_see_branch(branch_id)
) with check (
  lcc_private.is_finance_admin() and lcc_private.can_see_branch(branch_id)
);
