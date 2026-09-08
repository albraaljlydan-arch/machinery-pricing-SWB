<script lang="ts">
  import './shared-tab.css';
  import type { SheetRow, ProfileRow, MillRow, PipeRow, SquareRow, OrderRow, OperationRow } from '$lib/types';
  import { exportReportToPdf } from '$lib/calc/exportPdf';
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
      alert('❌ PDF export failed: ' + (e instanceof Error ? e.message : String(e)));
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
      <FullReport
        {mode}
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
    color: #94a3b8;
    font-weight: 500;
    margin-inline-start: 10px;
  }
  .preview-note {
    background: #eff6ff;
    border-bottom: 1px solid #dbeafe;
    color: #1e40af;
    font-size: 12.5px;
    font-weight: 600;
    padding: 8px 16px;
    text-align: center;
  }
  .report-frame {
    max-height: 640px;
    overflow-y: auto;
    background: #f1f5f9;
    padding: 16px;
    border-bottom: 1px solid #e2e8f0;
  }
  .report-frame > div {
    max-width: 860px;
    margin: 0 auto;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
  }
</style>
