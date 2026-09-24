-- ============================================================================
--  باقات سماكة الصاج وأسعارها — سعر جملة ومفرّق (بالدولار) لكل مادة في كل باقة
--  Sheet thickness bands and their prices — wholesale/retail (USD) per
--  material in each band
--
--  تبويب الصاج في صفحة الأسعار صار مقسّمًا حسب السماكة (افتراضيًا: حتى 5 مم،
--  من 5 إلى 10 مم، أكثر من 10 مم). المشتريات تستطيع إضافة باقة أو حذفها أو
--  تعديل حدودها، والحاسبة تختار الباقة حسب سماكة كل سطر صاج.
--
--  The Sheet Metal price tab is now split by thickness (default: up to 5 mm,
--  5–10 mm, above 10 mm). Procurement can add, delete or re-limit bands, and
--  the calculator picks the band from each sheet row's thickness.
--
--  شغّل أولًا ملف supabase-material-category-prices.sql، ثم هذا الملف، من
--  Supabase Dashboard → SQL Editor. آمن لإعادة التشغيل.
--  Run supabase-material-category-prices.sql first, then this file, from
--  Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  الباقات: كل باقة تشمل السماكات الأكبر من حدّ الباقة السابقة حتى حدّها
--  (up_to_mm). باقة واحدة فقط بلا حد (null) وهي الأخيرة: "أكثر من ...".
--
--  Bands: each covers thicknesses above the previous band's limit up to its
--  own up_to_mm. Exactly one band has no limit (null) — the last, "above …".
-- ---------------------------------------------------------------------------
create table if not exists public.sheet_thickness_bands (
  id         uuid        primary key default gen_random_uuid(),
  up_to_mm   numeric     check (up_to_mm is null or up_to_mm > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid        default auth.uid() references auth.users (id) on delete set null,
  -- مؤجَّل حتى نهاية العملية حتى يمكن تبديل حدّين في حفظ واحد.
  -- Deferred to commit so two limits can be swapped in a single save.
  constraint sheet_thickness_bands_limit_unique unique (up_to_mm) deferrable initially deferred
);

create table if not exists public.sheet_band_prices (
  band_id         uuid        not null references public.sheet_thickness_bands (id) on delete cascade,
  material_id     text        not null,
  wholesale_price numeric     not null default 0 check (wholesale_price >= 0),
  retail_price    numeric     not null default 0 check (retail_price >= 0),
  updated_at      timestamptz not null default now(),
  updated_by      uuid        default auth.uid() references auth.users (id) on delete set null,
  primary key (band_id, material_id)
);

-- ---------------------------------------------------------------------------
--  تعبئة أولية: ثلاث باقات افتراضية (فقط إذا لم توجد باقات)، وأسعار كل باقة
--  من سعر تبويب الصاج الحالي، أو من الجدول القديم إن لم يوجد.
--
--  Seed: three default bands (only when none exist), each priced from the
--  current Sheet Metal tab price, or from the old table when that is absent.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.sheet_thickness_bands) then
    insert into public.sheet_thickness_bands (up_to_mm) values (5), (10), (null);
  end if;

  if to_regclass('public.material_category_prices') is not null then
    insert into public.sheet_band_prices (band_id, material_id, wholesale_price, retail_price)
    select b.id, p.material_id, p.wholesale_price, p.retail_price
    from public.sheet_thickness_bands b
    cross join public.material_category_prices p
    where p.category = 'sheet'
    on conflict (band_id, material_id) do nothing;
  end if;

  insert into public.sheet_band_prices (band_id, material_id, wholesale_price, retail_price)
  select b.id, p.material_id, p.wholesale_price, p.retail_price
  from public.sheet_thickness_bands b
  cross join public.material_prices p
  on conflict (band_id, material_id) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
--  من عدّل ومتى — يُسجَّل على الخادم.
--  Who changed it and when — stamped server-side.
-- ---------------------------------------------------------------------------
create or replace function public.stamp_sheet_band_row()
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

drop trigger if exists sheet_thickness_bands_stamp on public.sheet_thickness_bands;
create trigger sheet_thickness_bands_stamp
  before insert or update on public.sheet_thickness_bands
  for each row execute function public.stamp_sheet_band_row();

drop trigger if exists sheet_band_prices_stamp on public.sheet_band_prices;
create trigger sheet_band_prices_stamp
  before insert or update on public.sheet_band_prices
  for each row execute function public.stamp_sheet_band_row();

-- ---------------------------------------------------------------------------
--  الصلاحيات (RLS): الجميع يقرأ. الأسعار تعدّلها المشتريات/المدير/المطوّر.
--  الباقات نفسها لا تُكتب مباشرة أبدًا — فقط عبر دالة save_sheet_bands التي
--  تتحقق من الدور ومن صحة الباقات كاملة.
--
--  RLS: everyone reads. Procurement / Admin / Developer edit prices. Bands
--  are never written directly — only through save_sheet_bands, which checks
--  the role and validates the whole band set.
-- ---------------------------------------------------------------------------
alter table public.sheet_thickness_bands enable row level security;
alter table public.sheet_band_prices enable row level security;

drop policy if exists "sheet bands: signed-in read" on public.sheet_thickness_bands;
create policy "sheet bands: signed-in read"
  on public.sheet_thickness_bands for select
  to authenticated
  using (true);

drop policy if exists "sheet band prices: signed-in read" on public.sheet_band_prices;
drop policy if exists "sheet band prices: procurement inserts" on public.sheet_band_prices;
drop policy if exists "sheet band prices: procurement updates" on public.sheet_band_prices;

create policy "sheet band prices: signed-in read"
  on public.sheet_band_prices for select
  to authenticated
  using (true);

create policy "sheet band prices: procurement inserts"
  on public.sheet_band_prices for insert
  to authenticated
  with check (public.current_app_role() in ('procurement', 'admin', 'developer'));

create policy "sheet band prices: procurement updates"
  on public.sheet_band_prices for update
  to authenticated
  using (public.current_app_role() in ('procurement', 'admin', 'developer'))
  with check (public.current_app_role() in ('procurement', 'admin', 'developer'));

-- ---------------------------------------------------------------------------
--  save_sheet_bands: يستقبل قائمة الباقات المطلوبة كاملة
--  [{ "id": "<uuid أو null>", "up_to_mm": <رقم أو null> }] ويطبّقها دفعة واحدة:
--  تعديل الموجود، إضافة الجديد (بأسعار الباقة التي كانت تشمل حدّه)، وحذف
--  ما لم يعد موجودًا (مع أسعاره).
--
--  Takes the complete desired band list and applies it atomically: updates
--  existing bands, inserts new ones (priced from the band that previously
--  contained their limit), and deletes bands no longer listed (with prices).
-- ---------------------------------------------------------------------------
create or replace function public.save_sheet_bands(p_bands jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_ids uuid[];
  v_item    jsonb;
  v_limit   numeric;
  v_source  uuid;
  v_new_id  uuid;
  v_kept    uuid[] := '{}';
begin
  if public.current_app_role() is null or public.current_app_role() not in ('procurement', 'admin', 'developer') then
    raise exception 'Only Procurement can change thickness bands' using errcode = '42501';
  end if;

  if jsonb_typeof(p_bands) is distinct from 'array' or jsonb_array_length(p_bands) = 0 then
    raise exception 'At least one band is required';
  end if;
  if (select count(*) from jsonb_array_elements(p_bands) e where e->>'up_to_mm' is null) <> 1 then
    raise exception 'Exactly one open-ended band is required';
  end if;
  if exists (select 1 from jsonb_array_elements(p_bands) e where e->>'id' is null and e->>'up_to_mm' is null) then
    raise exception 'The open-ended band must be an existing band';
  end if;
  if exists (select 1 from jsonb_array_elements(p_bands) e where e->>'up_to_mm' is not null and (e->>'up_to_mm')::numeric <= 0) then
    raise exception 'Band limits must be greater than zero';
  end if;
  if (select count(*) from jsonb_array_elements(p_bands) e where e->>'up_to_mm' is not null)
     <> (select count(distinct (e->>'up_to_mm')::numeric) from jsonb_array_elements(p_bands) e where e->>'up_to_mm' is not null) then
    raise exception 'Band limits must be different';
  end if;

  select coalesce(array_agg(id), '{}') into v_old_ids from public.sheet_thickness_bands;

  if exists (
    select 1 from jsonb_array_elements(p_bands) e
    where e->>'id' is not null and not ((e->>'id')::uuid = any (v_old_ids))
  ) then
    raise exception 'Unknown band';
  end if;

  -- New bands first, while the old limits still decide which band each one splits.
  for v_item in select * from jsonb_array_elements(p_bands) loop
    if v_item->>'id' is null then
      v_limit := (v_item->>'up_to_mm')::numeric;
      select id into v_source
      from public.sheet_thickness_bands
      where id = any (v_old_ids) and (up_to_mm is null or up_to_mm >= v_limit)
      order by up_to_mm asc nulls last
      limit 1;

      insert into public.sheet_thickness_bands (up_to_mm) values (v_limit) returning id into v_new_id;
      insert into public.sheet_band_prices (band_id, material_id, wholesale_price, retail_price)
      select v_new_id, material_id, wholesale_price, retail_price
      from public.sheet_band_prices
      where band_id = v_source;
    else
      v_kept := v_kept || (v_item->>'id')::uuid;
      update public.sheet_thickness_bands
      set up_to_mm = nullif(v_item->>'up_to_mm', '')::numeric
      where id = (v_item->>'id')::uuid;
    end if;
  end loop;

  delete from public.sheet_thickness_bands
  where id = any (v_old_ids) and not (id = any (v_kept));
end;
$$;

revoke all on function public.save_sheet_bands(jsonb) from public;
grant execute on function public.save_sheet_bands(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
--  تحديث مباشر للشاشات المفتوحة.
--  Realtime for open screens.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sheet_thickness_bands'
  ) then
    alter publication supabase_realtime add table public.sheet_thickness_bands;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sheet_band_prices'
  ) then
    alter publication supabase_realtime add table public.sheet_band_prices;
  end if;
end;
$$;
