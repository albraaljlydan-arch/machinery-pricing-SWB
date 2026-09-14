<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
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

  onMount(async () => {
    const { data, error } = await supabase.from('projects_with_designer').select('*').eq('status', 'Complete Production').order('created_at', { ascending: false });
    if (!error) projects = data || [];
    loading = false;
  });

</script>

<section>
  <div class="panel">
    <div class="panel-head">
      <span class="count-tag"><span class="mono">{loading ? '—' : projects.length}</span> {t($locale, 'projectsCountSuffix')}</span>
    </div>
    <p class="desc">{t($locale, 'procurementDesc')}</p>

    {#if loading}
      <div class="empty">{t($locale, 'loading')}</div>
    {:else if projects.length === 0}
      <div class="empty">{t($locale, 'procurementEmpty')}</div>
    {:else}
      <table>
        <thead><tr><th>{t($locale, 'colProject')}</th><th>{t($locale, 'colDesignerName')}</th><th class="col-center">{t($locale, 'colEstCost')}</th><th class="col-center">{t($locale, 'colStatus')}</th></tr></thead>
        <tbody>
          {#each projects as proj}
            <tr class="clickable-row" on:click={() => goto(`/procurement/${proj.id}`)}>
              <td class="name">{proj.project_name}</td>
              <td>{proj.designer_name || '—'}</td>
              <td class="mono">${fmt(proj.total_cost)}</td>
              <td class="col-center"><StatusBadge status={proj.status} userRole="procurement" locale={$locale} /></td>
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
</style>
