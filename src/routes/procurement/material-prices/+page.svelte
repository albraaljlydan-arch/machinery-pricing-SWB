<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { MATERIALS } from '$lib/constants';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';

  interface PriceRow {
    material_id: string;
    wholesale_price: number;
    retail_price: number;
  }

  let prices: PriceRow[] = [];
  let loading = true;
  let saving = false;

  onMount(async () => {
    const { data, error } = await supabase.from('material_prices').select('*');
    if (!error) prices = data || [];
    loading = false;
  });

  function nameFor(id: string) {
    return MATERIALS.find((m) => m.id === id)?.nameEn ?? id;
  }

  function updatePrice(id: string, field: 'wholesale_price' | 'retail_price', value: string) {
    const num = value === '' ? 0 : Number(value);
    prices = prices.map((p) => (p.material_id === id ? { ...p, [field]: num } : p));
  }

  async function save() {
    saving = true;
    const { error } = await supabase.from('material_prices').upsert(prices, { onConflict: 'material_id' });
    saving = false;
    if (error) toast.notify('❌ ' + error.message, 'error');
    else toast.notify(t($locale, 'pricesSavedToast'), 'success');
  }
</script>

<div class="panel">
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
            <td>
              <input class="price-input" type="number" step="0.01" min="0" value={p.wholesale_price} on:input={(e) => updatePrice(p.material_id, 'wholesale_price', e.currentTarget.value)} />
            </td>
            <td>
              <input class="price-input" type="number" step="0.01" min="0" value={p.retail_price} on:input={(e) => updatePrice(p.material_id, 'retail_price', e.currentTarget.value)} />
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    <button class="btn-save" on:click={save} disabled={saving}>{saving ? t($locale, 'savingGeneric') : t($locale, 'save')}</button>
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
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
  }
  tr:last-child td {
    border-bottom: none;
  }
  .name {
    font-weight: 700;
  }
  .price-input {
    width: 100px;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 5px 8px;
    font-size: 13px;
    font-family: var(--font-mono);
    background: var(--paper);
    color: var(--ink);
  }
  .btn-save {
    background: var(--success, #3f9463);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    margin-top: 16px;
  }
  .btn-save:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
