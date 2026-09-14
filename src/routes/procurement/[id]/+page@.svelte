<script lang="ts">
  // ==========================================================================
  //  PROCUREMENT — TWO FILES, ONE SCREEN
  //
  //  The view switch at the top is the whole point of this page:
  //
  //    "Designer Estimate"  read-only. The designer's rows at catalogue $/kg.
  //                         Reference only — nothing here can be edited, and
  //                         nothing Procurement does below ever writes to it.
  //    "Purchase File"      Procurement's own calculator. Same specs, every
  //                         $/kg blank, filled in with real invoice prices.
  //
  //  Before this split, Procurement edited the designer's rows in place, so
  //  the first save destroyed the estimate — and estimate-vs-actual is the
  //  most useful thing this project record has. Now project_data holds the
  //  designer's rows untouched and project_data.procurement holds the real
  //  purchase (see lib/calc/procurementSeed.ts).
  // ==========================================================================
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import Calculator from '$lib/components/calculator/Calculator.svelte';
  import FullReport from '$lib/components/calculator/FullReport.svelte';
  import type { SheetRow, ProfileRow, MillRow, PipeRow, SquareRow, OrderRow, OperationRow, InvoiceRow, ProjectData, ProcurementData } from '$lib/types';
  import { computeGrandTotals } from '$lib/calc/grandTotals';
  import { seedProcurementData, blankProcurementData, readProcurementData } from '$lib/calc/procurementSeed';
  import { formatDate } from '$lib/calc/formatDate';
  import { formatNum } from '$lib/utils';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';

  $: projectId = $page.params.id;

  let view: 'purchase' | 'estimate' = 'purchase';

  let loading = true;
  let saving = false;
  let completing = false;
  let status = 'Complete Production';
  let projectName = '';
  let clientName = '';
  let designerName = '';
  let createdAt = '';

  /** The designer's file — read-only on this screen, never written back. */
  let designerData: Partial<ProjectData> = {};

  /** Procurement's file — what the calculator below is bound to. */
  let sheetRows: SheetRow[] = [];
  let profileRows: ProfileRow[] = [];
  let millRows: MillRow[] = [];
  let pipeRows: PipeRow[] = [];
  let squareRows: SquareRow[] = [];
  let orderRows: OrderRow[] = [];
  let operations: OperationRow[] = [];
  let invoiceRows: InvoiceRow[] = [];
  let seededAt = '';

  /** True until the seeded file has been saved once — drives the "this is a
   *  fresh copy, prices are blank" banner. */
  let freshlySeeded = false;

  function adopt(p: ProcurementData) {
    sheetRows = p.sheetRows;
    profileRows = p.profileRows;
    millRows = p.millRows;
    pipeRows = p.pipeRows;
    squareRows = p.squareRows;
    orderRows = p.orderRows;
    operations = p.operations;
    invoiceRows = p.invoiceRows;
    seededAt = p.seededAt;
  }

  async function load() {
    loading = true;
    const { data, error } = await supabase.from('projects_with_designer').select('*').eq('id', projectId).single();
    if (error || !data) {
      toast.notify(t($locale, 'couldNotLoadProject'), 'error');
      goto('/procurement');
      return;
    }
    const d: Partial<ProjectData> = data.project_data || {};
    designerData = d;
    projectName = data.project_name || '';
    clientName = d.client || data.client || '';
    designerName = data.designer_name || '';
    createdAt = data.created_at || '';
    status = data.status;

    // First visit: build the purchase file from the designer's specs with
    // every price cleared. It isn't persisted until Save — reopening an
    // untouched project just re-seeds from the same specs.
    const existing = readProcurementData(d);
    freshlySeeded = !existing;
    adopt(existing ?? seedProcurementData(d));

    loading = false;
  }

  onMount(load);

  $: purchaseRows = { sheets: sheetRows, profiles: profileRows, mills: millRows, pipes: pipeRows, squares: squareRows, orders: orderRows, operations };
  // requireManualPrice: an un-entered $/kg leaves its row unpriced instead of
  // borrowing the catalogue price, so this total never quietly includes the
  // designer's estimate.
  $: purchaseTotals = computeGrandTotals(purchaseRows, { requireManualPrice: true });
  $: estimateTotals = computeGrandTotals({
    sheets: designerData.sheetRows ?? [],
    profiles: designerData.profileRows ?? [],
    mills: designerData.millRows ?? [],
    pipes: designerData.pipeRows ?? [],
    squares: designerData.squareRows ?? [],
    orders: designerData.orderRows ?? [],
    operations: designerData.operations ?? [],
  });

  /** Writes ONLY project_data.procurement — the designer's seven row arrays
   *  and every other key are carried across verbatim. */
  function buildProjectData(): Partial<ProjectData> {
    return {
      ...designerData,
      procurement: { sheetRows, profileRows, millRows, pipeRows, squareRows, orderRows, operations, invoiceRows, seededAt },
    };
  }

  async function saveProgress() {
    saving = true;
    // total_cost is left alone here: while the project is still Complete
    // Production it's the designer's estimate, and that's what Procurement's
    // own dashboard list shows. It only becomes the real cost on hand-off.
    const { error } = await supabase.from('projects').update({ project_data: buildProjectData() }).eq('id', projectId);
    saving = false;
    if (error) toast.notify(t($locale, 'errorSavingPrefix') + error.message, 'error');
    else {
      freshlySeeded = false;
      toast.notify(t($locale, 'purchaseFileSaved'), 'success');
    }
  }

  async function completeAndSend() {
    // Hard block, not a "send anyway" confirm — a $0 row isn't a real price,
    // and Accounting has no way to tell an unpriced row from an item that
    // genuinely cost nothing once it's inside their total.
    if (purchaseTotals.unpricedRows > 0) {
      toast.notify(t($locale, 'unpricedBlockSendTemplate').replace('{n}', String(purchaseTotals.unpricedRows)), 'error');
      return;
    }
    completing = true;
    // Now total_cost becomes the REAL cost — Accounting's list reads it as
    // "Final Cost". The designer's estimate stays recomputable from the
    // untouched rows in project_data.
    const { error } = await supabase
      .from('projects')
      .update({ status: 'Completed', total_cost: purchaseTotals.totalPrice, project_data: buildProjectData() })
      .eq('id', projectId);
    completing = false;
    if (error) toast.notify(t($locale, 'errorCompletingPrefix') + error.message, 'error');
    else goto('/procurement');
  }

  function reseedFromSpec() {
    if (!confirm(t($locale, 'confirmResetFromSpec'))) return;
    // Invoices survive: resetting the material spec says nothing about the
    // paperwork already filed against this project.
    const keptInvoices = invoiceRows;
    adopt(seedProcurementData(designerData));
    invoiceRows = keptInvoices;
    freshlySeeded = true;
  }

  function startBlank() {
    if (!confirm(t($locale, 'confirmStartBlank'))) return;
    const keptInvoices = invoiceRows;
    adopt(blankProcurementData());
    invoiceRows = keptInvoices;
    freshlySeeded = true;
  }
</script>

<div class="page">
  <div class="topbar">
    <a class="btn-back" href="/procurement">{t($locale, 'backToDashboard')}</a>
    <div class="spacer"></div>
    {#if view === 'purchase'}
      <button class="btn-ghost" on:click={reseedFromSpec} title={t($locale, 'resetFromSpecTitle')}>{t($locale, 'resetFromSpecAction')}</button>
      <button class="btn-ghost" on:click={startBlank} title={t($locale, 'startBlankTitle')}>{t($locale, 'startBlankAction')}</button>
      <button class="btn-save" on:click={saveProgress} disabled={saving}>{saving ? t($locale, 'savingGeneric') : t($locale, 'saveProgressAction')}</button>
      <button
        class="btn-complete"
        on:click={completeAndSend}
        disabled={completing || purchaseTotals.unpricedRows > 0}
        title={purchaseTotals.unpricedRows > 0 ? t($locale, 'unpricedBlockSendTemplate').replace('{n}', String(purchaseTotals.unpricedRows)) : undefined}
      >
        {completing ? t($locale, 'submittingGeneric') : t($locale, 'completeAndSendAccounting')}
      </button>
    {/if}
  </div>

  {#if loading}
    <p class="muted">{t($locale, 'loading')}</p>
  {:else}
    <!-- The switch. Two files, never merged into one editable table. -->
    <div class="switch" role="tablist">
      <button role="tab" aria-selected={view === 'purchase'} class:on={view === 'purchase'} on:click={() => (view = 'purchase')}>
        {t($locale, 'purchaseFileTab')}
        <span class="sub">{t($locale, 'purchaseFileTabSub')}</span>
      </button>
      <button role="tab" aria-selected={view === 'estimate'} class:on={view === 'estimate'} on:click={() => (view = 'estimate')}>
        {t($locale, 'designerEstimateTab')}
        <span class="sub">{t($locale, 'designerEstimateTabSub')}</span>
      </button>
    </div>

    {#if view === 'purchase'}
      {#if purchaseTotals.unpricedRows > 0}
        <div class="notice warn">{t($locale, 'unpricedRowsNoticeTemplate').replace('{n}', String(purchaseTotals.unpricedRows))}</div>
      {/if}

      <div dir="ltr">
        <Calculator
          mode="procurement"
          currentUserRole={$auth.userRole ?? 'procurement'}
          bind:sheetRows
          bind:profileRows
          bind:millRows
          bind:pipeRows
          bind:squareRows
          bind:orderRows
          bind:operations
          bind:invoiceRows
          bind:projectName
          {designerName}
          bind:clientName
          {status}
        />
      </div>
    {:else}
      <div class="notice">{@html t($locale, 'designerEstimateNotice')}</div>
      <div class="est-bar">
        <span class="lbl">{t($locale, 'designerEstimatedTotal')}</span>
        <span class="val mono">${formatNum(estimateTotals.totalPrice, 2)}</span>
      </div>
      <div class="report-card" dir="ltr">
        <FullReport
          mode="designer"
          projectName={projectName || '—'}
          engineer={designerName || '—'}
          client={clientName || '—'}
          {status}
          formattedDate={formatDate(createdAt)}
          safetyFactor={designerData.safetyFactor ?? 0}
          sheets={designerData.sheetRows ?? []}
          profiles={designerData.profileRows ?? []}
          mills={designerData.millRows ?? []}
          pipes={designerData.pipeRows ?? []}
          squares={designerData.squareRows ?? []}
          orders={designerData.orderRows ?? []}
          operations={designerData.operations ?? []}
        />
      </div>
    {/if}
  {/if}
</div>

<style>
  .page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px 20px 60px;
    font-family: var(--font-body);
    color: var(--ink);
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
    flex-wrap: wrap;
  }
  .spacer {
    flex: 1;
  }
  .btn-back {
    background: var(--steel);
    color: #fff;
    padding: 9px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
  }
  .btn-ghost {
    background: transparent;
    color: var(--ink-soft);
    border: 1px solid var(--border);
    padding: 8px 13px;
    border-radius: 8px;
    font-family: inherit;
    font-weight: 600;
    font-size: 12.5px;
  }
  .btn-ghost:hover {
    background: var(--card-hover);
    color: var(--ink);
  }
  .btn-save {
    background: var(--navy-3);
    color: #fff;
    border: none;
    padding: 9px 16px;
    border-radius: 8px;
    font-family: inherit;
    font-weight: 700;
    font-size: 13px;
  }
  .btn-complete {
    background: var(--success);
    color: #fff;
    border: none;
    padding: 9px 16px;
    border-radius: 8px;
    font-family: inherit;
    font-weight: 700;
    font-size: 13px;
  }
  .btn-save:disabled,
  .btn-complete:disabled {
    opacity: 0.6;
  }
  .muted {
    color: var(--ink-soft);
  }

  /* The two-file switch — big enough that nobody mistakes the read-only
     estimate for the file they're supposed to be filling in. */
  .switch {
    display: flex;
    gap: 8px;
    padding: 8px;
    background: var(--navy, #0e2a3f);
    border-radius: 12px;
    margin-bottom: 14px;
  }
  .switch button {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: transparent;
    color: #cfe4ec;
    border: none;
    padding: 10px 14px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 14px;
    text-align: center;
    cursor: pointer;
  }
  .switch button.on {
    background: var(--amber, #f2a93b);
    color: #1b1103;
  }
  .switch .sub {
    font-size: 11px;
    font-weight: 500;
    opacity: 0.75;
  }

  .notice {
    background: var(--info-bg);
    border: 1px solid var(--info-border);
    color: var(--info-ink);
    border-radius: 10px;
    padding: 10px 16px;
    font-size: 12.5px;
    margin-bottom: 14px;
  }
  .notice.warn {
    background: var(--warn-bg);
    border-color: var(--warn-border);
    color: var(--warn-ink);
  }

  /* Deliberately a dark band in both themes — same emphasis device the
     report's own ledger bars use. */
  .est-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--navy);
    border-radius: 10px;
    padding: 12px 20px;
    margin-bottom: 14px;
  }
  .est-bar .lbl {
    color: #9fc2d2;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .est-bar .val {
    color: #4ade80;
    font-size: 19px;
    font-weight: 700;
  }

  .report-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
  }
</style>
