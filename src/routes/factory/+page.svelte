<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { formatDate } from '$lib/calc/formatDate';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';
  import { notifyRole } from '$lib/calc/notify';
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
  let updatingId: string | null = null;

  async function loadProjects() {
    loading = true;
    const { data, error } = await supabase.from('projects_with_designer').select('*').eq('status', 'In Production').order('created_at', { ascending: false });
    if (!error) projects = data || [];
    loading = false;
  }

  onMount(loadProjects);

  // Routed through the same 3-second Undo toast every other confirmation in
  // this app uses (Delete, Submit to Admin) instead of a native confirm() —
  // see the project's toast store. Marking a project Finished sends it on
  // to Procurement, which is exactly the "Complete Production" step in the
  // workflow (In Production → Complete Production → Completed).
  function markFinished(proj: ProjectRow) {
    toast.confirmWithUndo(t($locale, 'markFinishedTemplate').replace('{name}', proj.project_name), 3, async () => {
      updatingId = proj.id;
      const { error } = await supabase.from('projects').update({ status: 'Complete Production' }).eq('id', proj.id);
      updatingId = null;
      if (error) {
        toast.notify(t($locale, 'markFinishedErrorPrefix') + error.message, 'error');
      } else {
        projects = projects.filter((p) => p.id !== proj.id);
        toast.notify(t($locale, 'markFinishedSuccess'), 'success');
        notifyRole('procurement', `"${proj.project_name}" has finished manufacturing and is ready for pricing.`, `/procurement/${proj.id}`);
      }
    });
  }

  function fmt(n: number) {
    return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
</script>

<section>
  <div class="sec-head">
    <span class="eyebrow">{t($locale, 'overview')}</span>
  </div>

  <div class="panel">
    <div class="panel-head">
      <h3>{t($locale, 'inProduction')}</h3>
      <span class="count-tag mono">{loading ? '—' : projects.length} {t($locale, 'projectsCountSuffix')}</span>
    </div>
    <p class="desc">{t($locale, 'factoryQueueDesc')}</p>

    {#if loading}
      <div class="empty">{t($locale, 'loading')}</div>
    {:else if projects.length === 0}
      <div class="empty">{t($locale, 'factoryEmpty')}</div>
    {:else}
      <table>
        <thead>
          <tr><th>{t($locale, 'colProject')}</th><th>{t($locale, 'colDesignerName')}</th><th>{t($locale, 'colClient')}</th><th>{t($locale, 'colEstCost')}</th><th>{t($locale, 'colStatus')}</th><th>{t($locale, 'colSubmitted')}</th><th></th></tr>
        </thead>
        <tbody>
          {#each projects as proj}
            <tr class="clickable-row" on:click={() => goto(`/factory/projects/${proj.id}`)}>
              <td class="name">{proj.project_name}</td>
              <td>{proj.designer_name || '—'}</td>
              <td>{proj.client || '—'}</td>
              <td class="mono">${fmt(proj.total_cost)}</td>
              <td><StatusBadge status={proj.status} userRole="factory" locale={$locale} /></td>
              <td class="muted">{formatDate(proj.created_at)}</td>
              <td>
                <button class="btn-finish" on:click|stopPropagation={() => markFinished(proj)} disabled={updatingId === proj.id}>
                  {t($locale, 'markFinishedAction')}
                </button>
              </td>
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
    font-family: var(--font-mono);
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
    font-family: var(--font-mono);
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
    text-align: right;
    font-size: 10.5px;
    color: var(--steel-2);
    font-family: var(--font-mono);
    letter-spacing: 0.4px;
    text-transform: uppercase;
    padding: 10px 18px;
    background: var(--paper);
    border-bottom: 1px solid var(--border);
    font-weight: 600;
  }
  td {
    text-align: start;
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
    background: var(--paper);
  }
  .name {
    font-weight: 700;
  }
  .mono {
    font-family: var(--font-mono);
    font-weight: 700;
  }
  .muted {
    color: var(--ink-soft);
    font-size: 12px;
  }
  .btn-finish {
    background: var(--success, #3f9463);
    color: #fff;
    border: none;
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }
  .btn-finish:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
