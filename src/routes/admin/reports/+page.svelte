<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { formatDate } from '$lib/calc/formatDate';
  import { locale } from '$lib/stores/locale';
  import { t, statusLabel } from '$lib/i18n/dict';
  import { formatCount as fmt } from '$lib/utils';
  import StatusBadge from '$lib/components/StatusBadge.svelte';

  interface ProjectRow {
    id: string;
    project_name: string;
    client: string | null;
    total_cost: number;
    status: string;
    created_at: string;
    designer_name?: string;
  }

  const STATUSES = ['Draft', 'Pending Admin', 'In Production', 'Complete Production', 'Completed', 'Rejected'];

  let projects: ProjectRow[] = [];
  let loading = true;

  onMount(async () => {
    const { data, error } = await supabase.from('projects_with_designer').select('*').order('created_at', { ascending: false });
    if (!error) projects = data || [];
    loading = false;
  });

  $: totalValue = projects.reduce((sum, p) => sum + Number(p.total_cost || 0), 0);
  $: statusCounts = STATUSES.map((s) => ({ status: s, count: projects.filter((p) => p.status === s).length }));


  function exportCsv() {
    const header = ['Project', 'Client', 'Designer', 'Cost ($)', 'Status', 'Created'];
    const rows = projects.map((p) => [p.project_name, p.client || '', p.designer_name || '', String(p.total_cost || 0), p.status, formatDate(p.created_at)]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swb-projects-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const marginX = 14;
    let y = 18;

    pdf.setFontSize(16);
    pdf.text('SWB Manufacturing System — Projects Report', marginX, y);
    y += 8;
    pdf.setFontSize(10);
    pdf.text(`Generated ${new Date().toLocaleDateString('en-GB')}  ·  ${projects.length} projects  ·  $${fmt(totalValue)} total value`, marginX, y);
    y += 10;

    const colX = [marginX, marginX + 55, marginX + 95, marginX + 130, marginX + 155];
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Project', colX[0], y);
    pdf.text('Client', colX[1], y);
    pdf.text('Cost ($)', colX[2], y);
    pdf.text('Status', colX[3], y);
    pdf.text('Created', colX[4], y);
    y += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.line(marginX, y - 3.5, 196, y - 3.5);

    for (const p of projects) {
      if (y > 280) {
        pdf.addPage();
        y = 18;
      }
      pdf.text(String(p.project_name).slice(0, 28), colX[0], y);
      pdf.text(String(p.client || '—').slice(0, 20), colX[1], y);
      pdf.text(`$${fmt(p.total_cost)}`, colX[2], y);
      pdf.text(String(p.status), colX[3], y);
      pdf.text(formatDate(p.created_at), colX[4], y);
      y += 6;
    }

    pdf.save(`swb-projects-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  }
</script>

<section>
  <div class="panel">
    <div class="panel-head">
      <div class="actions">
        <button class="btn-export" on:click={exportPdf}>{t($locale, 'exportPdfBtn')}</button>
        <button class="btn-export" on:click={exportCsv}>{t($locale, 'exportCsvBtn')}</button>
      </div>
    </div>
    <p class="desc">{t($locale, 'reportsPageDesc')}</p>

    {#if !loading}
      <div class="kpi-row">
        <div class="kpi">
          <div class="num mono">{projects.length}</div>
          <div class="lbl">{t($locale, 'kpiAllProjectsLabel')}</div>
        </div>
        <div class="kpi">
          <div class="num mono">${fmt(totalValue)}</div>
          <div class="lbl">{t($locale, 'totalValueLabel')}</div>
        </div>
      </div>

      <div class="status-breakdown">
        <div class="sb-title">{t($locale, 'statusBreakdownTitle')}</div>
        <div class="sb-chips">
          {#each statusCounts as sc}
            {#if sc.count > 0}
              <div class="sb-chip"><StatusBadge status={sc.status} userRole="admin" locale={$locale} /><span class="sb-count mono">{sc.count}</span></div>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <div class="panel">
    {#if loading}
      <div class="empty">{t($locale, 'loading')}</div>
    {:else}
      <table>
        <thead>
          <tr><th>{t($locale, 'colProject')}</th><th>{t($locale, 'colClient')}</th><th>{t($locale, 'colDesignerName')}</th><th class="col-center">{t($locale, 'colCost')}</th><th class="col-center">{t($locale, 'colStatus')}</th><th class="col-center">{t($locale, 'colCreated')}</th></tr>
        </thead>
        <tbody>
          {#each projects as p}
            <tr>
              <td class="name">{p.project_name}</td>
              <td>{p.client || '—'}</td>
              <td>{p.designer_name || '—'}</td>
              <td class="mono">${fmt(p.total_cost)}</td>
              <td class="col-center"><StatusBadge status={p.status} userRole="admin" locale={$locale} /></td>
              <td class="muted mono">{formatDate(p.created_at)}</td>
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
    padding: 18px 20px;
    margin-bottom: 18px;
    overflow-x: auto;
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 10px;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .btn-export {
    background: var(--navy);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 7px 14px;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
  }
  .desc {
    margin: 8px 0 16px;
    font-size: 12.5px;
    color: var(--ink-soft);
  }
  .kpi-row {
    display: flex;
    gap: 16px;
    margin-bottom: 18px;
  }
  .kpi {
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 20px;
  }
  .kpi .num {
    font-size: 22px;
    font-weight: 700;
  }
  .kpi .lbl {
    font-size: 11.5px;
    color: var(--ink-soft);
    margin-top: 2px;
  }
  .status-breakdown .sb-title {
    font-size: 10.5px;
    color: var(--steel-2);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-bottom: 8px;
  }
  .sb-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .sb-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 5px 12px 5px 8px;
  }
  .sb-count {
    font-size: 12px;
    font-weight: 700;
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
  .mono {
    font-weight: 700;
  }
  .muted {
    color: var(--ink-soft);
    font-size: 12px;
  }
</style>
