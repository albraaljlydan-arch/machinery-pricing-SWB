<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import type { PurchaseRequestRow } from '$lib/types';

  interface ProjectRow {
    id: string;
    project_name: string;
    client: string | null;
    status: string;
    created_at: string;
  }

  let projects: ProjectRow[] = [];
  let requests: PurchaseRequestRow[] = [];
  let loading = true;

  const todayStr = new Date().toISOString().slice(0, 10);

  onMount(async () => {
    const { data: projData, error: projErr } = await supabase.from('projects').select('id, project_name, client, status, created_at').eq('status', 'In Production').order('created_at', { ascending: false });
    if (!projErr) projects = projData || [];

    if (projects.length > 0) {
      const { data: reqData, error: reqErr } = await supabase
        .from('purchase_requests')
        .select('*')
        .in(
          'project_id',
          projects.map((p) => p.id)
        )
        .order('created_at', { ascending: false });
      if (!reqErr) requests = reqData || [];
    }
    loading = false;
  });

  function requestsFor(projectId: string) {
    return requests.filter((r) => r.project_id === projectId);
  }
  function cumulativePercentFor(projectId: string): number {
    const approved = requestsFor(projectId).find((r) => r.approval_status === 'approved');
    return approved ? Math.round(approved.cumulative_percent) : 0;
  }
  function todayStatusFor(projectId: string): 'none' | 'pending' | 'approved' | 'rejected' {
    const todayRow = requestsFor(projectId).find((r) => r.work_date === todayStr);
    if (!todayRow) return 'none';
    if (todayRow.approval_status === 'approved') return 'approved';
    if (todayRow.approval_status === 'rejected') return 'rejected';
    return 'pending';
  }
  function statusLabelFor(s: 'none' | 'pending' | 'approved' | 'rejected'): string {
    if (s === 'pending') return t($locale, 'purchaseStatusPending');
    if (s === 'approved') return t($locale, 'purchaseStatusApprovedToday');
    if (s === 'rejected') return t($locale, 'purchaseStatusRejectedToday');
    return t($locale, 'purchaseStatusNotSubmitted');
  }
</script>

<section>
  <div class="panel">
    <div class="panel-head">
      <span class="count-tag"><span class="mono">{loading ? '—' : projects.length}</span> {t($locale, 'projectsCountSuffix')}</span>
    </div>
    <p class="desc">{t($locale, 'purchaseRequestsDesc')}</p>

    {#if loading}
      <div class="empty">{t($locale, 'loading')}</div>
    {:else if projects.length === 0}
      <div class="empty">{t($locale, 'purchaseRequestsEmpty')}</div>
    {:else}
      <table>
        <thead>
          <tr>
            <th>{t($locale, 'colProject')}</th>
            <th>{t($locale, 'colClient')}</th>
            <th class="col-center">{t($locale, 'colCumulativePercent')}</th>
            <th class="col-center">{t($locale, 'colTodayStatus')}</th>
          </tr>
        </thead>
        <tbody>
          {#each projects as proj}
            {@const todayStatus = todayStatusFor(proj.id)}
            <tr class="clickable-row" on:click={() => goto(`/procurement/purchase-requests/${proj.id}`)}>
              <td class="name">{proj.project_name}</td>
              <td>{proj.client || '—'}</td>
              <td class="col-center">
                <div class="pct-cell">
                  <div class="pct-track"><div class="pct-fill" style="width:{cumulativePercentFor(proj.id)}%"></div></div>
                  <span class="mono">{cumulativePercentFor(proj.id)}%</span>
                </div>
              </td>
              <td class="col-center"><span class="chip chip-{todayStatus}">{statusLabelFor(todayStatus)}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</section>

<style>
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
    padding: 16px 18px 4px;
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
  .desc {
    padding: 0 18px 16px;
    margin: 0;
    font-size: 12.5px;
    color: var(--ink-soft);
    border-bottom: 1px solid var(--border);
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
    padding: 12px 16px;
    background: var(--paper);
    font-size: 11.5px;
    color: var(--ink-soft);
    border-bottom: 1px solid var(--border);
  }
  td {
    text-align: center;
    padding: 13px 16px;
    border-bottom: 1px solid var(--border);
  }
  tr:last-child td {
    border-bottom: none;
  }
  .name {
    font-weight: 700;
  }
  .clickable-row {
    cursor: pointer;
  }
  .clickable-row:hover td {
    background: var(--card-hover);
  }
  .pct-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
  }
  .pct-track {
    width: 90px;
    height: 7px;
    border-radius: 4px;
    background: var(--paper);
    overflow: hidden;
  }
  .pct-fill {
    height: 100%;
    background: var(--navy-3);
    border-radius: 4px;
  }
  .chip {
    display: inline-flex;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 11px;
    border-radius: 20px;
    white-space: nowrap;
  }
  .chip-none {
    background: var(--paper);
    color: var(--ink-soft);
    border: 1px solid var(--border);
  }
  .chip-pending {
    background: var(--amber-bg);
    color: var(--amber-ink);
  }
  .chip-approved {
    background: var(--success-bg);
    color: var(--success-deep);
  }
  .chip-rejected {
    background: var(--danger-bg);
    color: var(--danger-deep);
  }
</style>
