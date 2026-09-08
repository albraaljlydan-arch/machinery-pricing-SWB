<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { formatDate } from '$lib/calc/formatDate';

  interface OperationRow {
    id: string;
    project_name_snapshot: string;
    operation_type: string;
    work_date: string;
    completion_percent: number;
    notes: string | null;
  }

  let operations: OperationRow[] = [];
  let loading = true;
  let search = '';

  onMount(async () => {
    // Admin only ever sees APPROVED entries, and never the worker's
    // identity — Factory approves the raw entries, Follow-up Engineer's
    // roster of workers stays entirely between those two roles.
    const { data, error } = await supabase
      .from('factory_operations')
      .select('id, project_name_snapshot, operation_type, work_date, completion_percent, notes')
      .eq('approval_status', 'approved')
      .order('work_date', { ascending: false });
    if (!error) operations = data || [];
    loading = false;
  });

  $: filtered = search.trim() ? operations.filter((o) => o.project_name_snapshot.toLowerCase().includes(search.trim().toLowerCase())) : operations;

  $: byMachine = Object.entries(
    operations.reduce(
      (acc, o) => {
        acc[o.operation_type] = acc[o.operation_type] || { count: 0, sum: 0 };
        acc[o.operation_type].count += 1;
        acc[o.operation_type].sum += Number(o.completion_percent || 0);
        return acc;
      },
      {} as Record<string, { count: number; sum: number }>
    )
  )
    .map(([type, v]) => ({ type, count: v.count, avg: Math.round(v.sum / v.count) }))
    .sort((a, b) => b.count - a.count);
</script>

<section>
  <div class="panel">
    <div class="panel-head">
      <h3>{t($locale, 'factoryProgressByMachine')}</h3>
    </div>
    <p class="desc">{t($locale, 'factoryProgressDesc')}</p>

    {#if loading}
      <div class="empty">{t($locale, 'loading')}</div>
    {:else if byMachine.length === 0}
      <div class="empty">{t($locale, 'noMatchingOperations')}</div>
    {:else}
      <div class="bars">
        {#each byMachine as m (m.type)}
          <div class="bar-row">
            <span class="bar-label">{m.type}</span>
            <div class="bar-track"><div class="bar-fill" style="width:{m.avg}%"></div></div>
            <span class="bar-value mono">{m.avg}%</span>
            <span class="bar-count mono">({m.count})</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="panel">
    <div class="panel-head">
      <h3>{t($locale, 'dailyProgressTitle')}</h3>
      <span class="count-tag mono">{loading ? '—' : filtered.length}</span>
    </div>
    <input class="search" type="text" bind:value={search} placeholder={t($locale, 'searchByProject')} dir="auto" />

    {#if loading}
      <div class="empty">{t($locale, 'loading')}</div>
    {:else if filtered.length === 0}
      <div class="empty">{t($locale, 'noMatchingOperations')}</div>
    {:else}
      <table>
        <thead>
          <tr>
            <th>{t($locale, 'colProject')}</th>
            <th>{t($locale, 'colOperationType')}</th>
            <th>{t($locale, 'colWorkDate')}</th>
            <th>{t($locale, 'colCompletion')}</th>
            <th>{t($locale, 'colNotes')}</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as row}
            <tr>
              <td class="name">{row.project_name_snapshot}</td>
              <td>{row.operation_type}</td>
              <td class="mono muted">{formatDate(row.work_date)}</td>
              <td class="mono">{row.completion_percent}%</td>
              <td class="muted">{row.notes || '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</section>

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
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    margin-bottom: 4px;
  }
  .panel-head h3 {
    margin: 0;
    margin-inline-end: auto;
    font-size: 15px;
  }
  .count-tag {
    font-size: 11px;
    font-weight: 700;
    background: var(--paper);
    padding: 2px 9px;
    border-radius: 20px;
    color: var(--ink-soft);
    border: 1px solid var(--border);
  }
  .desc {
    margin: 0 0 14px;
    font-size: 12.5px;
    color: var(--ink-soft);
  }
  .search {
    width: 100%;
    max-width: 320px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 13px;
    margin-bottom: 14px;
    background: var(--paper);
    color: var(--ink);
  }
  .empty {
    padding: 30px;
    text-align: center;
    color: var(--ink-soft);
    font-size: 13px;
  }
  .bars {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .bar-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .bar-label {
    width: 140px;
    flex-shrink: 0;
    font-size: 12.5px;
    font-weight: 600;
  }
  .bar-track {
    flex: 1;
    height: 10px;
    background: var(--paper);
    border-radius: 6px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    background: var(--navy-3, #17456a);
    border-radius: 6px;
  }
  .bar-value {
    width: 40px;
    text-align: end;
    font-size: 12px;
    font-weight: 700;
  }
  .bar-count {
    width: 36px;
    color: var(--ink-soft);
    font-size: 11.5px;
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
  .name {
    font-weight: 700;
  }
  .mono {
    font-family: var(--font-mono);
  }
  .muted {
    color: var(--ink-soft);
  }
</style>
