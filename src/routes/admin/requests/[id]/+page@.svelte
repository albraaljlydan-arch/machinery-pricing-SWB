<script lang="ts">
  // ==========================================================================
  //  ADMIN — ONE CUSTOMER REQUEST (read-only oversight)
  //
  //  Admin can see what came in and who Factory matched it to, but does not
  //  assign anyone itself (that stays Factory's job) and cannot open the
  //  customer/designer chat — that thread is private to its two participants
  //  by design, not even Admin can read it.
  // ==========================================================================
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { formatDate } from '$lib/calc/formatDate';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t, requestStatusLabel } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';
  import type { CustomerRequest } from '$lib/types';

  $: requestId = $page.params.id;

  let loading = true;
  let request: CustomerRequest | null = null;
  let customerName = '';
  let designerName = '';

  async function load() {
    loading = true;
    const { data, error } = await supabase.from('customer_requests').select('*').eq('id', requestId).single();
    if (error || !data) {
      toast.notify(t($locale, 'couldNotLoadProject'), 'error');
      goto('/admin/requests');
      return;
    }
    request = data as CustomerRequest;

    const idsToLookUp = [request.customer_id, request.assigned_designer_id].filter((id): id is string => !!id);
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', idsToLookUp);
    const names = Object.fromEntries((profiles || []).map((p) => [p.id, p.full_name]));
    customerName = names[request.customer_id] ?? '';
    designerName = request.assigned_designer_id ? (names[request.assigned_designer_id] ?? '') : '';
    loading = false;
  }
  onMount(load);
</script>

<div class="page">
  {#if loading}
    <p class="muted">{t($locale, 'loading')}</p>
  {:else if request}
    <div class="topbar">
      <a class="btn-back" href="/admin/requests">{t($locale, 'backToRequests')}</a>
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
      <div>
        <span class="lbl">{t($locale, 'assignDesignerLabel')}</span>
        <span class="val">{request.assigned_designer_id ? designerName || '—' : t($locale, 'notAssignedYet')}</span>
      </div>
    </div>

    {#if request.description}
      <div class="desc-card">
        <span class="lbl">{t($locale, 'specDetailsLabel')}</span>
        <p>{request.description}</p>
      </div>
    {/if}

    {#if request.factory_note}
      <div class="desc-card">
        <span class="lbl">{t($locale, 'factoryNoteLabel')}</span>
        <p>{request.factory_note}</p>
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
  .desc-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .desc-card p {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
  }
</style>
