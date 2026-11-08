-- RLS + workflow tests for tasks / task_updates. Runs directly in Postgres. Rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

-- Fixtures: admin; manager1 -> emp1, emp2; manager2 -> emp3. Fictional only.
insert into public.profiles (id, employee_code, full_name, work_email, role) values
  ('b0000000-0000-4000-8000-000000000001', 'T-ADM', 'Test Admin',    'admin@example.com',    'admin'),
  ('b0000000-0000-4000-8000-000000000002', 'T-M1',  'Test Manager1', 'manager1@example.com', 'manager'),
  ('b0000000-0000-4000-8000-000000000003', 'T-M2',  'Test Manager2', 'manager2@example.com', 'manager');
insert into public.profiles (id, employee_code, full_name, work_email, role, reporting_manager_id, department_id) values
  ('b0000000-0000-4000-8000-000000000004', 'T-E1', 'Test Emp1', 'emp1@example.com', 'employee', 'b0000000-0000-4000-8000-000000000002', (select id from public.departments where name = 'Production')),
  ('b0000000-0000-4000-8000-000000000005', 'T-E2', 'Test Emp2', 'emp2@example.com', 'employee', 'b0000000-0000-4000-8000-000000000002', (select id from public.departments where name = 'Production')),
  ('b0000000-0000-4000-8000-000000000006', 'T-E3', 'Test Emp3', 'emp3@example.com', 'employee', 'b0000000-0000-4000-8000-000000000003', (select id from public.departments where name = 'Sales'));
insert into auth.users (id, email, aud, role, instance_id)
select ('a0000000-0000-4000-8000-00000000000' || n)::uuid, e, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
from (values (1,'admin@example.com'),(2,'manager1@example.com'),(3,'manager2@example.com'),
             (4,'emp1@example.com'),(5,'emp2@example.com'),(6,'emp3@example.com')) v(n, e);

-- helper table to pass ids between role switches
create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;

-----------------------------------------------------------------------------
-- Manager 1 creates tasks
-----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select lives_ok($$insert into ids values ('t1', public.create_task('Complete cable tray batch 14', 'b0000000-0000-4000-8000-000000000004', 'Fictional demo task', 'high', current_date, now() + interval '2 days', 500, 'pcs'))$$,
                'manager can assign a task to a direct report');
select throws_ok($$select public.create_task('Not my team', 'b0000000-0000-4000-8000-000000000006')$$,
                 '42501', 'You can only assign tasks to members of your own team.', 'manager cannot assign outside their team');
select throws_ok($$select public.create_task('Self task', 'b0000000-0000-4000-8000-000000000002')$$,
                 '42501', 'You can only assign tasks to members of your own team.', 'manager cannot assign a task to themselves');
select throws_ok($$insert into public.tasks (title, assigned_to, created_by) values ('direct', 'b0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002')$$,
                 '42501', null, 'no one can insert tasks directly (must use create_task)');
select throws_ok($$select public.create_task('Bad qty', 'b0000000-0000-4000-8000-000000000004', null, 'low', null, null, -5, 'pcs')$$,
                 '23514', null, 'negative target quantity is rejected');
select throws_ok($$select public.create_task('Bad dates', 'b0000000-0000-4000-8000-000000000004', null, 'low', current_date, now() - interval '3 days', null, null)$$,
                 '23514', null, 'due date before start date is rejected');
select lives_ok($$insert into ids values ('t2', public.create_task('Inspect finished trays', 'b0000000-0000-4000-8000-000000000005'))$$,
                'manager can assign to a second direct report');
select is((select count(*)::int from public.tasks), 2, 'manager sees their team''s tasks');
select is((select department_id from public.tasks where id = (select v from ids where k = 't1')),
          (select id from public.departments where name = 'Production'), 'task department defaults to the assignee''s department');
reset role;

-- Admin assigns a task to manager2's employee
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into ids values ('t3', public.create_task('Follow up with distributor', 'b0000000-0000-4000-8000-000000000006'))$$,
                'admin can assign a task to anyone');
select is((select count(*)::int from public.tasks), 3, 'admin sees all tasks');
reset role;

-----------------------------------------------------------------------------
-- Isolation
-----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.tasks), 1, 'manager2 sees only their team''s task');
select is((select count(*)::int from public.task_updates where task_id = (select v from ids where k = 't1')), 0, 'manager2 cannot read another team''s task history');
select throws_ok($$select public.review_task((select v from ids where k = 't1'), 'approve')$$,
                 '42501', 'Task not found, or you are not allowed to review it.', 'manager2 cannot review another team''s task');
select throws_ok($$select public.cancel_task((select v from ids where k = 't1'), 'no')$$,
                 '42501', 'Task not found, or you are not allowed to change it.', 'manager2 cannot cancel another team''s task');
reset role;

select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.tasks), 1, 'employee2 sees only their own task');
select throws_ok($$select public.update_task_progress((select v from ids where k = 't1'), 'in_progress')$$,
                 '42501', 'Task not found, or it is not assigned to you.', 'employee cannot update a colleague''s task');
reset role;

-----------------------------------------------------------------------------
-- Employee 1 works the task
-----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.tasks), 1, 'employee1 sees only their own task');
select throws_ok($$update public.tasks set status = 'completed' where id = (select v from ids where k = 't1')$$,
                 '42501', null, 'employee cannot update tasks directly');
select throws_ok($$select public.update_task_progress((select v from ids where k = 't1'), 'completed')$$,
                 'P0001', 'This status change is not allowed.', 'employee cannot mark a task completed');
select throws_ok($$select public.update_task_progress((select v from ids where k = 't1'), 'submitted_for_review')$$,
                 'P0001', 'This status change is not allowed.', 'employee cannot skip from To Do to Submitted');
select throws_ok($$select public.review_task((select v from ids where k = 't1'), 'approve')$$,
                 '42501', 'Task not found, or you are not allowed to review it.', 'employee cannot approve their own task');
select lives_ok($$select public.update_task_progress((select v from ids where k = 't1'), 'in_progress', 'Started cutting')$$,
                'employee can start their task');
select throws_ok($$select public.update_task_progress((select v from ids where k = 't1'), null, null, -1)$$,
                 'P0001', 'Quantity cannot be negative.', 'negative completed quantity is rejected');
select throws_ok($$select public.update_task_progress((select v from ids where k = 't1'), 'blocked')$$,
                 'P0001', 'Please explain why the task is blocked.', 'blocking requires a reason');
select lives_ok($$select public.update_task_progress((select v from ids where k = 't1'), null, 'Half done', 250)$$,
                'employee can record progress quantity');
select lives_ok($$select public.update_task_progress((select v from ids where k = 't1'), 'submitted_for_review', 'All 500 done')$$,
                'employee can submit for review');
select throws_ok($$select public.update_task_progress((select v from ids where k = 't1'), null, 'more notes')$$,
                 'P0001', 'This task is waiting for review. Your manager must approve or reopen it first.', 'task is locked while under review');
select throws_ok($$update public.task_updates set note = 'rewritten' where task_id = (select v from ids where k = 't1')$$,
                 '42501', null, 'task history cannot be edited');
select throws_ok($$delete from public.task_updates where task_id = (select v from ids where k = 't1')$$,
                 '42501', null, 'task history cannot be deleted');
reset role;

-----------------------------------------------------------------------------
-- Manager 1 reviews
-----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.review_task((select v from ids where k = 't1'), 'reopen')$$,
                 'P0001', 'Please give a reason for reopening the task.', 'reopening requires a reason');
select lives_ok($$select public.review_task((select v from ids where k = 't1'), 'reopen', 'Count is short by 10')$$,
                'manager can reopen a submitted task');
reset role;

select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.update_task_progress((select v from ids where k = 't1'), 'in_progress', 'Fixing count')$$, 'employee resumes a reopened task');
select lives_ok($$select public.update_task_progress((select v from ids where k = 't1'), 'submitted_for_review', 'Recounted: 500')$$, 'employee resubmits');
reset role;

select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.review_task((select v from ids where k = 't1'), 'approve')$$, 'manager approves the task');
select is((select status::text from public.tasks where id = (select v from ids where k = 't1')), 'completed', 'approved task is Completed');
select ok((select completed_at is not null and reviewed_by = 'b0000000-0000-4000-8000-000000000002' from public.tasks where id = (select v from ids where k = 't1')),
          'completion records reviewer and time');
select is((select count(*)::int from public.task_updates where task_id = (select v from ids where k = 't1')), 8,
          'every step is kept in task history');
select throws_ok($$select public.cancel_task((select v from ids where k = 't1'), 'too late')$$,
                 'P0001', 'This task is closed and can no longer be changed.', 'completed tasks cannot be cancelled');
select throws_ok($$select public.reassign_task((select v from ids where k = 't2'), 'b0000000-0000-4000-8000-000000000006')$$,
                 '42501', 'You can only assign tasks to members of your own team.', 'manager cannot reassign outside their team');
reset role;

select * from finish();
rollback;
