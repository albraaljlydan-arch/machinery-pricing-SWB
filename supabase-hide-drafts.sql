-- ============================================================================
--  SWB Manufacturing System — Drafts Are Private to Their Designer
--  شغّلو كامل بمرة وحدة من: Supabase Dashboard -> SQL Editor -> New query
--  Run this whole file at once, from: Supabase Dashboard -> SQL Editor
-- ============================================================================
--
--  السياسة الحالية "projects: signed-in read" مفتوحة على using (true) —
--  يعني أي حد مسجّل دخول (مدير، مصنع، مشتريات...) يقدر يشوف كل مشروع بأي
--  حالة، حتى مشاريع لسا Draft ما حدا بعتها. هاد بيسكّرها: مشروع الـ Draft
--  ما يشوفه غير صاحبو (المصمم يلي عملو). أي حالة تانية (Pending Admin،
--  Rejected، Awaiting Production...) تضل مفتوحة متل ما كانت بالضبط —
--  ما تغيّر شي غير رؤية الـ Draft.
--
--  The current "projects: signed-in read" policy is wide open
--  (using (true)) — any signed-in account (Admin, Factory, Procurement…)
--  can see every project at every status, including Drafts nobody has
--  submitted yet. This locks that down: a Draft project is visible only to
--  the Designer who owns it. Every other status (Pending Admin, Rejected,
--  Awaiting Production…) stays exactly as open as before — only Draft
--  visibility changes.
-- ============================================================================

drop policy if exists "projects: signed-in read" on public.projects;

create policy "projects: signed-in read"
  on public.projects for select
  to authenticated
  using (
    status <> 'Draft'
    or user_id = auth.uid()
  );
