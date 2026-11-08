-- RLS + integrity tests for departments, profiles, audit_logs.
-- Runs directly in Postgres (independent of the UI). Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(39);

-- Isolate from any seed/E2E data (rolled back with the transaction).
truncate table public.task_updates, public.tasks, public.audit_logs, public.profiles restart identity cascade;
delete from public.departments
 where name not in ('Production','Quality Control','Dispatch','Sales','Purchase','Accounts','Administration');
update public.departments set is_active = true;


-----------------------------------------------------------------------------
-- Fixtures (as postgres). Fictional people only.
-- auth ids: a...01 admin, 02 manager1, 03 manager2, 04 emp1 (->m1), 05 emp2 (->m1),
--           06 emp3 (->m2), 07 inactive (->m1)
-----------------------------------------------------------------------------
insert into public.profiles (id, employee_code, full_name, work_email, role, department_id) values
  ('b0000000-0000-4000-8000-000000000001', 'T-ADM', 'Test Admin',    'admin@test.local',    'admin',   (select id from public.departments where name = 'Administration')),
  ('b0000000-0000-4000-8000-000000000002', 'T-M1',  'Test Manager1', 'manager1@test.local', 'manager', (select id from public.departments where name = 'Production')),
  ('b0000000-0000-4000-8000-000000000003', 'T-M2',  'Test Manager2', 'manager2@test.local', 'manager', (select id from public.departments where name = 'Sales'));
insert into public.profiles (id, employee_code, full_name, work_email, role, reporting_manager_id, phone) values
  ('b0000000-0000-4000-8000-000000000004', 'T-E1', 'Test Emp1', 'emp1@test.local', 'employee', 'b0000000-0000-4000-8000-000000000002', '+91 90000 00001'),
  ('b0000000-0000-4000-8000-000000000005', 'T-E2', 'Test Emp2', 'emp2@test.local', 'employee', 'b0000000-0000-4000-8000-000000000002', null),
  ('b0000000-0000-4000-8000-000000000006', 'T-E3', 'Test Emp3', 'emp3@test.local', 'employee', 'b0000000-0000-4000-8000-000000000003', null),
  ('b0000000-0000-4000-8000-000000000007', 'T-EX', 'Test Former', 'former@test.local', 'employee', 'b0000000-0000-4000-8000-000000000002', null);

insert into auth.users (id, email, aud, role, instance_id) values
  ('a0000000-0000-4000-8000-000000000001', 'admin@test.local',    'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('a0000000-0000-4000-8000-000000000002', 'manager1@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('a0000000-0000-4000-8000-000000000003', 'manager2@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('a0000000-0000-4000-8000-000000000004', 'EMP1@test.local',     'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('a0000000-0000-4000-8000-000000000005', 'emp2@test.local',     'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('a0000000-0000-4000-8000-000000000006', 'emp3@test.local',     'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('a0000000-0000-4000-8000-000000000007', 'former@test.local',   'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

update public.profiles set employment_status = 'inactive' where id = 'b0000000-0000-4000-8000-000000000007';

-- 1-2: auth users are linked to profiles by email (case-insensitive)
select is((select count(*)::int from public.profiles where user_id is not null), 7, 'invited auth users are linked to their profiles');
select is((select user_id from public.profiles where employee_code = 'T-E1'),
          'a0000000-0000-4000-8000-000000000004'::uuid, 'email matching is case-insensitive');

-----------------------------------------------------------------------------
-- Anonymous visitors get nothing
-----------------------------------------------------------------------------
set local role anon;
select throws_ok('select count(*) from public.profiles', '42501', null, 'anon cannot read profiles');
select throws_ok('select count(*) from public.departments', '42501', null, 'anon cannot read departments');
select throws_ok('select * from public.colleague_names()', '42501', null, 'anon cannot call colleague_names()');
reset role;

-----------------------------------------------------------------------------
-- Employee 1
-----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from public.profiles), 1, 'employee sees only their own profile');
select is((select count(*)::int from public.profiles where employee_code = 'T-E2'), 0, 'employee cannot see a colleague''s profile');
select is((select count(*)::int from public.departments), 7, 'employee can read department names');
select is(public.is_admin(), false, 'employee is not admin');

-- role escalation attempts
update public.profiles set role = 'admin' where id = 'b0000000-0000-4000-8000-000000000004';
select throws_ok($$update public.profiles set user_id = 'a0000000-0000-4000-8000-000000000001' where id = 'b0000000-0000-4000-8000-000000000004'$$,
                 '42501', null, 'employee cannot write user_id (column privilege)');
select throws_ok($$insert into public.profiles (employee_code, full_name, work_email, role) values ('X1','Sneaky','sneaky@test.local','admin')$$,
                 '42501', null, 'employee cannot create profiles');
select throws_ok($$delete from public.profiles where id = 'b0000000-0000-4000-8000-000000000004'$$,
                 '42501', null, 'employee cannot delete profiles');
select throws_ok($$insert into public.departments (name) values ('Fake Dept')$$,
                 '42501', null, 'employee cannot create departments');
update public.departments set name = 'Hacked' where name = 'Sales';

-- colleague_names exposes only names/designation/department
select is((select count(*)::int from public.colleague_names()), 6, 'colleague_names lists active staff only');
select is(
  (select string_agg(p.parameter_name::text, ',' order by p.ordinal_position)
     from information_schema.routines r
     join information_schema.parameters p on p.specific_name = r.specific_name
    where r.routine_schema = 'public' and r.routine_name = 'colleague_names' and p.parameter_mode = 'OUT'),
  'id,full_name,designation,department_id',
  'colleague_names returns no contact details, role or joining date');

-- audit log is admin-only and append-only
select is((select count(*)::int from public.audit_logs), 0, 'employee cannot read audit logs');
select throws_ok($$insert into public.audit_logs (action, table_name, record_id) values ('x','x','x')$$,
                 '42501', null, 'employee cannot write audit logs');
reset role;

select is((select role::text from public.profiles where employee_code = 'T-E1'), 'employee', 'employee self-promotion had no effect');
select is((select count(*)::int from public.departments where name = 'Hacked'), 0, 'employee department rename had no effect');

-----------------------------------------------------------------------------
-- Manager 1 (direct reports: emp1, emp2, former)
-----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from public.profiles), 4, 'manager sees self + direct reports');
select is((select count(*)::int from public.profiles where employee_code = 'T-E3'), 0, 'manager cannot see another team''s employee');
select is((select count(*)::int from public.profiles where employee_code = 'T-M2'), 0, 'manager cannot see another manager''s profile');
select is((select phone from public.profiles where employee_code = 'T-E1'), '+91 90000 00001', 'manager can see a direct report''s phone');
update public.profiles set designation = 'Changed by manager' where id = 'b0000000-0000-4000-8000-000000000004';
reset role;
select is((select designation from public.profiles where employee_code = 'T-E1'), null, 'manager cannot edit profiles (admins only)');

-----------------------------------------------------------------------------
-- Inactive (deactivated) employee loses all access
-----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000007","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.profiles), 0, 'deactivated employee cannot read any profile');
select is((select count(*)::int from public.departments), 0, 'deactivated employee cannot read departments');
select is((select count(*)::int from public.colleague_names()), 0, 'deactivated employee gets no colleague names');
reset role;

-----------------------------------------------------------------------------
-- Admin
-----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from public.profiles), 7, 'admin sees all profiles');
select ok((select count(*) from public.audit_logs) > 0, 'admin can read audit logs');
select lives_ok($$insert into public.departments (name) values ('Maintenance')$$, 'admin can create a department');
select throws_ok($$insert into public.departments (name) values ('maintenance ')$$, '23505', null, 'department names are unique (case/space-insensitive)');
select throws_ok($$update public.profiles set role = 'employee' where id = 'b0000000-0000-4000-8000-000000000001'$$,
                 '42501', 'You cannot change your own role.', 'admin cannot change their own role');
select throws_ok($$update public.profiles set role = 'employee' where id = 'b0000000-0000-4000-8000-000000000002'$$,
                 'P0001', 'This person still has active team members. Assign them to another manager first.',
                 'manager with active reports cannot be demoted');
select throws_ok($$update public.profiles set reporting_manager_id = 'b0000000-0000-4000-8000-000000000004' where id = 'b0000000-0000-4000-8000-000000000005'$$,
                 'P0001', 'The reporting manager must be an active manager or admin.',
                 'reporting manager must have the manager/admin role');
select lives_ok($$update public.profiles set reporting_manager_id = 'b0000000-0000-4000-8000-000000000003' where id = 'b0000000-0000-4000-8000-000000000002'$$,
                'admin can set a manager''s manager');
select throws_ok($$update public.profiles set reporting_manager_id = 'b0000000-0000-4000-8000-000000000002' where id = 'b0000000-0000-4000-8000-000000000003'$$,
                 'P0001', 'This reporting manager would create a loop in the reporting chain.',
                 'reporting loops are rejected');
select throws_ok($$update public.profiles set work_email = 'new@test.local' where id = 'b0000000-0000-4000-8000-000000000004'$$,
                 'P0001', 'Work email cannot be changed after the account has been created.',
                 'login email is locked once the account exists');
select throws_ok($$insert into public.profiles (employee_code, full_name, work_email) values ('t-e1', 'Dup Code', 'dup@test.local')$$,
                 '23505', null, 'employee IDs are unique (case-insensitive)');
reset role;

-- Last active admin cannot be removed (even by a privileged session)
select set_config('request.jwt.claims', '', true);
select throws_ok($$update public.profiles set employment_status = 'inactive' where id = 'b0000000-0000-4000-8000-000000000001'$$,
                 'P0001', 'At least one active admin is required.', 'the last active admin cannot be deactivated');

select * from finish();
rollback;
