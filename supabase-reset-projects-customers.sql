-- ============================================================================
--  SWB Manufacturing System — Reset: Projects + Customers
--  شغّلو كامل بمرة وحدة من: Supabase Dashboard -> SQL Editor -> New query
--  Run this whole file at once, from: Supabase Dashboard -> SQL Editor
-- ============================================================================
--
--  شو بيعمل هاد الملف / What this does
--
--  بيمسح كل صفوف (rows) المشاريع والمشتريين وكل شي مرتبط فيهن، بس بيسيب
--  بنية الجداول (tables) زي ما هي — منشان تضل قادر تبلّش مشاريع جديدة من
--  غير ما تعيد بناء أي شي. ما بيلمس:
--    - profiles          (حسابات المصممين/المدراء وكل الأدوار)
--    - factory_workers   (لستة عمال المصنع)
--    - material_prices   (أسعار المواد)
--    - field_configs     (إعدادات الأعمدة المخصصة)
--
--  Deletes every ROW under projects and customers (and everything that
--  references them), but keeps every TABLE's structure intact — so you can
--  start creating fresh projects immediately without rebuilding anything.
--  It does NOT touch: profiles, factory_workers, material_prices,
--  field_configs.
--
--  ترتيب الحذف مهم / Order matters
--
--  لازم نمسح "الأولاد" (الجداول يلي فيها project_id أو request_id) قبل
--  "الأهل" (projects و customer_requests) — وإلا قاعدة البيانات بترفض
--  الحذف بسبب قيود الـ foreign key.
--
--  Child tables (the ones holding a project_id / request_id) have to be
--  deleted before their parent (projects / customer_requests), or Postgres
--  will reject the delete with a foreign-key violation.
--
--  ---- اقرا هاد قبل ما تشغّل / READ BEFORE RUNNING ----
--  هاد حذف نهائي ومش رجعي (no undo). تأكد إنك عم تشغّلو على بيئة التطوير/
--  التجريبية، مش على مشروع فيه بيانات حقيقية لمستخدمين شغالين عليه.
--
--  This is a permanent, irreversible delete. Make sure you're running it
--  against the dev/test project, not one with real users on it.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
--  ١) الأولاد يلي بيشيروا لمشروع / Children pointing at a project
-- ---------------------------------------------------------------------------
delete from public.factory_operations;
delete from public.project_events;
delete from public.project_items;
delete from public.purchase_requests;

-- ---------------------------------------------------------------------------
--  ٢) الأولاد يلي بيشيروا لطلب زبون / Children pointing at a customer request
-- ---------------------------------------------------------------------------
delete from public.chat_messages;

-- ---------------------------------------------------------------------------
--  ٣) الأهل / The parents themselves
-- ---------------------------------------------------------------------------
delete from public.projects;
delete from public.customer_requests;

-- ---------------------------------------------------------------------------
--  ٤) اختياري: تنبيهات قديمة كانت مشيرة لمشاريع/طلبات محذوفة
--     Optional: stale notifications that pointed at what you just deleted.
--     شيل التعليق عن السطر التالي إذا بدك تنضفها كمان (مش إجباري).
--     Uncomment the next line if you also want these cleared (not required).
-- ---------------------------------------------------------------------------
-- delete from public.notifications;

commit;
