<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { get } from 'svelte/store';
  import { goto, beforeNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import Calculator from '$lib/components/calculator/Calculator.svelte';
  import { flagsToSets, countFlags, type FlagSet } from '$lib/calc/reviewFlags';
  import { MATERIALS } from '$lib/constants';
  import type { SheetRow, ProfileRow, MillRow, PipeRow, SquareRow, OrderRow, OperationRow } from '$lib/types';
  import { makeDefaultSheetRows, makeDefaultProfileRows, makeDefaultMillRows, makeDefaultPipeRows, makeDefaultSquareRows, makeDefaultOrderRows, makeDefaultOperations } from '$lib/calc/defaultRows';
  import { nextUntitledProjectName } from '$lib/calc/untitledName';
  import { computeGrandTotals } from '$lib/calc/grandTotals';
  import { computeSheetRow, computeProfileRow, computeMillRow, computePipeRow, computeSquareRow, computeOrderRow, formatNum } from '$lib/utils';
  import { applyRowPricing } from '$lib/calc/pricing';
  import { toast } from '$lib/stores/toast';
  import { notifyRole } from '$lib/calc/notify';
  import { logProjectEvent } from '$lib/calc/projectEvents';
  import { encodeNotification } from '$lib/i18n/notifications';
  import { locale } from '$lib/stores/locale';
  import { t, statusLabel } from '$lib/i18n/dict';
  import { safetyFactor } from '$lib/stores/safetyFactor';
  import { clearPendingSave, isNetworkError, pendingSaveFor, pushProjectSave, queueSave, type ProjectDraftUpdate } from '$lib/offlineSaves';

  const getMaterialName = (id: string) => MATERIALS.find((m) => m.id === id)?.nameEn ?? id;

  $: projectId = $page.params.id ?? '';

  let loading = true;
  let saving = false;
  let submitting = false;
  let status = 'Draft';

  let projectName = '';
  let clientName = '';
  let sheetRows: SheetRow[] = [];
  let profileRows: ProfileRow[] = [];
  let millRows: MillRow[] = [];
  let pipeRows: PipeRow[] = [];
  let squareRows: SquareRow[] = [];
  let orderRows: OrderRow[] = [];
  let operations: OperationRow[] = [];
  let reviewFlagSets: FlagSet = flagsToSets(undefined);
  let savedReviewFlags: any = undefined;
  let renderImageUrl: string | null = null;
  let uploadingImage = false;

  async function load() {
    loading = true;
    const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (error || !data) {
      toast.notify(t($locale, 'couldNotLoadProject'), 'error');
      goto('/designer');
      return;
    }
    const d = data.project_data || {};
    projectName = d.projectName || data.project_name || '';
    clientName = d.client || data.client || '';
    status = data.status;
    sheetRows = d.sheetRows?.length ? d.sheetRows : makeDefaultSheetRows();
    profileRows = d.profileRows?.length ? d.profileRows : makeDefaultProfileRows();
    millRows = d.millRows?.length ? d.millRows : makeDefaultMillRows();
    pipeRows = d.pipeRows?.length ? d.pipeRows : makeDefaultPipeRows();
    squareRows = d.squareRows?.length ? d.squareRows : makeDefaultSquareRows();
    orderRows = d.orderRows?.length ? d.orderRows : makeDefaultOrderRows();
    operations = d.operations?.length ? d.operations : makeDefaultOperations();
    // Only a Rejected project carries flags worth showing — a fresh Draft
    // or anything past Rejected has nothing pending to highlight.
    reviewFlagSets = status === 'Rejected' ? flagsToSets(d.reviewFlags) : flagsToSets(undefined);
    // Kept as-is (not the Map form) so every regular save can pass it
    // straight back through untouched — see buildProjectData below. Before
    // this, every save silently WIPED the Admin's rejection notes the
    // instant the Designer touched anything, because the plain save just
    // replaced project_data wholesale without this field in it at all.
    savedReviewFlags = d.reviewFlags;
    projectSafetyFactor = Number(d.safetyFactor) || 0;
    renderImageUrl = data.render_image_url ?? null;

    // A save made on a weak connection that has not uploaded yet is newer
    // than the server copy — show it, so reopening never loses that work.
    const pending = canEdit ? pendingSaveFor(projectId, $auth.session?.user.id) : undefined;
    hasPendingLocalSave = !!pending;
    if (pending) {
      const p = pending.update.project_data as Record<string, any>;
      projectName = pending.update.project_name;
      clientName = pending.update.client;
      sheetRows = p.sheetRows ?? sheetRows;
      profileRows = p.profileRows ?? profileRows;
      millRows = p.millRows ?? millRows;
      pipeRows = p.pipeRows ?? pipeRows;
      squareRows = p.squareRows ?? squareRows;
      orderRows = p.orderRows ?? orderRows;
      operations = p.operations ?? operations;
    }
    loading = false;
    // Whatever was just loaded counts as saved; edits after this make the page dirty.
    await tick();
    savedSnapshot = currentSnapshot;
  }

  // ---- unsaved-changes tracking ---------------------------------------------
  let savedSnapshot = '';
  let hasPendingLocalSave = false;
  $: currentSnapshot = JSON.stringify({ projectName, clientName, sheetRows, profileRows, millRows, pipeRows, squareRows, orderRows, operations });
  $: dirty = canEdit && !loading && savedSnapshot !== '' && currentSnapshot !== savedSnapshot;

  onMount(load);

  $: flagCount = countFlags(reviewFlagSets);

  // The Safety Factor is a dashboard-level setting living in the Designer's
  // OWN browser (localStorage, see stores/safetyFactor.ts). buildProjectData
  // used to write a hardcoded `safetyFactor: 0`, so it was never stored with
  // the project at all: the margin existed only on the Designer's screen and
  // vanished the moment anyone else opened the file. Admin, Factory and
  // Procurement were all reading a final price with no margin in it.
  //
  // It is now captured INTO the project. While the project is still the
  // Designer's to edit, the live setting wins so changes take effect; once it
  // has left their hands the stored value is frozen and simply carried
  // through every later save, so downstream roles see the exact margin the
  // Designer submitted with — read-only, by construction.
  let projectSafetyFactor = 0;
  $: effectiveSafetyFactor = canEdit ? $safetyFactor : projectSafetyFactor;

  function buildProjectData() {
    return {
      projectName,
      client: clientName,
      safetyFactor: effectiveSafetyFactor,
      sheetRows,
      profileRows,
      millRows,
      pipeRows,
      squareRows,
      orderRows,
      operations,
      reviewFlags: savedReviewFlags,
    };
  }

  $: canEdit = status === 'Draft' || status === 'Rejected';

  async function fetchOtherProjectNames(): Promise<string[]> {
    const userId = $auth.session?.user?.id;
    if (!userId) return [];
    const { data } = await supabase.from('projects').select('id, project_name').eq('user_id', userId).neq('id', projectId);
    return (data || []).map((p) => p.project_name);
  }

  // Uploaded and persisted the moment it's picked — not batched with the
  // rest of buildProjectData() — so the render image survives even if the
  // Designer navigates away without hitting Save Draft.
  async function handleImageUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    uploadingImage = true;
    const path = `${projectId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('project-renders').upload(path, file, { upsert: false });
    if (uploadError) {
      uploadingImage = false;
      toast.notify(t($locale, 'imageUploadErrorPrefix') + uploadError.message, 'error');
      return;
    }
    const { data: pub } = supabase.storage.from('project-renders').getPublicUrl(path);
    const { error } = await supabase.from('projects').update({ render_image_url: pub.publicUrl }).eq('id', projectId);
    uploadingImage = false;
    if (error) {
      toast.notify(t($locale, 'imageUploadErrorPrefix') + error.message, 'error');
    } else {
      renderImageUrl = pub.publicUrl;
      toast.notify(t($locale, 'imageUploadedToast'), 'success');
    }
  }

  async function removeImage() {
    const { error } = await supabase.from('projects').update({ render_image_url: null }).eq('id', projectId);
    if (error) toast.notify(t($locale, 'imageUploadErrorPrefix') + error.message, 'error');
    else renderImageUrl = null;
  }

  function buildUpdate(finalName: string): ProjectDraftUpdate {
    const totals = computeGrandTotals({ sheets: sheetRows, profiles: profileRows, mills: millRows, pipes: pipeRows, squares: squareRows, orders: orderRows, operations });
    return { project_name: finalName, client: clientName, total_cost: totals.totalPrice, project_data: { ...buildProjectData(), projectName: finalName } };
  }

  // Saves a draft, or keeps it on this device when the connection fails (it
  // uploads automatically later — see lib/offlineSaves.ts). Uses get(locale)
  // because it can run from a toast after this page has been left.
  async function saveProjectDraft(id: string, userId: string, update: ProjectDraftUpdate): Promise<'saved' | 'queued' | 'failed'> {
    const result = await pushProjectSave(id, update);
    const loc = get(locale);
    if (result.ok) {
      clearPendingSave(id);
      return 'saved';
    }
    if (result.reason === 'network') {
      queueSave({ projectId: id, userId, update });
      toast.notify(t(loc, 'offlineSavedLocally'), 'info', 7000);
      return 'queued';
    }
    toast.notify(result.reason === 'locked' ? t(loc, 'projectNoLongerEditable') : t(loc, 'errorSavingPrefix') + result.message, 'error');
    return 'failed';
  }

  async function saveDraft() {
    saving = true;
    const snapshot = currentSnapshot;
    const trimmed = projectName.trim();
    const finalName = trimmed || nextUntitledProjectName(await fetchOtherProjectNames());
    const outcome = await saveProjectDraft(projectId, $auth.session?.user.id ?? '', buildUpdate(finalName));
    saving = false;
    if (outcome === 'failed') return;
    // Edits typed while the request was in flight still count as unsaved.
    const editedDuringSave = currentSnapshot !== snapshot;
    projectName = finalName;
    await tick();
    savedSnapshot = editedDuringSave ? snapshot : currentSnapshot;
    hasPendingLocalSave = outcome === 'queued';
    if (outcome === 'saved') {
      if (!trimmed) toast.notify(t($locale, 'savedAsNameTemplate').replace('{name}', finalName), 'success', 6000);
      else toast.notify(t($locale, 'draftSavedToast'), 'success');
    }
  }

  // Leaving no longer saves behind the designer's back. If there are unsaved
  // edits, the navigation goes ahead and a toast offers "Save" for 3 seconds;
  // when it runs out, the edits are simply discarded. Closing the tab asks
  // the browser's own "leave site?" question instead.
  let allowLeave = false;
  beforeNavigate(({ type, cancel, to }) => {
    if (!dirty || allowLeave) return;
    if (type === 'leave') {
      cancel();
      return;
    }
    if (to?.url.pathname === $page.url.pathname) return;
    offerSaveAfterLeaving();
  });

  function offerSaveAfterLeaving() {
    const id = projectId;
    const userId = $auth.session?.user.id ?? '';
    const typedName = projectName.trim();
    const update = buildUpdate(typedName);
    toast.offerAction(t($locale, 'leftWithoutSaving'), t($locale, 'saveNowAction'), 3, async () => {
      const finalName = typedName || nextUntitledProjectName(await fetchOtherProjectNames());
      const outcome = await saveProjectDraft(id, userId, { ...update, project_name: finalName, project_data: { ...update.project_data, projectName: finalName } });
      if (outcome === 'saved') toast.notify(t(get(locale), 'draftSavedToast'), 'success');
    });
  }

  function handleBackToDashboard() {
    goto('/designer');
  }
  function submitToAdmin() {
    const trimmed = projectName.trim();
    if (!trimmed || trimmed.toLowerCase().startsWith('untitled project')) {
      toast.notify(t($locale, 'needRealNameBeforeSubmit'), 'error');
      return;
    }
    if (!renderImageUrl) {
      toast.notify(t($locale, 'needImageBeforeSubmit'), 'error');
      return;
    }
    toast.confirmWithUndo(t($locale, 'submittingToAdminConfirm'), 3, async () => {
      submitting = true;
      const totals = computeGrandTotals({ sheets: sheetRows, profiles: profileRows, mills: millRows, pipes: pipeRows, squares: squareRows, orders: orderRows, operations });
      const { error } = await supabase
        .from('projects')
        .update({ project_name: trimmed, client: clientName, total_cost: totals.totalPrice, status: 'Pending Admin', project_data: { ...buildProjectData(), reviewFlags: undefined } })
        .eq('id', projectId);
      submitting = false;
      if (error) {
        toast.notify(isNetworkError(error) ? t($locale, 'submitOfflineError') : t($locale, 'errorSubmittingPrefix') + error.message, 'error');
      } else {
        clearPendingSave(projectId);
        allowLeave = true;
        notifyRole('admin', encodeNotification('projectSubmitted', { name: trimmed }), `/admin/projects/${projectId}`);
        notifyRole('developer', encodeNotification('projectSubmitted', { name: trimmed }), `/admin/projects/${projectId}`);
        logProjectEvent(projectId, 'submitted', $auth.session?.user.id);
        goto('/designer');
      }
    });
  }
</script>

<!-- The page chrome follows the dashboard's language and direction; only the
     calculator inside keeps dir="ltr", because its tables are English by
     design. -->
<div class="page">
  <!-- All actions sit together at the reading start: right in Arabic, left in English. -->
  <div class="topbar">
    <div class="actions">
      <button class="btn-back" on:click={handleBackToDashboard}>{t($locale, 'backToDashboard')}</button>
      {#if canEdit}
        <button class="btn-save" class:dirty on:click={saveDraft} disabled={saving}>{saving ? t($locale, 'savingGeneric') : t($locale, 'saveDraftAction')}</button>
        <button class="btn-submit" on:click={submitToAdmin} disabled={submitting}>{submitting ? t($locale, 'submittingGeneric') : t($locale, 'submitToAdminAction')}</button>
      {/if}
    </div>
    {#if !canEdit}
      <span class="readonly-note">{t($locale, 'readOnlyLockedTemplate').replace('{status}', statusLabel($locale, status))}</span>
    {/if}
  </div>
  {#if hasPendingLocalSave && canEdit}
    <div class="pending-note" role="status">{t($locale, 'offlinePendingNotice')}</div>
  {/if}

  {#if loading}
    <p class="muted">{t($locale, 'loading')}</p>
  {:else}
    {#if status === 'Rejected' && flagCount > 0}
      <div class="reject-notice">{t($locale, 'rejectNoticeTemplate').replace('{n}', String(flagCount))}</div>
    {/if}

    <div class="render-image-card">
      <div class="render-image-label">{t($locale, 'renderImageLabel')}</div>
      {#if renderImageUrl}
        <div class="render-image-preview">
          <img src={renderImageUrl} alt={t($locale, 'renderImageLabel')} />
          {#if canEdit}
            <button class="btn-remove-image" on:click={removeImage} disabled={uploadingImage}>{t($locale, 'removeImageAction')}</button>
          {/if}
        </div>
      {:else if canEdit}
        <div class="render-image-hint">{t($locale, 'renderImageHint')}</div>
      {:else}
        <div class="render-image-hint">—</div>
      {/if}
      {#if canEdit}
        <label class="btn-upload-image" class:disabled={uploadingImage}>
          {uploadingImage ? t($locale, 'uploadingImage') : t($locale, renderImageUrl ? 'replaceImageAction' : 'uploadImageAction')}
          <input type="file" accept="image/*" on:change={handleImageUpload} disabled={uploadingImage} hidden />
        </label>
      {/if}
    </div>

    <!-- Only the calculator itself is pinned LTR — its tables are English by
         design. The chrome above follows the dashboard's direction. -->
    <div dir="ltr">
      <Calculator
        mode="designer"
        currentUserRole={$auth.userRole ?? 'designer'}
        bind:sheetRows
        bind:profileRows
        bind:millRows
        bind:pipeRows
        bind:squareRows
        bind:orderRows
        bind:operations
        bind:projectName
        bind:clientName
        {status}
        safetyFactor={effectiveSafetyFactor}
        reviewFlags={status === 'Rejected' ? reviewFlagSets : undefined}
      />
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px 20px 60px;
    font-family: var(--font-body);
  }
  .topbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
    margin-bottom: 18px;
  }
  .actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }
  .btn-save.dirty {
    box-shadow: 0 0 0 2px var(--amber);
  }
  .pending-note {
    margin: -6px 0 16px;
    padding: 9px 12px;
    border-radius: 8px;
    background: var(--warn-bg, var(--paper));
    color: var(--warn-ink, var(--ink));
    border: 1px solid var(--warn-border, var(--border));
    font-size: 12.5px;
    font-weight: 600;
  }
  .btn-back {
    background: #64748b;
    color: #fff;
    padding: 9px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    border: none;
    cursor: pointer;
    font-family: inherit;
  }
  .btn-back:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .readonly-note {
    color: var(--danger-deep, #b91c1c);
    font-weight: 700;
    font-size: 13px;
  }
  .btn-save {
    background: var(--navy-3, #17456a);
    color: #fff;
    border: none;
    padding: 9px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
  }
  .btn-submit {
    background: var(--success, #3f9463);
    color: #fff;
    border: none;
    padding: 9px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
  }
  .muted {
    color: var(--ink-soft, #4c616c);
  }
  .reject-notice {
    background: #fdecea;
    border: 1px solid #d9342b;
    border-radius: 8px;
    padding: 10px 16px;
    color: #7a1610;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 16px;
  }
  .render-image-card {
    background: var(--card, #fff);
    border: 1px solid var(--border, #dbe2e6);
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .render-image-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--ink-soft, #4c616c);
    text-transform: uppercase;
  }
  .render-image-hint {
    font-size: 13px;
    color: var(--ink-soft, #4c616c);
    flex: 1;
  }
  .render-image-preview {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
  }
  .render-image-preview img {
    height: 64px;
    width: 64px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid var(--border, #dbe2e6);
  }
  .btn-upload-image,
  .btn-remove-image {
    background: var(--steel, #34495e);
    color: #fff;
    padding: 8px 14px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 12.5px;
    border: none;
    cursor: pointer;
    font-family: inherit;
  }
  .btn-remove-image {
    background: var(--danger, #d9342b);
  }
  .btn-upload-image.disabled {
    opacity: 0.6;
    pointer-events: none;
  }
</style>
