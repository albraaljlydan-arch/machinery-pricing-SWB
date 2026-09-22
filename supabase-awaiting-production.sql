-- ============================================================================
--  حالة "قيد الانتظار" — طبقة جديدة بين موافقة المدير وبدء المصنع للتصنيع
--  "Awaiting Production" — a new stage between Admin's approval and Factory
--  actually starting production.
--  Run this ONCE in the Supabase SQL editor. Safe to re-run.
--
--  المدير هلق بيوافق على المشروع فينتقل لحالة "Awaiting Production" (قيد
--  الانتظار)، مش "In Production" مباشرة — والمصنع هو يلي بيقرر لما يبلش
--  التصنيع فعليًا (زر "بدء التصنيع" الجديد بصفحة المشروع). هاي السياسة
--  بتوسّع صلاحية المصنع الحالية لتسمح بهاد الانتقال الإضافي.
--
--  Admin now approves into "Awaiting Production", not straight into "In
--  Production" — Factory decides when production actually starts (the new
--  "Start Production" button on the project page). This widens Factory's
--  existing update policy to allow that extra transition.
-- ============================================================================

-- نفس مشكلة profiles.role يلي واجهناها قبل: عمود projects.status عندو
-- check constraint قديم ما بيعرف "Awaiting Production" — لازم نوسّعو.
--
-- Same issue as profiles.role before: projects.status has a pre-existing
-- check constraint that doesn't know "Awaiting Production" — widen it.
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check
  check (status in ('Draft', 'Pending Admin', 'Awaiting Production', 'In Production', 'Complete Production', 'Completed', 'Rejected'));

drop policy if exists "projects: factory advances production" on public.projects;

create policy "projects: factory advances production"
  on public.projects for update
  to authenticated
  using (
    public.current_app_role() = 'factory'
    and status in ('Awaiting Production', 'In Production')
  )
  with check (status in ('Awaiting Production', 'In Production', 'Complete Production'));
