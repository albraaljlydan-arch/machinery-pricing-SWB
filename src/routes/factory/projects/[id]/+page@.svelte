<script lang="ts">
  // ==========================================================================
  //  FACTORY — ONE PROJECT
  //
  //  "Mark as Finished" lives HERE, on the project itself, and no longer on
  //  the dashboard list. Finishing a build is the factory's equivalent of the
  //  designer's "Submit to Admin": it hands the project to the next role, so
  //  it belongs where you can actually see what you are handing over, not as
  //  a button you can hit from a list row by accident.
  // ==========================================================================
  import { onMount } from 'svelte';
  import { formatDate } from '$lib/calc/formatDate';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import { locale } from '$lib/stores/locale';
  import { t, statusLabel } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';
  import { notifyRole } from '$lib/calc/notify';
  import { logProjectEvent } from '$lib/calc/projectEvents';
  import { encodeNotification } from '$lib/i18n/notifications';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import FullReport from '$lib/components/calculator/FullReport.svelte';
  import { formatNum } from '$lib/utils';

  $: projectId = $page.params.id;

  // 'developer' reaches every page's full functionality, same as everywhere
  // else in the app — not just 'factory'.
  $: canView = $auth.userRole === 'factory' || $auth.userRole === 'developer';

  let loading = true;
  let project: any = null;
  let updating = false;

  async function load() {
    loading = true;
    const { data, error } = await supabase.from('projects_with_designer').select('*').eq('id', projectId).single();
    if (error || !data) {
      toast.notify(t($locale, 'couldNotLoadProject'), 'error');
      goto('/factory');
      return;
    }
    project = data;
    loading = false;
  }
  onMount(load);

  $: pd = project?.project_data || {};
  $: isAwaitingProduction = project?.status === 'Awaiting Production';
  $: isInProduction = project?.status === 'In Production';

  function startProduction() {
    toast.confirmWithUndo(t($locale, 'startProductionConfirmTemplate').replace('{name}', project.project_name), 3, async () => {
      updating = true;
      // Status change and creation of the 100% follow-up balances happen atomically.
      const { error } = await supabase.rpc('start_production_with_followup_tasks', { p_project_id: projectId });
      updating = false;
      if (error) {
        toast.notify(t($locale, 'couldNotUpdatePrefix') + error.message, 'error');
      } else {
        toast.notify(t($locale, 'startedProductionToast'), 'success');
        logProjectEvent(projectId, 'production_started', $auth.session?.user.id);
        load();
      }
    });
  }

  function markFinished() {
    toast.confirmWithUndo(t($locale, 'confirmMarkFinishedTemplate').replace('{name}', project.project_name), 3, async () => {
      updating = true;
      const { error } = await supabase.from('projects').update({ status: 'Complete Production' }).eq('id', projectId);
      updating = false;
      if (error) {
        toast.notify(t($locale, 'couldNotUpdatePrefix') + error.message, 'error');
      } else {
        toast.notify(t($locale, 'markedFinishedToast'), 'success');
        notifyRole('procurement', encodeNotification('manufacturingFinished', { name: project.project_name }), `/procurement/${projectId}`);
        logProjectEvent(projectId, 'production_finished', $auth.session?.user.id);
        goto('/factory');
      }
    });
  }
</script>

<div class="page">
  {#if loading}
    <p class="muted">{t($locale, 'loading')}</p>
  {:else if !canView}
    <p class="muted">{t($locale, 'noPermissionView')}</p>
  {:else}
    <div class="topbar">
      <a class="btn-back" href="/factory">{t($locale, 'backToProjects')}</a>
      <div class="title">
        {t($locale, 'viewingLabel')} <span class="hl">{project.project_name}</span>
        <StatusBadge status={project.status} userRole={$auth.userRole ?? undefined} locale={$locale} />
      </div>
      <div class="spacer"></div>
      {#if isAwaitingProduction}
        <button class="btn-finish" on:click={startProduction} disabled={updating}>{t($locale, 'startProductionAction')}</button>
      {:else if isInProduction}
        <button class="btn-finish" on:click={markFinished} disabled={updating}>{t($locale, 'markAsFinishedAction')}</button>
      {:else}
        <span class="readonly-note">{t($locale, 'readOnlyStatusTemplate').replace('{status}', statusLabel($locale, project.status))}</span>
      {/if}
    </div>

    <div class="meta-grid">
      <div><span class="lbl">{t($locale, 'colDesignerName')}</span><span class="val">{project.designer_name || '—'}</span></div>
      <div><span class="lbl">{t($locale, 'colClient')}</span><span class="val">{project.client || '—'}</span></div>
      <div><span class="lbl">{t($locale, 'estimatedCostLabel')}</span><span class="val price mono">${formatNum(project.total_cost, 2)}</span></div>
      <div><span class="lbl">{t($locale, 'submittedLabel')}</span><span class="val mono">{formatDate(project.created_at)}</span></div>
    </div>

    <!-- dir="ltr" only around the report: its tables are English by design.
         The chrome above follows the dashboard's direction like every other
         screen. -->
    <div class="report-card" dir="ltr">
      <!-- The Designer's file as submitted, margin included — see the same
           note on admin/projects/[id]. -->
      <FullReport
        mode="designer"
        safetyFactor={Number(pd.safetyFactor) || 0}
        projectName={project.project_name}
        engineer={project.designer_name || '—'}
        client={project.client || '—'}
        status={project.status}
        formattedDate={formatDate(project.created_at)}
        sheets={pd.sheetRows || []}
        profiles={pd.profileRows || []}
        mills={pd.millRows || []}
        pipes={pd.pipeRows || []}
        squares={pd.squareRows || []}
        orders={pd.orderRows || []}
        operations={pd.operations || []}
      />
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px;
    font-family: var(--font-body);
    background: var(--paper);
    color: var(--ink);
    min-height: 100vh;
  }
  .muted {
    color: var(--ink-soft);
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--card);
    padding: 16px 24px;
    border-radius: 10px;
    border: 1px solid var(--border);
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
  .hl {
    color: var(--navy-3);
  }
  .btn-finish {
    background: var(--success);
    color: #fff;
    border: none;
    padding: 9px 16px;
    border-radius: 8px;
    font-family: inherit;
    font-weight: 700;
    font-size: 13px;
  }
  .btn-finish:disabled {
    opacity: 0.6;
  }
  .readonly-note {
    color: var(--ink-soft);
    font-size: 13px;
    font-style: italic;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }
  .meta-grid > div {
    background: var(--card);
    border: 1px solid var(--border);
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
    font-size: 14px;
    font-weight: 700;
  }
  .val.price {
    color: var(--success-deep);
  }
  .report-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
  }
</style>
