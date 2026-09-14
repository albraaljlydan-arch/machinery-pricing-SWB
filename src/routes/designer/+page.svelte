<script lang="ts">
  import { onMount } from 'svelte';
  import { formatDate } from '$lib/calc/formatDate';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { makeDefaultSheetRows, makeDefaultProfileRows, makeDefaultMillRows, makeDefaultPipeRows, makeDefaultSquareRows, makeDefaultOrderRows, makeDefaultOperations } from '$lib/calc/defaultRows';
  import { nextUntitledProjectName } from '$lib/calc/untitledName';
  import { toast } from '$lib/stores/toast';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { formatCount as fmt } from '$lib/utils';

  interface ProjectRow {
    id: string;
    project_name: string;
    client: string | null;
    total_cost: number;
    status: string;
    created_at: string;
  }

  let projects: ProjectRow[] = [];
  let loading = true;
  let creating = false;
  let deletingId: string | null = null;

  async function loadProjects() {
    loading = true;
    const userId = $auth.session?.user?.id;
    if (!userId) return;
    const { data, error } = await supabase.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (!error) projects = data || [];
    loading = false;
  }

  onMount(loadProjects);

  async function createProject() {
    creating = true;
    const userId = $auth.session?.user?.id;
    const name = nextUntitledProjectName(projects.map((p) => p.project_name));
    const project_data = {
      projectName: name,
      client: '',
      safetyFactor: 0,
      sheetRows: makeDefaultSheetRows(),
      profileRows: makeDefaultProfileRows(),
      millRows: makeDefaultMillRows(),
      pipeRows: makeDefaultPipeRows(),
      squareRows: makeDefaultSquareRows(),
      orderRows: makeDefaultOrderRows(),
      operations: makeDefaultOperations(),
    };
    const { data, error } = await supabase
      .from('projects')
      .insert([{ project_name: name, client: '', total_cost: 0, status: 'Draft', user_id: userId, project_data }])
      .select()
      .single();
    creating = false;
    if (!error && data) goto(`/designer/${data.id}`);
    else if (error) toast.notify(t($locale, 'createProjectErrorPrefix') + error.message, 'error');
  }

  // Delete is only meaningful for a project the Designer still owns the
  // fate of — once it's out for review/production/etc. it isn't theirs to
  // remove any more. Same status gate the calculator itself already uses
  // for "can I still edit this".
  function canDelete(proj: ProjectRow) {
    return proj.status === 'Draft' || proj.status === 'Rejected';
  }

  // Routed through the shared Undo toast (3 seconds) instead of a native
  // confirm() dialog — the delete only actually happens once the countdown
  // finishes; clicking Undo cancels it outright.
  function deleteProject(proj: ProjectRow) {
    toast.confirmWithUndo(t($locale, 'deletingTemplate').replace('{name}', proj.project_name), 3, async () => {
      deletingId = proj.id;
      const { error } = await supabase.from('projects').delete().eq('id', proj.id);
      deletingId = null;
      if (error) {
        toast.notify(t($locale, 'deleteErrorPrefix') + error.message, 'error');
      } else {
        projects = projects.filter((p) => p.id !== proj.id);
        toast.notify(t($locale, 'deleteSuccess'), 'success');
      }
    });
  }

</script>

<section>
  <div class="sec-head">
    <button class="btn-primary" on:click={createProject} disabled={creating}>{creating ? t($locale, 'creating') : t($locale, 'newProject')}</button>
  </div>

  <div class="panel">
    <div class="panel-head">
      <span class="count-tag"><span class="mono">{loading ? '—' : projects.length}</span> {t($locale, 'projectsCountSuffix')}</span>
    </div>

    {#if loading}
      <div class="empty">{t($locale, 'loading')}</div>
    {:else if projects.length === 0}
      <div class="empty">{t($locale, 'noProjectsYet')}</div>
    {:else}
      <table>
        <thead><tr><th>{t($locale, 'colProject')}</th><th>{t($locale, 'colClient')}</th><th class="col-center">{t($locale, 'colCost')}</th><th class="col-center">{t($locale, 'colStatus')}</th><th class="col-center">{t($locale, 'colCreated')}</th><th class="col-actions"></th></tr></thead>
        <tbody>
          {#each projects as proj}
            {@const isUntitled = proj.project_name.trim().toLowerCase().startsWith('untitled project')}
            <!-- The whole row opens the project, the way every other role's
                 list already worked. The Designer was the odd one out: it
                 alone needed you to hit a small "Open" link, which is now
                 gone. The delete button stops propagation so it still only
                 deletes. -->
            <tr class="clickable-row" on:click={() => goto(`/designer/${proj.id}`)}>
              <td class="name" class:untitled={isUntitled}>
                {proj.project_name}
                {#if isUntitled}<span class="untitled-tag">{t($locale, 'needsNameTag')}</span>{/if}
              </td>
              <td>{proj.client || '—'}</td>
              <td class="price mono">${fmt(proj.total_cost)}</td>
              <td class="col-center"><StatusBadge status={proj.status} userRole="designer" locale={$locale} /></td>
              <td class="muted mono">{formatDate(proj.created_at)}</td>
              <td class="col-actions">
                <div>
                  {#if canDelete(proj)}
                    <button
                      class="btn-del"
                      on:click|stopPropagation={() => deleteProject(proj)}
                      disabled={deletingId === proj.id}
                      title={t($locale, 'deleteProjectTitle')}
                      aria-label={t($locale, 'deleteProjectTitle')}
                    >
                      {#if deletingId === proj.id}
                        …
                      {:else}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M4 7h16" />
                          <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
                          <path d="M6 7l1 13.5A2 2 0 0 0 9 22h6a2 2 0 0 0 2-1.5L18 7" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      {/if}
                    </button>
                  {/if}
                </div>
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
    justify-content: flex-end;
    margin-bottom: 14px;
  }
  .btn-primary {
    background: var(--navy);
    color: #fff;
    border: none;
    padding: 9px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
  }
  .btn-primary:disabled {
    opacity: 0.6;
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
    justify-content: flex-end;
    padding: 16px 18px;
    border-bottom: 1px solid var(--border);
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
    font-weight: 700;
  }
  td {
    text-align: center;
    padding: 13px 18px;
    border-bottom: 1px solid var(--border);
  }
  tr:last-child td {
    border-bottom: none;
  }
  .name {
    font-weight: 700;
  }
  .name.untitled {
    color: var(--steel-2);
    font-weight: 500;
    font-style: italic;
  }
  .untitled-tag {
    display: inline-block;
    margin-inline-start: 8px;
    background: var(--paper);
    color: var(--steel-2);
    font-size: 10.5px;
    font-weight: 700;
    font-style: normal;
    padding: 2px 8px;
    border-radius: 20px;
    vertical-align: middle;
  }
  .price {
    font-family: var(--font-num);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }
  .muted {
    color: var(--ink-soft);
    font-size: 12.5px;
  }
  .clickable-row {
    cursor: pointer;
  }
  .clickable-row:hover td {
    background: var(--card-hover);
  }
  .btn-del {
    background: var(--danger-bg, #fbe2dc);
    border: 1px solid var(--danger, #d9503a);
    color: var(--danger-deep, #b91c1c);
    border-radius: 6px;
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    margin-inline-start: 18px;
  }
  .btn-del svg {
    width: 16px;
    height: 16px;
  }
  .btn-del:hover:not(:disabled) {
    background: var(--danger, #d9503a);
    border-color: var(--danger, #d9503a);
    color: #fff;
  }
  .btn-del:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
