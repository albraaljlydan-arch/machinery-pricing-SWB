-- Follow-up task balances. Run once in Supabase SQL Editor; safe to re-run.
create table if not exists public.followup_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_name_snapshot text not null,
  source_operation_id text not null,
  title text not null,
  details text,
  remaining_percent numeric(5,2) not null default 100 check (remaining_percent between 0 and 100),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (project_id, source_operation_id)
);
create table if not exists public.followup_task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.followup_tasks(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  deducted_percent numeric(5,2) not null check (deducted_percent > 0),
  remaining_after numeric(5,2) not null check (remaining_after between 0 and 100),
  notes text,
  work_date date not null default current_date,
  logged_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists followup_tasks_project_idx on public.followup_tasks(project_id);
create index if not exists followup_task_updates_task_idx on public.followup_task_updates(task_id);
create index if not exists followup_task_updates_date_idx on public.followup_task_updates(work_date);
alter table public.followup_tasks enable row level security;
alter table public.followup_task_updates enable row level security;
drop policy if exists "followup_tasks: signed-in read" on public.followup_tasks;
drop policy if exists "followup_task_updates: signed-in read" on public.followup_task_updates;
create policy "followup_tasks: signed-in read" on public.followup_tasks for select to authenticated using (true);
create policy "followup_task_updates: signed-in read" on public.followup_task_updates for select to authenticated using (true);

create or replace function public.start_production_with_followup_tasks(p_project_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_project public.projects%rowtype;
begin
  if public.current_app_role() not in ('factory', 'developer') then raise exception 'Only factory can start production'; end if;
  select * into v_project from public.projects where id = p_project_id for update;
  if not found then raise exception 'Project not found'; end if;
  if v_project.status <> 'Awaiting Production' then raise exception 'Project is not awaiting production'; end if;
  insert into public.followup_tasks (project_id, project_name_snapshot, source_operation_id, title, details)
  select v_project.id, v_project.project_name,
    coalesce(nullif(op->>'id', ''), 'operation-' || ordinality::text),
    coalesce(nullif(trim(op->>'process'), ''), nullif(trim(op->>'description'), ''), 'متابعة تصنيع الماكينة'),
    nullif(concat_ws(' · ', nullif(trim(op->>'description'), ''), nullif(trim(op->>'type'), ''), nullif(trim(op->>'properties'), '')), '')
  from jsonb_array_elements(coalesce(v_project.project_data->'operations', '[]'::jsonb)) with ordinality as rows(op, ordinality)
  on conflict (project_id, source_operation_id) do nothing;
  if not exists (select 1 from public.followup_tasks where project_id = v_project.id) then
    insert into public.followup_tasks (project_id, project_name_snapshot, source_operation_id, title)
    values (v_project.id, v_project.project_name, '__general__', 'متابعة تصنيع الماكينة')
    on conflict (project_id, source_operation_id) do nothing;
  end if;
  update public.projects set status = 'In Production' where id = v_project.id;
end; $$;

create or replace function public.deduct_followup_task(p_task_id uuid, p_percent numeric, p_notes text default null)
returns public.followup_tasks language plpgsql security definer set search_path = public as $$
declare v_task public.followup_tasks%rowtype; v_remaining numeric(5,2);
begin
  if public.current_app_role() not in ('followup', 'developer') then raise exception 'Only follow-up can update these tasks'; end if;
  if p_percent is null or p_percent <= 0 then raise exception 'The deduction must be greater than zero'; end if;
  select * into v_task from public.followup_tasks where id = p_task_id for update;
  if not found then raise exception 'Task not found'; end if;
  if p_percent > v_task.remaining_percent then raise exception 'The deduction exceeds the remaining balance'; end if;
  v_remaining := v_task.remaining_percent - p_percent;
  update public.followup_tasks set remaining_percent = v_remaining,
    completed_at = case when v_remaining = 0 then now() else null end
  where id = p_task_id returning * into v_task;
  insert into public.followup_task_updates (task_id, project_id, deducted_percent, remaining_after, notes, logged_by)
  values (v_task.id, v_task.project_id, p_percent, v_remaining, nullif(trim(p_notes), ''), auth.uid());
  insert into public.factory_operations (project_id, project_name_snapshot, operation_type, work_date, completion_percent, notes, logged_by, approval_status)
  values (v_task.project_id, v_task.project_name_snapshot, v_task.title, current_date, p_percent, nullif(trim(p_notes), ''), auth.uid(), 'approved');
  return v_task;
end; $$;
revoke all on function public.start_production_with_followup_tasks(uuid) from public;
revoke all on function public.deduct_followup_task(uuid, numeric, text) from public;
grant execute on function public.start_production_with_followup_tasks(uuid) to authenticated;
grant execute on function public.deduct_followup_task(uuid, numeric, text) to authenticated;


-- Back-fill machines that were already in production when this migration ran.
insert into public.followup_tasks (project_id, project_name_snapshot, source_operation_id, title, details)
select p.id, p.project_name,
  coalesce(nullif(op->>'id', ''), 'operation-' || ordinality::text),
  coalesce(nullif(trim(op->>'process'), ''), nullif(trim(op->>'description'), ''), 'متابعة تصنيع الماكينة'),
  nullif(concat_ws(' · ', nullif(trim(op->>'description'), ''), nullif(trim(op->>'type'), ''), nullif(trim(op->>'properties'), '')), '')
from public.projects p
cross join lateral jsonb_array_elements(coalesce(p.project_data->'operations', '[]'::jsonb)) with ordinality as rows(op, ordinality)
where p.status = 'In Production'
on conflict (project_id, source_operation_id) do nothing;

insert into public.followup_tasks (project_id, project_name_snapshot, source_operation_id, title)
select p.id, p.project_name, '__general__', 'متابعة تصنيع الماكينة'
from public.projects p
where p.status = 'In Production'
  and not exists (select 1 from public.followup_tasks t where t.project_id = p.id)
on conflict (project_id, source_operation_id) do nothing;
