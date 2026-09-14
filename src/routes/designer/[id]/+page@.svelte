<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
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
  import { encodeNotification } from '$lib/i18n/notifications';
  import { locale } from '$lib/stores/locale';
  import { t, statusLabel } from '$lib/i18n/dict';
  import { safetyFactor } from '$lib/stores/safetyFactor';

  const getMaterialName = (id: string) => MATERIALS.find((m) => m.id === id)?.nameEn ?? id;

  $: projectId = $page.params.id;

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
    loading = false;
  }

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

  async function saveDraft() {
    saving = true;
    const totals = computeGrandTotals({ sheets: sheetRows, profiles: profileRows, mills: millRows, pipes: pipeRows, squares: squareRows, orders: orderRows, operations });
    const trimmed = projectName.trim();
    const finalName = trimmed || nextUntitledProjectName(await fetchOtherProjectNames());
    const { error } = await supabase
      .from('projects')
      .update({ project_name: finalName, client: clientName, total_cost: totals.totalPrice, project_data: buildProjectData() })
      .eq('id', projectId);
    saving = false;
    if (error) {
      toast.notify(t($locale, 'errorSavingPrefix') + error.message, 'error');
    } else {
      projectName = finalName;
      if (!trimmed) toast.notify(t($locale, 'savedAsNameTemplate').replace('{name}', finalName), 'success', 6000);
      else toast.notify(t($locale, 'draftSavedToast'), 'success');
    }
  }

  // Leaving the calculator (← Back to Dashboard) without ever clicking
  // "💾 Save Draft" used to just discard whatever was typed. This silently
  // persists it as a Draft first — same "Untitled Project [N]" naming as a
  // manual save — so the person's edits are never lost just because they
  // forgot to click Save before leaving.
  let leaving = false;
  async function handleBackToDashboard() {
    if (!canEdit || leaving) {
      goto('/designer');
      return;
    }
    leaving = true;
    const totals = computeGrandTotals({ sheets: sheetRows, profiles: profileRows, mills: millRows, pipes: pipeRows, squares: squareRows, orders: orderRows, operations });
    const trimmed = projectName.trim();
    const finalName = trimmed || nextUntitledProjectName(await fetchOtherProjectNames());
    const { error } = await supabase
      .from('projects')
      .update({ project_name: finalName, client: clientName, total_cost: totals.totalPrice, project_data: buildProjectData() })
      .eq('id', projectId);
    if (error) {
      toast.notify(t($locale, 'autoSaveErrorPrefix') + error.message, 'error');
    } else if (!trimmed) {
      toast.notify(t($locale, 'savedAsNameShortTemplate').replace('{name}', finalName), 'success', 6000);
    } else {
      toast.notify(t($locale, 'draftSavedBeforeLeaving'), 'success');
    }
    goto('/designer');
  }

  function submitToAdmin() {
    const trimmed = projectName.trim();
    if (!trimmed || trimmed.toLowerCase().startsWith('untitled project')) {
      toast.notify(t($locale, 'needRealNameBeforeSubmit'), 'error');
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
        toast.notify(t($locale, 'errorSubmittingPrefix') + error.message, 'error');
      } else {
        notifyRole('admin', encodeNotification('projectSubmitted', { name: trimmed }), `/admin/projects/${projectId}`);
        notifyRole('developer', encodeNotification('projectSubmitted', { name: trimmed }), `/admin/projects/${projectId}`);
        goto('/designer');
      }
    });
  }
</script>

<!-- The page chrome follows the dashboard's language and direction; only the
     calculator inside keeps dir="ltr", because its tables are English by
     design. -->
<div class="page">
  <div class="topbar">
    <button class="btn-back" on:click={handleBackToDashboard} disabled={leaving}>{leaving ? t($locale, 'savingGeneric') : t($locale, 'backToDashboard')}</button>
    {#if !canEdit}
      <span class="readonly-note">{t($locale, 'readOnlyLockedTemplate').replace('{status}', statusLabel($locale, status))}</span>
    {/if}
    <div class="spacer"></div>
    {#if canEdit}
      <button class="btn-save" on:click={saveDraft} disabled={saving}>{saving ? t($locale, 'savingGeneric') : t($locale, 'saveDraftAction')}</button>
      <button class="btn-submit" on:click={submitToAdmin} disabled={submitting}>{submitting ? t($locale, 'submittingGeneric') : t($locale, 'submitToAdminAction')}</button>
    {/if}
  </div>

  {#if loading}
    <p class="muted">{t($locale, 'loading')}</p>
  {:else}
    {#if status === 'Rejected' && flagCount > 0}
      <div class="reject-notice">{t($locale, 'rejectNoticeTemplate').replace('{n}', String(flagCount))}</div>
    {/if}

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
    gap: 14px;
    margin-bottom: 18px;
  }
  .spacer {
    flex: 1;
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
</style>
