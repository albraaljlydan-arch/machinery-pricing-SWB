<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';
  import { formatDate } from '$lib/calc/formatDate';
  import { notifyRole } from '$lib/calc/notify';
  import { encodeNotification } from '$lib/i18n/notifications';
  import FullReport from '$lib/components/calculator/FullReport.svelte';
  import { flagsToSets, type FlagSet } from '$lib/calc/reviewFlags';
  import { totalPieces, pieceSumForIds, unionRowFlags, rowFlagsToFlagSet, flagSetToRowFlags, latestRowStatus, EMPTY_PURCHASE_ROW_FLAGS } from '$lib/calc/purchaseRequests';
  import type { PurchaseRequestRow, ProjectData } from '$lib/types';

  $: projectId = $page.params.id;
  const todayStr = new Date().toISOString().slice(0, 10);

  let loading = true;
  let project: any = null;
  let requests: PurchaseRequestRow[] = [];
  let submitting = false;
  let checked: FlagSet = flagsToSets(undefined);

  async function load() {
    loading = true;
    const [{ data: proj, error: projErr }, { data: reqData, error: reqErr }] = await Promise.all([
      supabase.from('projects_with_designer').select('*').eq('id', projectId).single(),
      supabase.from('purchase_requests').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    ]);
    if (projErr || !proj) {
      toast.notify(t($locale, 'couldNotLoadProject'), 'error');
      goto('/procurement/purchase-requests');
      return;
    }
    project = proj;
    requests = reqData || [];
    checked = flagsToSets(undefined);
    loading = false;
  }
  onMount(load);

  $: pd = (project?.project_data || {}) as ProjectData;
  $: statusMap = latestRowStatus(requests);
  $: approvedFlags = requests.filter((r) => r.approval_status === 'approved').reduce((acc, r) => unionRowFlags(acc, r.requested_row_ids), EMPTY_PURCHASE_ROW_FLAGS);
  $: pendingFlags = requests.filter((r) => r.approval_status === 'pending').reduce((acc, r) => unionRowFlags(acc, r.requested_row_ids), EMPTY_PURCHASE_ROW_FLAGS);
  $: lockedFlagSet = rowFlagsToFlagSet(approvedFlags); // only APPROVED rows get a disabled checkbox
  $: shownFlagSet = mergeChecked(checked, rowFlagsToFlagSet(unionRowFlags(approvedFlags, pendingFlags)));

  $: totalPcs = totalPieces(pd);
  $: approvedPieces = pieceSumForIds(pd, approvedFlags);
  $: cumulativePercentSoFar = totalPcs > 0 ? Math.round((approvedPieces / totalPcs) * 100) : 0;

  function mergeChecked(a: FlagSet, extra: FlagSet): FlagSet {
    const out = flagsToSets(undefined);
    for (const cat of Object.keys(out) as (keyof FlagSet)[]) out[cat] = new Map([...a[cat], ...extra[cat]]);
    return out;
  }

  function rowStatusFor(category: keyof FlagSet, id: string): { label: string; tone: 'locked' | 'pending' | 'rejected' } | undefined {
    const s = statusMap.get(id);
    if (!s) return undefined;
    if (s.status === 'pending') return { label: 'Awaiting factory approval', tone: 'pending' };
    if (s.status === 'rejected') return { label: s.note ? `Rejected: ${s.note}` : 'Rejected', tone: 'rejected' };
    return undefined; // approved — just a disabled checked checkbox, no pill needed
  }

  function toggleRow(category: keyof FlagSet, id: string) {
    if (lockedFlagSet[category].has(id)) return; // approved — can't uncheck
    const next = { ...checked, [category]: new Map(checked[category]) };
    if (next[category].has(id)) next[category].delete(id);
    else next[category].set(id, '');
    checked = next;
  }
  function changeNote(category: keyof FlagSet, id: string, note: string) {
    const next = { ...checked, [category]: new Map(checked[category]) };
    next[category].set(id, note);
    checked = next;
  }

  $: newFlags = flagSetToRowFlags(checked);
  $: piecesToday = pieceSumForIds(pd, newFlags);
  $: piecesCumulativeAfter = pieceSumForIds(pd, unionRowFlags(approvedFlags, newFlags));
  $: dailyPercent = totalPcs > 0 ? (piecesToday / totalPcs) * 100 : 0;
  $: cumulativePercentAfter = totalPcs > 0 ? (piecesCumulativeAfter / totalPcs) * 100 : 0;

  async function submit() {
    if (piecesToday === 0) {
      toast.notify(t($locale, 'noRowsSelectedError'), 'error');
      return;
    }
    submitting = true;
    const { error } = await supabase.from('purchase_requests').insert({
      project_id: projectId,
      project_name_snapshot: project.project_name,
      work_date: todayStr,
      requested_by: $auth.session?.user.id,
      requested_row_ids: newFlags,
      pieces_today: piecesToday,
      pieces_cumulative: piecesCumulativeAfter,
      total_pieces: totalPcs,
      daily_percent: dailyPercent,
      cumulative_percent: cumulativePercentAfter,
      approval_status: 'pending',
    });
    submitting = false;
    if (error) {
      toast.notify(t($locale, 'purchaseRequestSubmitError') + error.message, 'error');
    } else {
      toast.notify(t($locale, 'purchaseRequestSubmitted'), 'success');
      notifyRole('factory', encodeNotification('purchaseRequestPendingApproval', { name: project.project_name }), '/factory/approve-purchase-requests');
      await load();
    }
  }
</script>

<div class="page">
  {#if loading}
    <p class="muted">{t($locale, 'loading')}</p>
  {:else}
    <div class="topbar">
      <a class="btn-back" href="/procurement/purchase-requests">{t($locale, 'backToPurchaseRequests')}</a>
      <div class="title">{project.project_name}</div>
      <div class="spacer"></div>
      <div class="stat-pill"><span>{t($locale, 'colCumulativePercent')}</span><b class="mono">{cumulativePercentSoFar}%</b></div>
    </div>

    <div class="hint">{t($locale, 'purchaseChecklistHint')}</div>

    <div class="live-bar">
      <div class="live-stat"><span class="lbl">{t($locale, 'piecesTodayLabel')}</span><span class="val mono">{piecesToday} <small>({Math.round(dailyPercent)}%)</small></span></div>
      <div class="live-stat"><span class="lbl">{t($locale, 'piecesCumulativeLabel')}</span><span class="val mono">{piecesCumulativeAfter} <small>({Math.round(cumulativePercentAfter)}%)</small></span></div>
      <div class="live-stat"><span class="lbl">{t($locale, 'totalPiecesLabel')}</span><span class="val mono">{totalPcs}</span></div>
      <button class="btn-submit" disabled={submitting || piecesToday === 0} on:click={submit}>{t($locale, 'sendToFactoryAction')}</button>
    </div>

    <div class="report-card" dir="ltr">
      <FullReport
        mode="designer"
        safetyFactor={Number(pd.safetyFactor) || 0}
        projectName={project.project_name}
        engineer={project.designer_name || '—'}
        client={project.client || '—'}
        status={project.status}
        formattedDate={formatDate(project.created_at)}
        sheets={pd.sheetRows || []}
        profiles={pd.profileRows || []}
        mills={pd.millRows || []}
        pipes={pd.pipeRows || []}
        squares={pd.squareRows || []}
        orders={pd.orderRows || []}
        operations={[]}
        flagIcon="select"
        flagSets={shownFlagSet}
        lockedIds={lockedFlagSet}
        rowStatus={rowStatusFor}
        onToggle={toggleRow}
        onReasonChange={changeNote}
      />
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px;
    font-family: var(--font-body);
    background: var(--paper);
    color: var(--ink);
    min-height: 100vh;
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
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .spacer {
    flex: 1;
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
  }
  .stat-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 12px;
  }
  .stat-pill b {
    font-size: 14px;
    color: var(--navy-3);
  }
  .hint {
    background: var(--info-bg);
    border: 1px solid var(--info-border);
    border-radius: 10px;
    padding: 10px 16px;
    color: var(--info-ink);
    font-size: 13px;
    margin-bottom: 16px;
  }
  .live-bar {
    display: flex;
    align-items: center;
    gap: 22px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 20px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .live-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .live-stat .lbl {
    font-size: 10.5px;
    color: var(--ink-soft);
    text-transform: uppercase;
    font-weight: 700;
  }
  .live-stat .val {
    font-size: 15px;
    font-weight: 800;
  }
  .live-stat .val small {
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-soft);
  }
  .btn-submit {
    margin-inline-start: auto;
    background: var(--success);
    color: #fff;
    border: none;
    padding: 10px 18px;
    border-radius: 8px;
    font-family: inherit;
    font-weight: 700;
    font-size: 13px;
  }
  .btn-submit:disabled {
    opacity: 0.6;
  }
  .report-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }
</style>
