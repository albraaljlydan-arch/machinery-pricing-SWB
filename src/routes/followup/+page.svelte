<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';
  import { notifyRole } from '$lib/calc/notify';
  import { encodeNotification } from '$lib/i18n/notifications';
  import { formatDate } from '$lib/calc/formatDate';
  import { OPERATION_TYPES, CUSTOM_OPERATION, operationLabel } from '$lib/calc/operationTypes';

  interface ProjectOption {
    id: string;
    project_name: string;
  }
  interface OperationRow {
    id: string;
    project_name_snapshot: string;
    operation_type: string;
    work_date: string;
    completion_percent: number;
    notes: string | null;
    approval_status: string;
  }

  let projects: ProjectOption[] = [];
  let recent: OperationRow[] = [];
  let loadingRecent = true;
  let saving = false;

  let projectId = '';
  let operationType: string = OPERATION_TYPES[0].id;
  let workDate = new Date().toISOString().slice(0, 10);
  let completionPercent = 0;
  let notes = '';

  // ---- Custom operation ----
  // "Other" used to be a plain option that stored the literal word "Other",
  // which told nobody downstream what was actually done. It is now a proper
  // custom entry: picking it reveals a text field, and — the part that
  // matters — an explicit way back out. Backing out restores the first preset
  // and clears whatever was typed, so there is no half-state where the form
  // still remembers an abandoned custom name.
  let customOperation = '';
  $: isCustom = operationType === CUSTOM_OPERATION;
  /** What actually gets written to operation_type. */
  $: effectiveOperation = isCustom ? customOperation.trim() : operationType;

  function cancelCustomOperation() {
    operationType = OPERATION_TYPES[0].id;
    customOperation = '';
  }

  async function loadRecent() {
    loadingRecent = true;
    const { data, error } = await supabase.from('factory_operations').select('*').order('created_at', { ascending: false }).limit(20);
    if (!error) recent = data || [];
    loadingRecent = false;
  }

  let loadingOptions = true;

  onMount(async () => {
    // ONLY machines the factory is currently building. Progress can't
    // meaningfully be reported against a draft, something still awaiting
    // approval, or a job that already shipped — and the unfiltered list
    // this used to load was why the dropdown filled up with projects that
    // had nothing to log against.
    const { data: projData, error: projErr } = await supabase.from('projects').select('id, project_name').eq('status', 'In Production').order('project_name');
    // The error used to be swallowed, so a failed query and a genuinely empty
    // queue produced the identical blank dropdown with no way to tell which
    // had happened.
    if (projErr) toast.notify(t($locale, 'loadProjectsErrorPrefix') + projErr.message, 'error');
    projects = projData || [];
    if (projects.length > 0) projectId = projects[0].id;
    loadingOptions = false;
    loadRecent();
  });

  // THIS is why the Log button was dead: it required a worker, the worker
  // roster was empty, so `workerId` never became truthy and the button could
  // never enable — with nothing on screen explaining why. The worker field is
  // gone entirely now, so the only real requirements are a machine and an
  // operation name.
  $: canLog = !!projectId && !!effectiveOperation && !saving;

  async function logOperation() {
    if (!canLog) return;
    saving = true;
    const proj = projects.find((p) => p.id === projectId);
    const { error } = await supabase.from('factory_operations').insert({
      project_id: projectId,
      project_name_snapshot: proj?.project_name ?? '—',
      operation_type: effectiveOperation,
      work_date: workDate,
      completion_percent: completionPercent,
      notes: notes.trim() || null,
      logged_by: $auth.session?.user.id ?? null,
      approval_status: 'pending',
    });
    saving = false;
    if (error) {
      toast.notify(t($locale, 'operationLogErrorPrefix') + error.message, 'error');
    } else {
      toast.notify(t($locale, 'operationLoggedSuccess'), 'success');
      notifyRole('factory', encodeNotification('progressPendingApproval', { name: proj?.project_name ?? '—' }), '/factory/approve-progress');
      notes = '';
      completionPercent = 0;
      cancelCustomOperation();
      loadRecent();
    }
  }
</script>

<div class="panel">
  <h3>{t($locale, 'logOperationBtn')}</h3>
  <p class="desc">{t($locale, 'followupDesc')}</p>
  <p class="desc hint">{t($locale, 'inProductionOnlyHint')}</p>

  <div class="form-grid">
    <label>
      {t($locale, 'selectProjectPlaceholder')}
      <select bind:value={projectId} disabled={projects.length === 0}>
        <!-- An explicit empty option. Without one the select rendered as a
             blank box that looked broken rather than empty. -->
        {#if projects.length === 0}
          <option value="">{loadingOptions ? t($locale, 'loading') : t($locale, 'noProjectsInProduction')}</option>
        {/if}
        {#each projects as p}<option value={p.id}>{p.project_name}</option>{/each}
      </select>
    </label>
    <label>
      {t($locale, 'selectOperationPlaceholder')}
      <select bind:value={operationType}>
        {#each OPERATION_TYPES as op (op.id)}<option value={op.id}>{operationLabel($locale, op.id)}</option>{/each}
        <option value={CUSTOM_OPERATION}>{t($locale, 'customOperationOption')}</option>
      </select>
      {#if isCustom}
        <!-- The way back out sits directly under the field, is a real button
             rather than "pick the first item again", and says what it does.
             That is the whole point: choosing a custom operation must never
             feel like a one-way door. -->
        <div class="custom-op">
          <input type="text" bind:value={customOperation} placeholder={t($locale, 'customOperationPlaceholder')} dir="auto" />
          <button type="button" class="btn-cancel-custom" on:click={cancelCustomOperation} title={t($locale, 'cancelCustomOperationTitle')}>
            {t($locale, 'cancelCustomOperation')}
          </button>
        </div>
        {#if !customOperation.trim()}
          <span class="field-hint warn">{t($locale, 'customOperationNeedsName')}</span>
        {/if}
      {/if}
    </label>
    <!-- No date field at all. It was locked to today anyway, so showing a
         dead input plus a line explaining why it was dead only added noise:
         the entry is stamped with today's date on save either way. -->
    <label>
      {t($locale, 'colCompletion')}
      <input type="number" min="0" max="100" bind:value={completionPercent} />
    </label>
    <label class="full">
      {t($locale, 'colNotes')}
      <input type="text" bind:value={notes} dir="auto" />
    </label>
  </div>

  <button class="btn-log" on:click={logOperation} disabled={!canLog}>
    {saving ? t($locale, 'savingGeneric') : t($locale, 'logOperationBtn')}
  </button>
</div>

<div class="panel">
  <h3>{t($locale, 'recentOperationsTitle')}</h3>
  {#if loadingRecent}
    <p class="muted">{t($locale, 'loading')}</p>
  {:else if recent.length === 0}
    <p class="muted">{t($locale, 'noOperationsYet')}</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>{t($locale, 'colProject')}</th>
          <th>{t($locale, 'colOperationType')}</th>
          <th class="col-center">{t($locale, 'colWorkDate')}</th>
          <th class="col-center">{t($locale, 'colCompletion')}</th>
          <th>{t($locale, 'colNotes')}</th>
          <th class="col-center">{t($locale, 'colApprovalStatus')}</th>
        </tr>
      </thead>
      <tbody>
        {#each recent as row}
          <tr>
            <td>{row.project_name_snapshot}</td>
            <td>{operationLabel($locale, row.operation_type)}</td>
            <td class="mono">{formatDate(row.work_date)}</td>
            <td class="mono">{row.completion_percent}%</td>
            <td class="muted">{row.notes || '—'}</td>
            <td class="col-center">
              <span class="status-pill status-{row.approval_status}">
                {row.approval_status === 'approved' ? t($locale, 'approvalStatusApproved') : row.approval_status === 'rejected' ? t($locale, 'approvalStatusRejected') : t($locale, 'approvalStatusPending')}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 18px 20px;
    margin-bottom: 18px;
    overflow-x: auto;
  }
  .panel h3 {
    margin: 0 0 6px;
    font-size: 14.5px;
  }
  .desc {
    margin: 0 0 14px;
    font-size: 12.5px;
    color: var(--ink-soft);
  }
  .desc.hint {
    background: var(--info-bg);
    border: 1px solid var(--info-border);
    color: var(--info-ink);
    border-radius: 8px;
    padding: 8px 12px;
  }
  .field-hint {
    font-size: 11px;
    color: var(--ink-soft);
  }
  .field-hint.warn {
    color: var(--warn-ink);
  }
  .custom-op {
    display: flex;
    gap: 6px;
    align-items: stretch;
  }
  .custom-op input {
    flex: 1;
    min-width: 0;
  }
  .btn-cancel-custom {
    flex-shrink: 0;
    background: var(--paper);
    border: 1px solid var(--border);
    color: var(--ink-soft);
    border-radius: 7px;
    padding: 0 10px;
    font-family: inherit;
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
  }
  .btn-cancel-custom:hover {
    background: var(--card-hover);
    color: var(--ink);
  }
  .form-grid input:disabled {
    background: var(--paper);
    color: var(--ink-soft);
    cursor: not-allowed;
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 14px;
  }
  .form-grid label {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 12px;
    color: var(--ink-soft);
  }
  .form-grid label.full {
    grid-column: 1 / -1;
  }
  .form-grid input,
  .form-grid select {
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 7px 10px;
    font-size: 13px;
    background: var(--card);
    color: var(--ink);
  }
  .btn-log {
    background: var(--navy);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .btn-log:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .muted {
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
    text-transform: uppercase;
    padding: 8px 12px;
    background: var(--paper);
    border-bottom: 1px solid var(--border);
    font-weight: 600;
  }
  td {
    text-align: center;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
  }
  tr:last-child td {
    border-bottom: none;
  }
  .status-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
    white-space: nowrap;
  }
  .status-pill.status-pending {
    background: var(--amber-bg, #fceed4);
    color: var(--amber-ink, #8a5a0b);
  }
  .status-pill.status-approved {
    background: var(--success-bg, #e3f3e9);
    color: var(--success-deep, #1e6b41);
  }
  .status-pill.status-rejected {
    background: var(--danger-bg);
    color: var(--danger-deep);
  }
</style>
