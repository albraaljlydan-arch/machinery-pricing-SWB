<script lang="ts">
  // ==========================================================================
  //  ADMIN — ONE MACHINE, 360°
  //
  //  Reached from the topbar search. Complements /admin/projects/[id] (the
  //  full calculator report + approve/reject) rather than replacing it: this
  //  screen is the story of the project — estimate vs. what it actually cost,
  //  every operation logged against it, every purchase request, and the full
  //  status timeline — with a link out to the calculator report itself.
  // ==========================================================================
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { fly, fade } from 'svelte/transition';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t, statusLabel, eventLabel } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';
  import { formatDate } from '$lib/calc/formatDate';
  import { formatNum } from '$lib/utils';
  import { computeGrandTotals } from '$lib/calc/grandTotals';
  import { operationLabel } from '$lib/calc/operationTypes';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import type { ProjectEvent } from '$lib/types';

  $: projectId = $page.params.id;

  interface ProjectRow {
    id: string;
    project_name: string;
    client: string | null;
    status: string;
    total_cost: number;
    created_at: string;
    designer_name: string | null;
    project_data: any;
  }
  interface OperationRow {
    id: string;
    operation_type: string;
    work_date: string;
    completion_percent: number;
    approval_status: string;
    logged_by: string;
  }
  interface PurchaseRow {
    id: string;
    work_date: string;
    pieces_today: number;
    cumulative_percent: number;
    approval_status: string;
    requested_by: string;
  }

  let loading = true;
  let project: ProjectRow | null = null;
  let operations: OperationRow[] = [];
  let purchases: PurchaseRow[] = [];
  let events: ProjectEvent[] = [];
  let actorNames: Record<string, string> = {};

  async function load() {
    loading = true;
    const { data, error } = await supabase.from('projects_with_designer').select('*').eq('id', projectId).single();
    if (error || !data) {
      toast.notify(t($locale, 'couldNotLoadProject'), 'error');
      goto('/admin/projects');
      return;
    }
    project = data as ProjectRow;

    const [{ data: ops }, { data: pur }, { data: evs }] = await Promise.all([
      supabase.from('factory_operations').select('id, operation_type, work_date, completion_percent, approval_status, logged_by').eq('project_id', projectId).order('work_date', { ascending: false }),
      supabase.from('purchase_requests').select('id, work_date, pieces_today, cumulative_percent, approval_status, requested_by').eq('project_id', projectId).order('work_date', { ascending: false }),
      supabase.from('project_events').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    ]);
    operations = (ops as OperationRow[]) ?? [];
    purchases = (pur as PurchaseRow[]) ?? [];
    events = (evs as ProjectEvent[]) ?? [];

    const actorIds = [...new Set(events.map((e) => e.actor_id).filter((id): id is string => !!id))];
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', actorIds);
      actorNames = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
    }
    loading = false;
  }
  onMount(load);

  $: pd = project?.project_data || {};
  $: estimateTotals = computeGrandTotals({
    sheets: pd.sheetRows ?? [],
    profiles: pd.profileRows ?? [],
    mills: pd.millRows ?? [],
    pipes: pd.pipeRows ?? [],
    squares: pd.squareRows ?? [],
    orders: pd.orderRows ?? [],
    operations: pd.operations ?? [],
  });
  $: isCompleted = project?.status === 'Completed';

  function opStatusText(s: string) {
    if (s === 'approved') return t($locale, 'approvalStatusApproved');
    if (s === 'rejected') return t($locale, 'approvalStatusRejected');
    return t($locale, 'approvalStatusPending');
  }
</script>

<div class="page">
  {#if loading}
    <p class="muted">{t($locale, 'loading')}</p>
  {:else if project}
    <div class="topbar" in:fly={{ y: -8, duration: 240 }}>
      <a class="btn-back" href="/admin/projects">{t($locale, 'backToProjects')}</a>
      <div class="title">
        {t($locale, 'viewingLabel')} <span class="hl">{project.project_name}</span>
        <StatusBadge status={project.status} userRole="admin" locale={$locale} />
      </div>
      <div class="spacer"></div>
      <a class="btn-report" href={`/admin/projects/${projectId}`}>{t($locale, 'machineOpenFullReport')}</a>
    </div>

    <div class="meta-grid">
      <div><span class="lbl">{t($locale, 'colDesignerName')}</span><span class="val">{project.designer_name || '—'}</span></div>
      <div><span class="lbl">{t($locale, 'colClient')}</span><span class="val">{project.client || '—'}</span></div>
      <div><span class="lbl">{t($locale, 'colStatus')}</span><span class="val">{statusLabel($locale, project.status)}</span></div>
      <div><span class="lbl">{t($locale, 'submittedLabel')}</span><span class="val mono">{formatDate(project.created_at)}</span></div>
    </div>

    <section class="panel" in:fade={{ duration: 260, delay: 60 }}>
      <div class="panel-head"><h3>{t($locale, 'machineEstimateVsActual')}</h3></div>
      <div class="cost-grid">
        <div class="cost-card">
          <span class="lbl">{t($locale, 'machineEstimatedCost')}</span>
          <strong class="mono">${formatNum(estimateTotals.totalPrice, 2)}</strong>
        </div>
        <div class="cost-card" class:done={isCompleted}>
          <span class="lbl">{t($locale, 'machineActualCost')}</span>
          <strong class="mono">{isCompleted ? `$${formatNum(project.total_cost, 2)}` : '—'}</strong>
        </div>
      </div>
    </section>

    <section class="panel" in:fade={{ duration: 260, delay: 120 }}>
      <div class="panel-head">
        <h3>{t($locale, 'machineTimeline')}</h3>
        <span class="count-tag mono">{events.length}</span>
      </div>
      {#if events.length === 0}
        <div class="empty">{t($locale, 'machineNoTimeline')}</div>
      {:else}
        <ol class="timeline">
          {#each events as event, i (event.id)}
            <li in:fly={{ x: 10, duration: 240, delay: Math.min(i, 12) * 30 }}>
              <span class="dot dot-{event.event_type}"></span>
              <div class="tl-body">
                <b>{eventLabel($locale, event.event_type)}</b>
                <small>
                  {event.actor_id ? (actorNames[event.actor_id] ?? '—') : '—'}
                  {#if event.event_type === 'rejected' && event.note}
                    · {t($locale, 'eventFlaggedRowsTemplate').replace('{n}', event.note)}
                  {:else if event.note}
                    · <span class="mono">{event.note}</span>
                  {/if}
                </small>
              </div>
              <time class="mono">{formatDate(event.created_at)}</time>
            </li>
          {/each}
        </ol>
      {/if}
    </section>

    <div class="two-col">
      <section class="panel" in:fade={{ duration: 260, delay: 180 }}>
        <div class="panel-head">
          <h3>{t($locale, 'machineOperationsLog')}</h3>
          <span class="count-tag mono">{operations.length}</span>
        </div>
        {#if operations.length === 0}
          <div class="empty">{t($locale, 'machineNoOperations')}</div>
        {:else}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t($locale, 'colOperationType')}</th>
                  <th>{t($locale, 'colWorkDate')}</th>
                  <th>{t($locale, 'colCompletion')}</th>
                  <th>{t($locale, 'colApprovalStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {#each operations as op (op.id)}
                  <tr>
                    <td>{operationLabel($locale, op.operation_type)}</td>
                    <td class="mono muted">{formatDate(op.work_date)}</td>
                    <td class="mono">{op.completion_percent}%</td>
                    <td><span class="status-pill status-{op.approval_status}">{opStatusText(op.approval_status)}</span></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>

      <section class="panel" in:fade={{ duration: 260, delay: 220 }}>
        <div class="panel-head">
          <h3>{t($locale, 'machinePurchaseLog')}</h3>
          <span class="count-tag mono">{purchases.length}</span>
        </div>
        {#if purchases.length === 0}
          <div class="empty">{t($locale, 'machineNoPurchases')}</div>
        {:else}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t($locale, 'colWorkDate')}</th>
                  <th>{t($locale, 'colPiecesToday')}</th>
                  <th>{t($locale, 'colCumulativePercent')}</th>
                  <th>{t($locale, 'colApprovalStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {#each purchases as pu (pu.id)}
                  <tr>
                    <td class="mono muted">{formatDate(pu.work_date)}</td>
                    <td class="mono">{pu.pieces_today}</td>
                    <td class="mono">{Math.round(pu.cumulative_percent)}%</td>
                    <td><span class="status-pill status-{pu.approval_status}">{opStatusText(pu.approval_status)}</span></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px;
    font-family: var(--font-body);
    background: var(--paper);
    color: var(--ink);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 18px;
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
    border-radius: 14px;
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
  .btn-report {
    background: var(--navy);
    color: #fff;
    padding: 9px 16px;
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
  .spacer {
    flex: 1;
  }
  .hl {
    color: var(--navy-3);
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

  .panel {
    padding: 18px 20px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--card);
    box-shadow: var(--shadow);
    min-width: 0;
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }
  .panel-head h3 {
    margin: 0;
    font-size: 15px;
  }
  .count-tag {
    padding: 3px 9px;
    border: 1px solid var(--border);
    border-radius: 20px;
    background: var(--paper);
    color: var(--ink-soft);
    font-size: 11px;
  }
  .empty {
    padding: 26px;
    text-align: center;
    color: var(--ink-soft);
    font-size: 13px;
  }

  .cost-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .cost-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 18px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--paper);
  }
  .cost-card strong {
    font-size: 22px;
    color: var(--ink-soft);
  }
  .cost-card.done strong {
    color: var(--success-deep, #1a7a45);
  }

  .timeline {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .timeline li {
    display: grid;
    grid-template-columns: 14px 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 10px 4px;
    border-bottom: 1px solid var(--border);
  }
  .timeline li:last-child {
    border-bottom: none;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--steel-2);
  }
  .dot-created {
    background: var(--steel-2);
  }
  .dot-submitted {
    background: var(--navy-3);
  }
  .dot-approved {
    background: var(--success);
  }
  .dot-rejected {
    background: var(--danger);
  }
  .dot-production_finished {
    background: var(--amber);
  }
  .dot-completed {
    background: var(--purple, #9a7bea);
  }
  .tl-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .tl-body b {
    font-size: 13px;
  }
  .tl-body small {
    font-size: 11.5px;
    color: var(--ink-soft);
  }
  .timeline time {
    font-size: 11.5px;
    color: var(--ink-soft);
  }

  .two-col {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }
  th {
    text-align: center;
    font-size: 10px;
    color: var(--steel-2);
    text-transform: uppercase;
    padding: 8px 10px;
    background: var(--paper);
    border-bottom: 1px solid var(--border);
    font-weight: 700;
  }
  td {
    text-align: center;
    padding: 9px 10px;
    border-bottom: 1px solid var(--border);
  }
  tr:last-child td {
    border-bottom: none;
  }
  .muted {
    color: var(--ink-soft);
  }
  .status-pill.status-pending {
    background: var(--amber-bg);
    color: var(--amber-ink);
  }
  .status-pill.status-approved {
    background: var(--success-bg);
    color: var(--success-deep);
  }
  .status-pill.status-rejected {
    background: var(--danger-bg);
    color: var(--danger-deep);
  }

  @media (max-width: 900px) {
    .two-col {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 480px) {
    .cost-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
