-- ============================================================================
--  SWB Manufacturing System — Row Level Security
--  شغّلو كامل بمرة وحدة من: Supabase Dashboard -> SQL Editor -> New query
--  Run this whole file at once, from: Supabase Dashboard -> SQL Editor
-- ============================================================================
--
--  ليش هاد الملف ضروري / Why this file exists
--
--  حرس المسارات يلي بالكود (lib/auth/access.ts) بيمنع الوصول للصفحة الغلط
--  بالخطأ — بس هو شغّال جوّا المتصفح، فأي حد يفتح devtools يقدر يتجاوزو.
--  والمفتاح العام (sb_publishable_…) مكتوب حرفيًا بملف supabaseClient.ts،
--  يعني موجود بمصدر الصفحة لأي زائر.
--
--  فالحماية الحقيقية للبيانات لازم تكون هون، بقاعدة البيانات. من غير هاد
--  الملف، أي حساب مسجّل دخول يقدر ينفّذ من الـ console:
--
--      supabase.from('profiles').update({ role: 'admin' }).eq('id', myId)
--
--  ويرفّع نفسو لمدير — وما يهم أبدًا إنو صفحة المستخدمين مخفية عنو.
--
--  The route guard in lib/auth/access.ts stops the wrong SCREEN being
--  reached. It cannot stop the wrong REQUEST: the app talks to Supabase
--  straight from the browser with a publishable key that is in the page
--  source, so authorisation has to be enforced by the database. Without the
--  policies below, any signed-in account can promote itself to admin with a
--  single console call, no matter what the UI shows it.
--
--  ---- اقرا هاد قبل ما تشغّل / READ BEFORE RUNNING ----
--  هاد أساس متحفّظ مبني على قراءة الكود. شغّلو على نسخة تجريبية أولًا إذا
--  عندك، وجرّب كل دور (مصمم / مدير / مصنع / مشتريات / محاسبة / متابعة)
--  وتأكد إنو الصفحات لسا تفتح عادي. إذا صار شي "لا توجد مشاريع" وهو غلط،
--  ابعتلي شو صار ومنعدّل السياسة.
--
--  This is a conservative baseline derived from reading the app. Try it on a
--  staging project first if you have one, then sign in as each role and
--  confirm every page still loads. If a screen goes unexpectedly empty, that
--  is a policy being too strict — tell me which one and I'll adjust it.
-- ============================================================================


-- ---------------------------------------------------------------------------
--  ١) دالة تقرأ دور المستخدم الحالي
--  1) A helper that reads the signed-in user's role
--
--  security definer مهم هون: السياسات على جدول profiles نفسو رح تنادي هاد
--  الدالة، ولو كانت تقرأ الجدول بصلاحيات المستخدم العادي رح يصير استدعاء
--  دائري (infinite recursion) وSupabase يرفض الاستعلام. security definer
--  يخليها تقرأ متجاوزة الـ RLS، فينكسر الدوران.
--
--  security definer matters: the policies on `profiles` below call this
--  function, and a plain reader would recurse infinitely (Postgres detects it
--  and errors). Running as definer reads past RLS and breaks the cycle.
--  search_path is pinned so the function can't be hijacked by a shadowed
--  table on someone else's path.
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

-- المدير والمطوّر: الاثنين عندهن وصول كامل حسب مواصفة النظام.
-- Admin and developer both have full reach, per the app's own spec.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('admin', 'developer')
$$;

grant execute on function public.is_admin() to authenticated;


-- ---------------------------------------------------------------------------
--  ٢) profiles — هون كانت أخطر ثغرة
--  2) profiles — this is where the dangerous hole was
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles readable by signed-in users" on public.profiles;
drop policy if exists "profiles: admin writes role" on public.profiles;
drop policy if exists "profiles: admin inserts" on public.profiles;
drop policy if exists "profiles: factory inserts" on public.profiles;
drop policy if exists "profiles: own row name" on public.profiles;

-- القراءة مفتوحة لكل مسجّل دخول: التطبيق يحتاجها بأماكن كثيرة — اسم المصمم
-- بالجداول، وnotify.ts يدور على المستلمين حسب الدور.
-- Read stays open to any signed-in user: the app needs it in several places
-- (designer names on every list, and notify.ts looking recipients up by role).
create policy "profiles readable by signed-in users"
  on public.profiles for select
  to authenticated
  using (true);

-- الكتابة على الدور: المدير/المطوّر فقط. هاد السطر لحالو يمنع أي حساب من
-- ترفيع نفسو.
-- Writing a role: admin/developer only. This single policy is what stops any
-- account from promoting itself.
create policy "profiles: admin writes role"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- إنشاء الحسابات محصور بحساب المصنع؛ الأدمن يقرأ ويعدّل الدور فقط.
-- Account creation belongs to Factory; Admin may still read and update roles.
create policy "profiles: factory inserts"
  on public.profiles for insert
  to authenticated
  with check (public.current_app_role() = 'factory');


-- ---------------------------------------------------------------------------
--  ٣) projects
--  القراءة مفتوحة لكل مسجّل دخول (نظام داخلي، وكل دور يحتاج يشوف أسماء
--  المشاريع — حتى مهندس المتابعة يحتاجها لقائمة الاختيار). الكتابة هي يلي
--  مقيّدة حسب الدور والحالة.
--
--  Read is open to any signed-in user — this is an internal system and every
--  role needs project names (the Follow-up Engineer's dropdown included).
--  WRITES are what get scoped, by role and by current status.
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;

drop policy if exists "projects: signed-in read" on public.projects;
drop policy if exists "projects: designer creates own" on public.projects;
drop policy if exists "projects: designer edits own draft" on public.projects;
drop policy if exists "projects: designer deletes own draft" on public.projects;
drop policy if exists "projects: admin full write" on public.projects;
drop policy if exists "projects: factory advances production" on public.projects;
drop policy if exists "projects: procurement prices completed builds" on public.projects;

create policy "projects: signed-in read"
  on public.projects for select
  to authenticated
  using (true);

-- المصمم: ينشئ مشاريعو بس، وباسمو هو.
-- Designer: creates only their own rows, owned by themselves.
create policy "projects: designer creates own"
  on public.projects for insert
  to authenticated
  with check (
    public.current_app_role() = 'designer'
    and user_id = auth.uid()
  );

-- المصمم: يعدّل مشروعو وهو مسودة أو مرفوض فقط — مو بعد ما يطلع من إيدو.
-- Designer: edits their own project only while it is still theirs to touch.
create policy "projects: designer edits own draft"
  on public.projects for update
  to authenticated
  using (
    public.current_app_role() = 'designer'
    and user_id = auth.uid()
    and status in ('Draft', 'Rejected')
  )
  with check (
    user_id = auth.uid()
    and status in ('Draft', 'Rejected', 'Pending Admin')
  );

create policy "projects: designer deletes own draft"
  on public.projects for delete
  to authenticated
  using (
    public.current_app_role() = 'designer'
    and user_id = auth.uid()
    and status in ('Draft', 'Rejected')
  );

create policy "projects: admin full write"
  on public.projects for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- المصنع: بس ينقل مشروع من "قيد التصنيع" لـ"اكتمل التصنيع".
-- Factory: may only move a project from In Production to Complete Production.
create policy "projects: factory advances production"
  on public.projects for update
  to authenticated
  using (
    public.current_app_role() = 'factory'
    and status = 'In Production'
  )
  with check (status in ('In Production', 'Complete Production'));

-- المشتريات: تكتب ملف الشراء والتكلفة الفعلية على مشروع خلّص تصنيع، وتقدر
-- ترسلو للمحاسبة. ما تقدر تلمس مشروع بأي حالة تانية.
-- Procurement: writes the purchase file and the real cost on a build the
-- factory has finished, and may hand it to Accounting. Nothing else.
create policy "projects: procurement prices completed builds"
  on public.projects for update
  to authenticated
  using (
    public.current_app_role() = 'procurement'
    and status = 'Complete Production'
  )
  with check (status in ('Complete Production', 'Completed'));


-- ---------------------------------------------------------------------------
--  ٤) notifications — كل واحد يشوف إشعاراتو هو بس
--  4) notifications — you see only your own
--
--  ملاحظة: الإدخال مفتوح لأي مسجّل دخول عن قصد، لأنو التطبيق يبعت إشعارات
--  لمستخدمين تانيين (notifyUser / notifyRole) من متصفح المُرسِل. أسوأ ما
--  يقدر يعملو حساب خبيث هون إنو يبعت إشعار مزعج — ما يقرأ إشعارات غيرو.
--
--  Note: INSERT is deliberately open to any signed-in user, because the app
--  notifies OTHER people from the sender's own browser (notifyUser /
--  notifyRole). The worst a malicious account can do here is send a nuisance
--  notification; it still cannot read anyone else's.
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "notifications: read own" on public.notifications;
drop policy if exists "notifications: mark own read" on public.notifications;
drop policy if exists "notifications: signed-in send" on public.notifications;

create policy "notifications: read own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications: mark own read"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications: signed-in send"
  on public.notifications for insert
  to authenticated
  with check (true);


-- ---------------------------------------------------------------------------
--  ٥) factory_operations — سجل التشغيل
--  5) factory_operations — the machine-operations log
-- ---------------------------------------------------------------------------
alter table public.factory_operations enable row level security;

drop policy if exists "ops: signed-in read" on public.factory_operations;
drop policy if exists "ops: followup logs own" on public.factory_operations;
drop policy if exists "ops: factory approves" on public.factory_operations;
drop policy if exists "ops: admin full write" on public.factory_operations;

create policy "ops: signed-in read"
  on public.factory_operations for select
  to authenticated
  using (true);

-- مهندس المتابعة: يسجّل إدخالات باسمو، ودايمًا بحالة "بانتظار الموافقة" —
-- ما يقدر يوافق على إدخالو هو.
-- Follow-up Engineer: logs entries under their own id, always as pending —
-- they cannot approve their own work.
create policy "ops: followup logs own"
  on public.factory_operations for insert
  to authenticated
  with check (
    public.current_app_role() in ('followup', 'developer')
    and logged_by = auth.uid()
    and approval_status = 'pending'
  );

create policy "ops: factory approves"
  on public.factory_operations for update
  to authenticated
  using (public.current_app_role() = 'factory')
  with check (approval_status in ('pending', 'approved', 'rejected'));

create policy "ops: admin full write"
  on public.factory_operations for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ---------------------------------------------------------------------------
--  ٦) factory_workers — المصنع والمدير يديروا قائمة العمال
--  6) factory_workers — factory and admin manage the roster
-- ---------------------------------------------------------------------------
alter table public.factory_workers enable row level security;

drop policy if exists "workers: signed-in read" on public.factory_workers;
drop policy if exists "workers: factory manages" on public.factory_workers;
drop policy if exists "workers: factory removes" on public.factory_workers;

create policy "workers: signed-in read"
  on public.factory_workers for select
  to authenticated
  using (true);

create policy "workers: factory manages"
  on public.factory_workers for insert
  to authenticated
  with check (public.current_app_role() in ('factory', 'admin', 'developer'));

create policy "workers: factory removes"
  on public.factory_workers for delete
  to authenticated
  using (public.current_app_role() in ('factory', 'admin', 'developer'));


-- ---------------------------------------------------------------------------
--  ٧) material_prices — الأسعار
--  الجميع يقرا (الحاسبة تحتاجها لكل دور)، والمشتريات/المدير بس يعدّلوا —
--  هاد يطابق نص الواجهة نفسها: "عرض للقراءة فقط — التعديل من حساب المشتريات".
--
--  Everyone reads (every role's calculator needs them); only Procurement and
--  Admin write — which is exactly what the UI already tells users:
--  "Read-only — editing is done from the Procurement account."
-- ---------------------------------------------------------------------------
alter table public.material_prices enable row level security;

drop policy if exists "prices: signed-in read" on public.material_prices;
drop policy if exists "prices: procurement writes" on public.material_prices;
drop policy if exists "prices: procurement updates" on public.material_prices;

create policy "prices: signed-in read"
  on public.material_prices for select
  to authenticated
  using (true);

create policy "prices: procurement writes"
  on public.material_prices for insert
  to authenticated
  with check (public.current_app_role() in ('procurement', 'admin', 'developer'));

create policy "prices: procurement updates"
  on public.material_prices for update
  to authenticated
  using (public.current_app_role() in ('procurement', 'admin', 'developer'))
  with check (public.current_app_role() in ('procurement', 'admin', 'developer'));


-- ---------------------------------------------------------------------------
--  ٨) field_configs — أعمدة الحاسبة المخصّصة (صفحة المطوّر)
--  8) field_configs — the Developer's custom calculator columns
-- ---------------------------------------------------------------------------
alter table public.field_configs enable row level security;

drop policy if exists "fields: signed-in read" on public.field_configs;
drop policy if exists "fields: developer writes" on public.field_configs;
drop policy if exists "fields: developer updates" on public.field_configs;

create policy "fields: signed-in read"
  on public.field_configs for select
  to authenticated
  using (true);

create policy "fields: developer writes"
  on public.field_configs for insert
  to authenticated
  with check (public.current_app_role() in ('developer', 'admin'));

create policy "fields: developer updates"
  on public.field_configs for update
  to authenticated
  using (public.current_app_role() in ('developer', 'admin'))
  with check (public.current_app_role() in ('developer', 'admin'));


-- ---------------------------------------------------------------------------
--  ٩) الـ view — الـ views ما عندها RLS خاص فيها
--  9) The view — views don't carry their own RLS
--
--  projects_with_designer لازم تكون security_invoker، يعني تُنفَّذ بصلاحيات
--  المستخدم يلي عمل الاستعلام فتطبّق سياسات projects عليه. من غير هاد
--  الإعداد، الـ view تنفّذ بصلاحيات مالكها وتتجاوز كل يلي فوق — وتصير
--  الباب الخلفي لكل شي أقفلناه.
--
--  A view runs as its OWNER by default, which would bypass every policy
--  above and become the back door to all of it. security_invoker makes it run
--  as the querying user, so the projects policies actually apply.
--  (Requires Postgres 15+, which every current Supabase project is on.)
-- ---------------------------------------------------------------------------
alter view public.projects_with_designer set (security_invoker = on);


-- ---------------------------------------------------------------------------
--  فحص سريع بعد التشغيل / Quick check afterwards
--  لازم كل جدول يطلع rowsecurity = true
--  Every table should come back with rowsecurity = true
-- ---------------------------------------------------------------------------
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'profiles', 'projects', 'notifications', 'factory_operations',
    'factory_workers', 'material_prices', 'field_configs'
  )
order by relname;
