-- ============================================================================
--  إزالة تتبّع العمال / Retiring per-worker tracking
--  شغّلو من: Supabase Dashboard -> SQL Editor -> New query
-- ============================================================================
--
--  التقدّم صار يُسجَّل على الماكينة، لا على العامل. حقل العامل انشال من
--  شاشة مهندس المتابعة، فالإدخال الجديد ما عاد يبعت worker_id ولا
--  worker_name.
--
--  ⚠️ إذا كان هدول العمودين NOT NULL، كل تسجيل عملية جديد رح يفشل برسالة
--  null value in column "worker_id" violates not-null constraint.
--  هاد الملف يفكّ القيد. آمن للتشغيل أكثر من مرة، وما يمسح أي بيانات:
--  الصفوف القديمة تحتفظ بأسماء عمالها كما هي.
--
--  Progress is now logged per MACHINE, not per worker. The worker field is
--  gone from the Follow-up Engineer's screen, so new inserts no longer send
--  worker_id or worker_name.
--
--  ⚠️ If those columns are NOT NULL, every new log will fail with
--  'null value in column "worker_id" violates not-null constraint'.
--  This file lifts that. Safe to re-run, and it deletes nothing — existing
--  rows keep the worker names they were saved with.
-- ============================================================================

-- ١) فكّ قيد NOT NULL إن كان موجودًا (do-nothing إذا كان مفكوكًا أصلًا)
-- 1) Drop the NOT NULL if present (a no-op if it already isn't)
alter table public.factory_operations alter column worker_id  drop not null;
alter table public.factory_operations alter column worker_name drop not null;

-- ٢) فكّ المفتاح الأجنبي على العامل، إن كان موجودًا. لازم يُفَك قبل ما
--    يصير ممكن حذف جدول factory_workers لاحقًا.
-- 2) Drop the foreign key to the roster, if one exists. It has to go before
--    factory_workers itself could ever be dropped.
do $$
declare fk_name text;
begin
  select conname into fk_name
  from pg_constraint
  where conrelid = 'public.factory_operations'::regclass
    and contype = 'f'
    and confrelid = 'public.factory_workers'::regclass
  limit 1;

  if fk_name is not null then
    execute format('alter table public.factory_operations drop constraint %I', fk_name);
  end if;
exception
  -- factory_workers مش موجود أصلًا / the roster table isn't there at all
  when undefined_table then null;
end $$;


-- ============================================================================
--  اختياري — احذفو فقط إذا متأكد إنك ما بدك ترجع لتتبّع العمال أبدًا.
--  الجدول مش مؤذي إذا بقي؛ ما حد صار يقرا منو.
--
--  OPTIONAL — only run this if you're certain per-worker tracking is never
--  coming back. Leaving the table in place is harmless; nothing reads it now.
--
--  drop table if exists public.factory_workers;
--
--  وإذا كمان بدك تشيل العمودين نفسهن (هاد يمسح أسماء العمال المسجّلة
--  بالصفوف القديمة نهائيًا — ما إلها رجعة):
--  And to remove the columns themselves — this permanently erases the worker
--  names on existing rows, with no way back:
--
--  alter table public.factory_operations drop column if exists worker_id;
--  alter table public.factory_operations drop column if exists worker_name;
-- ============================================================================


-- ---------------------------------------------------------------------------
--  فحص بعد التشغيل / Check afterwards — is_nullable لازم يطلع YES
-- ---------------------------------------------------------------------------
select column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'factory_operations'
  and column_name in ('worker_id', 'worker_name')
order by column_name;
