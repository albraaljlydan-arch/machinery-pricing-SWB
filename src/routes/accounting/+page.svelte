<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { formatDate } from '$lib/calc/formatDate';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
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

  let projects: ProjectRow[] = [];
  let loading = true;

  $: totalValue = projects.reduce((sum, p) => sum + Number(p.total_cost || 0), 0);

  onMount(async () => {
    const { data, error } = await supabase.from('projects_with_designer').select('*').eq('status', 'Completed').order('created_at', { ascending: false });
    if (!error) projects = data || [];
    loading = false;
  });

</script>

<section>
  <div class="sec-head">
    <span class="eyebrow">{t($locale, 'overview')}</span>
    {#if !loading && projects.length > 0}
      <span class="total-pill">{t($locale, 'totalValueLabel')}: <span class="mono">${fmt(totalValue)}</span></span>
    {/if}
  </div>

  <div class="panel">
    <div class="panel-head">
      <h3>{t($locale, 'statusCompleted')}</h3>
      <span class="count-tag"><span class="mono">{loading ? '—' : projects.length}</span> {t($locale, 'projectsCountSuffix')}</span>
    </div>
    <p class="desc">{t($locale, 'accountingDesc')}</p>

    {#if loading}
      <div class="empty">{t($locale, 'loading')}</div>
    {:else if projects.length === 0}
      <div class="empty">{t($locale, 'accountingEmpty')}</div>
    {:else}
      <table>
        <thead>
          <tr><th>{t($locale, 'colProject')}</th><th>{t($locale, 'colDesignerName')}</th><th>{t($locale, 'colClient')}</th><th class="col-center">{t($locale, 'colFinalCost')}</th><th class="col-center">{t($locale, 'colStatus')}</th><th class="col-center">{t($locale, 'colCompletedDate')}</th></tr>
        </thead>
        <tbody>
          {#each projects as proj}
            <!-- /accounting/[id], not /admin/projects/[id]: that one renders
                 the DESIGNER's rows (the estimate). Accounting needs
                 Procurement's file, at the prices actually paid. -->
            <tr class="clickable-row" on:click={() => goto(`/accounting/${proj.id}`)}>
              <td class="name">{proj.project_name}</td>
              <td>{proj.designer_name || '—'}</td>
              <td>{proj.client || '—'}</td>
              <td class="mono">${fmt(proj.total_cost)}</td>
              <td class="col-center"><StatusBadge status={proj.status} userRole="accounting" locale={$locale} /></td>
              <td class="muted mono">{formatDate(proj.created_at)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</section>

<style>
  .sec-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  .eyebrow {
    font-weight: 700;
    font-size: 11px;
    color: var(--steel-2);
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .total-pill {
    font-size: 12px;
    font-weight: 700;
    background: var(--success-bg);
    color: var(--success-deep);
    padding: 4px 12px;
    border-radius: 20px;
    border: 1px solid color-mix(in srgb, var(--success-deep) 35%, transparent);
  }
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
    justify-content: space-between;
    padding: 16px 18px 4px;
  }
  .panel-head h3 {
    margin: 0;
    font-size: 14.5px;
    font-weight: 900;
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
    font-size: 10.5px;
    color: var(--steel-2);
    letter-spacing: 0.4px;
    text-transform: uppercase;
    padding: 10px 18px;
    background: var(--paper);
    border-bottom: 1px solid var(--border);
    font-weight: 600;
  }
  td {
    text-align: center;
    padding: 13px 18px;
    border-bottom: 1px solid var(--border);
  }
  tr:last-child td {
    border-bottom: none;
  }
  .clickable-row {
    cursor: pointer;
  }
  .clickable-row:hover td {
    background: var(--card-hover);
  }
  .name {
    font-weight: 700;
  }
  /* .mono itself is global (tokens.css) — only the extra weight is local. */
  .mono {
    font-weight: 700;
  }
  .muted {
    color: var(--ink-soft);
    font-size: 12px;
  }
</style>
