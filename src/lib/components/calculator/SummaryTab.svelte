<script lang="ts">
  import './shared-tab.css';
  import type { SheetRow, ProfileRow, MillRow, PipeRow, SquareRow, OrderRow, OperationRow } from '$lib/types';
  import { exportReportToPdf, NothingToExportError } from '$lib/calc/exportPdf';
  import { toast } from '$lib/stores/toast';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import FullReport from './FullReport.svelte';

  // This tab IS the preview of exactly what gets exported — the Designer
  // sees, live, everything the Owner will eventually see, because it's
  // literally the same <FullReport> component rendered on-screen instead
  // of hidden off-screen. No separate "condensed" summary that could ever
  // drift out of sync with the real PDF content.
  export let mode: 'designer' | 'procurement' = 'designer';
  export let projectName: string;
  export let designerName = '';
  export let clientName = '';
  export let status = 'Draft';
  export let safetyFactor = 0; // read-only here — set on the Settings page

  export let sheets: SheetRow[] = [];
  export let profiles: ProfileRow[] = [];
  export let mills: MillRow[] = [];
  export let pipes: PipeRow[] = [];
  export let squares: SquareRow[] = [];
  export let orders: OrderRow[] = [];
  export let operations: OperationRow[] = [];

  let isExporting = false;
  let reportEl: HTMLDivElement;

  function todayFormatted() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  async function handleExportPDF() {
    if (!reportEl) return;
    isExporting = true;
    try {
      const safeName = (projectName || 'Report').replace(/[^a-z0-9_-]+/gi, '_');
      await exportReportToPdf(reportEl, `${safeName}.pdf`);
    } catch (e) {
      const msg = e instanceof NothingToExportError ? t($locale, 'noDataToExport') : t($locale, 'pdfExportFailedPrefix') + (e instanceof Error ? e.message : String(e));
      toast.notify(msg, 'error');
    } finally {
      isExporting = false;
    }
  }
</script>

<div class="card">
  <div class="card-header">
    <div class="card-title">
      <span class="tag">{mode === 'procurement' ? '09' : '08'}</span>
      <h2>Project Summary</h2>
      {#if designerName}<span class="by-line">Prepared by <strong>{designerName}</strong></span>{/if}
    </div>
    <button class="btn-add" on:click={handleExportPDF} disabled={isExporting}>
      {isExporting ? '⏳ Exporting…' : '📄 Export PDF'}
    </button>
  </div>

  <div class="preview-note">👁️ This is exactly what goes into the PDF sent onward — everything below is what {designerName || 'you'} would be sending to the <strong>Owner</strong> for review.</div>

  <!-- Same element used for BOTH the live on-screen preview and the PDF
       export source (html2canvas reads straight off this) — one render,
       never two copies that could disagree with each other. The report
       itself already ends with its own "Final Cost Summary" box, so no
       separate totals bar is repeated here. -->
  <div class="report-frame">
    <div bind:this={reportEl}>
      <!-- requireManualPrice tracks `mode` here, which it deliberately does
           NOT do inside FullReport itself: Admin's review screen renders the
           DESIGNER's rows with mode="procurement" just to get the discount
           columns. This tab, by contrast, only ever sits inside
           Procurement's own calculator, so procurement mode really does mean
           "every price has to be typed in". -->
      <FullReport
        {mode}
        requireManualPrice={mode === 'procurement'}
        {projectName}
        engineer={designerName}
        client={clientName}
        {status}
        formattedDate={todayFormatted()}
        {safetyFactor}
        {sheets}
        {profiles}
        {mills}
        {pipes}
        {squares}
        {orders}
        {operations}
      />
    </div>
  </div>
</div>

<style>
  .by-line {
    font-size: 11.5px;
    color: var(--ink-soft);
    font-weight: 500;
    margin-inline-start: 10px;
  }
  .preview-note {
    background: var(--info-bg);
    border-bottom: 1px solid var(--info-border);
    color: var(--info-ink);
    font-size: 12.5px;
    font-weight: 600;
    padding: 8px 16px;
    text-align: center;
  }
  .report-frame {
    max-height: 640px;
    overflow-y: auto;
    background: var(--paper);
    padding: 16px;
    border-bottom: 1px solid var(--border);
  }
  /* The 860px clamp that used to be here is the A4 content width, and it was
     being applied to the ON-SCREEN preview as well as to the export. On a wide
     monitor that threw away most of the available room and squeezed the
     twelve-column material tables until the headers ran into each other.
     The preview is full width now; A4 is imposed only on the copy
     html2canvas rasterises — see PDF_CONTENT_PX in calc/exportPdf.ts — so the
     PDF is unchanged and the screen is readable. */
  .report-frame > div {
    width: 100%;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
  }
</style>
