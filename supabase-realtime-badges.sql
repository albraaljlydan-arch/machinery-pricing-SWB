-- ============================================================================
--  Realtime للأرقام على تبويبات القائمة الجانبية (كل الأدوار)
--  Realtime for the sidebar nav badge counts (every role)
--  Run this ONCE in the Supabase SQL editor. Safe to re-run.
--
--  الأرقام (متل "٣" على تبويب "طلبات الزبائن" أو "بانتظار الموافقة") كانت
--  تُحسب مرة وحدة لما الصفحة تفتح وتضل ثابتة لحد ما المستخدم يعمل ريفرش.
--  هاد الملف يفعّل Realtime على الجداول يلي هاي الأرقام مبنية عليها، حتى
--  تتحدّث لحظيًا بدون ريفرش — chat_messages كانت الوحيدة المفعّلة قبل هلق
--  (من supabase-customer-requests.sql).
--
--  The sidebar badge counts (e.g. "3" on "Customer Requests" or "Pending
--  Approval") were computed once on page load and stayed frozen until a
--  manual refresh. This enables Realtime on every table those counts are
--  built from, so they update live — chat_messages was the only table this
--  was already on (from supabase-customer-requests.sql).
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'projects'
  ) then
    alter publication supabase_realtime add table public.projects;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'customer_requests'
  ) then
    alter publication supabase_realtime add table public.customer_requests;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'factory_operations'
  ) then
    alter publication supabase_realtime add table public.factory_operations;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'purchase_requests'
  ) then
    alter publication supabase_realtime add table public.purchase_requests;
  end if;
end $$;

-- فحص سريع بعد التشغيل / Quick check afterwards
select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' order by tablename;
