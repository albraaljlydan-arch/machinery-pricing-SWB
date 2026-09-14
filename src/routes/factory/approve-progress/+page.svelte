<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { formatDate } from '$lib/calc/formatDate';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';
  import { notifyUser } from '$lib/calc/notify';
  import { encodeNotification } from '$lib/i18n/notifications';
  import { operationLabel } from '$lib/calc/operationTypes';

  interface Entry {
    id: string;
    project_name_snapshot: string;
    operation_type: string;
    work_date: string;
    completion_percent: number;
    notes: string | null;
    logged_by: string | null;
  }

  let entries: Entry[] = [];
  let loading = true;
  let acting: string | null = null;

  async function loadPending() {
    loading = true;
    const { data, error } = await supabase.from('factory_operations').select('*').eq('approval_status', 'pending').order('work_date', { ascending: false });
    if (!error) entries = data || [];
    loading = false;
  }
  onMount(loadPending);

  async function act(entry: Entry, decision: 'approved' | 'rejected') {
    acting = entry.id;
    const { error } = await supabase.from('factory_operations').update({ approval_status: decision }).eq('id', entry.id);
    acting = null;
    if (error) {
      toast.notify(t($locale, 'entryActionErrorPrefix') + error.message, 'error');
    } else {
      entries = entries.filter((e) => e.id !== entry.id);
      toast.notify(decision === 'approved' ? t($locale, 'entryApprovedSuccess') : t($locale, 'entryRejectedSuccess'), 'success');
      if (entry.logged_by) {
        notifyUser(entry.logged_by, encodeNotification(decision === 'approved' ? 'progressApproved' : 'progressRejected', { name: entry.project_name_snapshot }), '/followup');
      }
    }
  }
</script>

<div class="panel">
  {#if loading}
    <div class="empty">{t($locale, 'loading')}</div>
  {:else if entries.length === 0}
    <div class="empty">{t($locale, 'noPendingEntries')}</div>
  {:else}
    <table>
      <thead>
        <tr>
          <th>{t($locale, 'colProject')}</th>
          <th>{t($locale, 'colOperationType')}</th>
          <th class="col-center">{t($locale, 'colWorkDate')}</th>
          <th class="col-center">{t($locale, 'colCompletion')}</th>
          <th>{t($locale, 'colNotes')}</th>
          <!-- Last cell, shrink-to-fit: see .col-actions in tokens.css -->
          <th class="col-actions"></th>
        </tr>
      </thead>
      <tbody>
        {#each entries as e (e.id)}
          <tr>
            <td class="name">{e.project_name_snapshot}</td>
            <td>{operationLabel($locale, e.operation_type)}</td>
            <td class="mono muted">{formatDate(e.work_date)}</td>
            <td class="mono">{e.completion_percent}%</td>
            <td class="muted">{e.notes || '—'}</td>
            <td class="col-actions">
              <div>
                <button class="btn-approve" disabled={acting === e.id} on:click={() => act(e, 'approved')}>{t($locale, 'approveAction')}</button>
                <button class="btn-reject" disabled={acting === e.id} on:click={() => act(e, 'rejected')}>{t($locale, 'rejectAction')}</button>
              </div>
            </td>
          </tr>
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
  .btn-approve:disabled,
  .btn-reject:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
