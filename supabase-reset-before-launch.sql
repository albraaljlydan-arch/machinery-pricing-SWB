-- ============================================================================
--  تصفير البيانات قبل الإطلاق — حذف كل ما يخص الماكينات والإشعارات
--  Pre-launch reset — delete everything about machines, and all notifications
--
--  يُشغَّل مرة واحدة كاملًا من: Supabase Dashboard → SQL Editor → New query
--  Run the whole file once, from: Supabase Dashboard → SQL Editor → New query
--
--  ما الذي يُحذف / What is deleted (rows only — every table stays in place):
--    - projects                 الماكينات (المشاريع) نفسها
--    - project_items            بنود الماكينات
--    - project_events           سجل أحداث كل ماكينة
--    - factory_operations       عمليات المصنع وتقدّمها
--    - purchase_requests        طلبات الشراء القديمة
--    - procurement_tasks        مهام المشتريات
--    - procurement_task_updates سجل مشتريات كل مهمة
--    - followup_tasks           مهام مهندس المتابعة
--    - followup_task_updates    سجل إنجاز مهام المتابعة
--    - customer_requests        طلبات الزبائن لماكينات جديدة
--    - chat_messages            محادثات طلبات الزبائن
--    - notifications            كل الإشعارات لكل المستخدمين
--
--  ما الذي يبقى كما هو / What is kept untouched:
--    - المستخدمون وأدوارهم (auth.users, profiles) — لا حاجة لإعادة الدعوات
--      Users and their roles — no re-invitations needed
--    - أسعار المواد وباقات سماكة الصاج (material_prices,
--      material_category_prices, sheet_thickness_bands, sheet_band_prices)
--    - عمال المصنع (factory_workers) وإعدادات أعمدة الحاسبة (field_configs)
--
--  الصور التصميمية المرفوعة للماكينات محفوظة في Storage، ولا يسمح Supabase
--  بحذفها من SQL. احذفها يدويًا: Storage → project-renders → حدّد الكل → Delete.
--  Render images live in Storage, which Supabase does not allow SQL to delete.
--  Remove them by hand: Storage → project-renders → select all → Delete.
--
--  ---- اقرأ قبل التشغيل / READ BEFORE RUNNING ----
--  هذا حذف نهائي لا يمكن التراجع عنه. كل الحذف داخل عملية واحدة: إمّا أن يُحذف
--  كل شيء أو لا يُحذف شيء إن حدث خطأ.
--  This is permanent and cannot be undone. It runs as one transaction: either
--  everything is deleted, or nothing is if any step fails.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
--  ١) السجلات التابعة لمهام الماكينة أولًا، ثم المهام نفسها
--  1) Task logs first, then the tasks — children before parents so no
--     foreign key blocks the delete.
-- ---------------------------------------------------------------------------
delete from public.procurement_task_updates;
delete from public.procurement_tasks;
delete from public.followup_task_updates;
delete from public.followup_tasks;

-- ---------------------------------------------------------------------------
--  ٢) كل ما يشير إلى ماكينة
--  2) Everything else that points at a machine
-- ---------------------------------------------------------------------------
delete from public.factory_operations;
delete from public.project_events;
delete from public.project_items;
delete from public.purchase_requests;

-- ---------------------------------------------------------------------------
--  ٣) الماكينات نفسها
--  3) The machines themselves
-- ---------------------------------------------------------------------------
delete from public.projects;

-- ---------------------------------------------------------------------------
--  ٤) طلبات الزبائن ومحادثاتها
--  4) Customer requests and their chat
-- ---------------------------------------------------------------------------
delete from public.chat_messages;
delete from public.customer_requests;

-- ---------------------------------------------------------------------------
--  ٥) كل الإشعارات
--  5) All notifications
-- ---------------------------------------------------------------------------
delete from public.notifications;

commit;

-- ---------------------------------------------------------------------------
--  تحقّق: يجب أن تكون كل الأعداد صفرًا، والمستخدمون والأسعار كما هم.
--  Check: every count should be zero; users and prices unchanged.
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.projects)                 as projects,
  (select count(*) from public.procurement_tasks)        as procurement_tasks,
  (select count(*) from public.followup_tasks)           as followup_tasks,
  (select count(*) from public.factory_operations)       as factory_operations,
  (select count(*) from public.project_events)           as project_events,
  (select count(*) from public.customer_requests)        as customer_requests,
  (select count(*) from public.notifications)            as notifications,
  (select count(*) from public.profiles)                 as users_kept,
  (select count(*) from public.material_category_prices) as category_prices_kept,
  (select count(*) from public.sheet_band_prices)        as sheet_band_prices_kept;
