<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { formatDate } from '$lib/calc/formatDate';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t, statusLabel } from '$lib/i18n/dict';
  import { formatCount as fmt } from '$lib/utils';
  import StatusBadge from '$lib/components/StatusBadge.svelte';

  let projects: any[] = [];
  let loading = true;

  $: statusFilter = $page.url.searchParams.get('status');

  onMount(async () => {
    const { data, error } = await supabase.from('projects_with_designer').select('*').order('created_at', { ascending: false });
    if (!error) projects = data || [];
    loading = false;
  });

  $: filtered = statusFilter ? projects.filter((p) => p.status === statusFilter) : projects;

</script>

<section>
  {#if statusFilter}
    <div class="sec-head">
      <a href="/admin/projects" class="clear-filter">{t($locale, 'clearFilter')}</a>
    </div>
  {/if}

  <div class="panel">
    {#if loading}
      <div class="empty">{t($locale, 'loading')}</div>
    {:else if filtered.length === 0}
      <div class="empty">{statusFilter ? t($locale, 'noProjectsWithStatusTemplate').replace('{status}', statusLabel($locale, statusFilter)) : t($locale, 'noProjectsPlain')}</div>
    {:else}
      <table>
        <thead><tr><th>{t($locale, 'colProject')}</th><th>{t($locale, 'colDesignerName')}</th><th>{t($locale, 'colClient')}</th><th>{t($locale, 'colCost')}</th><th>{t($locale, 'colStatus')}</th><th>{t($locale, 'colSubmitted')}</th></tr></thead>
        <tbody>
          {#each filtered as proj}
            <tr class="clickable-row" on:click={() => goto(`/admin/projects/${proj.id}`)}>
              <td class="name">{proj.project_name}</td>
              <td>{proj.designer_name || '—'}</td>
              <td>{proj.client || '—'}</td>
              <td class="mono">${fmt(proj.total_cost)}</td>
              <td><StatusBadge status={proj.status} userRole="admin" locale={$locale} /></td>
              <td class="muted">{formatDate(proj.created_at)}</td>
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
    justify-content: flex-start;
    margin-bottom: 14px;
  }
  .clear-filter {
    font-size: 12.5px;
    color: var(--navy-3);
    font-weight: 700;
  }
  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow-x: auto;
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
    padding: 10px 16px;
    background: var(--paper);
    border-bottom: 1px solid var(--border);
    font-weight: 600;
  }
  td {
    text-align: center;
    padding: 12px 16px;
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
  .clickable-row {
    cursor: pointer;
  }
  .clickable-row:hover td {
    background: var(--card-hover);
  }
</style>
