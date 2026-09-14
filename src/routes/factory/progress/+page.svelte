<script lang="ts">
  // ==========================================================================
  //  FACTORY — PROGRESS MONITORING
  //
  //  The factory now has, inside the factory, the same unified oversight the
  //  Admin has: Follow-up + Procurement progress combined, period tabs,
  //  per-machine comparison, and fair employee scoring — rebuilt on the same
  //  design as admin/factory-progress rather than the old Follow-up-only,
  //  plain-table version.
  //
  //  Two deliberate differences from the Admin's copy:
  //   - It shows PENDING (and rejected) entries too, not just approved ones —
  //     pending is precisely the factory's own queue, which the Admin never
  //     needs to see. A status pill on the daily table makes that visible.
  //   - Every score/average (the daily stats, the per-machine bars, the fair
  //     employee ranking) is still computed from APPROVED entries only: an
  //     unapproved number is a claim, not a measurement, and letting it move
  //     an average would defeat the point of the approval step. Only the raw
  //     daily log lists everything.
  // ==========================================================================
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { formatDate } from '$lib/calc/formatDate';
  import { operationLabel } from '$lib/calc/operationTypes';

  interface OperationRow {
    id: string;
    project_id: string;
    project_name_snapshot: string;
    operation_type: string;
    work_date: string;
    completion_percent: number;
    logged_by: string;
    approval_status: string;
    created_at: string;
  }

  interface PurchaseRow {
    id: string;
    project_id: string;
    project_name_snapshot: string;
    work_date: string;
    requested_by: string;
    pieces_today: number;
    daily_percent: number;
    cumulative_percent: number;
    approval_status: string;
    created_at: string;
  }

  interface ProgressRow {
    id: string;
    source: 'followup' | 'procurement';
    projectId: string;
    machine: string;
    engineer: string;
    workDate: string;
    detail: string;
    dailyValue: number;
    cumulativeValue: number;
    pieces: number | null;
    approvalStatus: string;
    createdAt: string;
  }

  let operations: OperationRow[] = [];
  let purchases: PurchaseRow[] = [];
  let names: Record<string, string> = {};
  let loading = true;
  let loadError = '';
  const todayStr = new Date().toISOString().slice(0, 10);
  type Period = 'day' | 'week' | 'month';
  let period: Period = 'day';
  let selectedDate = todayStr;
  let selectedMachine = '';

  function dateKey(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function shiftDays(date: Date, amount: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
  }

  // The work week here runs Saturday–Friday, not the ISO Sunday/Monday
  // start — so "this week" always snaps to that fixed Sat-start grid
  // instead of floating with whatever weekday "today" happens to be.
  function startOfWeekSat(date: Date): Date {
    return shiftDays(date, -((date.getDay() + 1) % 7));
  }

  const today = new Date();
  const dayOptions = Array.from({ length: 60 }, (_, index) => {
    const date = shiftDays(today, -index);
    return { value: dateKey(date), date };
  });
  const currentWeekStart = startOfWeekSat(today);
  const weekOptions = Array.from({ length: 12 }, (_, index) => {
    const start = shiftDays(currentWeekStart, -index * 7);
    const end = shiftDays(start, 6);
    return { value: dateKey(end), start: dateKey(start), end: dateKey(end), startDate: start, endDate: end };
  });
  const monthOptions = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { value: dateKey(date), start: dateKey(date), end: dateKey(end), date };
  });

  function periodRange(): { start: string; end: string } {
    if (period === 'day') return { start: selectedDate, end: selectedDate };
    const options = period === 'week' ? weekOptions : monthOptions;
    return options.find((option) => option.value === selectedDate) || options[0];
  }

  function selectPeriod(next: Period) {
    period = next;
    selectedDate = next === 'day' ? todayStr : next === 'week' ? weekOptions[0].value : monthOptions[0].value;
  }

  onMount(async () => {
    const [operationsRes, purchasesRes] = await Promise.all([
      supabase
        .from('factory_operations')
        .select('id, project_id, project_name_snapshot, operation_type, work_date, completion_percent, logged_by, approval_status, created_at')
        .order('work_date', { ascending: false }),
      supabase
        .from('purchase_requests')
        .select('id, project_id, project_name_snapshot, work_date, requested_by, pieces_today, daily_percent, cumulative_percent, approval_status, created_at')
        .order('work_date', { ascending: false }),
    ]);

    if (operationsRes.error || purchasesRes.error) {
      loadError = operationsRes.error?.message || purchasesRes.error?.message || '';
    }
    operations = operationsRes.data || [];
    purchases = purchasesRes.data || [];

    const ids = Array.from(new Set([...operations.map((row) => row.logged_by), ...purchases.map((row) => row.requested_by)].filter(Boolean)));
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      names = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile.full_name]));
    }
    loading = false;
  });

  // Approved-only, same rule as Admin's copy — see the header note.
  function followupCumulative(projectId: string, throughDate?: string): number {
    const total = operations
      .filter((row) => row.project_id === projectId && row.approval_status === 'approved' && (!throughDate || row.work_date <= throughDate))
      .reduce((sum, row) => sum + Number(row.completion_percent || 0), 0);
    return Math.min(100, Math.round(total));
  }

  function latestPurchasePercent(projectId: string, throughDate?: string): number {
    const latest = purchases
      .filter((row) => row.project_id === projectId && row.approval_status === 'approved' && (!throughDate || row.work_date <= throughDate))
      .sort((a, b) => b.work_date.localeCompare(a.work_date) || b.created_at.localeCompare(a.created_at))[0];
    return latest ? Math.min(100, Math.round(Number(latest.cumulative_percent || 0))) : 0;
  }

  function statusText(s: string) {
    if (s === 'approved') return t($locale, 'approvalStatusApproved');
    if (s === 'rejected') return t($locale, 'approvalStatusRejected');
    return t($locale, 'approvalStatusPending');
  }

  $: machineOptions = Array.from(
    new Map(
      [...operations, ...purchases].map((row) => [row.project_id, row.project_name_snapshot] as const)
    )
  )
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Every entry, any approval_status — the daily log is a queue, not just a
  // record, so pending/rejected rows stay visible with their own pill.
  $: progressRows = [
    ...operations.map(
      (row): ProgressRow => ({
        id: `followup-${row.id}`,
        source: 'followup',
        projectId: row.project_id,
        machine: row.project_name_snapshot,
        engineer: names[row.logged_by] || '—',
        workDate: row.work_date,
        detail: operationLabel($locale, row.operation_type),
        dailyValue: Math.round(Number(row.completion_percent || 0)),
        cumulativeValue: followupCumulative(row.project_id, row.work_date),
        pieces: null,
        approvalStatus: row.approval_status,
        createdAt: row.created_at,
      })
    ),
    ...purchases.map(
      (row): ProgressRow => ({
        id: `procurement-${row.id}`,
        source: 'procurement',
        projectId: row.project_id,
        machine: row.project_name_snapshot,
        engineer: names[row.requested_by] || '—',
        workDate: row.work_date,
        detail: t($locale, 'purchasedMaterials'),
        dailyValue: Math.round(Number(row.daily_percent || 0)),
        cumulativeValue: Math.min(100, Math.round(Number(row.cumulative_percent || 0))),
        pieces: Number(row.pieces_today || 0),
        approvalStatus: row.approval_status,
        createdAt: row.created_at,
      })
    ),
  ].sort((a, b) => b.workDate.localeCompare(a.workDate) || b.createdAt.localeCompare(a.createdAt));

  $: range = periodRange();
  $: filteredRows = progressRows.filter(
    (row) => row.workDate >= range.start && row.workDate <= range.end && (!selectedMachine || row.projectId === selectedMachine)
  );
  // The stats/scores below all read from this — approved-only, per the
  // header note — while the daily table further down reads filteredRows
  // directly so pending/rejected entries stay visible there.
  $: approvedRows = filteredRows.filter((row) => row.approvalStatus === 'approved');

  $: machineSummaries = machineOptions
    .filter((machine) => !selectedMachine || machine.id === selectedMachine)
    .map((machine) => ({
      ...machine,
      followup: followupCumulative(machine.id, range.end),
      procurement: latestPurchasePercent(machine.id, range.end),
    }));

  function fairScore(rows: ProgressRow[]): number {
    const byMachine = new Map<string, number>();
    for (const row of rows) byMachine.set(row.projectId, Math.min(100, (byMachine.get(row.projectId) || 0) + row.dailyValue));
    const values = [...byMachine.values()];
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  }

  function employeeResults(source: ProgressRow['source']) {
    const grouped = new Map<string, ProgressRow[]>();
    for (const row of approvedRows.filter((item) => item.source === source)) {
      const key = row.engineer || '—';
      grouped.set(key, [...(grouped.get(key) || []), row]);
    }
    return [...grouped].map(([engineer, rows]) => ({
      engineer,
      score: fairScore(rows),
      machines: new Set(rows.map((row) => row.projectId)).size,
      reports: rows.length,
      pieces: rows.reduce((sum, row) => sum + Number(row.pieces || 0), 0),
    })).sort((a, b) => b.score - a.score);
  }

  $: followupApproved = approvedRows.filter((row) => row.source === 'followup');
  $: procurementApproved = approvedRows.filter((row) => row.source === 'procurement');
  $: followupScore = fairScore(followupApproved);
  $: procurementScore = fairScore(procurementApproved);
  $: followupEmployees = employeeResults('followup');
  $: procurementEmployees = employeeResults('procurement');
</script>

<div class="period-tabs" aria-label={$locale === 'ar' ? 'الفترة الزمنية' : 'Time period'}>
  <button class:active={period === 'day'} type="button" on:click={() => selectPeriod('day')}>{$locale === 'ar' ? 'يومي' : 'Daily'}</button>
  <button class:active={period === 'week'} type="button" on:click={() => selectPeriod('week')}>{$locale === 'ar' ? 'أسبوعي' : 'Weekly'}</button>
  <button class:active={period === 'month'} type="button" on:click={() => selectPeriod('month')}>{$locale === 'ar' ? 'شهري' : 'Monthly'}</button>
</div>

<div class="filters">
  <label>
    <span>{$locale === 'ar' ? (period === 'day' ? 'اختر اليوم' : period === 'week' ? 'اختر الأسبوع' : 'اختر الشهر') : `Select ${period}`}</span>
    <select bind:value={selectedDate}>
      {#if period === 'day'}
        {#each dayOptions as option (option.value)}
          <option value={option.value}>{option.date.toLocaleDateString($locale === 'ar' ? 'ar-SY' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</option>
        {/each}
      {:else if period === 'week'}
        {#each weekOptions as option (option.value)}
          <option value={option.value}>{formatDate(option.start)} - {formatDate(option.end)}</option>
        {/each}
      {:else}
        {#each monthOptions as option (option.value)}
          <option value={option.value}>{option.date.toLocaleDateString($locale === 'ar' ? 'ar-SY' : 'en-US', { month: 'long', year: 'numeric' })}</option>
        {/each}
      {/if}
    </select>
  </label>

  <label>
    <span>{t($locale, 'filterByMachine')}</span>
    <select bind:value={selectedMachine}>
      <option value="">{t($locale, 'allMachines')}</option>
      {#each machineOptions as machine (machine.id)}
        <option value={machine.id}>{machine.name}</option>
      {/each}
    </select>
  </label>
</div>

{#if loadError}
  <div class="error-box">{t($locale, 'loadErrorPrefix')}{loadError}</div>
{/if}

<div class="daily-stats">
  <div class="stat">
    <span class="stat-label">{$locale === 'ar' ? 'متوسط تقدم المتابعة لكل ماكينة' : 'Follow-up progress per machine'}</span>
    <strong class="mono">{loading ? '—' : `${followupScore}%`}</strong>
    <small>{new Set(followupApproved.map((row) => row.projectId)).size} {$locale === 'ar' ? 'ماكينات' : 'machines'} · {followupApproved.length} {t($locale, 'approvedEntries')}</small>
  </div>
  <div class="stat procurement-stat">
    <span class="stat-label">{$locale === 'ar' ? 'متوسط تقدم المشتريات لكل ماكينة' : 'Procurement progress per machine'}</span>
    <strong class="mono">{loading ? '—' : `${procurementScore}%`}</strong>
    <small>{new Set(procurementApproved.map((row) => row.projectId)).size} {$locale === 'ar' ? 'ماكينات' : 'machines'} · {procurementApproved.length} {t($locale, 'approvedEntries')}</small>
  </div>
</div>

<section class="panel employee-panel">
  <div class="panel-head">
    <div>
      <h3>{$locale === 'ar' ? 'إنجاز الموظفين' : 'Employee progress'}</h3>
      <p>{$locale === 'ar' ? 'متوسط نقاط التقدم المعتمدة لكل ماكينة، مع وزن متساوٍ لكل ماكينة' : 'Average approved progress points per machine, with equal weight per machine'}</p>
    </div>
  </div>
  <div class="employee-columns">
    {#each [{ source: 'followup', title: t($locale, 'followup'), rows: followupEmployees }, { source: 'procurement', title: t($locale, 'procurement'), rows: procurementEmployees }] as group}
      <div class="employee-group">
        <h4>{group.title}</h4>
        {#if group.rows.length === 0}
          <div class="mini-empty">{$locale === 'ar' ? 'لا يوجد إنجاز معتمد ضمن الفترة' : 'No approved progress in this period'}</div>
        {:else}
          {#each group.rows as employee (employee.engineer)}
            <div class="employee-row">
              <div><b>{employee.engineer}</b><small>{employee.machines} {$locale === 'ar' ? 'ماكينات' : 'machines'} · {employee.reports} {$locale === 'ar' ? 'تقارير' : 'reports'}</small></div>
              <strong class="mono">{employee.score}%</strong>
            </div>
          {/each}
        {/if}
      </div>
    {/each}
  </div>
</section>
<section class="panel">
  <div class="panel-head">
    <div>
      <h3>{t($locale, 'machineProgressToDate')}</h3>
      <p>{t($locale, 'machineProgressToDateDesc')}</p>
    </div>
    <span class="count-tag mono">{loading ? '—' : machineSummaries.length}</span>
  </div>

  {#if loading}
    <div class="empty">{t($locale, 'loading')}</div>
  {:else if machineSummaries.length === 0}
    <div class="empty">{t($locale, 'noMatchingOperations')}</div>
  {:else}
    <div class="machine-grid">
      {#each machineSummaries as machine (machine.id)}
        <article class="machine-card">
          <h4>{machine.name}</h4>
          <div class="progress-line">
            <div class="progress-label">
              <span>{t($locale, 'followup')}</span>
              <b class="mono">{machine.followup}%</b>
            </div>
            <div class="track"><div class="fill followup-fill" style="width:{machine.followup}%"></div></div>
          </div>
          <div class="progress-line">
            <div class="progress-label">
              <span>{t($locale, 'procurement')}</span>
              <b class="mono">{machine.procurement}%</b>
            </div>
            <div class="track"><div class="fill procurement-fill" style="width:{machine.procurement}%"></div></div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>

<section class="panel">
  <div class="panel-head">
    <div>
      <h3>{t($locale, 'unifiedDailyProgress')}</h3>
      <p>{t($locale, 'unifiedDailyProgressDesc')}</p>
    </div>
    <span class="count-tag mono">{loading ? '—' : filteredRows.length}</span>
  </div>

  {#if loading}
    <div class="empty">{t($locale, 'loading')}</div>
  {:else if filteredRows.length === 0}
    <div class="empty">{t($locale, 'noProgressForFilters')}</div>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t($locale, 'colWorkDate')}</th>
            <th>{t($locale, 'machineLabel')}</th>
            <th>{t($locale, 'departmentLabel')}</th>
            <th>{t($locale, 'engineerLabel')}</th>
            <th>{t($locale, 'achievementDetails')}</th>
            <th>{t($locale, 'dailyAchievement')}</th>
            <th>{t($locale, 'cumulativeAchievement')}</th>
            <th class="col-center">{t($locale, 'colApprovalStatus')}</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredRows as row (row.id)}
            <tr>
              <td class="mono muted">{formatDate(row.workDate)}</td>
              <td class="machine-name">{row.machine}</td>
              <td><span class="source source-{row.source}">{t($locale, row.source)}</span></td>
              <td>{row.engineer}</td>
              <td>{row.detail}{row.pieces !== null ? ` · ${row.pieces} ${t($locale, 'pieceUnit')}` : ''}</td>
              <td class="mono">{row.dailyValue}%</td>
              <td>
                <div class="table-progress">
                  <div class="track"><div class="fill" class:followup-fill={row.source === 'followup'} class:procurement-fill={row.source === 'procurement'} style="width:{row.cumulativeValue}%"></div></div>
                  <b class="mono">{row.cumulativeValue}%</b>
                </div>
              </td>
              <td class="col-center"><span class="status-pill status-{row.approvalStatus}">{statusText(row.approvalStatus)}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  .period-tabs {
    display: inline-grid;
    grid-template-columns: repeat(3, minmax(92px, 1fr));
    gap: 4px;
    padding: 4px;
    margin-bottom: 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--paper);
  }
  .period-tabs button {
    min-height: 36px;
    padding: 7px 16px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--ink-soft);
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
  }
  .period-tabs button.active {
    background: var(--navy);
    color: #fff;
    box-shadow: 0 4px 12px rgba(9, 45, 65, 0.18);
  }
  .filters {
    display: grid;
    grid-template-columns: minmax(190px, 240px) minmax(220px, 1fr);
    gap: 12px;
    align-items: end;
  }
  .filters label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    font-size: 12px;
    font-weight: 700;
    color: var(--ink-soft);
  }
  .filters select {
    width: 100%;
    min-height: 38px;
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 7px 10px;
    background: var(--card);
    color: var(--ink);
    font: inherit;
  }

  .error-box {
    padding: 11px 14px;
    border: 1px solid var(--danger);
    border-radius: 7px;
    background: var(--danger-bg);
    color: var(--danger-deep);
    font-size: 13px;
  }
  .employee-panel {
    margin-top: 18px;
  }
  .employee-columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  .employee-group {
    border: 1px solid var(--border);
    border-radius: 7px;
    overflow: hidden;
  }
  .employee-group h4 {
    margin: 0;
    padding: 11px 13px;
    background: var(--paper);
    color: var(--ink);
    font-size: 13px;
  }
  .employee-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 58px;
    padding: 9px 13px;
    border-top: 1px solid var(--border);
  }
  .employee-row > div {
    display: grid;
    gap: 3px;
  }
  .employee-row b {
    font-size: 13px;
  }
  .employee-row small,
  .mini-empty {
    color: var(--ink-soft);
    font-size: 11.5px;
  }
  .employee-row strong {
    color: var(--navy);
    font-size: 22px;
  }
  .mini-empty {
    padding: 18px 13px;
    border-top: 1px solid var(--border);
  }
  .daily-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  .stat {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 5px 14px;
    align-items: center;
    padding: 16px 18px;
    border: 1px solid var(--border);
    border-inline-start: 4px solid var(--navy-3);
    border-radius: var(--radius);
    background: var(--card);
    box-shadow: var(--shadow);
  }
  .procurement-stat {
    border-inline-start-color: var(--amber);
  }
  .stat-label {
    font-size: 13px;
    font-weight: 800;
  }
  .stat strong {
    grid-row: 1 / 3;
    grid-column: 2;
    font-size: 25px;
  }
  .stat small {
    color: var(--ink-soft);
    font-size: 11.5px;
  }
  .panel {
    padding: 18px 20px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--card);
    box-shadow: var(--shadow);
    min-width: 0;
    margin-top: 18px;
  }
  .panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 16px;
  }
  .panel-head h3 {
    margin: 0 0 4px;
    font-size: 15px;
  }
  .panel-head p {
    margin: 0;
    color: var(--ink-soft);
    font-size: 12.5px;
  }
  .count-tag {
    flex-shrink: 0;
    padding: 3px 9px;
    border: 1px solid var(--border);
    border-radius: 20px;
    background: var(--paper);
    color: var(--ink-soft);
    font-size: 11px;
  }
  .machine-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .machine-card {
    padding: 14px;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--paper);
  }
  .machine-card h4 {
    margin: 0 0 13px;
    font-size: 13.5px;
  }
  .progress-line + .progress-line {
    margin-top: 11px;
  }
  .progress-label {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 5px;
    color: var(--ink-soft);
    font-size: 11.5px;
  }
  .progress-label b {
    color: var(--ink);
  }
  .track {
    height: 7px;
    overflow: hidden;
    border-radius: 4px;
    background: var(--border);
  }
  .fill {
    height: 100%;
    border-radius: 4px;
    background: var(--navy-3);
  }
  .followup-fill {
    background: var(--navy-3);
  }
  .procurement-fill {
    background: var(--amber);
  }
  .empty {
    padding: 32px;
    text-align: center;
    color: var(--ink-soft);
    font-size: 13px;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    min-width: 960px;
    border-collapse: collapse;
    font-size: 12.5px;
  }
  th {
    padding: 9px 10px;
    border-bottom: 1px solid var(--border);
    background: var(--paper);
    color: var(--steel-2);
    font-size: 10.5px;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
  }
  td {
    padding: 11px 10px;
    border-bottom: 1px solid var(--border);
    text-align: center;
    vertical-align: middle;
  }
  tr:last-child td {
    border-bottom: 0;
  }
  .machine-name {
    font-weight: 700;
  }
  .muted {
    color: var(--ink-soft);
  }
  .source {
    display: inline-flex;
    padding: 3px 9px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }
  .source-followup {
    background: var(--info-bg);
    color: var(--info-ink);
  }
  .source-procurement {
    background: var(--amber-bg);
    color: var(--amber-ink);
  }
  .table-progress {
    display: grid;
    grid-template-columns: minmax(70px, 1fr) 38px;
    align-items: center;
    gap: 8px;
  }
  .table-progress b {
    font-size: 11.5px;
  }
  /* The three approval states reuse the shared pill palette: pending borrows
     amber, approved success, rejected danger. */
  .status-pill.status-pending {
    background: var(--amber-bg);
    color: var(--amber-ink);
  }
  .status-pill.status-approved {
    background: var(--success-bg);
    color: var(--success-deep);
  }
  .status-pill.status-rejected {
    background: var(--danger-bg);
    color: var(--danger-deep);
  }

  @media (max-width: 760px) {
    .filters,
    .daily-stats,
    .machine-grid,
    .employee-columns {
      grid-template-columns: 1fr;
    }
    .stat strong {
      font-size: 22px;
    }
  }
</style>
