-- ============================================================================
--  customer_requests + chat_messages — طلبات الزبائن وتعيين المصمم والمحادثة
--  Run this ONCE in the Supabase SQL editor (Project -> SQL Editor -> New
--  query -> paste -> Run). Safe to re-run: every statement is idempotent.
--
--  A customer account (new role: 'customer', self-registered from /signup)
--  submits a simple initial spec for a machine. Factory manually reviews it
--  and assigns a designer; from then on the customer and that designer can
--  exchange text chat messages about the request. Neither table touches
--  `projects` — a request may never become a real production project.
-- ============================================================================


-- ---------------------------------------------------------------------------
--  ١) profiles — عمودان اختياريان لحسابات الزبائن + صلاحية التسجيل الذاتي
--  1) profiles — two optional columns for customer accounts, plus the
--     self-signup insert policy
--
--  الإدخال الحالي (supabase-rls.sql) مقصور على حساب المصنع. هاي السياسة
--  الجديدة تسمح لأي مستخدم جديد بإدخال صف خاص بنفسه فقط، وبدور 'customer'
--  فقط — ما تقدر تُستخدم للترفّع لأي دور موظف.
--
--  Existing insert policy (supabase-rls.sql) is Factory-only. This new
--  policy additionally lets a freshly-registered user insert exactly one
--  row — their own — locked to role = 'customer'. It cannot be used to
--  self-promote to any staff role.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists company_name text;
alter table public.profiles add column if not exists phone text;

-- profiles.role كان مقيّد من زمان بقيمة check constraint ما بتعرف "customer" —
-- هاي بتوسّع القائمة المسموحة لتشملها، من غير ما تشيل أي دور موجود.
--
-- profiles.role has a pre-existing check constraint that doesn't know about
-- "customer" — this widens the allowed list to include it, without removing
-- any existing role.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('designer', 'admin', 'factory', 'procurement', 'accounting', 'followup', 'developer', 'customer'));

drop policy if exists "profiles: customer self-signup" on public.profiles;
create policy "profiles: customer self-signup"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid() and role = 'customer');


-- ---------------------------------------------------------------------------
--  ٢) customer_requests
-- ---------------------------------------------------------------------------
create table if not exists public.customer_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id),
  title text not null,
  description text not null default '',
  -- Free-form initial specs (machine type, quantity, dimensions/capacity...) —
  -- kept as JSON since the useful fields vary by machine type.
  spec_data jsonb not null default '{}'::jsonb,
  status text not null default 'New' check (status in ('New', 'Assigned', 'Rejected', 'Closed')),
  assigned_designer_id uuid references auth.users(id),
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz,
  -- Set by Factory when rejecting or noting something for later. Shown to
  -- the customer, same as rejection_note on purchase_requests.
  factory_note text,
  created_at timestamptz not null default now()
);

create index if not exists customer_requests_customer_id_idx on public.customer_requests(customer_id);
create index if not exists customer_requests_status_idx on public.customer_requests(status);
create index if not exists customer_requests_assigned_designer_id_idx on public.customer_requests(assigned_designer_id);

alter table public.customer_requests enable row level security;

drop policy if exists "customer_requests: read own or assigned or staff" on public.customer_requests;
drop policy if exists "customer_requests: customer creates own" on public.customer_requests;
drop policy if exists "customer_requests: factory assigns" on public.customer_requests;
drop policy if exists "customer_requests: admin full write" on public.customer_requests;

create policy "customer_requests: read own or assigned or staff"
  on public.customer_requests for select
  to authenticated
  using (
    customer_id = auth.uid()
    or assigned_designer_id = auth.uid()
    or public.current_app_role() in ('factory', 'admin', 'developer')
  );

-- الزبون: ينشئ طلبه هو فقط، ودايمًا بحالة "جديد".
-- Customer: creates only their own request, always starting as 'New'.
create policy "customer_requests: customer creates own"
  on public.customer_requests for insert
  to authenticated
  with check (
    public.current_app_role() = 'customer'
    and customer_id = auth.uid()
    and status = 'New'
  );

-- المصنع: يعيّن مصمم أو يرفض أو يغلق الطلب.
-- Factory: assigns a designer, rejects, or closes the request.
create policy "customer_requests: factory assigns"
  on public.customer_requests for update
  to authenticated
  using (public.current_app_role() = 'factory')
  with check (status in ('New', 'Assigned', 'Rejected', 'Closed'));

create policy "customer_requests: admin full write"
  on public.customer_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ---------------------------------------------------------------------------
--  ٣) chat_messages — محادثة الزبون مع المصمم المعيّن على طلب واحد
--  3) chat_messages — the customer/assigned-designer thread for one request
--
--  خاصة بالطرفين حصرًا — ولا حتى المصنع أو المدير يقدروا يقرأوها. هاد
--  عكس customer_requests نفسها (العنوان والمواصفات)، يلي المصنع/المدير
--  لسا يقدروا يشوفوها عادي.
--
--  Strictly private to the two participants — not even Factory or Admin can
--  read it. This is the opposite of customer_requests itself (title/specs),
--  which Factory/Admin can still see normally.
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.customer_requests(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_request_id_idx on public.chat_messages(request_id);

alter table public.chat_messages enable row level security;

drop policy if exists "chat_messages: participants and staff read" on public.chat_messages;
drop policy if exists "chat_messages: participants read" on public.chat_messages;
drop policy if exists "chat_messages: participants send" on public.chat_messages;

create policy "chat_messages: participants read"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.customer_requests r
      where r.id = chat_messages.request_id
        and (r.customer_id = auth.uid() or r.assigned_designer_id = auth.uid())
    )
  );

-- الإرسال محصور بطرفي الطلب، وبس وهو بحالة "معيّن" (بعد ما المصنع يعيّن مصمم).
-- Sending is limited to the request's two participants, and only once it is
-- 'Assigned' (a designer has actually been matched to it).
create policy "chat_messages: participants send"
  on public.chat_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.customer_requests r
      where r.id = chat_messages.request_id
        and r.status = 'Assigned'
        and (r.customer_id = auth.uid() or r.assigned_designer_id = auth.uid())
    )
  );

-- تفعيل التحديث اللحظي (Realtime) لجدول المحادثة — أول استخدام له بالمشروع.
-- Enable Realtime delivery for the chat table — the app's first use of it.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;


-- ---------------------------------------------------------------------------
--  فحص سريع بعد التشغيل / Quick check afterwards
-- ---------------------------------------------------------------------------
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('customer_requests', 'chat_messages')
order by relname;
