<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { formatDate } from '$lib/calc/formatDate';
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import { locale } from '$lib/stores/locale';
  import { t, requestStatusLabel } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';
  import { notifyUser, notifyRole } from '$lib/calc/notify';
  import { encodeNotification } from '$lib/i18n/notifications';
  import type { CustomerRequest } from '$lib/types';

  $: requestId = $page.params.id;

  let loading = true;
  let request: CustomerRequest | null = null;
  let customerName = '';
  let designerName = '';
  let designers: { id: string; full_name: string }[] = [];
  let selectedDesignerId = '';
  let factoryNote = '';
  let saving = false;

  async function load() {
    loading = true;
    const [{ data, error }, { data: designerRows }] = await Promise.all([
      supabase.from('customer_requests').select('*').eq('id', requestId).single(),
      supabase.from('profiles').select('id, full_name').eq('role', 'designer').order('full_name'),
    ]);
    designers = designerRows || [];
    if (error || !data) {
      toast.notify(t($locale, 'couldNotLoadProject'), 'error');
      goto('/factory/requests');
      return;
    }
    request = data as CustomerRequest;
    factoryNote = request.factory_note ?? '';
    selectedDesignerId = request.assigned_designer_id ?? '';

    const { data: customer } = await supabase.from('profiles').select('full_name').eq('id', request.customer_id).single();
    customerName = customer?.full_name ?? '';
    if (request.assigned_designer_id) {
      const { data: designer } = await supabase.from('profiles').select('full_name').eq('id', request.assigned_designer_id).single();
      designerName = designer?.full_name ?? '';
    }
    loading = false;
  }
  onMount(load);

  async function assignDesigner() {
    if (!request || !selectedDesignerId) return;
    const chosenDesignerName = designers.find((d) => d.id === selectedDesignerId)?.full_name ?? '';
    saving = true;
    const { error } = await supabase
      .from('customer_requests')
      .update({ assigned_designer_id: selectedDesignerId, assigned_by: $auth.session?.user.id, assigned_at: new Date().toISOString(), status: 'Assigned' })
      .eq('id', request.id);
    saving = false;
    if (error) {
      toast.notify(t($locale, 'assignErrorPrefix') + error.message, 'error');
      return;
    }
    toast.notify(t($locale, 'assignedSuccessToast'), 'success');
    notifyUser(selectedDesignerId, encodeNotification('designerAssignedToYou', { name: request.title }), `/designer/requests/${request.id}`);
    notifyUser(request.customer_id, encodeNotification('designerAssignedToRequest', { name: request.title }), `/customer/${request.id}`);
    notifyRole('admin', encodeNotification('designerAssignedNotifyAdmin', { name: request.title, designer: chosenDesignerName }), `/admin/requests/${request.id}`);
    load();
  }

  async function rejectRequest() {
    if (!request) return;
    saving = true;
    const { error } = await supabase.from('customer_requests').update({ status: 'Rejected', factory_note: factoryNote.trim() || null }).eq('id', request.id);
    saving = false;
    if (error) {
      toast.notify(t($locale, 'assignErrorPrefix') + error.message, 'error');
      return;
    }
    load();
  }
</script>

<div class="page">
  {#if loading}
    <p class="muted">{t($locale, 'loading')}</p>
  {:else if request}
    <div class="topbar">
      <a class="btn-back" href="/factory/requests">{t($locale, 'backToRequests')}</a>
      <div class="title">
        {t($locale, 'viewingLabel')} <span class="hl">{request.title}</span>
        <span class="status-tag status-{request.status}">{requestStatusLabel($locale, request.status)}</span>
      </div>
    </div>

    <div class="meta-grid">
      <div><span class="lbl">{t($locale, 'colClient')}</span><span class="val">{customerName || '—'}</span></div>
      <div><span class="lbl">{t($locale, 'colMachineType')}</span><span class="val">{request.spec_data?.machineType ?? '—'}</span></div>
      <div><span class="lbl">{t($locale, 'quantityLabel')}</span><span class="val mono">{request.spec_data?.quantity ?? '—'}</span></div>
      <div><span class="lbl">{t($locale, 'colCreated')}</span><span class="val mono">{formatDate(request.created_at)}</span></div>
    </div>

    {#if request.description}
      <div class="desc-card">
        <span class="lbl">{t($locale, 'specDetailsLabel')}</span>
        <p>{request.description}</p>
      </div>
    {/if}

    {#if request.status === 'New'}
      <div class="assign-card">
        <span class="lbl">{t($locale, 'assignDesignerLabel')}</span>
        <div class="assign-row">
          <select bind:value={selectedDesignerId}>
            <option value="">{t($locale, 'selectDesignerPlaceholder')}</option>
            {#each designers as d}<option value={d.id}>{d.full_name}</option>{/each}
          </select>
          <button class="btn-assign" on:click={assignDesigner} disabled={saving || !selectedDesignerId}>{t($locale, 'assignBtn')}</button>
        </div>
        <label class="note-label">
          {t($locale, 'factoryNoteLabel')}
          <textarea rows="2" dir="auto" bind:value={factoryNote}></textarea>
        </label>
        <button class="btn-reject" on:click={rejectRequest} disabled={saving}>{t($locale, 'rejectRequestBtn')}</button>
      </div>
    {:else if request.assigned_designer_id}
      <div class="desc-card">
        <span class="lbl">{t($locale, 'assignDesignerLabel')}</span>
        <p>{designerName || '—'}</p>
      </div>
    {/if}
  {/if}
</div>

<style>
  .page {
    max-width: 1000px;
    margin: 0 auto;
    padding: 24px;
    font-family: var(--font-body);
    background: var(--paper);
    color: var(--ink);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .muted {
    color: var(--ink-soft);
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--card);
    padding: 16px 24px;
    border-radius: 10px;
    border: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .btn-back {
    background: var(--steel);
    color: #fff;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
  }
  .title {
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .hl {
    color: var(--navy-3);
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
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 12px;
  }
  .meta-grid > div {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
  }
  .lbl {
    font-size: 10.5px;
    color: var(--ink-soft);
    text-transform: uppercase;
    font-weight: 700;
  }
  .val {
    font-size: 14px;
    font-weight: 700;
  }
  .desc-card,
  .assign-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .desc-card p {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  .assign-row {
    display: flex;
    gap: 8px;
  }
  .assign-row select {
    flex: 1;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 13px;
    background: var(--paper);
    color: var(--ink);
  }
  .btn-assign {
    background: var(--navy);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 18px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
  }
  .btn-assign:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .note-label {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 11px;
    color: var(--ink-soft);
  }
  .note-label textarea {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 13px;
    background: var(--paper);
    color: var(--ink);
    font-family: inherit;
    resize: vertical;
  }
  .btn-reject {
    align-self: flex-start;
    background: var(--danger-bg);
    color: var(--danger-deep);
    border: 1px solid var(--danger, #d9503a);
    border-radius: 8px;
    padding: 7px 14px;
    font-weight: 700;
    font-size: 12.5px;
    cursor: pointer;
  }
  .btn-reject:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
