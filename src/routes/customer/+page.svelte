<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { formatDate } from '$lib/calc/formatDate';
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import { locale } from '$lib/stores/locale';
  import { t, requestStatusLabel } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';
  import { notifyRole } from '$lib/calc/notify';
  import { encodeNotification } from '$lib/i18n/notifications';
  import type { CustomerRequest } from '$lib/types';

  let requests: CustomerRequest[] = [];
  let loading = true;
  let showModal = false;
  let creating = false;

  let title = '';
  let machineType = '';
  let quantity = 1;
  let description = '';

  async function loadRequests() {
    loading = true;
    const userId = $auth.session?.user?.id;
    if (!userId) return;
    const { data, error } = await supabase.from('customer_requests').select('*').eq('customer_id', userId).order('created_at', { ascending: false });
    if (!error) requests = (data as CustomerRequest[]) || [];
    loading = false;
  }

  onMount(loadRequests);

  function openModal() {
    title = '';
    machineType = '';
    quantity = 1;
    description = '';
    showModal = true;
  }
  function closeModal() {
    showModal = false;
  }

  async function submitRequest() {
    const userId = $auth.session?.user?.id;
    if (!userId || !title.trim() || !machineType.trim()) return;
    creating = true;
    const { data, error } = await supabase
      .from('customer_requests')
      .insert({
        customer_id: userId,
        title: title.trim(),
        description: description.trim(),
        spec_data: { machineType: machineType.trim(), quantity: Number(quantity) || 1 },
        status: 'New',
      })
      .select()
      .single();
    creating = false;
    if (error || !data) {
      toast.notify(t($locale, 'requestSubmitErrorPrefix') + (error?.message ?? ''), 'error');
      return;
    }
    notifyRole('factory', encodeNotification('newCustomerRequest', { name: data.title }), `/factory/requests/${data.id}`);
    notifyRole('admin', encodeNotification('newCustomerRequest', { name: data.title }), `/admin/requests/${data.id}`);
    toast.notify(t($locale, 'requestSubmittedSuccess'), 'success');
    closeModal();
    goto(`/customer/${data.id}`);
  }
</script>

<section>
  <div class="sec-head">
    <button class="btn-primary" on:click={openModal}>{t($locale, 'newRequestBtn')}</button>
  </div>

  <div class="panel">
    <div class="panel-head">
      <span class="count-tag"><span class="mono">{loading ? '—' : requests.length}</span> {t($locale, 'requestsCountSuffix')}</span>
    </div>

    {#if loading}
      <div class="empty">{t($locale, 'loading')}</div>
    {:else if requests.length === 0}
      <div class="empty">{t($locale, 'noRequestsYet')}</div>
    {:else}
      <table>
        <thead>
          <tr>
            <th>{t($locale, 'colRequestTitle')}</th>
            <th>{t($locale, 'colMachineType')}</th>
            <th class="col-center">{t($locale, 'colStatus')}</th>
            <th class="col-center">{t($locale, 'colCreated')}</th>
          </tr>
        </thead>
        <tbody>
          {#each requests as r (r.id)}
            <tr class="clickable-row" on:click={() => goto(`/customer/${r.id}`)}>
              <td class="name">{r.title}</td>
              <td>{r.spec_data?.machineType ?? '—'}</td>
              <td class="col-center"><span class="status-tag status-{r.status}">{requestStatusLabel($locale, r.status)}</span></td>
              <td class="muted mono">{formatDate(r.created_at)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</section>

{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" on:click={closeModal} on:keydown={(e) => e.key === 'Escape' && closeModal()} role="presentation">
    <div class="modal" on:click|stopPropagation role="dialog" aria-label={t($locale, 'newRequestTitle')} tabindex="-1">
      <h3>{t($locale, 'newRequestTitle')}</h3>
      <label>{t($locale, 'colRequestTitle')}<input type="text" dir="auto" bind:value={title} /></label>
      <label>{t($locale, 'machineTypeLabel')}<input type="text" dir="auto" bind:value={machineType} /></label>
      <label>{t($locale, 'quantityLabel')}<input type="number" min="1" bind:value={quantity} /></label>
      <label>{t($locale, 'descriptionLabel')}<textarea rows="4" dir="auto" bind:value={description}></textarea></label>
      <div class="modal-actions">
        <button class="btn-add" on:click={submitRequest} disabled={creating || !title.trim() || !machineType.trim()}>
          {creating ? t($locale, 'savingGeneric') : t($locale, 'submitRequestBtn')}
        </button>
        <button class="btn-cancel" on:click={closeModal}>{t($locale, 'cancelBtn')}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .sec-head {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 14px;
  }
  .btn-primary {
    background: var(--navy);
    color: #fff;
    border: none;
    padding: 9px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
  }
  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow-x: auto;
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 16px 18px;
    border-bottom: 1px solid var(--border);
  }
  .count-tag {
    font-size: 11px;
    font-weight: 700;
    background: var(--paper);
    padding: 2px 9px;
    border-radius: 20px;
    color: var(--ink-soft);
    border: 1px solid var(--border);
  }
  .empty {
    padding: 40px;
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
    letter-spacing: 0.4px;
    text-transform: uppercase;
    padding: 10px 18px;
    background: var(--paper);
    border-bottom: 1px solid var(--border);
    font-weight: 700;
  }
  td {
    text-align: center;
    padding: 13px 18px;
    border-bottom: 1px solid var(--border);
  }
  tr:last-child td {
    border-bottom: none;
  }
  .name {
    font-weight: 700;
  }
  .muted {
    color: var(--ink-soft);
    font-size: 12.5px;
  }
  .clickable-row {
    cursor: pointer;
  }
  .clickable-row:hover td {
    background: var(--card-hover);
  }
  .status-tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    background: var(--paper);
    border: 1px solid var(--border);
    color: var(--ink-soft);
  }
  .status-Assigned {
    background: var(--success-bg, #e2f5ea);
    color: var(--success-deep, #1a7a45);
    border-color: transparent;
  }
  .status-Rejected {
    background: var(--danger-bg);
    color: var(--danger-deep);
    border-color: transparent;
  }
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: #0007;
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
    max-width: 420px;
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
  .modal textarea {
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 7px 10px;
    font-size: 13px;
    background: var(--paper);
    color: var(--ink);
    font-family: inherit;
    resize: vertical;
  }
  .modal-actions {
    display: flex;
    gap: 8px;
    margin-top: 6px;
  }
  .btn-add {
    background: var(--navy);
    color: #fff;
    border: 0;
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
