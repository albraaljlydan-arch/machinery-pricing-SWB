<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { formatDate } from '$lib/calc/formatDate';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t, requestStatusLabel } from '$lib/i18n/dict';
  import type { CustomerRequest } from '$lib/types';

  let requests: CustomerRequest[] = [];
  let customerNames: Record<string, string> = {};
  let loading = true;

  async function load() {
    loading = true;
    const { data, error } = await supabase.from('customer_requests').select('*').order('created_at', { ascending: false });
    if (!error) requests = (data as CustomerRequest[]) || [];

    const ids = [...new Set(requests.map((r) => r.customer_id))];
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      customerNames = Object.fromEntries((profiles || []).map((p) => [p.id, p.full_name]));
    }
    loading = false;
  }
  onMount(load);
</script>

<section>
  <div class="panel">
    <div class="panel-head">
      <span class="count-tag"><span class="mono">{loading ? '—' : requests.length}</span> {t($locale, 'requestsCountSuffix')}</span>
    </div>

    {#if loading}
      <div class="empty">{t($locale, 'loading')}</div>
    {:else if requests.length === 0}
      <div class="empty">{t($locale, 'noRequestsPlain')}</div>
    {:else}
      <table>
        <thead>
          <tr>
            <th>{t($locale, 'colRequestTitle')}</th>
            <th>{t($locale, 'colClient')}</th>
            <th>{t($locale, 'colMachineType')}</th>
            <th class="col-center">{t($locale, 'colStatus')}</th>
            <th class="col-center">{t($locale, 'colCreated')}</th>
          </tr>
        </thead>
        <tbody>
          {#each requests as r (r.id)}
            <tr class="clickable-row" on:click={() => goto(`/factory/requests/${r.id}`)}>
              <td class="name">{r.title}</td>
              <td>{customerNames[r.customer_id] ?? '—'}</td>
              <td>{r.spec_data?.machineType ?? '—'}</td>
              <td class="col-center"><span class="status-tag status-{r.status}">{requestStatusLabel($locale, r.status)}</span></td>
              <td class="muted mono">{formatDate(r.created_at)}</td>
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
    overflow-x: auto;
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 16px 18px;
    border-bottom: 1px solid var(--border);
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
  .empty {
    padding: 40px;
    text-align: center;
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
    letter-spacing: 0.4px;
    text-transform: uppercase;
    padding: 10px 18px;
    background: var(--paper);
    border-bottom: 1px solid var(--border);
    font-weight: 700;
  }
  td {
    text-align: center;
    padding: 13px 18px;
    border-bottom: 1px solid var(--border);
  }
  tr:last-child td {
    border-bottom: none;
  }
  .name {
    font-weight: 700;
  }
  .muted {
    color: var(--ink-soft);
    font-size: 12.5px;
  }
  .clickable-row {
    cursor: pointer;
  }
  .clickable-row:hover td {
    background: var(--card-hover);
  }
  .status-tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    background: var(--paper);
    border: 1px solid var(--border);
    color: var(--ink-soft);
  }
  .status-Assigned {
    background: var(--success-bg, #e2f5ea);
    color: var(--success-deep, #1a7a45);
    border-color: transparent;
  }
  .status-Rejected {
    background: var(--danger-bg);
    color: var(--danger-deep);
    border-color: transparent;
  }
</style>
