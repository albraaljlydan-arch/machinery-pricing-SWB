<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';

  const ROLES = ['designer', 'admin', 'factory', 'procurement', 'accounting', 'developer', 'followup'] as const;

  interface UserRow {
    id: string;
    full_name: string;
    role: string;
  }

  let users: UserRow[] = [];
  let loading = true;
  let search = '';
  let updatingId: string | null = null;

  async function loadUsers() {
    loading = true;
    const { data, error } = await supabase.from('profiles').select('id, full_name, role').order('full_name');
    if (!error) users = data || [];
    loading = false;
  }
  onMount(loadUsers);

  $: filtered = search.trim() ? users.filter((u) => u.full_name.toLowerCase().includes(search.trim().toLowerCase())) : users;

  async function changeRole(userId: string, newRole: string) {
    updatingId = userId;
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    updatingId = null;
    if (error) {
      toast.notify(t($locale, 'roleUpdateErrorPrefix') + error.message, 'error');
    } else {
      users = users.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
      toast.notify(t($locale, 'roleUpdatedSuccess'), 'success');
    }
  }

  // ---- Edit user modal ----
  let showEditModal = false;
  let editingUser: UserRow | null = null;
  let editFullName = '';
  let editEmail = '';
  let editPassword = '';
  let editRole: (typeof ROLES)[number] = 'designer';
  let updating = false;

  function openEditModal(u: UserRow) {
    editingUser = u;
    editFullName = u.full_name;
    editEmail = '';
    editPassword = '';
    editRole = u.role as (typeof ROLES)[number];
    showEditModal = true;
  }
  function closeEditModal() {
    showEditModal = false;
    editingUser = null;
  }

  async function updateUser() {
    if (!editingUser || !editFullName.trim()) return;
    updating = true;
    const { data, error } = await supabase.functions.invoke('update-user', {
      body: {
        user_id: editingUser.id,
        full_name: editFullName.trim(),
        role: editRole,
        email: editEmail.trim() || undefined,
        password: editPassword || undefined,
      },
    });
    updating = false;
    const fnError = error || (data as any)?.error;
    if (fnError) {
      toast.notify(t($locale, 'userUpdateErrorPrefix') + (typeof fnError === 'string' ? fnError : fnError.message), 'error');
    } else {
      toast.notify(t($locale, 'userUpdatedSuccess'), 'success');
      showEditModal = false;
      editingUser = null;
      loadUsers();
    }
  }
</script>

<div class="panel">
  <input class="search" type="text" bind:value={search} placeholder={t($locale, 'searchUsersPlaceholder')} dir="auto" />

  {#if loading}
    <div class="empty">{t($locale, 'loading')}</div>
  {:else if filtered.length === 0}
    <div class="empty">{t($locale, 'noProjectsPlain')}</div>
  {:else}
    <table>
      <thead>
        <tr>
          <th>{t($locale, 'colFullName')}</th>
          <th>{t($locale, 'colRole')}</th>
          <th class="col-actions"></th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as u (u.id)}
          <tr>
            <td class="name">{u.full_name}</td>
            <td>
              <select class="role-select" value={u.role} disabled={updatingId === u.id} on:change={(e) => changeRole(u.id, e.currentTarget.value)}>
                {#each ROLES as r}<option value={r}>{t($locale, r)}</option>{/each}
              </select>
            </td>
            <td class="col-actions">
              <div>
                <button class="btn-view" on:click={() => goto(`/admin/people/${u.id}`)}>{t($locale, 'viewProfileAction')}</button>
                <button class="btn-edit" on:click={() => openEditModal(u)}>{t($locale, 'editUserAction')}</button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

{#if showEditModal && editingUser}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" on:click={closeEditModal} on:keydown={(e) => e.key === 'Escape' && closeEditModal()} role="presentation">
    <div class="modal" on:click|stopPropagation role="dialog" aria-label={t($locale, 'editUserTitle')} tabindex="-1">
      <h3>{t($locale, 'editUserTitle')}</h3>
      <label>
        {t($locale, 'fullNamePlaceholder')}
        <input type="text" bind:value={editFullName} dir="auto" />
      </label>
      <label>
        {t($locale, 'emailPlaceholder')}
        <input type="email" bind:value={editEmail} dir="ltr" placeholder={editingUser.full_name} />
      </label>
      <label>
        {t($locale, 'newPasswordOptionalPlaceholder')}
        <input type="text" bind:value={editPassword} dir="ltr" />
        <span class="hint">{t($locale, 'leaveBlankHint')}</span>
      </label>
      <label>
        {t($locale, 'colRole')}
        <select bind:value={editRole}>
          {#each ROLES as r}<option value={r}>{t($locale, r)}</option>{/each}
        </select>
      </label>
      <div class="modal-actions">
        <button class="btn-add" on:click={updateUser} disabled={updating || !editFullName.trim()}>
          {updating ? t($locale, 'savingGeneric') : t($locale, 'updateUserBtn')}
        </button>
        <button class="btn-cancel" on:click={closeEditModal}>{t($locale, 'cancelBtn')}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 18px 20px;
    overflow-x: auto;
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 12px;
  }
  .btn-add {
    background: var(--navy);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 7px 14px;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
  }
  .btn-add:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .search {
    width: 100%;
    max-width: 320px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 13px;
    margin-bottom: 14px;
    background: var(--paper);
    color: var(--ink);
  }
  .empty {
    padding: 30px;
    text-align: center;
    color: var(--ink-soft);
    font-size: 13px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th {
    text-align: center;
    font-size: 10.5px;
    color: var(--steel-2);
    text-transform: uppercase;
    padding: 8px 12px;
    background: var(--paper);
    border-bottom: 1px solid var(--border);
    font-weight: 600;
  }
  td {
    text-align: center;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
  }
  tr:last-child td {
    border-bottom: none;
  }
  .name {
    font-weight: 700;
  }
  .role-select {
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 5px 10px;
    font-size: 12.5px;
    background: var(--card);
    color: var(--ink);
  }
  .btn-edit,
  .btn-view {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--ink-soft);
    border-radius: 7px;
    padding: 5px 12px;
    font-size: 12px;
    cursor: pointer;
    margin-inline-end: 6px;
  }
  .btn-view {
    color: var(--navy-3);
    border-color: color-mix(in srgb, var(--navy-3) 35%, var(--border));
  }
  .hint {
    font-size: 11px;
    color: var(--ink-soft);
    font-weight: 400;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }
  .modal {
    background: var(--card);
    border-radius: 12px;
    padding: 22px 24px;
    width: 100%;
    max-width: 380px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .modal h3 {
    margin: 0 0 4px;
    font-size: 15px;
  }
  .modal label {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 12px;
    color: var(--ink-soft);
  }
  .modal input,
  .modal select {
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 7px 10px;
    font-size: 13px;
    background: var(--paper);
    color: var(--ink);
  }
  .modal-actions {
    display: flex;
    gap: 8px;
    margin-top: 6px;
  }
  .btn-cancel {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--ink-soft);
    border-radius: 8px;
    padding: 7px 14px;
    font-size: 12.5px;
    cursor: pointer;
  }
</style>
