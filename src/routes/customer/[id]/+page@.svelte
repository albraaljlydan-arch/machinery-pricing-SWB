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
  import ChatThread from '$lib/components/ChatThread.svelte';
  import type { CustomerRequest } from '$lib/types';

  $: requestId = $page.params.id;

  let loading = true;
  let request: CustomerRequest | null = null;
  let designerName = '';

  async function load() {
    loading = true;
    const { data, error } = await supabase.from('customer_requests').select('*').eq('id', requestId).single();
    if (error || !data) {
      toast.notify(t($locale, 'couldNotLoadProject'), 'error');
      goto('/customer');
      return;
    }
    request = data as CustomerRequest;
    if (request.assigned_designer_id) {
      const { data: designer } = await supabase.from('profiles').select('full_name').eq('id', request.assigned_designer_id).single();
      designerName = designer?.full_name ?? '';
    }
    loading = false;
  }
  onMount(load);
</script>

<div class="page">
  {#if loading}
    <p class="muted">{t($locale, 'loading')}</p>
  {:else if request}
    <div class="topbar">
      <a class="btn-back" href="/customer">{t($locale, 'backToRequests')}</a>
      <div class="title">
        {t($locale, 'viewingLabel')} <span class="hl">{request.title}</span>
        <span class="status-tag status-{request.status}">{requestStatusLabel($locale, request.status)}</span>
      </div>
    </div>

    <div class="meta-grid">
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

    <ChatThread requestId={request.id} enabled={request.status === 'Assigned'} otherPartyName={designerName || t($locale, 'designer')} />
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
