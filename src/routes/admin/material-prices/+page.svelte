<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { MATERIALS } from '$lib/constants';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';

  interface PriceRow {
    material_id: string;
    wholesale_price: number;
    retail_price: number;
  }

  let prices: PriceRow[] = [];
  let loading = true;

  onMount(async () => {
    const { data, error } = await supabase.from('material_prices').select('*');
    if (!error) prices = data || [];
    loading = false;
  });

  function nameFor(id: string) {
    return MATERIALS.find((m) => m.id === id)?.nameEn ?? id;
  }
  function fmt(n: number) {
    return Number(n || 0).toFixed(2);
  }
</script>

<div class="panel">
  <p class="note">{t($locale, 'materialPricesReadonlyNote')}</p>

  {#if loading}
    <div class="empty">{t($locale, 'loading')}</div>
  {:else}
    <table>
      <thead>
        <tr>
          <th>{t($locale, 'colMaterial')}</th>
          <th>{t($locale, 'colWholesalePrice')}</th>
          <th>{t($locale, 'colRetailPrice')}</th>
        </tr>
      </thead>
      <tbody>
        {#each prices as p (p.material_id)}
          <tr>
            <td class="name">{nameFor(p.material_id)}</td>
            <td class="mono">${fmt(p.wholesale_price)}</td>
            <td class="mono">${fmt(p.retail_price)}</td>
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
    overflow-x: auto;
  }
  .note {
    margin: 0 0 14px;
    font-size: 12.5px;
    color: var(--ink-soft);
  }
  .empty {
    padding: 30px;
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
  .name {
    font-weight: 700;
  }
</style>
