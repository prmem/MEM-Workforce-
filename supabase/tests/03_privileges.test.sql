-- Privilege regression tests: least privilege for client roles (anon, authenticated).
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- anon: no table privileges and no function execution in public.
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'),
  0, 'anon has no table privileges in public');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')),
  0, 'anon cannot execute any public function');

-- authenticated: only the explicit allowlist of functions.
select is(
  (select string_agg(p.proname, ',' order by p.proname)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')),
  'can_manage_assignee,cancel_task,colleague_names,create_task,current_app_role,current_profile_id,edit_task,is_admin,is_manager_of,reassign_task,review_task,update_task_progress',
  'authenticated can execute only the allowlisted functions');

-- authenticated: no DELETE anywhere; no direct writes to tasks/history/audit.
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'authenticated' and privilege_type in ('DELETE', 'TRUNCATE')),
  0, 'authenticated cannot delete or truncate any table');

select is(
  (select count(*)::int from information_schema.table_privileges
    where table_schema = 'public' and grantee = 'authenticated'
      and table_name in ('tasks', 'task_updates', 'audit_logs')
      and privilege_type <> 'SELECT'),
  0, 'tasks, task history and audit logs are read-only for clients');

-- every public table has RLS enabled
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0, 'RLS is enabled on every public table');

select * from finish();
rollback;
