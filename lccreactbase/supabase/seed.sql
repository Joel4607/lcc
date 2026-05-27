insert into public.branches (name, code, address, phone)
values ('Headquarters', 'HQ', 'Accra Central', '+233 24 000 0000')
on conflict (code) do update
set name = excluded.name,
    address = excluded.address,
    phone = excluded.phone;

insert into public.record_weeks (week_number, start_date, end_date, cycle_id)
values
  (1, date '2026-05-03', date '2026-05-09', '2026-05'),
  (2, date '2026-05-10', date '2026-05-16', '2026-05')
on conflict (cycle_id, week_number) do nothing;
