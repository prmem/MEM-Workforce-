-- MEM Workforce — Phase 1 tasks
-- tasks + task_updates (append-only history). Clients can only SELECT (via RLS);
-- every write goes through the SECURITY DEFINER functions below, which check
-- permissions and the allowed status workflow.
--
-- Source of truth:
--   * current status  -> tasks.status
--   * history         -> task_updates (append-only)
--   * "overdue"       -> computed: due_at < now() and status not in (completed, cancelled). Never stored.

create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.task_status as enum (
  'to_do', 'in_progress', 'blocked', 'submitted_for_review', 'completed', 'reopened', 'cancelled'
);

create table public.tasks (
  id                 uuid primary key default gen_random_uuid(),
  task_number        bigint generated always as identity unique,
  title              text not null check (char_length(btrim(title)) between 1 and 200),
  description        text check (description is null or char_length(description) <= 5000),
  assigned_to        uuid not null references public.profiles (id) on delete restrict,
  created_by         uuid not null references public.profiles (id) on delete restrict,
  department_id      uuid references public.departments (id) on delete restrict,
  priority           public.task_priority not null default 'medium',
  start_date         date,
  due_at             timestamptz,
  status             public.task_status not null default 'to_do',
  target_quantity    numeric(14, 3) check (target_quantity is null or target_quantity > 0),
  completed_quantity numeric(14, 3) check (completed_quantity is null or completed_quantity >= 0),
  unit               text check (unit is null or char_length(btrim(unit)) between 1 and 30),
  completion_note    text check (completion_note is null or char_length(completion_note) <= 2000),
  reviewed_by        uuid references public.profiles (id) on delete restrict,
  reviewed_at        timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint tasks_due_after_start check (
    due_at is null or start_date is null or (due_at at time zone 'Asia/Kolkata')::date >= start_date
  ),
  constraint tasks_completed_at_matches_status check ((status = 'completed') = (completed_at is not null))
);
create index tasks_assigned_to_idx on public.tasks (assigned_to);
create index tasks_created_by_idx on public.tasks (created_by);
create index tasks_status_idx on public.tasks (status);
create index tasks_due_at_idx on public.tasks (due_at);
create index tasks_department_idx on public.tasks (department_id);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create table public.task_updates (
  id                 bigint generated always as identity primary key,
  task_id            uuid not null references public.tasks (id) on delete restrict,
  author_id          uuid not null references public.profiles (id) on delete restrict,
  kind               text not null check (kind in ('created', 'status', 'progress', 'review', 'edited', 'reassigned', 'cancelled')),
  from_status        public.task_status,
  to_status          public.task_status,
  note               text check (note is null or char_length(note) <= 2000),
  completed_quantity numeric(14, 3) check (completed_quantity is null or completed_quantity >= 0),
  created_at         timestamptz not null default now()
);
create index task_updates_task_idx on public.task_updates (task_id, created_at);

-- Reassignments are also written to the audit log.
create trigger tasks_audit_reassign
  after update of assigned_to on public.tasks
  for each row
  when (old.assigned_to is distinct from new.assigned_to)
  execute function public.write_audit_log();

-----------------------------------------------------------------------------
-- Permission helper
-----------------------------------------------------------------------------
-- Admins manage every task; a manager manages tasks of their direct reports.
create function public.can_manage_assignee(p_assignee uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or public.is_manager_of(p_assignee);
$$;

-- Internal: resolve caller or fail.
create function public.require_profile()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.current_profile_id();
begin
  if v_me is null then
    raise exception 'You are not signed in or your account is inactive.' using errcode = '42501';
  end if;
  return v_me;
end;
$$;

-----------------------------------------------------------------------------
-- create_task
-----------------------------------------------------------------------------
create function public.create_task(
  p_title           text,
  p_assigned_to     uuid,
  p_description     text default null,
  p_priority        public.task_priority default 'medium',
  p_start_date      date default null,
  p_due_at          timestamptz default null,
  p_target_quantity numeric default null,
  p_unit            text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me   uuid := public.require_profile();
  v_dept uuid;
  v_id   uuid;
begin
  select department_id into v_dept
    from public.profiles
   where id = p_assigned_to and employment_status = 'active';
  if not found then
    raise exception 'The selected employee was not found or is inactive.' using errcode = 'P0001';
  end if;

  if not public.can_manage_assignee(p_assigned_to) then
    raise exception 'You can only assign tasks to members of your own team.' using errcode = '42501';
  end if;

  insert into public.tasks (title, description, assigned_to, created_by, department_id, priority,
                            start_date, due_at, target_quantity, unit)
  values (btrim(p_title), nullif(btrim(p_description), ''), p_assigned_to, v_me, v_dept,
          coalesce(p_priority, 'medium'), p_start_date, p_due_at, p_target_quantity, nullif(btrim(p_unit), ''))
  returning id into v_id;

  insert into public.task_updates (task_id, author_id, kind, to_status)
  values (v_id, v_me, 'created', 'to_do');

  return v_id;
end;
$$;

-----------------------------------------------------------------------------
-- update_task_progress (assignee only)
-- Allowed moves: to_do -> in_progress; in_progress <-> blocked;
-- in_progress -> submitted_for_review; reopened -> in_progress.
-----------------------------------------------------------------------------
create function public.update_task_progress(
  p_task_id            uuid,
  p_new_status         public.task_status default null,
  p_note               text default null,
  p_completed_quantity numeric default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me   uuid := public.require_profile();
  v_task public.tasks%rowtype;
  v_note text := nullif(btrim(p_note), '');
  v_to   public.task_status;
begin
  select * into v_task from public.tasks where id = p_task_id for update;
  if not found or v_task.assigned_to <> v_me then
    raise exception 'Task not found, or it is not assigned to you.' using errcode = '42501';
  end if;

  if v_task.status in ('completed', 'cancelled') then
    raise exception 'This task is closed and can no longer be updated.' using errcode = 'P0001';
  end if;
  if v_task.status = 'submitted_for_review' then
    raise exception 'This task is waiting for review. Your manager must approve or reopen it first.' using errcode = 'P0001';
  end if;

  if p_completed_quantity is not null and p_completed_quantity < 0 then
    raise exception 'Quantity cannot be negative.' using errcode = 'P0001';
  end if;

  v_to := case when p_new_status is not null and p_new_status <> v_task.status then p_new_status end;

  if v_to is not null and not (
       (v_task.status = 'to_do'       and v_to = 'in_progress')
    or (v_task.status = 'in_progress' and v_to in ('blocked', 'submitted_for_review'))
    or (v_task.status = 'blocked'     and v_to = 'in_progress')
    or (v_task.status = 'reopened'    and v_to = 'in_progress')
  ) then
    raise exception 'This status change is not allowed.' using errcode = 'P0001';
  end if;

  if v_to = 'blocked' and v_note is null then
    raise exception 'Please explain why the task is blocked.' using errcode = 'P0001';
  end if;

  if v_to is null and v_note is null and p_completed_quantity is null then
    raise exception 'Nothing to update. Add a note, a quantity or a new status.' using errcode = 'P0001';
  end if;

  update public.tasks
     set status             = coalesce(v_to, status),
         completed_quantity = coalesce(p_completed_quantity, completed_quantity),
         completion_note    = case when v_to = 'submitted_for_review' then v_note else completion_note end
   where id = p_task_id;

  insert into public.task_updates (task_id, author_id, kind, from_status, to_status, note, completed_quantity)
  values (p_task_id, v_me,
          case when v_to is null then 'progress' else 'status' end,
          case when v_to is null then null else v_task.status end,
          v_to, v_note, p_completed_quantity);
end;
$$;

-----------------------------------------------------------------------------
-- review_task (assignee's manager or an admin; never the assignee)
-----------------------------------------------------------------------------
create function public.review_task(
  p_task_id  uuid,
  p_decision text,
  p_note     text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me   uuid := public.require_profile();
  v_task public.tasks%rowtype;
  v_note text := nullif(btrim(p_note), '');
  v_to   public.task_status;
begin
  if p_decision not in ('approve', 'reopen') then
    raise exception 'Unknown review decision.' using errcode = 'P0001';
  end if;

  select * into v_task from public.tasks where id = p_task_id for update;
  if not found or not public.can_manage_assignee(v_task.assigned_to) then
    raise exception 'Task not found, or you are not allowed to review it.' using errcode = '42501';
  end if;
  if v_task.assigned_to = v_me then
    raise exception 'You cannot review your own task.' using errcode = '42501';
  end if;
  if v_task.status <> 'submitted_for_review' then
    raise exception 'Only tasks submitted for review can be approved or reopened.' using errcode = 'P0001';
  end if;
  if p_decision = 'reopen' and v_note is null then
    raise exception 'Please give a reason for reopening the task.' using errcode = 'P0001';
  end if;

  v_to := case when p_decision = 'approve' then 'completed' else 'reopened' end;

  update public.tasks
     set status       = v_to,
         reviewed_by  = v_me,
         reviewed_at  = now(),
         completed_at = case when v_to = 'completed' then now() else null end
   where id = p_task_id;

  insert into public.task_updates (task_id, author_id, kind, from_status, to_status, note)
  values (p_task_id, v_me, 'review', v_task.status, v_to, v_note);
end;
$$;

-----------------------------------------------------------------------------
-- cancel_task / edit_task / reassign_task (assignee's manager or an admin)
-----------------------------------------------------------------------------
create function public.lock_managed_open_task(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me   uuid := public.require_profile();
  v_task public.tasks%rowtype;
begin
  select * into v_task from public.tasks where id = p_task_id for update;
  if not found or not public.can_manage_assignee(v_task.assigned_to) then
    raise exception 'Task not found, or you are not allowed to change it.' using errcode = '42501';
  end if;
  if v_task.assigned_to = v_me then
    raise exception 'You cannot manage your own task. Ask your manager or an admin.' using errcode = '42501';
  end if;
  if v_task.status in ('completed', 'cancelled') then
    raise exception 'This task is closed and can no longer be changed.' using errcode = 'P0001';
  end if;
  return v_task;
end;
$$;

create function public.cancel_task(p_task_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me   uuid := public.require_profile();
  v_task public.tasks;
  v_note text := nullif(btrim(p_reason), '');
begin
  v_task := public.lock_managed_open_task(p_task_id);
  if v_note is null then
    raise exception 'Please give a reason for cancelling the task.' using errcode = 'P0001';
  end if;

  update public.tasks set status = 'cancelled' where id = p_task_id;

  insert into public.task_updates (task_id, author_id, kind, from_status, to_status, note)
  values (p_task_id, v_me, 'cancelled', v_task.status, 'cancelled', v_note);
end;
$$;

create function public.edit_task(
  p_task_id         uuid,
  p_title           text,
  p_description     text,
  p_priority        public.task_priority,
  p_start_date      date,
  p_due_at          timestamptz,
  p_target_quantity numeric,
  p_unit            text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me   uuid := public.require_profile();
  v_task public.tasks;
begin
  v_task := public.lock_managed_open_task(p_task_id);

  update public.tasks
     set title           = btrim(p_title),
         description     = nullif(btrim(p_description), ''),
         priority        = coalesce(p_priority, priority),
         start_date      = p_start_date,
         due_at          = p_due_at,
         target_quantity = p_target_quantity,
         unit            = nullif(btrim(p_unit), '')
   where id = p_task_id;

  insert into public.task_updates (task_id, author_id, kind)
  values (p_task_id, v_me, 'edited');
end;
$$;

create function public.reassign_task(p_task_id uuid, p_new_assignee uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me   uuid := public.require_profile();
  v_task public.tasks;
  v_dept uuid;
begin
  v_task := public.lock_managed_open_task(p_task_id);

  if p_new_assignee = v_task.assigned_to then
    raise exception 'The task is already assigned to this person.' using errcode = 'P0001';
  end if;

  select department_id into v_dept
    from public.profiles
   where id = p_new_assignee and employment_status = 'active';
  if not found then
    raise exception 'The selected employee was not found or is inactive.' using errcode = 'P0001';
  end if;
  if not public.can_manage_assignee(p_new_assignee) then
    raise exception 'You can only assign tasks to members of your own team.' using errcode = '42501';
  end if;

  update public.tasks
     set assigned_to = p_new_assignee,
         department_id = v_dept
   where id = p_task_id;

  insert into public.task_updates (task_id, author_id, kind, note)
  values (p_task_id, v_me, 'reassigned', nullif(btrim(p_reason), ''));
end;
$$;

-----------------------------------------------------------------------------
-- RLS: read access only. Assignee, the assignee's direct manager, admins.
-----------------------------------------------------------------------------
alter table public.tasks        enable row level security;
alter table public.task_updates enable row level security;

create policy tasks_select on public.tasks
  for select to authenticated
  using (
    assigned_to = public.current_profile_id()
    or public.can_manage_assignee(assigned_to)
  );

create policy task_updates_select on public.task_updates
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));

revoke all on table public.tasks, public.task_updates from anon, authenticated;
grant select on table public.tasks, public.task_updates to authenticated;

revoke execute on function
  public.can_manage_assignee(uuid),
  public.require_profile(),
  public.lock_managed_open_task(uuid),
  public.create_task(text, uuid, text, public.task_priority, date, timestamptz, numeric, text),
  public.update_task_progress(uuid, public.task_status, text, numeric),
  public.review_task(uuid, text, text),
  public.cancel_task(uuid, text),
  public.edit_task(uuid, text, text, public.task_priority, date, timestamptz, numeric, text),
  public.reassign_task(uuid, uuid, text)
from public, anon;

-- Internal helpers: not callable by any client role.
revoke execute on function
  public.require_profile(),
  public.lock_managed_open_task(uuid)
from authenticated;

grant execute on function
  public.can_manage_assignee(uuid),
  public.create_task(text, uuid, text, public.task_priority, date, timestamptz, numeric, text),
  public.update_task_progress(uuid, public.task_status, text, numeric),
  public.review_task(uuid, text, text),
  public.cancel_task(uuid, text),
  public.edit_task(uuid, text, text, public.task_priority, date, timestamptz, numeric, text),
  public.reassign_task(uuid, uuid, text)
to authenticated;
