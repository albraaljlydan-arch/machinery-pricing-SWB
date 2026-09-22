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
  import { logProjectEvent } from '$lib/calc/projectEvents';
  import { encodeNotification } from '$lib/i18n/notifications';
  import { toast } from '$lib/stores/toast';
  import { locale } from '$lib/stores/locale';
  import { t, statusLabel } from '$lib/i18n/dict';

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
      toast.notify(t($locale, 'couldNotLoadProject'), 'error');
      goto('/admin/projects');
      return;
    }
    // projects_with_designer is a curated view with a fixed column list, so
    // it doesn't carry render_image_url — fetched separately rather than
    // touching that view's definition (which isn't tracked in this repo).
    const { data: renderRow } = await supabase.from('projects').select('render_image_url').eq('id', projectId).single();
    project = { ...data, render_image_url: renderRow?.render_image_url ?? null };
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
    // Approval hands the project to Factory's incoming queue — Factory still
    // has to explicitly start production (factory/projects/[id]) rather than
    // it becoming "In Production" the instant Admin approves.
    const { error } = await supabase
      .from('projects')
      .update({ status: 'Awaiting Production', project_data: { ...pd, reviewFlags: undefined } })
      .eq('id', projectId);
    acting = false;
    if (error) toast.notify(t($locale, 'entryActionErrorPrefix') + error.message, 'error');
    else {
      if (project.user_id) notifyUser(project.user_id, encodeNotification('projectApproved', { name: project.project_name }), `/designer/${projectId}`);
      logProjectEvent(projectId, 'approved', $auth.session?.user.id);
      goto('/admin/projects');
    }
  }

  async function handleReject() {
    if (flagCount === 0) {
      toast.notify(t($locale, 'tickAtLeastOneRow'), 'error');
      return;
    }
    acting = true;
    const { error } = await supabase
      .from('projects')
      .update({ status: 'Rejected', project_data: { ...pd, reviewFlags: setsToFlags(flagSets) } })
      .eq('id', projectId);
    acting = false;
    if (error) toast.notify(t($locale, 'entryActionErrorPrefix') + error.message, 'error');
    else {
      if (project.user_id) notifyUser(project.user_id, encodeNotification('projectRejected', { name: project.project_name, count: flagCount }), `/designer/${projectId}`);
      // The flagged-row count is the one durable summary of WHY it bounced —
      // the flags themselves get cleared the next time it's approved.
      logProjectEvent(projectId, 'rejected', $auth.session?.user.id, String(flagCount));
      goto('/admin/projects');
    }
  }
</script>

<div class="page">
  {#if loading}
    <p class="muted">{t($locale, 'loading')}</p>
  {:else if !canReview}
    <p class="muted">{t($locale, 'noPermissionView')}</p>
  {:else}
    <div class="topbar">
      <a class="btn-back" href="/admin/projects">{t($locale, 'backToProjects')}</a>
      <div class="title">
        {t($locale, 'reviewingLabel')} <span class="hl">{project.project_name}</span>
        <StatusBadge status={project.status} userRole={$auth.userRole ?? undefined} locale={$locale} />
      </div>
      <div class="spacer"></div>
      {#if isPendingReview}
        <button class="btn-approve" on:click={handleApprove} disabled={acting}>{t($locale, 'approveAndSendFactory')}</button>
        <button class="btn-reject" on:click={handleReject} disabled={acting}>
          {flagCount > 0 ? t($locale, 'rejectWithCountTemplate').replace('{n}', String(flagCount)) : t($locale, 'rejectAction')}
        </button>
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

    {#if isPendingReview}
      <div class="hint">{t($locale, 'flagRowsHint')}</div>
    {/if}

    {#if project.render_image_url}
      <div class="render-image-card">
        <div class="render-image-label">{t($locale, 'renderImageLabel')}</div>
        <img src={project.render_image_url} alt={t($locale, 'renderImageLabel')} />
      </div>
    {/if}

    <div class="report-card" dir="ltr">
      <!-- mode="designer" with the SUBMITTED safety factor. This was
           mode="procurement", which was wrong twice over: it added Discount
           columns the Designer never fills in, and — because the discount
           layout replaces the margin block — it hid the Safety Factor and
           showed a Final Price with no margin in it. Admin is reviewing the
           Designer's file, so it renders as the Designer's file, read-only. -->
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
  .btn-approve {
    background: var(--success);
    color: #fff;
    border: none;
    padding: 9px 16px;
    border-radius: 8px;
    font-family: inherit;
    font-weight: 700;
    font-size: 13px;
  }
  .btn-reject {
    background: var(--danger);
    color: #fff;
    border: none;
    padding: 9px 16px;
    border-radius: 8px;
    font-family: inherit;
    font-weight: 700;
    font-size: 13px;
  }
  .btn-approve:disabled,
  .btn-reject:disabled {
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
  .hint {
    background: var(--info-bg);
    border: 1px solid var(--info-border);
    border-radius: 10px;
    padding: 10px 16px;
    color: var(--info-ink);
    font-size: 13px;
    margin-bottom: 16px;
  }
  .report-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }
  .render-image-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 16px;
  }
  .render-image-label {
    font-size: 10.5px;
    font-weight: 700;
    color: var(--ink-soft);
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .render-image-card img {
    max-width: 100%;
    max-height: 420px;
    border-radius: 8px;
    border: 1px solid var(--border);
    display: block;
  }
</style>
