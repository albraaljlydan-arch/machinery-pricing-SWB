-- ============================================================================
-- منع المصنع من إنشاء حسابات مدير أو مطور / Restrict Factory-created roles
-- Paste into Supabase Dashboard SQL Editor after supabase-rls.sql.
-- Safe to re-run. This protects direct browser writes to profiles; the
-- create-user Edge Function must enforce the same allowlist server-side.
-- ============================================================================

begin;

drop policy if exists "profiles: factory inserts" on public.profiles;

-- المصنع ينشئ فقط حسابات التشغيل، ولا يستطيع منح admin أو developer.
-- Factory may create operational staff only, never admin or developer.
create policy "profiles: factory inserts"
  on public.profiles for insert
  to authenticated
  with check (
    public.current_app_role() = 'factory'
    and role in ('designer', 'factory', 'procurement', 'accounting', 'followup')
  );

commit;
