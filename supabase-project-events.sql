-- ============================================================================
--  project_events — سجل زمني لكل تحوّل بحياة المشروع (مين، إيمتى، وشو صار)
--  project_events — an audit trail of every status transition in a project's
--  life: who did it, when, and any note attached.
--  Run this ONCE in the Supabase SQL editor. Safe to re-run.
--
--  ليش جدول مستقل بدل أعمدة تواريخ على projects؟
--   - المشروع ممكن ينرفض أكتر من مرة، فعمود rejected_at واحد بيضيّع التاريخ.
--   - الأدمن بدو يشوف التسلسل كامل (إنشاء ← تسليم ← رفض ← تسليم ← موافقة).
--   - التدقيق على أداء المصمم (كم مرة انرفض، كم أخد وقت للتسليم) ما بينعمل
--     من حالة واحدة حالية، بينعمل من تاريخ كامل.
--
--  Why a separate table instead of date columns on `projects`?
--   - A project can be rejected more than once; a single rejected_at column
--     throws that history away.
--   - Admin needs the full sequence (created → submitted → rejected →
--     submitted → approved), not just the latest state.
--   - Auditing a designer (how often rejected, how long to deliver) is a
--     question about history, which a current-status column cannot answer.
-- ============================================================================

create table if not exists public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_type text not null check (
    event_type in ('created', 'submitted', 'approved', 'rejected', 'production_started', 'production_finished', 'completed')
  ),
  -- مين عمل الحدث. nullable لأن أحداث قديمة/مستوردة ممكن ما يكون إلها فاعل معروف.
  -- Who did it. Nullable because back-filled/imported events may have no known actor.
  actor_id uuid references auth.users(id),
  -- ملاحظة حرة: سبب الرفض، عدد السطور المعلَّمة، إلخ.
  -- Free note: rejection reason, number of flagged rows, etc.
  note text,
  created_at timestamptz not null default now()
);

create index if not exists project_events_project_id_idx on public.project_events(project_id);
create index if not exists project_events_actor_id_idx on public.project_events(actor_id);
create index if not exists project_events_type_idx on public.project_events(event_type);

alter table public.project_events enable row level security;

drop policy if exists "project_events: signed-in read" on public.project_events;
drop policy if exists "project_events: signed-in write" on public.project_events;

-- القراءة مفتوحة لكل مسجّل دخول، تمامًا متل projects نفسها — التسلسل الزمني
-- ما بيكشف أكتر مما الجدول الأصلي بيكشفو أصلًا.
-- Read is open to any signed-in user, exactly like `projects` itself — the
-- timeline exposes nothing the projects table doesn't already expose.
create policy "project_events: signed-in read"
  on public.project_events for select
  to authenticated
  using (true);

-- الكتابة: كل دور بيسجّل حدثو باسمو هو. ما في update ولا delete أبدًا —
-- السجل التاريخي لازم يضل غير قابل للتعديل حتى يكون صالح للتدقيق.
-- Write: each role logs its own event under its own id. There is deliberately
-- NO update and NO delete policy — an audit trail that can be edited after the
-- fact is not an audit trail.
create policy "project_events: signed-in write"
  on public.project_events for insert
  to authenticated
  with check (actor_id = auth.uid());


-- ---------------------------------------------------------------------------
--  تعبئة أولية: كل مشروع موجود بياخد حدث "إنشاء" بتاريخ إنشائه الحقيقي، حتى
--  الصفحات الجديدة ما تطلع فاضية للمشاريع القديمة.
--  Back-fill: every existing project gets a 'created' event at its real
--  creation date, so the new timeline/stats screens aren't empty for
--  everything that predates this table.
-- ---------------------------------------------------------------------------
insert into public.project_events (project_id, event_type, actor_id, created_at)
select p.id, 'created', p.user_id, p.created_at
from public.projects p
where not exists (
  select 1 from public.project_events e
  where e.project_id = p.id and e.event_type = 'created'
);


-- فحص سريع بعد التشغيل / Quick check afterwards
select event_type, count(*) as count
from public.project_events
group by event_type
order by event_type;
