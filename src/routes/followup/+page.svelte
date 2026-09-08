<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';
  import { notifyRole } from '$lib/calc/notify';
  import { formatDate } from '$lib/calc/formatDate';

  const OPERATION_TYPES = ['Laser Cutting', 'CNC Machining', 'Turning', 'Welding', 'Assembly', 'Other'];

  interface ProjectOption {
    id: string;
    project_name: string;
  }
  interface WorkerOption {
    id: string;
    full_name: string;
  }
  interface OperationRow {
    id: string;
    project_name_snapshot: string;
    operation_type: string;
    worker_name: string;
    work_date: string;
    completion_percent: number;
    notes: string | null;
    approval_status: string;
  }

  let projects: ProjectOption[] = [];
  let workers: WorkerOption[] = [];
  let recent: OperationRow[] = [];
  let loadingRecent = true;
  let saving = false;

  let projectId = '';
  let operationType = OPERATION_TYPES[0];
  let workerId = '';
  let workDate = new Date().toISOString().slice(0, 10);
  let completionPercent = 0;
  let notes = '';

  async function loadRecent() {
    loadingRecent = true;
    const { data, error } = await supabase.from('factory_operations').select('*').order('created_at', { ascending: false }).limit(20);
    if (!error) recent = data || [];
    loadingRecent = false;
  }

  onMount(async () => {
    const [{ data: projData }, { data: workerData }] = await Promise.all([
      supabase.from('projects').select('id, project_name').order('project_name'),
      supabase.from('factory_workers').select('id, full_name').order('full_name'),
    ]);
    projects = projData || [];
    workers = workerData || [];
    if (projects.length > 0) projectId = projects[0].id;
    if (workers.length > 0) workerId = workers[0].id;
    loadRecent();
  });

  async function logOperation() {
    if (!projectId || !workerId) return;
    saving = true;
    const proj = projects.find((p) => p.id === projectId);
    const worker = workers.find((w) => w.id === workerId);
    const { error } = await supabase.from('factory_operations').insert({
      project_id: projectId,
      project_name_snapshot: proj?.project_name ?? '—',
      operation_type: operationType,
      worker_id: workerId,
      worker_name: worker?.full_name ?? '—',
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
      notifyRole('factory', `New progress entry for "${proj?.project_name ?? '—'}" is pending your approval.`, '/factory/approve-progress');
      notes = '';
      completionPercent = 0;
      loadRecent();
    }
  }
</script>

<div class="panel">
  <h3>{t($locale, 'logOperationBtn')}</h3>
  <p class="desc">{t($locale, 'followupDesc')}</p>

  <div class="form-grid">
    <label>
      {t($locale, 'selectProjectPlaceholder')}
      <select bind:value={projectId}>
        {#each projects as p}<option value={p.id}>{p.project_name}</option>{/each}
      </select>
    </label>
    <label>
      {t($locale, 'selectOperationPlaceholder')}
      <select bind:value={operationType}>
        {#each OPERATION_TYPES as op}<option value={op}>{op}</option>{/each}
      </select>
    </label>
    <label>
      {t($locale, 'colWorker')}
      <select bind:value={workerId}>
        {#if workers.length === 0}<option value="">{t($locale, 'noWorkersYet')}</option>{/if}
        {#each workers as w}<option value={w.id}>{w.full_name}</option>{/each}
      </select>
    </label>
    <label>
      {t($locale, 'colWorkDate')}
      <input type="date" bind:value={workDate} />
    </label>
    <label>
      {t($locale, 'colCompletion')}
      <input type="number" min="0" max="100" bind:value={completionPercent} />
    </label>
    <label class="full">
      {t($locale, 'colNotes')}
      <input type="text" bind:value={notes} dir="auto" />
    </label>
  </div>

  <button class="btn-log" on:click={logOperation} disabled={saving || !projectId || !workerId}>
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
          <th>{t($locale, 'colWorkerName')}</th>
          <th>{t($locale, 'colWorkDate')}</th>
          <th>{t($locale, 'colCompletion')}</th>
          <th>{t($locale, 'colNotes')}</th>
          <th>{t($locale, 'colApprovalStatus')}</th>
        </tr>
      </thead>
      <tbody>
        {#each recent as row}
          <tr>
            <td>{row.project_name_snapshot}</td>
            <td>{row.operation_type}</td>
            <td>{row.worker_name}</td>
            <td class="mono">{formatDate(row.work_date)}</td>
            <td class="mono">{row.completion_percent}%</td>
            <td class="muted">{row.notes || '—'}</td>
            <td>
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
    text-align: start;
    font-size: 10.5px;
    color: var(--steel-2);
    text-transform: uppercase;
    padding: 8px 12px;
    background: var(--paper);
    border-bottom: 1px solid var(--border);
    font-weight: 600;
  }
  td {
    text-align: start;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
  }
  tr:last-child td {
    border-bottom: none;
  }
  .mono {
    font-family: var(--font-mono);
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
    background: #fdecea;
    color: #7a1610;
  }
</style>
