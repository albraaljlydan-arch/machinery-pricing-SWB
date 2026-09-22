-- ============================================================================
--  SWB Manufacturing System — Required Render Image on Submit
--  شغّلو كامل بمرة وحدة من: Supabase Dashboard -> SQL Editor -> New query
--  Run this whole file at once, from: Supabase Dashboard -> SQL Editor
-- ============================================================================
--
--  شو بيعمل هاد الملف / What this does
--
--  ١) بيضيف عمود render_image_url على projects — رابط الصورة المرندرة
--     الحلوة للماكيت يلي المصمم بيحطها بدل ما يبعت ملف الماكيت نفسو.
--  ٢) بيسوّي bucket تخزين اسمو project-renders تنحط فيه هالصور.
--  ٣) بيضيف trigger يمنع أي مشروع يوصل لحالة "Pending Admin" (يعني
--     يتبعت للمدير) من غير ما يكون فيه صورة مرندرة محطوطة. هاد المنع
--     بقاعدة البيانات نفسها — مش بس بالواجهة — لنفس السبب المشروح
--     بأول supabase-rls.sql: أي حد يفتح devtools يقدر يتخطى فحص
--     الواجهة، فالحماية الحقيقية لازم تكون هون.
--
--  1) Adds a render_image_url column on projects — the link to the nice
--     rendered mockup image the Designer uploads, instead of sending the
--     raw mockup file.
--  2) Creates a storage bucket called project-renders to hold those images.
--  3) Adds a trigger that blocks a project from reaching "Pending Admin"
--     (i.e. being submitted to Admin) unless it already has a render image
--     set. This is enforced in the DATABASE, not just the UI — same reason
--     as the top of supabase-rls.sql: anyone with devtools open can skip a
--     UI check, so the real guard has to live here.
--
--  ---- اقرا هاد قبل ما تشغّل / READ BEFORE RUNNING ----
--  شغّلو بعد ما تشغّل supabase-rls.sql (لو لسا ما شغّلتو) لأنو بيتعمد على
--  الدالة current_app_role() المعرّفة فيه. جرّب إرسال مشروع (submit) بعدها
--  من غير صورة وتأكد إنو بيترفض برسالة واضحة.
--
--  Run this after supabase-rls.sql (if you haven't already) — it relies on
--  the current_app_role() helper defined there. Afterwards, try submitting a
--  project with no image and confirm it's rejected with a clear message.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
--  ١) العمود الجديد / The new column
-- ---------------------------------------------------------------------------
alter table public.projects
  add column if not exists render_image_url text;

-- ---------------------------------------------------------------------------
--  ٢) الـ trigger يلي بيمنع الإرسال من غير صورة
--     The trigger that blocks submitting without an image
--
--  بيتفعّل بس لما status يصير 'Pending Admin' — يعني وقت الإرسال الفعلي.
--  ما بيأثر على حفظ المسودة (Draft) ولا على أي حالة تانية.
--
--  Only fires when status is becoming 'Pending Admin' — the actual moment
--  of submitting. It does not affect saving a Draft or any other status.
-- ---------------------------------------------------------------------------
create or replace function public.require_render_image_on_submit()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Pending Admin' and coalesce(new.render_image_url, '') = '' then
    raise exception 'Please upload a rendered project image before submitting to Admin. / لازم ترفع صورة مرندرة للمشروع قبل ما تبعتو للمدير.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_require_render_image_on_submit on public.projects;

create trigger trg_require_render_image_on_submit
  before insert or update on public.projects
  for each row
  execute function public.require_render_image_on_submit();

-- ---------------------------------------------------------------------------
--  ٣) bucket التخزين للصور / The storage bucket for the images
--
--  public = true: الصور نفسها مش بيانات حساسة (مجرد صورة مرندرة للتصميم)،
--  فبنخليها تنفتح برابط مباشر بالمتصفح من غير ما نحتاج signed URLs. اللي
--  محمي مش الصورة نفسها — المحمي مين قادر يرفع/يمسح، وهاد بالسياسات تحت.
--
--  public = true: the image itself isn't sensitive data (just a rendered
--  design preview), so we let it open via a direct browser URL without
--  needing signed URLs. What's protected isn't the image — it's WHO can
--  upload/replace/delete it, via the policies below.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('project-renders', 'project-renders', true)
on conflict (id) do nothing;

drop policy if exists "project renders: public read" on storage.objects;
drop policy if exists "project renders: designer uploads own draft" on storage.objects;
drop policy if exists "project renders: designer replaces own draft" on storage.objects;
drop policy if exists "project renders: designer deletes own draft" on storage.objects;

create policy "project renders: public read"
  on storage.objects for select
  using (bucket_id = 'project-renders');

-- مسار الملف المتوقع: <project_id>/<اسم الملف> — أول جزء من المسار لازم
-- يكون id مشروع يملكو نفس المستخدم وهو لسا مسودة أو مرفوض (زي بالظبط
-- سياسة "designer edits own draft" بجدول projects).
--
-- Expected object path: <project_id>/<filename> — the first path segment
-- must be a project the uploading user owns, and it must still be theirs to
-- edit (mirrors the "designer edits own draft" policy on projects exactly).
create policy "project renders: designer uploads own draft"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-renders'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
        and p.status in ('Draft', 'Rejected')
    )
  );

create policy "project renders: designer replaces own draft"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project-renders'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
        and p.status in ('Draft', 'Rejected')
    )
  )
  with check (
    bucket_id = 'project-renders'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
        and p.status in ('Draft', 'Rejected')
    )
  );

create policy "project renders: designer deletes own draft"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-renders'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
        and p.status in ('Draft', 'Rejected')
    )
  );

commit;

-- ---------------------------------------------------------------------------
--  فحص سريع بعد التشغيل / Quick check afterwards
--  Run these separately — not part of the block above — just to confirm.
-- ---------------------------------------------------------------------------
-- select column_name from information_schema.columns
--   where table_name = 'projects' and column_name = 'render_image_url';
-- select id, public from storage.buckets where id = 'project-renders';
