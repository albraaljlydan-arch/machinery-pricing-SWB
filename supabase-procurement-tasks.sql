-- ============================================================================
-- مهام المشتريات بالكميات / Quantity-based procurement tasks
--
-- شغّل الملف مرة واحدة من Supabase SQL Editor. آمن لإعادة التشغيل.
-- كل بند مواد بالمشروع يصير مهمة شراء عند بدء التصنيع. المشتريات تسجّل
-- الكمية المشتراة والمورد وموعد الوصول بدل إدخال نسبة يدوية.
--
-- Run once in Supabase SQL Editor. Safe to re-run. Every purchasable row in
-- the project becomes a task when production starts. Procurement records the
-- bought quantity, supplier and delivery date instead of typing a percentage.
-- ============================================================================

create table if not exists public.procurement_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_name_snapshot text not null,
  source_category text not null check (source_category in ('sheets', 'profiles', 'mills', 'pipes', 'squares', 'orders')),
  source_row_id text not null,
  item_name text not null,
  details text,
  source_data jsonb not null default '{}'::jsonb,
  unit_label text not null default 'قطعة',
  total_quantity numeric(12,3) not null check (total_quantity > 0),
  purchased_quantity numeric(12,3) not null default 0 check (purchased_quantity >= 0 and purchased_quantity <= total_quantity),
  received_quantity numeric(12,3) not null default 0 check (received_quantity >= 0 and received_quantity <= purchased_quantity),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (project_id, source_category, source_row_id)
);

create table if not exists public.procurement_task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.procurement_tasks(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  quantity numeric(12,3) not null check (quantity > 0),
  supplier text not null,
  unit_price numeric(14,2) check (unit_price is null or unit_price >= 0),
  expected_arrival_date date,
  received_at timestamptz,
  notes text,
  work_date date not null default current_date,
  logged_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists procurement_tasks_project_idx on public.procurement_tasks(project_id);
create index if not exists procurement_task_updates_task_idx on public.procurement_task_updates(task_id);
create index if not exists procurement_task_updates_supplier_idx on public.procurement_task_updates(supplier);

alter table public.procurement_tasks enable row level security;
alter table public.procurement_task_updates enable row level security;

drop policy if exists "procurement_tasks: signed-in read" on public.procurement_tasks;
drop policy if exists "procurement_task_updates: signed-in read" on public.procurement_task_updates;
create policy "procurement_tasks: signed-in read" on public.procurement_tasks for select to authenticated using (true);
create policy "procurement_task_updates: signed-in read" on public.procurement_task_updates for select to authenticated using (true);

-- يبني المهام من نسخة ملف المصمم الموجودة داخل المشروع.
-- Builds task snapshots from the designer file stored on the project.
create or replace function public.seed_procurement_tasks(p_project_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_project public.projects%rowtype;
begin
  select * into v_project from public.projects where id = p_project_id;
  if not found then raise exception 'Project not found'; end if;

  insert into public.procurement_tasks (
    project_id, project_name_snapshot, source_category, source_row_id,
    item_name, details, source_data, unit_label, total_quantity
  )
  select
    v_project.id,
    v_project.project_name,
    category,
    coalesce(nullif(row_data->>'id', ''), category || '-' || ordinality::text),
    case category
      when 'sheets' then 'Sheet · ' || coalesce(row_data->>'materialId', 'Material')
      when 'profiles' then 'Profile · ' || coalesce(row_data->>'materialId', 'Material')
      when 'mills' then 'Mill stock · ' || coalesce(row_data->>'materialId', 'Material')
      when 'pipes' then 'Pipe · ' || coalesce(row_data->>'materialId', 'Material')
      when 'squares' then 'Square stock · ' || coalesce(row_data->>'materialId', 'Material')
      else coalesce(nullif(trim(row_data->>'orderName'), ''), 'Ready-made item')
    end,
    case category
      when 'sheets' then concat_ws(' × ', row_data->>'length', row_data->>'width', row_data->>'thickness') || ' mm'
      when 'profiles' then concat_ws(' · ', row_data->>'profileType', row_data->>'sectionOpt', (row_data->>'length') || ' m')
      when 'mills' then 'Ø ' || coalesce(row_data->>'diameter', '—') || ' mm · ' || coalesce(row_data->>'length', '—') || ' cm'
      when 'pipes' then 'OD ' || coalesce(row_data->>'outerDiameter', '—') || ' / ID ' || coalesce(row_data->>'innerDiameter', '—') || ' mm'
      when 'squares' then concat_ws(' × ', row_data->>'width', row_data->>'thickness', row_data->>'length')
      else nullif(concat_ws(' · ', nullif(trim(row_data->>'description'), ''), nullif(trim(row_data->>'properties'), '')), '')
    end,
    row_data,
    unit_label,
    greatest(coalesce(nullif(row_data->>'quantity', '')::numeric, 1), 0.001)
  from (
    select 'sheets'::text category, 'لوح'::text unit_label, elem row_data, ordinality
      from jsonb_array_elements(coalesce(v_project.project_data->'sheetRows', '[]'::jsonb)) with ordinality as x(elem, ordinality)
    union all
    select 'profiles', 'بار', elem, ordinality from jsonb_array_elements(coalesce(v_project.project_data->'profileRows', '[]'::jsonb)) with ordinality as x(elem, ordinality)
    union all
    select 'mills', 'قطعة', elem, ordinality from jsonb_array_elements(coalesce(v_project.project_data->'millRows', '[]'::jsonb)) with ordinality as x(elem, ordinality)
    union all
    select 'pipes', 'قطعة', elem, ordinality from jsonb_array_elements(coalesce(v_project.project_data->'pipeRows', '[]'::jsonb)) with ordinality as x(elem, ordinality)
    union all
    select 'squares', 'قطعة', elem, ordinality from jsonb_array_elements(coalesce(v_project.project_data->'squareRows', '[]'::jsonb)) with ordinality as x(elem, ordinality)
    union all
    select 'orders', 'قطعة', elem, ordinality from jsonb_array_elements(coalesce(v_project.project_data->'orderRows', '[]'::jsonb)) with ordinality as x(elem, ordinality)
  ) rows
  on conflict (project_id, source_category, source_row_id) do nothing;
end; $$;

-- أي انتقال إلى قيد التصنيع يولّد المهام فورًا.
-- Any transition into production creates the tasks immediately.
create or replace function public.seed_procurement_tasks_on_production()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'In Production' then
    if tg_op = 'INSERT' then
      perform public.seed_procurement_tasks(new.id);
    elsif old.status is distinct from new.status then
      perform public.seed_procurement_tasks(new.id);
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists projects_seed_procurement_tasks on public.projects;
create trigger projects_seed_procurement_tasks
after insert or update of status on public.projects
for each row execute function public.seed_procurement_tasks_on_production();

-- خصم كمية شراء بشكل ذري، مع كتابة صف متوافق للتقارير القديمة.
-- Atomically deducts a bought quantity and writes a compatibility progress row.
create or replace function public.record_procurement_purchase(
  p_task_id uuid,
  p_quantity numeric,
  p_supplier text,
  p_unit_price numeric default null,
  p_expected_arrival_date date default null,
  p_received boolean default false,
  p_notes text default null
)
returns public.procurement_tasks language plpgsql security definer set search_path = public as $$
declare
  v_task public.procurement_tasks%rowtype;
  v_remaining numeric;
  v_total numeric;
  v_purchased numeric;
  v_flags jsonb := jsonb_build_object('sheets', '[]'::jsonb, 'profiles', '[]'::jsonb, 'mills', '[]'::jsonb, 'pipes', '[]'::jsonb, 'squares', '[]'::jsonb, 'orders', '[]'::jsonb);
begin
  if public.current_app_role() not in ('procurement', 'developer') then raise exception 'Only procurement can record purchases'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be greater than zero'; end if;
  if nullif(trim(p_supplier), '') is null then raise exception 'Supplier is required'; end if;

  select * into v_task from public.procurement_tasks where id = p_task_id for update;
  if not found then raise exception 'Task not found'; end if;
  v_remaining := v_task.total_quantity - v_task.purchased_quantity;
  if p_quantity > v_remaining then raise exception 'Quantity exceeds the remaining balance'; end if;

  update public.procurement_tasks
  set purchased_quantity = purchased_quantity + p_quantity,
      received_quantity = received_quantity + case when p_received then p_quantity else 0 end,
      completed_at = case when received_quantity + case when p_received then p_quantity else 0 end = total_quantity then now() else null end
  where id = p_task_id returning * into v_task;

  insert into public.procurement_task_updates (task_id, project_id, quantity, supplier, unit_price, expected_arrival_date, received_at, notes, logged_by)
  values (v_task.id, v_task.project_id, p_quantity, trim(p_supplier), p_unit_price, p_expected_arrival_date,
          case when p_received then now() else null end, nullif(trim(p_notes), ''), auth.uid());

  select coalesce(sum(total_quantity), 0), coalesce(sum(purchased_quantity), 0)
  into v_total, v_purchased from public.procurement_tasks where project_id = v_task.project_id;

  if v_task.purchased_quantity = v_task.total_quantity then
    v_flags := jsonb_set(v_flags, array[v_task.source_category], jsonb_build_array(jsonb_build_object('id', v_task.source_row_id, 'reason', '')));
  end if;

  insert into public.purchase_requests (
    project_id, project_name_snapshot, work_date, requested_by, requested_row_ids,
    pieces_today, pieces_cumulative, total_pieces, daily_percent, cumulative_percent, approval_status
  ) values (
    v_task.project_id, v_task.project_name_snapshot, current_date, auth.uid(), v_flags,
    round(p_quantity)::integer, round(v_purchased)::integer, round(v_total)::integer,
    case when v_total > 0 then p_quantity / v_total * 100 else 0 end,
    case when v_total > 0 then v_purchased / v_total * 100 else 0 end,
    'approved'
  );
  return v_task;
end; $$;

-- تأكيد وصول كل الكمية المطلوبة من موردين لهذه المهمة.
-- Confirms receipt of every already-ordered unit for a task.
create or replace function public.mark_procurement_task_received(p_task_id uuid)
returns public.procurement_tasks language plpgsql security definer set search_path = public as $$
declare v_task public.procurement_tasks%rowtype;
begin
  if public.current_app_role() not in ('procurement', 'developer') then raise exception 'Only procurement can confirm deliveries'; end if;
  select * into v_task from public.procurement_tasks where id = p_task_id for update;
  if not found then raise exception 'Task not found'; end if;
  if v_task.purchased_quantity <= v_task.received_quantity then raise exception 'There is no pending delivery'; end if;
  update public.procurement_task_updates set received_at = now()
    where task_id = p_task_id and received_at is null;
  update public.procurement_tasks set received_quantity = purchased_quantity,
    completed_at = case when purchased_quantity = total_quantity then now() else null end
    where id = p_task_id returning * into v_task;
  return v_task;
end; $$;

-- تعبئة المشاريع الموجودة أصلًا قيد التصنيع.
-- Back-fill projects that are already in production.
do $$ declare p record; begin
  for p in select id from public.projects where status = 'In Production' loop
    perform public.seed_procurement_tasks(p.id);
  end loop;
end $$;

-- الطلبات الموافق عليها بالنظام القديم تُعتبر مؤمّنة بالكامل.
-- Rows approved in the legacy checklist are back-filled as fully secured.
update public.procurement_tasks t
set purchased_quantity = t.total_quantity,
    received_quantity = t.total_quantity,
    completed_at = coalesce(t.completed_at, now())
where exists (
  select 1
  from public.purchase_requests r,
       lateral jsonb_array_elements(coalesce(r.requested_row_ids->t.source_category, '[]'::jsonb)) flag
  where r.project_id = t.project_id
    and r.approval_status = 'approved'
    and flag->>'id' = t.source_row_id
);

revoke all on function public.seed_procurement_tasks(uuid) from public;
revoke all on function public.record_procurement_purchase(uuid, numeric, text, numeric, date, boolean, text) from public;
revoke all on function public.mark_procurement_task_received(uuid) from public;
grant execute on function public.record_procurement_purchase(uuid, numeric, text, numeric, date, boolean, text) to authenticated;
grant execute on function public.mark_procurement_task_received(uuid) to authenticated;

-- تحديث أرقام القائمة الجانبية لحظيًا / Keep sidebar badges live.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'procurement_tasks') then
    alter publication supabase_realtime add table public.procurement_tasks;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'procurement_task_updates') then
    alter publication supabase_realtime add table public.procurement_task_updates;
  end if;
end $$;
