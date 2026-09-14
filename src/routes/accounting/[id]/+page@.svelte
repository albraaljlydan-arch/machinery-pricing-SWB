<script lang="ts">
  // ==========================================================================
  //  ACCOUNTING — READ-ONLY PREVIEW OF PROCUREMENT'S FILE
  //
  //  Accounting used to be sent to /admin/projects/[id], which renders the
  //  DESIGNER's rows — i.e. the estimate. This screen shows the file they
  //  actually need: what Procurement paid, at the prices Procurement typed
  //  in, with no editable control anywhere on the page.
  //
  //  It's FullReport (the same renderer behind the PDF and Admin's review)
  //  rather than the Calculator, precisely because FullReport has no inputs
  //  — read-only is a property of the component, not a flag that could be
  //  forgotten on one tab.
  // ==========================================================================
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { formatDate } from '$lib/calc/formatDate';
  import { formatNum } from '$lib/utils';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import FullReport from '$lib/components/calculator/FullReport.svelte';
  import { computeGrandTotals } from '$lib/calc/grandTotals';
  import { readProcurementData } from '$lib/calc/procurementSeed';
  import type { ProcurementData, ProjectData } from '$lib/types';

  $: projectId = $page.params.id;

  let loading = true;
  let project: any = null;
  let purchase: ProcurementData | null = null;

  async function load() {
    loading = true;
    const { data, error } = await supabase.from('projects_with_designer').select('*').eq('id', projectId).single();
    if (error || !data) {
      toast.notify(t($locale, 'couldNotLoadProject'), 'error');
      goto('/accounting');
      return;
    }
    project = data;
    purchase = readProcurementData((data.project_data || {}) as Partial<ProjectData>);
    loading = false;
  }
  onMount(load);

  $: totals = purchase
    ? computeGrandTotals(
        {
          sheets: purchase.sheetRows,
          profiles: purchase.profileRows,
          mills: purchase.millRows,
          pipes: purchase.pipeRows,
          squares: purchase.squareRows,
          orders: purchase.orderRows,
          operations: purchase.operations,
        },
        { requireManualPrice: true }
      )
    : null;

  $: invoicedTotal = (purchase?.invoiceRows ?? []).reduce((sum, r) => sum + Number(r.invoiceValue || 0), 0);
</script>

<div class="page">
  {#if loading}
    <p class="muted">{t($locale, 'loading')}</p>
  {:else}
    <div class="topbar">
      <a class="btn-back" href="/accounting">{t($locale, 'backToDashboard')}</a>
      <div class="title">
        {project.project_name}
        <StatusBadge status={project.status} userRole="accounting" locale={$locale} />
      </div>
      <div class="spacer"></div>
      <span class="readonly-note">{t($locale, 'readOnlyPreviewTag')}</span>
    </div>

    {#if !purchase}
      <div class="notice warn">{t($locale, 'noPurchaseFileYet')}</div>
    {:else}
      <div class="meta-grid">
        <div><span class="lbl">{t($locale, 'colDesignerName')}</span><span class="val">{project.designer_name || '—'}</span></div>
        <div><span class="lbl">{t($locale, 'colClient')}</span><span class="val">{project.client || '—'}</span></div>
        <div><span class="lbl">{t($locale, 'actualCostLabel')}</span><span class="val price mono">${formatNum(totals?.totalPrice, 2)}</span></div>
        <div>
          <span class="lbl">{t($locale, 'invoicesLoggedLabel')}</span>
          <span class="val mono">{purchase.invoiceRows.length} · ${formatNum(invoicedTotal, 2)}</span>
        </div>
      </div>

      {#if totals && totals.unpricedRows > 0}
        <div class="notice warn">{t($locale, 'unpricedSentWarnTemplate').replace('{n}', String(totals.unpricedRows))}</div>
      {/if}

      {#if purchase.invoiceRows.length > 0}
        <div class="inv-card">
          <h3>{t($locale, 'supplierInvoicesTitle')}</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t($locale, 'colInvoiceNo')}</th>
                  <th>{t($locale, 'colWorkDate')}</th>
                  <th>{t($locale, 'colInvoiceClient')}</th>
                  <th>{t($locale, 'colInvoiceValue')}</th>
                  <th>{t($locale, 'colInvoiceFile')}</th>
                  <th>{t($locale, 'colNotes')}</th>
                </tr>
              </thead>
              <tbody>
                {#each purchase.invoiceRows as inv (inv.id)}
                  <tr>
                    <td class="mono">{inv.invoiceNo || '—'}</td>
                    <td>{inv.date || '—'}</td>
                    <td>{inv.client || '—'}</td>
                    <td class="mono">${formatNum(inv.invoiceValue, 2)}</td>
                    <td>
                      {#if inv.driveLink}
                        <a href={inv.driveLink} target="_blank" rel="noreferrer noopener">{t($locale, 'openLinkLabel')}</a>
                      {:else}
                        —
                      {/if}
                    </td>
                    <td class="notes">{inv.notes || '—'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}

      <div class="report-card" dir="ltr">
        <FullReport
          mode="procurement"
          requireManualPrice={true}
          projectName={project.project_name || '—'}
          engineer="Procurement"
          client={project.client || '—'}
          status={project.status}
          formattedDate={formatDate(project.created_at)}
          sheets={purchase.sheetRows}
          profiles={purchase.profileRows}
          mills={purchase.millRows}
          pipes={purchase.pipeRows}
          squares={purchase.squareRows}
          orders={purchase.orderRows}
          operations={purchase.operations}
        />
      </div>
    {/if}
  {/if}
</div>

<style>
  .page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px 20px 60px;
    font-family: var(--font-body);
    color: var(--ink);
  }
  .muted {
    color: var(--ink-soft);
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--card, #fff);
    padding: 14px 20px;
    border-radius: 10px;
    border: 1px solid var(--border, #e2e8f0);
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
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .readonly-note {
    color: var(--ink-soft);
    font-size: 12.5px;
    font-weight: 600;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }
  .meta-grid > div {
    background: var(--card, #fff);
    border: 1px solid var(--border, #e2e8f0);
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
    font-size: 14.5px;
    font-weight: 700;
  }
  .val.price {
    color: var(--success-deep);
  }
  .notice {
    border-radius: 10px;
    padding: 10px 16px;
    font-size: 12.5px;
    margin-bottom: 16px;
    background: var(--info-bg);
    border: 1px solid var(--info-border);
    color: var(--info-ink);
  }
  .notice.warn {
    background: var(--warn-bg);
    border-color: var(--warn-border);
    color: var(--warn-ink);
  }
  .inv-card {
    background: var(--card, #fff);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 10px;
    padding: 14px 18px;
    margin-bottom: 16px;
  }
  .inv-card h3 {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 800;
  }
  .table-wrap {
    overflow-x: auto;
  }
  .inv-card table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }
  .inv-card th {
    text-align: center;
    padding: 7px 10px;
    background: var(--paper, #f1f5f9);
    color: #64748b;
    font-size: 10.5px;
    text-transform: uppercase;
    border-bottom: 1px solid var(--border, #e2e8f0);
    white-space: nowrap;
  }
  .inv-card td {
    text-align: center;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border, #e2e8f0);
  }
  .inv-card tr:last-child td {
    border-bottom: none;
  }
  /* .mono is global (tokens.css); nothing to add here. */
  .notes {
    max-width: 320px;
  }
  .report-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
  }
</style>
