<script lang="ts">
  import { onMount } from 'svelte';
  import { formatDate } from '$lib/calc/formatDate';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import FullReport from '$lib/components/calculator/FullReport.svelte';
  import { flagsToSets, setsToFlags, countFlags, type FlagSet } from '$lib/calc/reviewFlags';
  import { formatNum } from '$lib/utils';
  import { notifyUser } from '$lib/calc/notify';

  $: projectId = $page.params.id;

  // 'developer' gets exactly the same review/approve/reject access as
  // 'admin' here — per spec, that role can reach and use any page that
  // has tabs/options, not just view it. Every gate below checks this
  // instead of a bare `=== 'admin'`.
  $: canReview = $auth.userRole === 'admin' || $auth.userRole === 'developer';

  let loading = true;
  let project: any = null;
  let flagSets: FlagSet = flagsToSets(undefined);
  let acting = false;

  async function load() {
    loading = true;
    const { data, error } = await supabase.from('projects_with_designer').select('*').eq('id', projectId).single();
    if (error || !data) {
      alert('Could not load this project.');
      goto('/admin/projects');
      return;
    }
    project = data;
    flagSets = flagsToSets(project.project_data?.reviewFlags);
    loading = false;
  }
  onMount(load);

  $: pd = project?.project_data || {};
  $: isPendingReview = project?.status === 'Pending Admin';
  $: flagCount = countFlags(flagSets);

  function toggleFlag(category: keyof FlagSet, id: string) {
    const next = { ...flagSets, [category]: new Map(flagSets[category]) };
    if (next[category].has(id)) next[category].delete(id);
    else next[category].set(id, '');
    flagSets = next;
  }

  function changeReason(category: keyof FlagSet, id: string, reason: string) {
    const next = { ...flagSets, [category]: new Map(flagSets[category]) };
    next[category].set(id, reason);
    flagSets = next;
  }

  async function handleApprove() {
    acting = true;
    const { error } = await supabase
      .from('projects')
      .update({ status: 'In Production', project_data: { ...pd, reviewFlags: undefined } })
      .eq('id', projectId);
    acting = false;
    if (error) alert('❌ ' + error.message);
    else {
      if (project.user_id) notifyUser(project.user_id, `Your project "${project.project_name}" was approved and sent to the factory.`, `/designer/${projectId}`);
      goto('/admin/projects');
    }
  }

  async function handleReject() {
    if (flagCount === 0) {
      alert('⚠️ Please tick at least one row above to mark what needs fixing before rejecting.');
      return;
    }
    acting = true;
    const { error } = await supabase
      .from('projects')
      .update({ status: 'Rejected', project_data: { ...pd, reviewFlags: setsToFlags(flagSets) } })
      .eq('id', projectId);
    acting = false;
    if (error) alert('❌ ' + error.message);
    else {
      if (project.user_id) notifyUser(project.user_id, `Your project "${project.project_name}" was rejected — ${flagCount} row(s) need fixing.`, `/designer/${projectId}`);
      goto('/admin/projects');
    }
  }
</script>

<div class="page" dir="ltr">
  {#if loading}
    <p class="muted">Loading…</p>
  {:else if !canReview}
    <p class="muted">You don't have permission to review projects.</p>
  {:else}
    <div class="topbar">
      <a class="btn-back" href="/admin/projects">← Back to Projects</a>
      <div class="title">
        Reviewing: <span class="hl">{project.project_name}</span>
        <StatusBadge status={project.status} userRole={$auth.userRole ?? undefined} />
      </div>
      <div class="spacer"></div>
      {#if isPendingReview}
        <button class="btn-approve" on:click={handleApprove} disabled={acting}>✅ Approve &amp; Send to Factory</button>
        <button class="btn-reject" on:click={handleReject} disabled={acting} title={flagCount === 0 ? 'Tick at least one row below first' : `${flagCount} row(s) flagged`}>
          ❌ Reject{flagCount > 0 ? ` (${flagCount} flagged)` : ''}
        </button>
      {:else}
        <span class="readonly-note">Read-only — already {project.status}</span>
      {/if}
    </div>

    <div class="meta-grid">
      <div><span class="lbl">Designer</span><span class="val">{project.designer_name || '—'}</span></div>
      <div><span class="lbl">Client</span><span class="val">{project.client || '—'}</span></div>
      <div><span class="lbl">Estimated Cost</span><span class="val price">${formatNum(project.total_cost, 2)}</span></div>
      <div><span class="lbl">Submitted</span><span class="val">{formatDate(project.created_at)}</span></div>
    </div>

    {#if isPendingReview}
      <div class="hint">Tick the box on the right of any row, in any table below, then write why — the Designer will see exactly that row and reason when they reopen it.</div>
    {/if}

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
        {flagSets}
        onToggle={isPendingReview ? toggleFlag : undefined}
        onReasonChange={isPendingReview ? changeReason : undefined}
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
  .btn-approve {
    background: #10b981;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 13px;
  }
  .btn-reject {
    background: #ef4444;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 13px;
  }
  .btn-approve:disabled,
  .btn-reject:disabled {
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
  .hint {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 10px 16px;
    color: #1e40af;
    font-size: 13px;
    margin-bottom: 16px;
  }
  .report-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }
</style>
