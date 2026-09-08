<script lang="ts">
  import { onMount } from 'svelte';
  import { formatDate } from '$lib/calc/formatDate';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import { toast } from '$lib/stores/toast';
  import { notifyRole } from '$lib/calc/notify';
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
      alert('Could not load this project.');
      goto('/factory');
      return;
    }
    project = data;
    loading = false;
  }
  onMount(load);

  $: pd = project?.project_data || {};
  $: isInProduction = project?.status === 'In Production';

  function markFinished() {
    toast.confirmWithUndo(`Mark "${project.project_name}" as finished?`, 3, async () => {
      updating = true;
      const { error } = await supabase.from('projects').update({ status: 'Complete Production' }).eq('id', projectId);
      updating = false;
      if (error) {
        toast.notify('Could not update: ' + error.message, 'error');
      } else {
        toast.notify('Marked as finished.', 'success');
        notifyRole('procurement', `"${project.project_name}" has finished manufacturing and is ready for pricing.`, `/procurement/${projectId}`);
        goto('/factory');
      }
    });
  }
</script>

<div class="page" dir="ltr">
  {#if loading}
    <p class="muted">Loading…</p>
  {:else if !canView}
    <p class="muted">You don't have permission to view this project.</p>
  {:else}
    <div class="topbar">
      <a class="btn-back" href="/factory">← Back to Projects</a>
      <div class="title">
        Viewing: <span class="hl">{project.project_name}</span>
        <StatusBadge status={project.status} userRole={$auth.userRole ?? undefined} />
      </div>
      <div class="spacer"></div>
      {#if isInProduction}
        <button class="btn-finish" on:click={markFinished} disabled={updating}>✅ Mark as Finished</button>
      {:else}
        <span class="readonly-note">Read-only — {project.status}</span>
      {/if}
    </div>

    <div class="meta-grid">
      <div><span class="lbl">Designer</span><span class="val">{project.designer_name || '—'}</span></div>
      <div><span class="lbl">Client</span><span class="val">{project.client || '—'}</span></div>
      <div><span class="lbl">Estimated Cost</span><span class="val price">${formatNum(project.total_cost, 2)}</span></div>
      <div><span class="lbl">Submitted</span><span class="val">{formatDate(project.created_at)}</span></div>
    </div>

    <div class="report-card">
      <FullReport
        mode="procurement"
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
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f8fafc;
    min-height: 100vh;
  }
  .muted {
    color: #64748b;
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 14px;
    background: #fff;
    padding: 16px 24px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    margin-bottom: 16px;
  }
  .spacer {
    flex: 1;
  }
  .btn-back {
    background: #64748b;
    color: #fff;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 13px;
  }
  .title {
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .hl {
    color: #2563eb;
  }
  .btn-finish {
    background: #10b981;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 13px;
  }
  .btn-finish:disabled {
    opacity: 0.6;
  }
  .readonly-note {
    color: #64748b;
    font-size: 13px;
    font-style: italic;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }
  .meta-grid > div {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
  }
  .lbl {
    font-size: 10.5px;
    color: #94a3b8;
    text-transform: uppercase;
    font-weight: 700;
  }
  .val {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
  }
  .val.price {
    color: #059669;
  }
  .report-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }
</style>
