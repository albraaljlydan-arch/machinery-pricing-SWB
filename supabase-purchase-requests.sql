-- ============================================================================
--  purchase_requests — طلبات الشراء اليومية (المشتريات) بموافقة المصنع
--  Run this ONCE in the Supabase SQL editor (Project -> SQL Editor -> New
--  query -> paste -> Run). It only creates this one new table + its RLS
--  policies; it does not touch any existing table.
--
--  Mirrors the exact submit-as-pending / role-approves shape already used
--  by `factory_operations` (see supabase-rls.sql, section 5) — a parallel
--  log that never touches `projects.status`.
-- ============================================================================

create table if not exists public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_name_snapshot text not null,
  work_date date not null default current_date,
  requested_by uuid not null references auth.users(id),
  -- {sheets:[id,...], profiles:[...], mills:[...], pipes:[...], squares:[...], orders:[...]}
  requested_row_ids jsonb not null default '{}'::jsonb,
  pieces_today integer not null default 0,
  pieces_cumulative integer not null default 0,
  total_pieces integer not null default 0,
  daily_percent numeric not null default 0,
  cumulative_percent numeric not null default 0,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  -- Set by Factory on reject. Shown back to Procurement; never surfaced to Admin.
  rejection_note text,
  created_at timestamptz not null default now()
);

-- Safe to re-run this whole file even if the table already exists from an
-- earlier version of this script (before `rejection_note` existed).
alter table public.purchase_requests add column if not exists rejection_note text;

create index if not exists purchase_requests_project_id_idx on public.purchase_requests(project_id);
create index if not exists purchase_requests_approval_status_idx on public.purchase_requests(approval_status);

alter table public.purchase_requests enable row level security;

drop policy if exists "purchase_requests: signed-in read" on public.purchase_requests;
drop policy if exists "purchase_requests: procurement logs own" on public.purchase_requests;
drop policy if exists "purchase_requests: factory approves" on public.purchase_requests;
drop policy if exists "purchase_requests: admin full write" on public.purchase_requests;

create policy "purchase_requests: signed-in read"
  on public.purchase_requests for select
  to authenticated
  using (true);

-- المشتريات: تسجّل طلبات باسمها، ودايمًا بحالة "بانتظار الموافقة" — ما
-- تقدر توافق على طلبها هي.
-- Procurement: inserts requests under their own id, always as pending —
-- they cannot approve their own request.
create policy "purchase_requests: procurement logs own"
  on public.purchase_requests for insert
  to authenticated
  with check (
    public.current_app_role() in ('procurement', 'developer')
    and requested_by = auth.uid()
    and approval_status = 'pending'
  );

create policy "purchase_requests: factory approves"
  on public.purchase_requests for update
  to authenticated
  using (public.current_app_role() = 'factory')
  with check (approval_status in ('pending', 'approved', 'rejected'));

create policy "purchase_requests: admin full write"
  on public.purchase_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
