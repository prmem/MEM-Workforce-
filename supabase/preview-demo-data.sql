-- MEM Workforce — FICTIONAL demo data for a PREVIEW project only.
-- Paste into the Supabase SQL Editor of the preview project AFTER the schema setup.
-- Never run this on a production project. No passwords are stored here: demo logins are
-- created in the Supabase dashboard (Authentication → Users → Add user) and are linked to
-- these profiles automatically by email.
--
-- Refuses to run if any employee profile already exists. All-or-nothing: on any error nothing is saved.

begin;

do $$
begin
  if exists (select 1 from public.profiles) then
    raise exception 'Profiles already exist. This demo data is only for an empty preview project.';
  end if;
end $$;

-- People (surname "Demo" marks demo data). Managers are inserted before their reports.
insert into public.profiles (employee_code, full_name, work_email, role, department_id, designation, joining_date)
values ('ADM-001', 'Anita Demo', 'admin@example.com', 'admin',
        (select id from public.departments where name = 'Administration'), 'Administrator', '2026-04-01');

insert into public.profiles (employee_code, full_name, work_email, role, department_id, designation, reporting_manager_id, joining_date)
select v.code, v.name, v.email, v.role::public.app_role,
       (select id from public.departments where name = v.dept), v.designation,
       (select id from public.profiles where work_email = v.manager_email), '2026-04-01'
from (values
  ('MGR-001', 'Rohit Demo',  'manager.production@example.com', 'manager', 'Production', 'Production Supervisor', 'admin@example.com'),
  ('MGR-002', 'Sunita Demo', 'manager.sales@example.com',      'manager', 'Sales',      'Sales Manager',         'admin@example.com')
) as v(code, name, email, role, dept, designation, manager_email);

insert into public.profiles (employee_code, full_name, work_email, role, department_id, designation, reporting_manager_id, phone, joining_date)
select v.code, v.name, v.email, 'employee',
       (select id from public.departments where name = v.dept), v.designation,
       (select id from public.profiles where work_email = v.manager_email), v.phone, '2026-04-01'
from (values
  ('EMP-001', 'Vikram Demo', 'vikram@example.com', 'Production',      'Machine Operator',   'manager.production@example.com', '+91 90000 00001'),
  ('EMP-002', 'Kavita Demo', 'kavita@example.com', 'Quality Control', 'QC Inspector',       'manager.production@example.com', null),
  ('EMP-003', 'Arjun Demo',  'arjun@example.com',  'Dispatch',        'Dispatch Assistant', 'manager.production@example.com', null),
  ('EMP-004', 'Meena Demo',  'meena@example.com',  'Sales',           'Sales Executive',    'manager.sales@example.com',      null),
  ('EMP-005', 'Rahul Demo',  'rahul@example.com',  'Purchase',        'Purchase Assistant', 'manager.sales@example.com',      null),
  ('EMP-006', 'Pooja Demo',  'pooja@example.com',  'Accounts',        'Accounts Assistant', 'admin@example.com',              null),
  ('EMP-007', 'Former Demo', 'former@example.com', 'Production',      'Helper',             'manager.production@example.com', null)
) as v(code, name, email, dept, designation, manager_email, phone);

update public.profiles set employment_status = 'inactive' where work_email = 'former@example.com';

-- Tasks (examples from the spec). Due times are relative to now so "overdue" shows up.
with t(title, assignee, creator, priority, status, due_hours, target, done, unit, note) as (values
  ('Complete cable tray production batch 14',     'vikram@example.com', 'manager.production@example.com', 'high',   'in_progress',          30,   500::numeric, 220::numeric, 'pcs', null),
  ('Update actual production quantity for batch 13','vikram@example.com','manager.production@example.com', 'medium', 'to_do',                -20,  null, null, null, null),
  ('Inspect finished cable trays (batch 12)',      'kavita@example.com', 'manager.production@example.com', 'high',   'submitted_for_review', 10,   300, 300, 'pcs', 'All 300 inspected; 4 rejected for coating defects.'),
  ('Record inspection quantity and defects',       'kavita@example.com', 'manager.production@example.com', 'medium', 'completed',            -48,  null, null, null, null),
  ('Prepare dispatch documentation for order 2211','arjun@example.com',  'manager.production@example.com', 'urgent', 'blocked',              6,    null, null, null, 'Waiting for invoice copy from Accounts.'),
  ('Confirm order dispatch 2209',                  'arjun@example.com',  'manager.production@example.com', 'medium', 'to_do',                72,   null, null, null, null),
  ('Follow up with distributors (North region)',   'meena@example.com',  'manager.sales@example.com',      'medium', 'in_progress',          48,   null, null, null, null),
  ('Record quotation response from distributor',   'meena@example.com',  'manager.sales@example.com',      'low',    'reopened',             -5,   null, null, null, 'Please add the quoted price.'),
  ('Follow up on raw material deliveries',         'rahul@example.com',  'manager.sales@example.com',      'high',   'to_do',                24,   null, null, null, null),
  ('Complete payment reconciliation for October',  'pooja@example.com',  'admin@example.com',              'high',   'in_progress',          -2,   null, null, null, null),
  ('Monthly production review',                    'manager.production@example.com', 'admin@example.com',  'medium', 'to_do',                96,   null, null, null, null),
  ('Old cancelled stock count',                    'vikram@example.com', 'manager.production@example.com', 'low',    'cancelled',            -100, null, null, null, 'Replaced by batch audit.')
),
ins as (
  insert into public.tasks (title, description, assigned_to, created_by, department_id, priority, status, due_at,
                            target_quantity, completed_quantity, unit, completion_note, reviewed_by, reviewed_at, completed_at)
  select t.title, 'Fictional demo task.', a.id, c.id, a.department_id, t.priority::public.task_priority, t.status::public.task_status,
         now() + make_interval(hours => t.due_hours), t.target, t.done, t.unit,
         case when t.status = 'submitted_for_review' then t.note end,
         case when t.status in ('completed', 'reopened') then c.id end,
         case when t.status in ('completed', 'reopened') then now() - interval '1 hour' end,
         case when t.status = 'completed' then now() - interval '1 hour' end
  from t
  join public.profiles a on a.work_email = t.assignee
  join public.profiles c on c.work_email = t.creator
  returning id, title, status, assigned_to, created_by
)
insert into public.task_updates (task_id, author_id, kind, from_status, to_status, note)
select id, created_by, 'created', null::public.task_status, 'to_do'::public.task_status, null::text from ins
union all
select ins.id,
       case when ins.status in ('completed', 'reopened', 'cancelled') then ins.created_by else ins.assigned_to end,
       case when ins.status = 'cancelled' then 'cancelled'
            when ins.status in ('completed', 'reopened') then 'review'
            else 'status' end,
       'to_do'::public.task_status, ins.status, t.note::text
from ins
join t on t.title = ins.title
where ins.status <> 'to_do';

commit;

select 'Demo data loaded: ' || (select count(*) from public.profiles) || ' people, '
       || (select count(*) from public.tasks) || ' tasks.' as result;
