-- MEM Workforce — Phase 1 foundation
-- Departments, employee profiles, role helpers, audit log, Row Level Security.
-- Principles: RLS on every table, default deny, least privilege, no deletes of history.

-----------------------------------------------------------------------------
-- Types
-----------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'manager', 'employee');
create type public.employment_status as enum ('active', 'inactive');

-----------------------------------------------------------------------------
-- Shared trigger: maintain updated_at
-----------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-----------------------------------------------------------------------------
-- departments
-----------------------------------------------------------------------------
create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  is_active   boolean not null default true,
  sort_order  integer not null default 0 check (sort_order between 0 and 10000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index departments_name_unique on public.departments (lower(btrim(name)));

create trigger departments_set_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

-- The spec's proposed (configurable) departments. Admins can edit/deactivate them.
insert into public.departments (name, sort_order) values
  ('Production', 10),
  ('Quality Control', 20),
  ('Dispatch', 30),
  ('Sales', 40),
  ('Purchase', 50),
  ('Accounts', 60),
  ('Administration', 70);

-----------------------------------------------------------------------------
-- profiles (one row per employee; linked to auth.users by user_id)
-----------------------------------------------------------------------------
create table public.profiles (
  id                   uuid primary key default gen_random_uuid(),
  -- Set automatically by trigger when the invited auth user is created. Never set by clients.
  user_id              uuid unique references auth.users (id) on delete set null,
  employee_code        text not null check (employee_code ~ '^[A-Za-z0-9-]{1,20}$'),
  full_name            text not null check (char_length(btrim(full_name)) between 1 and 120),
  work_email           text not null check (
                          char_length(work_email) <= 254
                          and work_email = lower(work_email)
                          and work_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
                        ),
  phone                text check (phone is null or phone ~ '^\+?[0-9][0-9 -]{6,19}$'),
  department_id        uuid references public.departments (id) on delete restrict,
  designation          text check (designation is null or char_length(designation) <= 80),
  reporting_manager_id uuid references public.profiles (id) on delete restrict,
  joining_date         date,
  employment_status    public.employment_status not null default 'active',
  role                 public.app_role not null default 'employee',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint profiles_not_own_manager check (reporting_manager_id is null or reporting_manager_id <> id)
);
create unique index profiles_employee_code_unique on public.profiles (upper(employee_code));
create unique index profiles_work_email_unique on public.profiles (work_email);
create index profiles_reporting_manager_idx on public.profiles (reporting_manager_id);
create index profiles_department_idx on public.profiles (department_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-----------------------------------------------------------------------------
-- Role helper functions (SECURITY DEFINER so policies can call them without
-- recursive RLS; fixed search_path; inactive employees resolve to nothing).
-----------------------------------------------------------------------------
create function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  where p.user_id = auth.uid()
    and p.employment_status = 'active';
$$;

create function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.user_id = auth.uid()
    and p.employment_status = 'active';
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

-- True when the signed-in user is the active manager (or admin) that `target`
-- directly reports to. Direct reports only (owner decision).
create function public.is_manager_of(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles t
    join public.profiles m on m.id = t.reporting_manager_id
    where t.id = target
      and m.user_id = auth.uid()
      and m.employment_status = 'active'
      and m.role in ('manager', 'admin')
  );
$$;

-----------------------------------------------------------------------------
-- Profile integrity rules (enforced for every writer, including admins)
-----------------------------------------------------------------------------
create function public.profiles_enforce_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cursor uuid;
  v_depth  integer := 0;
begin
  -- Reporting manager must be an active manager/admin.
  if new.reporting_manager_id is not null
     and (tg_op = 'INSERT' or new.reporting_manager_id is distinct from old.reporting_manager_id) then
    if not exists (
      select 1 from public.profiles m
      where m.id = new.reporting_manager_id
        and m.employment_status = 'active'
        and m.role in ('manager', 'admin')
    ) then
      raise exception 'The reporting manager must be an active manager or admin.'
        using errcode = 'P0001';
    end if;

    -- No loops in the reporting chain.
    v_cursor := new.reporting_manager_id;
    while v_cursor is not null loop
      if v_cursor = new.id then
        raise exception 'This reporting manager would create a loop in the reporting chain.'
          using errcode = 'P0001';
      end if;
      v_depth := v_depth + 1;
      if v_depth > 100 then
        raise exception 'Reporting chain is too deep.' using errcode = 'P0001';
      end if;
      select reporting_manager_id into v_cursor from public.profiles where id = v_cursor;
    end loop;
  end if;

  -- Department must be active when assigned or changed.
  if new.department_id is not null
     and (tg_op = 'INSERT' or new.department_id is distinct from old.department_id) then
    if not exists (select 1 from public.departments d where d.id = new.department_id and d.is_active) then
      raise exception 'The selected department is not active.' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    -- Email is the login identity; it cannot change once the account is linked.
    if old.user_id is not null and new.work_email is distinct from old.work_email then
      raise exception 'Work email cannot be changed after the account has been created.'
        using errcode = 'P0001';
    end if;

    -- Signed-in users cannot change their own role or deactivate themselves.
    if old.user_id is not null and old.user_id = auth.uid() then
      if new.role is distinct from old.role then
        raise exception 'You cannot change your own role.' using errcode = '42501';
      end if;
      if new.employment_status is distinct from old.employment_status then
        raise exception 'You cannot change your own employment status.' using errcode = '42501';
      end if;
    end if;

    -- A manager with active direct reports cannot be demoted or deactivated.
    if old.role in ('manager', 'admin')
       and (new.role = 'employee' or new.employment_status = 'inactive')
       and (new.role is distinct from old.role or new.employment_status is distinct from old.employment_status)
       and exists (
         select 1 from public.profiles r
         where r.reporting_manager_id = old.id and r.employment_status = 'active'
       ) then
      raise exception 'This person still has active team members. Assign them to another manager first.'
        using errcode = 'P0001';
    end if;

    -- There must always be at least one active admin.
    if old.role = 'admin' and old.employment_status = 'active'
       and (new.role <> 'admin' or new.employment_status <> 'active')
       and not exists (
         select 1 from public.profiles a
         where a.id <> old.id and a.role = 'admin' and a.employment_status = 'active'
       ) then
      raise exception 'At least one active admin is required.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_enforce_rules
  before insert or update on public.profiles
  for each row execute function public.profiles_enforce_rules();

-- Link a newly created (invited) auth user to the profile with the same email.
create function public.link_auth_user_to_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null then
    update public.profiles
       set user_id = new.id
     where work_email = lower(new.email)
       and user_id is null;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created_link_profile
  after insert on auth.users
  for each row execute function public.link_auth_user_to_profile();

-----------------------------------------------------------------------------
-- audit_logs (append-only; written only by SECURITY DEFINER code)
-----------------------------------------------------------------------------
create table public.audit_logs (
  id               bigint generated always as identity primary key,
  occurred_at      timestamptz not null default now(),
  actor_user_id    uuid,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  action           text not null check (char_length(action) between 1 and 60),
  table_name       text not null check (char_length(table_name) between 1 and 60),
  record_id        text not null,
  old_data         jsonb,
  new_data         jsonb
);
create index audit_logs_record_idx on public.audit_logs (table_name, record_id);
create index audit_logs_occurred_idx on public.audit_logs (occurred_at desc);

create function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (actor_user_id, actor_profile_id, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(),
    public.current_profile_id(),
    lower(tg_op),
    tg_table_name,
    coalesce(new.id, old.id)::text,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return null;
end;
$$;

create trigger departments_audit
  after insert or update on public.departments
  for each row execute function public.write_audit_log();

create trigger profiles_audit
  after insert or update on public.profiles
  for each row execute function public.write_audit_log();

-----------------------------------------------------------------------------
-- colleague_names(): the ONLY way non-admins see other people. Returns names,
-- designation and department of active staff — never contact details, joining
-- date or role. (Owner-approved.)
-----------------------------------------------------------------------------
create function public.colleague_names()
returns table (id uuid, full_name text, designation text, department_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.designation, p.department_id
  from public.profiles p
  where p.employment_status = 'active'
    and public.current_profile_id() is not null
  order by p.full_name;
$$;

-----------------------------------------------------------------------------
-- Row Level Security
-----------------------------------------------------------------------------
alter table public.departments enable row level security;
alter table public.profiles    enable row level security;
alter table public.audit_logs  enable row level security;

-- departments: any active signed-in employee can read names; only admins write.
create policy departments_select on public.departments
  for select to authenticated
  using (public.current_profile_id() is not null);

create policy departments_insert on public.departments
  for insert to authenticated
  with check (public.is_admin());

create policy departments_update on public.departments
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- profiles: self, direct reports (managers), everyone (admins). Only admins write.
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = public.current_profile_id()
    or public.is_admin()
    or public.is_manager_of(id)
  );

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.is_admin());

create policy profiles_update on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- audit_logs: admins read; nobody writes directly.
create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (public.is_admin());

-----------------------------------------------------------------------------
-- Privileges (least privilege; anon gets nothing; no DELETE for anyone)
-----------------------------------------------------------------------------
revoke all on table public.departments, public.profiles, public.audit_logs from anon, authenticated;

grant select on table public.departments to authenticated;
grant insert (name, description, is_active, sort_order) on table public.departments to authenticated;
grant update (name, description, is_active, sort_order) on table public.departments to authenticated;

grant select on table public.profiles to authenticated;
grant insert (employee_code, full_name, work_email, phone, department_id, designation,
              reporting_manager_id, joining_date, role)
  on table public.profiles to authenticated;
grant update (employee_code, full_name, work_email, phone, department_id, designation,
              reporting_manager_id, joining_date, employment_status, role)
  on table public.profiles to authenticated;

grant select on table public.audit_logs to authenticated;

revoke execute on function
  public.set_updated_at(),
  public.current_profile_id(),
  public.current_app_role(),
  public.is_admin(),
  public.is_manager_of(uuid),
  public.profiles_enforce_rules(),
  public.link_auth_user_to_profile(),
  public.write_audit_log(),
  public.colleague_names()
from public, anon;

grant execute on function
  public.current_profile_id(),
  public.current_app_role(),
  public.is_admin(),
  public.is_manager_of(uuid),
  public.colleague_names()
to authenticated;
