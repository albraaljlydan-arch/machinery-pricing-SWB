<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';

  const ROLES = ['designer', 'admin', 'factory', 'procurement', 'accounting', 'developer', 'followup'] as const;
  type UserRow = { id: string; full_name: string; role: string };
  let users: UserRow[] = [], loading = true, search = '', creating = false, showModal = false;
  let fullName = '', email = '', password = '', role: (typeof ROLES)[number] = 'designer';

  async function loadUsers() {
    loading = true;
    // Customer accounts are self-registered and managed nowhere — this page
    // is staff-only, so they're excluded rather than cluttering the roster.
    const { data, error } = await supabase.from('profiles').select('id, full_name, role').in('role', ROLES).order('full_name');
    if (!error) users = data || [];
    loading = false;
  }
  onMount(loadUsers);
  $: filtered = search.trim() ? users.filter((u) => u.full_name.toLowerCase().includes(search.trim().toLowerCase())) : users;

  function openModal() { fullName = ''; email = ''; password = ''; role = 'designer'; showModal = true; }
  function closeModal() { showModal = false; }
  async function createUser() {
    if (!fullName.trim() || !email.trim() || password.length < 6) return;
    creating = true;
    const { data, error } = await supabase.functions.invoke('create-user', { body: { full_name: fullName.trim(), email: email.trim(), password, role } });
    creating = false;
    const fnError = error || (data as any)?.error;
    if (fnError) toast.notify(t($locale, 'userCreateErrorPrefix') + (typeof fnError === 'string' ? fnError : fnError.message), 'error');
    else { toast.notify(t($locale, 'userCreatedSuccess'), 'success'); closeModal(); loadUsers(); }
  }
</script>

<div class="panel">
  <div class="panel-head"><button class="btn-add" on:click={openModal}>{t($locale, 'addUserBtn')}</button></div>
  <input class="search" type="text" bind:value={search} placeholder={t($locale, 'searchUsersPlaceholder')} dir="auto" />
  {#if loading}<div class="empty">{t($locale, 'loading')}</div>
  {:else if filtered.length === 0}<div class="empty">{t($locale, 'noProjectsPlain')}</div>
  {:else}<table><thead><tr><th>{t($locale, 'colFullName')}</th><th>{t($locale, 'colRole')}</th></tr></thead><tbody>
    {#each filtered as u (u.id)}<tr><td class="name">{u.full_name}</td><td>{t($locale, u.role as any)}</td></tr>{/each}
  </tbody></table>{/if}
</div>

{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" on:click={closeModal} on:keydown={(e) => e.key === 'Escape' && closeModal()} role="presentation">
    <div class="modal" on:click|stopPropagation role="dialog" aria-label={t($locale, 'addUserTitle')} tabindex="-1">
      <h3>{t($locale, 'addUserTitle')}</h3>
      <label>{t($locale, 'fullNamePlaceholder')}<input type="text" bind:value={fullName} dir="auto" /></label>
      <label>{t($locale, 'emailPlaceholder')}<input type="email" bind:value={email} dir="ltr" /></label>
      <label>{t($locale, 'tempPasswordPlaceholder')}<input type="text" bind:value={password} dir="ltr" /></label>
      <label>{t($locale, 'colRole')}<select bind:value={role}>{#each ROLES as r}<option value={r}>{t($locale, r)}</option>{/each}</select></label>
      <div class="modal-actions"><button class="btn-add" on:click={createUser} disabled={creating || !fullName.trim() || !email.trim() || password.length < 6}>{creating ? t($locale, 'savingGeneric') : t($locale, 'createUserBtn')}</button><button class="btn-cancel" on:click={closeModal}>{t($locale, 'cancelBtn')}</button></div>
    </div>
  </div>
{/if}

<style>
  .panel{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:18px 20px;overflow-x:auto}.panel-head{display:flex;justify-content:flex-end;margin-bottom:12px}.btn-add{background:var(--navy);color:#fff;border:0;border-radius:8px;padding:7px 14px;font-size:12.5px;font-weight:700;cursor:pointer}.btn-add:disabled{opacity:.6;cursor:not-allowed}.search{width:100%;max-width:320px;border:1px solid var(--border);border-radius:8px;padding:7px 12px;font-size:13px;margin-bottom:14px;background:var(--paper);color:var(--ink)}.empty{padding:30px;text-align:center;color:var(--ink-soft);font-size:13px}table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:center;font-size:10.5px;color:var(--steel-2);padding:8px 12px;background:var(--paper);border-bottom:1px solid var(--border);font-weight:600}td{text-align:center;padding:10px 12px;border-bottom:1px solid var(--border)}.name{font-weight:700}.modal-backdrop{position:fixed;inset:0;background:#0007;display:flex;align-items:center;justify-content:center;z-index:50}.modal{background:var(--card);border-radius:12px;padding:22px 24px;width:100%;max-width:380px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:12px}.modal h3{margin:0 0 4px;font-size:15px}.modal label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--ink-soft)}.modal input,.modal select{border:1px solid var(--border);border-radius:7px;padding:7px 10px;font-size:13px;background:var(--paper);color:var(--ink)}.modal-actions{display:flex;gap:8px;margin-top:6px}.btn-cancel{background:transparent;border:1px solid var(--border);color:var(--ink-soft);border-radius:8px;padding:7px 14px;font-size:12.5px;cursor:pointer}
</style>
