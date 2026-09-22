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

  let awaitingProjects: ProjectRow[] = [];
  let inProductionProjects: ProjectRow[] = [];
  let progressByProject: Record<string, number> = {};
  let loading = true;

  async function loadProjects() {
    loading = true;
    const { data, error } = await supabase
      .from('projects_with_designer')
      .select('*')
      .in('status', ['Awaiting Production', 'In Production'])
      .order('created_at', { ascending: false });
    if (!error && data) {
      awaitingProjects = data.filter((p) => p.status === 'Awaiting Production');
      inProductionProjects = data.filter((p) => p.status === 'In Production');

      if (inProductionProjects.length > 0) {
        const { data: ops } = await supabase
          .from('factory_operations')
          .select('project_id, completion_percent')
          .eq('approval_status', 'approved')
          .in('project_id', inProductionProjects.map((p) => p.id));
        const sums: Record<string, number> = {};
        for (const row of ops ?? []) sums[row.project_id] = (sums[row.project_id] ?? 0) + Number(row.completion_percent || 0);
        progressByProject = Object.fromEntries(Object.entries(sums).map(([id, v]) => [id, Math.min(100, Math.round(v))]));
      }
    }
    loading = false;
  }

  onMount(loadProjects);

  // "Mark Finished" (and now "Start Production") live on the project itself
  // (factory/projects/[id]), not as a row action here — the factory's
  // counterpart to the designer's "Submit to Admin", done where you can see
  // what you're handing over/taking on, not a stray click on a list row.
</script>

<section>
  <div class="sec-head">
    <span class="eyebrow">{t($locale, 'overview')}</span>
  </div>

  <div class="panel">
    <div class="panel-head">
      <h3>{t($locale, 'awaitingProductionQueueTitle')}</h3>
      <span class="count-tag"><span class="mono">{loading ? '—' : awaitingProjects.length}</span> {t($locale, 'projectsCountSuffix')}</span>
    </div>

    {#if loading}
      <div class="empty">{t($locale, 'loading')}</div>
    {:else if awaitingProjects.length === 0}
      <div class="empty">{t($locale, 'awaitingProductionEmpty')}</div>
    {:else}
      <table>
        <thead>
          <tr><th>{t($locale, 'colProject')}</th><th>{t($locale, 'colDesignerName')}</th><th>{t($locale, 'colClient')}</th><th class="col-center">{t($locale, 'colEstCost')}</th><th class="col-center">{t($locale, 'colStatus')}</th><th class="col-center">{t($locale, 'colSubmitted')}</th></tr>
        </thead>
        <tbody>
          {#each awaitingProjects as proj}
            <tr class="clickable-row" on:click={() => goto(`/factory/projects/${proj.id}`)}>
              <td class="name">{proj.project_name}</td>
              <td>{proj.designer_name || '—'}</td>
              <td>{proj.client || '—'}</td>
              <td class="mono">${fmt(proj.total_cost)}</td>
              <td class="col-center"><StatusBadge status={proj.status} userRole="factory" locale={$locale} /></td>
              <td class="muted mono">{formatDate(proj.created_at)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  <div class="panel">
    <div class="panel-head">
      <h3>{t($locale, 'inProduction')}</h3>
      <span class="count-tag"><span class="mono">{loading ? '—' : inProductionProjects.length}</span> {t($locale, 'projectsCountSuffix')}</span>
    </div>
    <p class="desc">{t($locale, 'factoryQueueDesc')}</p>

    {#if loading}
      <div class="empty">{t($locale, 'loading')}</div>
    {:else if inProductionProjects.length === 0}
      <div class="empty">{t($locale, 'factoryEmpty')}</div>
    {:else}
      <table>
        <thead>
          <tr><th>{t($locale, 'colProject')}</th><th>{t($locale, 'colDesignerName')}</th><th>{t($locale, 'colClient')}</th><th>{t($locale, 'colEstCost')}</th><th>{t($locale, 'progressLabel')}</th><th class="col-center">{t($locale, 'colStatus')}</th><th class="col-center">{t($locale, 'colSubmitted')}</th></tr>
        </thead>
        <tbody>
          {#each inProductionProjects as proj}
            <tr class="clickable-row" on:click={() => goto(`/factory/projects/${proj.id}`)}>
              <td class="name">{proj.project_name}</td>
              <td>{proj.designer_name || '—'}</td>
              <td>{proj.client || '—'}</td>
              <td class="mono">${fmt(proj.total_cost)}</td>
              <td>
                <div class="prog-cell">
                  <div class="prog-track"><div class="prog-fill" style="width:{progressByProject[proj.id] ?? 0}%"></div></div>
                  <span class="mono prog-value">{progressByProject[proj.id] ?? 0}%</span>
                </div>
              </td>
              <td class="col-center"><StatusBadge status={proj.status} userRole="factory" locale={$locale} /></td>
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
    margin-bottom: 4px;
  }
  .eyebrow {
    font-weight: 700;
    font-size: 11px;
    color: var(--steel-2);
    letter-spacing: 1px;
    text-transform: uppercase;
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
  .mono {
    font-weight: 700;
  }
  .muted {
    color: var(--ink-soft);
    font-size: 12px;
  }
  .prog-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
  }
  .prog-track {
    width: 84px;
    height: 6px;
    border-radius: 4px;
    background: var(--border);
    overflow: hidden;
  }
  .prog-fill {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--navy-3), var(--cyan));
  }
  .prog-value {
    font-size: 11.5px;
    min-width: 30px;
  }
</style>
