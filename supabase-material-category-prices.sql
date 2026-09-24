-- ============================================================================
--  أسعار المواد حسب النوع — جملة ومفرّق لكل تبويب في الحاسبة
--  Material prices per calculator category — wholesale and retail per tab
--
--  قبل هذا الملف كان جدول material_prices يحفظ سعرًا واحدًا لكل مادة، وحاسبة
--  المصمم لا تقرؤه أصلًا (كانت تأخذ الأسعار من ذاكرة متصفح كل مصمم). هذا الجدول
--  يحفظ سعر الجملة والمفرّق لكل مادة داخل كل نوع: الصاج، البروفيلات، الميّال،
--  البواري والبوش، التربيعات والبلاطات. المشتريات تعدّل، والجميع يقرأ، والحاسبة
--  تأخذ السعر الصحيح لكل تبويب.
--
--  Before this file, material_prices held one price per material, and the
--  designer's calculator never read it (it used each designer's own browser
--  storage). This table holds wholesale + retail per material within each
--  category — Sheet Metal, Profiles & Tubes, Mill, Pipes & Bushings, Square &
--  Blocks. Procurement edits, everyone reads, and the calculator applies the
--  right price per tab.
--
--  يُشغَّل مرة واحدة من Supabase Dashboard → SQL Editor. آمن لإعادة التشغيل.
--  Run once from Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

create table if not exists public.material_category_prices (
  category        text        not null check (category in ('sheet', 'profile', 'mill', 'pipe', 'square')),
  material_id     text        not null,
  wholesale_price numeric     not null default 0 check (wholesale_price >= 0),
  retail_price    numeric     not null default 0 check (retail_price >= 0),
  updated_at      timestamptz not null default now(),
  updated_by      uuid        default auth.uid() references auth.users (id) on delete set null,
  primary key (category, material_id)
);

-- ---------------------------------------------------------------------------
--  تعبئة أولية من الأسعار الحالية: سعر كل مادة يُنسخ لكل الأنواع، ثم تعدّلها
--  المشتريات لكل تبويب على حدة. لا يلمس أي سعر موجود مسبقًا في الجدول الجديد.
--
--  Seed from the current prices: each material's price is copied into every
--  category, for Procurement to adjust per tab. Never overwrites a row that
--  already exists in the new table.
-- ---------------------------------------------------------------------------
insert into public.material_category_prices (category, material_id, wholesale_price, retail_price)
select c.category, mp.material_id, mp.wholesale_price, mp.retail_price
from public.material_prices mp
cross join (values ('sheet'), ('profile'), ('mill'), ('pipe'), ('square')) as c (category)
on conflict (category, material_id) do nothing;

-- ---------------------------------------------------------------------------
--  من عدّل ومتى — يُسجَّل تلقائيًا على الخادم ولا يمكن تزويره من المتصفح.
--  Who changed it and when — stamped server-side, not trusted from the browser.
-- ---------------------------------------------------------------------------
create or replace function public.stamp_material_category_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists material_category_prices_stamp on public.material_category_prices;
create trigger material_category_prices_stamp
  before insert or update on public.material_category_prices
  for each row execute function public.stamp_material_category_price();

-- ---------------------------------------------------------------------------
--  الصلاحيات (RLS): الجميع يقرأ لأن الحاسبة تحتاجها، والمشتريات/المدير/المطوّر
--  فقط يضيفون أو يعدّلون — نفس قواعد جدول material_prices القديم.
--
--  RLS: every signed-in user reads (the calculator needs it); only
--  Procurement / Admin / Developer insert or update — the same rules as the
--  old material_prices table. No delete policy: rows are only ever edited.
-- ---------------------------------------------------------------------------
alter table public.material_category_prices enable row level security;

drop policy if exists "category prices: signed-in read" on public.material_category_prices;
drop policy if exists "category prices: procurement inserts" on public.material_category_prices;
drop policy if exists "category prices: procurement updates" on public.material_category_prices;

create policy "category prices: signed-in read"
  on public.material_category_prices for select
  to authenticated
  using (true);

create policy "category prices: procurement inserts"
  on public.material_category_prices for insert
  to authenticated
  with check (public.current_app_role() in ('procurement', 'admin', 'developer'));

create policy "category prices: procurement updates"
  on public.material_category_prices for update
  to authenticated
  using (public.current_app_role() in ('procurement', 'admin', 'developer'))
  with check (public.current_app_role() in ('procurement', 'admin', 'developer'));

-- ---------------------------------------------------------------------------
--  تحديث مباشر: الشاشات المفتوحة تستلم الأسعار الجديدة فور حفظها.
--  Realtime: open screens pick up new prices as soon as they are saved.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'material_category_prices'
  ) then
    alter publication supabase_realtime add table public.material_category_prices;
  end if;
end;
$$;
