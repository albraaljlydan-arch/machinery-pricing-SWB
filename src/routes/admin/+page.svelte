<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { formatDate } from '$lib/calc/formatDate';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import StatCard from '$lib/components/admin/StatCard.svelte';
  import DonutMetric from '$lib/components/admin/DonutMetric.svelte';

  interface ProjectRow {
    id: string;
    project_name: string;
    client: string | null;
    total_cost: number;
    status: string;
    created_at: string;
  }

  interface OperationRow {
    id: string;
    project_id: string;
    project_name_snapshot: string;
    operation_type: string;
    work_date: string;
    completion_percent: number;
    created_at: string;
  }

  interface PurchaseRow {
    id: string;
    project_id: string;
    project_name_snapshot: string;
    work_date: string;
    pieces_today: number;
    daily_percent: number;
    cumulative_percent: number;
    created_at: string;
  }

  interface ActivityRow {
    id: string;
    source: 'factory' | 'procurement';
    name: string;
    date: string;
    value: number;
    pieces: number | null;
    createdAt: string;
  }

  let projects: ProjectRow[] = [];
  let operations: OperationRow[] = [];
  let purchases: PurchaseRow[] = [];
  let loading = true;
  let loadError = '';

  function dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const today = new Date();
  const todayStr = dateKey(today);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStartStr = dateKey(monthStart);

  onMount(async () => {
    const [projectsRes, operationsRes, purchasesRes] = await Promise.all([
      supabase.from('projects_with_designer').select('*').order('created_at', { ascending: false }),
      supabase
        .from('factory_operations')
        .select('id, project_id, project_name_snapshot, operation_type, work_date, completion_percent, created_at')
        .eq('approval_status', 'approved')
        .order('work_date', { ascending: false }),
      supabase
        .from('purchase_requests')
        .select('id, project_id, project_name_snapshot, work_date, pieces_today, daily_percent, cumulative_percent, created_at')
        .eq('approval_status', 'approved')
        .order('work_date', { ascending: false }),
    ]);

    loadError = projectsRes.error?.message || operationsRes.error?.message || purchasesRes.error?.message || '';
    projects = projectsRes.data || [];
    operations = operationsRes.data || [];
    purchases = purchasesRes.data || [];
    loading = false;
  });

  $: pending = projects.filter((project) => project.status === 'Pending Admin');
  $: inProduction = projects.filter((project) => project.status === 'In Production');
  $: completed = projects.filter((project) => project.status === 'Completed');
  $: rejected = projects.filter((project) => project.status === 'Rejected');

  function countInMonthOffset(rows: ProjectRow[], monthsAgo: number): number {
    const target = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
    return rows.filter((row) => {
      const date = new Date(row.created_at);
      return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth();
    }).length;
  }

  function deltaPct(rows: ProjectRow[]): number {
    const current = countInMonthOffset(rows, 0);
    const previous = countInMonthOffset(rows, 1);
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / previous) * 100;
  }

  function groupedAverage(rows: OperationRow[]): number {
    const byMachine: Record<string, number> = {};
    for (const row of rows) {
      byMachine[row.project_id] = Math.min(100, (byMachine[row.project_id] || 0) + Number(row.completion_percent || 0));
    }
    const values = Object.values(byMachine);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  }

  function purchaseGroupedAverage(rows: PurchaseRow[]): number {
    const byMachine: Record<string, number> = {};
    for (const row of rows) {
      byMachine[row.project_id] = Math.min(100, (byMachine[row.project_id] || 0) + Number(row.daily_percent || 0));
    }
    const values = Object.values(byMachine);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  }
  function factoryProgress(projectId: string): number {
    return Math.min(
      100,
      Math.round(
        operations
          .filter((row) => row.project_id === projectId)
          .reduce((sum, row) => sum + Number(row.completion_percent || 0), 0)
      )
    );
  }

  function procurementProgress(projectId: string): number {
    const latest = purchases
      .filter((row) => row.project_id === projectId)
      .sort((a, b) => b.work_date.localeCompare(a.work_date) || b.created_at.localeCompare(a.created_at))[0];
    return latest ? Math.min(100, Math.round(Number(latest.cumulative_percent || 0))) : 0;
  }

  $: todayOperations = operations.filter((row) => row.work_date === todayStr);
  $: thisMonthOperations = operations.filter((row) => row.work_date >= monthStartStr && row.work_date <= todayStr);
  $: todayFactoryProgress = groupedAverage(todayOperations);
  $: monthlyMachineProgress = groupedAverage(thisMonthOperations);

  $: weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = dateKey(date);
    const dayOperations = operations.filter((row) => row.work_date === key);
    const dayPurchases = purchases.filter((row) => row.work_date === key);

    return {
      key,
      label: date.toLocaleDateString($locale === 'ar' ? 'ar-SY' : 'en-US', { weekday: 'short' }),
      factory: groupedAverage(dayOperations),
      procurement: purchaseGroupedAverage(dayPurchases),
    };
  });

  $: machineRows = inProduction
    .map((project) => ({
      ...project,
      factoryProgress: factoryProgress(project.id),
      procurementProgress: procurementProgress(project.id),
    }))
    .sort((a, b) => b.factoryProgress - a.factoryProgress)
    .slice(0, 6);

  $: machinesWithoutToday = inProduction.filter((project) => !todayOperations.some((row) => row.project_id === project.id));
  $: supplyRiskCount = inProduction.filter((project) => procurementProgress(project.id) < factoryProgress(project.id)).length;

  $: recentActivity = [
    ...operations.map(
      (row): ActivityRow => ({
        id: `factory-${row.id}`,
        source: 'factory',
        name: row.project_name_snapshot,
        date: row.work_date,
        value: Math.round(Number(row.completion_percent || 0)),
        pieces: null,
        createdAt: row.created_at,
      })
    ),
    ...purchases.map(
      (row): ActivityRow => ({
        id: `procurement-${row.id}`,
        source: 'procurement',
        name: row.project_name_snapshot,
        date: row.work_date,
        value: Math.round(Number(row.daily_percent || 0)),
        pieces: Number(row.pieces_today || 0),
        createdAt: row.created_at,
      })
    ),
  ]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  $: dateRangeText = `${formatDate(monthStart)} – ${formatDate(today)}`;
</script>

<div class="dashboard-head">
  <div>
    <h2>{$locale === 'ar' ? 'ملخص أداء المعمل' : 'Factory performance overview'}</h2>
    <p>{$locale === 'ar' ? 'أهم الأرقام التي تحتاجها لاتخاذ قرار سريع اليوم.' : 'The numbers you need to make a quick decision today.'}</p>
  </div>
  <div class="head-actions">
    <span class="date-pill">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
      {dateRangeText}
    </span>
    <a class="export-btn" href="/admin/reports">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
      {t($locale, 'exportBtn')}
    </a>
  </div>
</div>

{#if loadError}
  <div class="error-box">{t($locale, 'loadErrorPrefix')}{loadError}</div>
{/if}

<div class="stat-row">
  <a href="/admin/projects?status=Pending Admin" class="stat-link">
    <StatCard icon="clock" label={t($locale, 'kpiPendingLabel')} value={pending.length} deltaPct={deltaPct(pending)} deltaLabel={t($locale, 'vsLastMonth')} {loading} />
  </a>
  <StatCard icon="gear" label={t($locale, 'kpiInProdLabel')} value={inProduction.length} deltaPct={deltaPct(inProduction)} deltaLabel={t($locale, 'vsLastMonth')} {loading} />
  <StatCard icon="check" label={t($locale, 'kpiCompletedLabel')} value={completed.length} deltaPct={deltaPct(completed)} deltaLabel={t($locale, 'vsLastMonth')} {loading} />
  <a href="/admin/projects?status=Rejected" class="stat-link">
    <StatCard icon="x" label={t($locale, 'kpiRejectedLabel')} value={rejected.length} deltaPct={deltaPct(rejected)} deltaLabel={t($locale, 'vsLastMonth')} {loading} />
  </a>
</div>

<div class="analytics-layout">
  <section class="panel weekly-panel">
  <div class="panel-head">
    <div>
      <h3>{$locale === 'ar' ? 'أداء آخر 7 أيام' : 'Last 7 days performance'}</h3>
      <p>{$locale === 'ar' ? 'متوسط الإنجاز اليومي المعتمد' : 'Average approved daily progress'}</p>
    </div>
    <div class="legend">
      <span><i class="factory-dot"></i>{t($locale, 'followup')}</span>
      <span><i class="purchase-dot"></i>{t($locale, 'procurement')}</span>
    </div>
  </div>

  <div class="chart" aria-label={$locale === 'ar' ? 'مخطط أداء آخر سبعة أيام' : 'Seven day performance chart'}>
    {#each weekDays as day (day.key)}
      <div class="day-column">
        <div class="bars">
          <div class="bar factory-bar" style="height:{Math.max(3, day.factory)}%" title={`${day.factory}%`}><span>{day.factory || ''}</span></div>
          <div class="bar purchase-bar" style="height:{Math.max(3, day.procurement)}%" title={`${day.procurement}%`}><span>{day.procurement || ''}</span></div>
        </div>
        <small>{day.label}</small>
      </div>
    {/each}
  </div>
</section>

<div class="indicator-stack">
  <section class="panel metric-panel">
    <DonutMetric
      value={todayFactoryProgress}
      tone="factory"
      label={$locale === 'ar' ? 'إنجاز المصنع اليوم' : 'Factory progress today'}
      detail={$locale === 'ar' ? `${todayOperations.length} تقارير متابعة معتمدة اليوم` : `${todayOperations.length} approved follow-up reports today`}
    />
  </section>
  <section class="panel metric-panel">
    <DonutMetric
      value={monthlyMachineProgress}
      tone="monthly"
      label={$locale === 'ar' ? 'تقدّم الماكينات هذا الشهر' : 'Machine progress this month'}
      detail={$locale === 'ar' ? `${new Set(thisMonthOperations.map((row) => row.project_id)).size} ماكينة مسجّل لها إنجاز هذا الشهر` : `${new Set(thisMonthOperations.map((row) => row.project_id)).size} machines with recorded progress this month`}
    />
  </section>
</div>

</div>

<section class="panel machines-panel">
  <div class="panel-head">
    <div>
      <h3>{$locale === 'ar' ? 'الماكينات قيد الإنتاج' : 'Machines in production'}</h3>
      <p>{$locale === 'ar' ? 'التقدّم الكلي للمصنع والمشتريات لكل ماكينة' : 'Total factory and procurement progress for each machine'}</p>
    </div>
    <a class="details-link" href="/admin/factory-progress">{$locale === 'ar' ? 'عرض التفاصيل' : 'View details'}</a>
  </div>

  {#if loading}
    <div class="empty">{t($locale, 'loading')}</div>
  {:else if machineRows.length === 0}
    <div class="empty">{t($locale, 'noMatchingOperations')}</div>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t($locale, 'colProject')}</th>
            <th>{t($locale, 'colClient')}</th>
            <th>{t($locale, 'followup')}</th>
            <th>{t($locale, 'procurement')}</th>
            <th>{t($locale, 'colStatus')}</th>
          </tr>
        </thead>
        <tbody>
          {#each machineRows as machine (machine.id)}
            <tr>
              <td class="machine-name">{machine.project_name}</td>
              <td>{machine.client || 'SWB Technology'}</td>
              <td>
                <div class="progress-cell">
                  <div class="mini-track"><div class="mini-fill factory-fill" style="width:{machine.factoryProgress}%"></div></div>
                  <span class="mono">{machine.factoryProgress}%</span>
                </div>
              </td>
              <td>
                <div class="progress-cell">
                  <div class="mini-track"><div class="mini-fill purchase-fill" style="width:{machine.procurementProgress}%"></div></div>
                  <span class="mono">{machine.procurementProgress}%</span>
                </div>
              </td>
              <td><StatusBadge status={machine.status} userRole="admin" locale={$locale} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<div class="lower-grid">
  <section class="panel activity-panel">
    <div class="panel-head">
      <div>
        <h3>{$locale === 'ar' ? 'آخر نشاط معتمد' : 'Latest approved activity'}</h3>
        <p>{$locale === 'ar' ? 'آخر تحديثات المتابعة والمشتريات' : 'Recent follow-up and procurement updates'}</p>
      </div>
    </div>
    {#if loading}
      <div class="empty">{t($locale, 'loading')}</div>
    {:else if recentActivity.length === 0}
      <div class="empty">{t($locale, 'noProgressForFilters')}</div>
    {:else}
      <div class="activity-list">
        {#each recentActivity as activity (activity.id)}
          <div class="activity-row">
            <span class="activity-icon activity-{activity.source}">
              {#if activity.source === 'factory'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V9l5 3V9l5 3V5h4l2 15Z" /><path d="M3 20h18" /></svg>
              {:else}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h19l-2 9H7L5 3H2" /><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg>
              {/if}
            </span>
            <div class="activity-copy">
              <b>{activity.name}</b>
              <span>{activity.source === 'factory' ? t($locale, 'followup') : t($locale, 'procurement')} · {formatDate(activity.date)}</span>
            </div>
            <strong class="mono">{activity.pieces !== null ? `${activity.pieces} pcs` : `${activity.value}%`}</strong>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="panel attention-panel">
    <div class="panel-head">
      <div>
        <h3>{$locale === 'ar' ? 'يحتاج انتباهك' : 'Needs your attention'}</h3>
        <p>{$locale === 'ar' ? 'أهم الحالات التي قد تؤخر سير العمل' : 'The main items that may slow production'}</p>
      </div>
    </div>
    <div class="attention-list">
      <a class="attention-row attention-approval" href="/admin/projects?status=Pending Admin">
        <span class="attention-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 8v5M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
        </span>
        <div>
          <b>{$locale === 'ar' ? 'مشاريع تنتظر موافقتك' : 'Projects awaiting your approval'}</b>
          <small>{$locale === 'ar' ? 'راجعها حتى لا يتوقف خط العمل' : 'Review them to keep work moving'}</small>
        </div>
        <strong class="mono">{pending.length}</strong>
      </a>
      <a class="attention-row attention-progress" href="/admin/factory-progress">
        <span class="attention-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V9l5 3V9l5 3V5h4l2 15Z" /><path d="M3 20h18" /></svg>
        </span>
        <div>
          <b>{$locale === 'ar' ? 'ماكينات بلا تحديث اليوم' : 'Machines without an update today'}</b>
          <small>{$locale === 'ar' ? 'لم يصل لها تقرير متابعة معتمد' : 'No approved follow-up report received'}</small>
        </div>
        <strong class="mono">{machinesWithoutToday.length}</strong>
      </a>
      <a class="attention-row attention-supply" href="/admin/factory-progress">
        <span class="attention-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h19l-2 9H7L5 3H2" /><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg>
        </span>
        <div>
          <b>{$locale === 'ar' ? 'مشتريات متأخرة عن التصنيع' : 'Purchasing behind production'}</b>
          <small>{$locale === 'ar' ? 'نسبة الشراء أقل من إنجاز المصنع' : 'Purchasing progress is below factory progress'}</small>
        </div>
        <strong class="mono">{supplyRiskCount}</strong>
      </a>
    </div>
  </section>
</div>

<style>
  .dashboard-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    flex-wrap: wrap;
  }
  .dashboard-head h2 {
    margin: 0 0 3px;
    font-size: 20px;
  }
  .dashboard-head p {
    margin: 0;
    color: var(--ink);
    font-size: 12px;
    font-weight: 800;
  }
  .head-actions {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .date-pill,
  .export-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 36px;
    padding: 7px 12px;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--card);
    color: var(--ink-soft);
    font-size: 11.5px;
    font-weight: 700;
  }
  .export-btn {
    background: var(--navy-3);
    border-color: var(--navy-3);
    color: #fff;
  }
  .date-pill svg,
  .export-btn svg {
    width: 15px;
    height: 15px;
  }
  .error-box {
    padding: 11px 14px;
    border: 1px solid var(--danger);
    border-radius: 7px;
    background: var(--danger-bg);
    color: var(--danger-deep);
    font-size: 13px;
  }
  .stat-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }
  .stat-link {
    display: block;
    min-width: 0;
  }
  .analytics-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(340px, 0.8fr);
    gap: 16px;
    align-items: stretch;
  }
  .indicator-stack {
    display: grid;
    grid-template-rows: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .metric-panel {
    min-height: 0;
    display: grid;
    place-items: center;
  }
  .panel {
    min-width: 0;
    padding: 18px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    box-shadow: var(--shadow);
  }
  .panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 15px;
  }
  .panel-head h3 {
    margin: 0 0 3px;
    font-size: 14px;
  }
  .panel-head p {
    margin: 0;
    color: var(--ink-soft);
    font-size: 11.5px;
  }
  .legend {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
    color: var(--ink-soft);
    font-size: 10.5px;
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .legend i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  .factory-dot {
    background: var(--success);
  }
  .purchase-dot {
    background: var(--purple);
  }
  .chart {
    height: 290px;
    display: grid;
    grid-template-columns: repeat(7, minmax(30px, 1fr));
    gap: 18px;
    align-items: end;
    padding: 18px 18px 0;
    border-bottom: 1px solid var(--border);
    background-image: linear-gradient(to bottom, transparent 24%, var(--border) 25%, transparent 25%, transparent 49%, var(--border) 50%, transparent 50%, transparent 74%, var(--border) 75%, transparent 75%);
  }
  .day-column {
    height: 100%;
    display: grid;
    grid-template-rows: 1fr 24px;
    align-items: end;
    gap: 7px;
    min-width: 0;
  }
  .day-column .bars {
    height: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 5px;
  }
  .bar {
    position: relative;
    width: min(34px, 42%);
    min-height: 3px;
    border-radius: 3px 3px 0 0;
    transition: height 800ms cubic-bezier(0.22, 1, 0.36, 1), filter 160ms ease;
  }
  .bar:hover {
    filter: brightness(1.12);
  }
  .bar span {
    position: absolute;
    inset-inline-start: 50%;
    bottom: calc(100% + 4px);
    transform: translateX(-50%);
    color: var(--ink);
    font-size: 12px;
    font-weight: 800;
  }
  .factory-bar {
    background: linear-gradient(to top, #14513c, #3ca874);
  }
  .purchase-bar {
    background: linear-gradient(to top, #5632c7, #9475ef);
  }
  .day-column small {
    overflow: hidden;
    color: var(--navy);
    font-size: 12px;
    font-weight: 800;
    text-align: center;
    white-space: nowrap;
  }
  .machines-panel {
    padding-bottom: 4px;
  }
  .details-link {
    flex-shrink: 0;
    color: var(--navy-3);
    font-size: 11.5px;
    font-weight: 800;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    min-width: 720px;
    border-collapse: collapse;
    font-size: 12.5px;
  }
  th {
    padding: 9px 10px;
    border-bottom: 1px solid var(--border);
    background: var(--paper);
    color: var(--steel-2);
    font-size: 10px;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
  }
  td {
    padding: 11px 10px;
    border-bottom: 1px solid var(--border);
    text-align: center;
  }
  tr:last-child td {
    border-bottom: 0;
  }
  .machine-name {
    font-weight: 800;
  }
  .progress-cell {
    display: grid;
    grid-template-columns: minmax(70px, 1fr) 38px;
    align-items: center;
    gap: 8px;
  }
  .mini-track {
    height: 6px;
    overflow: hidden;
    border-radius: 4px;
    background: var(--border);
  }
  .mini-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 850ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .factory-fill {
    background: var(--success);
  }
  .purchase-fill {
    background: var(--purple);
  }
  .progress-cell span {
    font-size: 10.5px;
  }
  .lower-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.8fr);
    gap: 16px;
    align-items: start;
  }
  .activity-panel {
    padding-bottom: 8px;
  }
  .activity-list {
    display: flex;
    flex-direction: column;
  }
  .activity-row {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
  }
  .activity-row:last-child {
    border-bottom: 0;
  }
  .activity-icon {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 7px;
  }
  .activity-icon svg {
    width: 16px;
    height: 16px;
  }
  .activity-factory {
    background: var(--success-bg);
    color: var(--success-deep);
  }
  .activity-procurement {
    background: var(--purple-bg);
    color: var(--purple-ink);
  }
  .activity-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .activity-copy b {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .activity-copy span {
    color: var(--ink-soft);
    font-size: 10.5px;
  }
  .activity-row > strong {
    font-size: 12px;
  }
  .attention-panel {
    padding-bottom: 8px;
  }
  .attention-list {
    display: flex;
    flex-direction: column;
  }
  .attention-row {
    min-width: 0;
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) auto;
    align-items: center;
    gap: 11px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
    color: var(--ink);
    transition: background 160ms ease;
  }
  .attention-row:last-child {
    border-bottom: 0;
  }
  .attention-row:hover {
    background: var(--card-hover);
  }
  .attention-icon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 7px;
    background: var(--paper);
    color: var(--navy-3);
  }
  .attention-icon svg {
    width: 18px;
    height: 18px;
  }
  .attention-approval .attention-icon {
    background: var(--amber-bg);
    color: var(--amber-ink);
  }
  .attention-progress .attention-icon {
    background: var(--info-bg);
    color: var(--info-ink);
  }
  .attention-supply .attention-icon {
    background: var(--purple-bg);
    color: var(--purple-ink);
  }
  .attention-row > div {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .attention-row b {
    font-size: 12px;
  }
  .attention-row small {
    color: var(--ink-soft);
    font-size: 10.5px;
  }
  .attention-row > strong {
    min-width: 34px;
    font-size: 24px;
    font-weight: 850;
    text-align: center;
  }
  .empty {
    padding: 30px 18px;
    color: var(--ink-soft);
    font-size: 12.5px;
    text-align: center;
  }

  @media (max-width: 1200px) {
    .lower-grid {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 900px) {
    .stat-row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 680px) {
    .dashboard-head,
    .head-actions {
      align-items: stretch;
    }
    .head-actions {
      width: 100%;
    }
    .date-pill,
    .export-btn {
      justify-content: center;
      flex: 1;
    }
    .stat-row,
    .chart {
      gap: 5px;
      padding-inline: 0;
    }
    .panel-head {
      flex-wrap: wrap;
    }
  }
</style>
