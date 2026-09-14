<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { formatDate } from '$lib/calc/formatDate';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';
  import { notifyUser } from '$lib/calc/notify';
  import { encodeNotification } from '$lib/i18n/notifications';
  import { PURCHASE_CATEGORIES } from '$lib/calc/purchaseRequests';
  import type { PurchaseRequestRow } from '$lib/types';

  let entries: PurchaseRequestRow[] = [];
  let loading = true;
  let acting: string | null = null;
  let rejectingId: string | null = null;
  let rejectNote = '';

  async function loadPending() {
    loading = true;
    const { data, error } = await supabase.from('purchase_requests').select('*').eq('approval_status', 'pending').order('work_date', { ascending: false });
    if (!error) entries = data || [];
    loading = false;
  }
  onMount(loadPending);

  function notesFor(entry: PurchaseRequestRow): string {
    const notes: string[] = [];
    for (const cat of PURCHASE_CATEGORIES) {
      for (const f of entry.requested_row_ids[cat] ?? []) {
        if (f.reason && f.reason.trim()) notes.push(f.reason.trim());
      }
    }
    return notes.join(' · ');
  }

  function startReject(entry: PurchaseRequestRow) {
    rejectingId = entry.id;
    rejectNote = '';
  }
  function cancelReject() {
    rejectingId = null;
    rejectNote = '';
  }

  async function act(entry: PurchaseRequestRow, decision: 'approved' | 'rejected') {
    acting = entry.id;
    const update: Record<string, unknown> = { approval_status: decision };
    if (decision === 'rejected') update.rejection_note = rejectNote.trim() || null;
    const { error } = await supabase.from('purchase_requests').update(update).eq('id', entry.id);
    acting = null;
    if (error) {
      toast.notify(t($locale, 'entryActionErrorPrefix') + error.message, 'error');
    } else {
      entries = entries.filter((e) => e.id !== entry.id);
      rejectingId = null;
      toast.notify(decision === 'approved' ? t($locale, 'entryApprovedSuccess') : t($locale, 'entryRejectedSuccess'), 'success');
      notifyUser(entry.requested_by, encodeNotification(decision === 'approved' ? 'purchaseRequestApproved' : 'purchaseRequestRejected', { name: entry.project_name_snapshot }), '/procurement/purchase-requests');
    }
  }
</script>

<div class="panel">
  <p class="desc">{t($locale, 'approvePurchaseRequestsDesc')}</p>
  {#if loading}
    <div class="empty">{t($locale, 'loading')}</div>
  {:else if entries.length === 0}
    <div class="empty">{t($locale, 'noPendingPurchaseRequests')}</div>
  {:else}
    <table>
      <thead>
        <tr>
          <th>{t($locale, 'colProject')}</th>
          <th class="col-center">{t($locale, 'colWorkDate')}</th>
          <th class="col-center">{t($locale, 'colPiecesToday')}</th>
          <th class="col-center">{t($locale, 'colCumulativePercent')}</th>
          <th>{t($locale, 'colNotes')}</th>
          <th class="col-actions"></th>
        </tr>
      </thead>
      <tbody>
        {#each entries as e (e.id)}
          <tr>
            <td class="name">{e.project_name_snapshot}</td>
            <td class="mono muted">{formatDate(e.work_date)}</td>
            <td class="mono">{e.pieces_today}</td>
            <td class="mono">{Math.round(e.cumulative_percent)}%</td>
            <td class="muted">{notesFor(e) || '—'}</td>
            <td class="col-actions">
              <div>
                <button class="btn-approve" disabled={acting === e.id} on:click={() => act(e, 'approved')}>{t($locale, 'approveAction')}</button>
                <button class="btn-reject" disabled={acting === e.id} on:click={() => startReject(e)}>{t($locale, 'rejectAction')}</button>
              </div>
            </td>
          </tr>
          {#if rejectingId === e.id}
            <tr class="reject-row">
              <td colspan="6">
                <div class="reject-form">
                  <input type="text" placeholder={t($locale, 'rejectionNotePlaceholder')} bind:value={rejectNote} />
                  <button class="btn-reject" disabled={acting === e.id} on:click={() => act(e, 'rejected')}>{t($locale, 'confirmRejectAction')}</button>
                  <button class="btn-cancel" on:click={cancelReject}>{t($locale, 'cancelAction')}</button>
                </div>
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 18px 20px;
    overflow-x: auto;
  }
  .desc {
    margin: 0 0 14px;
    font-size: 12.5px;
    color: var(--ink-soft);
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
  .muted {
    color: var(--ink-soft);
  }
  .reject-row td {
    background: var(--paper);
    padding: 12px;
  }
  .reject-form {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .reject-form input {
    flex: 1;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 7px 10px;
    font-size: 12.5px;
    background: var(--card);
    color: var(--ink);
  }
  .btn-approve {
    background: var(--success, #3f9463);
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 5px 10px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .btn-reject {
    background: transparent;
    border: 1px solid var(--danger, #d9503a);
    color: var(--danger, #d9503a);
    border-radius: 6px;
    padding: 5px 10px;
    font-size: 12px;
    cursor: pointer;
  }
  .btn-cancel {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--ink-soft);
    border-radius: 6px;
    padding: 5px 10px;
    font-size: 12px;
    cursor: pointer;
  }
  .btn-approve:disabled,
  .btn-reject:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
