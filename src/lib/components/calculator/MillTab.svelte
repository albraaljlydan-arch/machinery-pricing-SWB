<script lang="ts">
  import { onMount } from 'svelte';
  import './shared-tab.css';
  import type { MillRow } from '$lib/types';
  import { MATERIALS, ROD_DIAMETERS, TYPE_OPTIONS } from '$lib/constants';
  import { computeMillRow, generateUid, formatNum } from '$lib/utils';
  import { applyRowPricing } from '$lib/calc/pricing';
  import { MILL_COLUMNS, withDiscount, withCustomColumns, withLabelOverrides } from '$lib/calc/tableColumns';
  import { loadFieldConfig, emptyFieldConfig, type FieldConfigData, type CustomFieldDef } from '$lib/calc/fieldConfig';
  import DecimalInput from './DecimalInput.svelte';
  import QuantityInput from './QuantityInput.svelte';
  import DiscountInput from './DiscountInput.svelte';

  export let mode: 'designer' | 'procurement' = 'designer';
  export let rows: MillRow[];
  export let flagged: Map<string, string> | undefined = undefined;

  // Developer-added columns — Designer's Mill tab only for now (Procurement's
  // calculator has its own separate shape and isn't wired up yet). Loaded
  // once on mount from Supabase so every Designer sees the same columns,
  // not just whoever's browser configured them.
  let fieldConfig: FieldConfigData = emptyFieldConfig;
  onMount(async () => {
    if (mode === 'designer') fieldConfig = await loadFieldConfig('designer_mill');
  });
  $: customCols = fieldConfig.customColumns;

  $: showManualPrice = mode === 'procurement';
  // Procurement's file must start with a genuinely EMPTY $/kg — no falling
  // back to the catalogue price, which is the designer's estimate. See
  // RowPricingOptions in calc/pricing.ts.
  $: requireManualPrice = mode === 'procurement';
  $: showDiscount = mode === 'procurement';
  $: columns = withCustomColumns(
    withLabelOverrides(withDiscount(MILL_COLUMNS, showDiscount), mode === 'designer' ? fieldConfig.labelOverrides : undefined),
    mode === 'designer' ? customCols : []
  );

  function updateCustomField(rowId: string, fieldId: string, value: string | number) {
    rows = rows.map((r) => (r.id === rowId ? { ...r, customFields: { ...(r.customFields ?? {}), [fieldId]: value } } : r));
  }
  function customSelectValue(row: MillRow, c: CustomFieldDef): string {
    const val = row.customFields?.[c.id];
    if (val === undefined || val === '') return '';
    const opts = c.constraints?.options ?? [];
    return opts.includes(String(val)) ? String(val) : '__custom__';
  }
  function handleDropdownChange(rowId: string, c: CustomFieldDef, value: string) {
    updateCustomField(rowId, c.id, value === '__custom__' ? '' : value);
  }

  function effective(row: MillRow, needsManualPrice = requireManualPrice) {
    return applyRowPricing(computeMillRow(row, row.type === 'standard' ? 'wholesale' : 'retail'), row, { requireManualPrice: needsManualPrice });
  }

  function addRow() {
    rows = [...rows, { id: generateUid(), materialId: 'ss304', diameterOpt: '10', diameter: 10, length: 30, quantity: 1, type: 'standard', discount: 0 }];
  }
  function removeRow(id: string) {
    rows = rows.filter((r) => r.id !== id);
  }
  function updateRow(id: string, patch: Partial<MillRow>) {
    rows = rows.map((r) => {
      if (r.id !== id) return r;
      let next = { ...r, ...patch };
      if (patch.diameterOpt && patch.diameterOpt !== 'custom') {
        const preset = ROD_DIAMETERS.find((d) => d.id === patch.diameterOpt);
        if (preset) next.diameter = preset.value;
      }
      return next;
    });
  }

  // `requireManualPrice` is passed explicitly rather than read off the
  // closure so this stays a tracked dependency of the reactive statement.
  $: totals = rows.reduce(
    (acc, row) => {
      const eff = effective(row, requireManualPrice);
      acc.weight += eff.totalWeight;
      acc.discount += eff.discount;
      acc.total += eff.finalTotal;
      if (eff.unpriced) acc.unpriced += 1;
      return acc;
    },
    { weight: 0, discount: 0, total: 0, unpriced: 0 }
  );
</script>

<div class="card">
  <div class="card-header">
    <div class="card-title"><span class="tag">03</span><h2>Mill Table (Solid Round Bars)</h2></div>
    <button class="btn-add" on:click={addRow}>+ Add Mill</button>
  </div>

  <div class="table-wrap">
    <table>
      <colgroup>
        <col style="width: 3.05%" /><col style="width: 14.38%" /><col style="width: 17.07%" />
        <col style="width: 15.72%" /><col style="width: 8.09%" /><col style="width: 5.39%" />
        <col style="width: 8.98%" /><col style="width: 8.09%" />
        <col style="width: {showDiscount ? '6%' : '7.37%'}" />
        {#if showDiscount}<col style="width: 6%" />{/if}
        {#each mode === 'designer' ? customCols : [] as c (c.id)}<col style="width: 9%" />{/each}
        <col style="width: {showDiscount ? '7%' : '8.63%'}" />
        <col style="width: 3.23%" />
      </colgroup>
      <thead>
        <tr>
          <th>#</th>
          {#each columns as col}<th>{col.label}</th>{/each}
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row, i (row.id)}
          {@const eff = effective(row)}
          {@const isCustomDia = row.diameterOpt === 'custom'}
          {@const lenM = ((row.length || 0) * (row.quantity || 0)) / 100}
          <tr class:row-flagged={flagged?.has(row.id)}>
            <td class="idx">{i + 1}</td>
            <td>
              <select class="input" value={row.materialId} on:change={(e) => updateRow(row.id, { materialId: e.currentTarget.value })}>
                {#each MATERIALS as m}<option value={m.id}>{m.nameEn}</option>{/each}
              </select>
            </td>
            <td>
              {#if isCustomDia}
                <div class="split">
                  <select class="input" value={row.diameterOpt} on:change={(e) => updateRow(row.id, { diameterOpt: e.currentTarget.value })}>
                    {#each ROD_DIAMETERS as d}<option value={d.id}>{d.label}</option>{/each}
                  </select>
                  <DecimalInput bind:value={row.diameter} placeholder="mm" />
                </div>
              {:else}
                <select class="input" value={row.diameterOpt} on:change={(e) => updateRow(row.id, { diameterOpt: e.currentTarget.value })}>
                  {#each ROD_DIAMETERS as d}<option value={d.id}>{d.label}</option>{/each}
                </select>
              {/if}
            </td>
            <td>
              <select class="input" value={row.type} on:change={(e) => updateRow(row.id, { type: e.currentTarget.value as MillRow['type'] })}>
                {#each TYPE_OPTIONS as t}<option value={t.v}>{t.l}</option>{/each}
              </select>
            </td>
            <td><DecimalInput bind:value={row.length} placeholder="cm" /></td>
            <td><QuantityInput bind:value={row.quantity} /></td>
            <td class="num">{formatNum(lenM, 2)} m</td>
            <td class="num" style="font-weight:bold">{formatNum(eff.totalWeight, 2)}</td>
            <td>
              {#if showManualPrice}
                <DecimalInput bind:value={row.manualPrice} placeholder="$/kg" />
              {:else}
                <span class="num readonly">${formatNum(eff.pricePerKg, 2)}</span>
              {/if}
            </td>
            {#if showDiscount}<td><DiscountInput bind:value={row.discount} /></td>{/if}
            {#each mode === 'designer' ? customCols : [] as c (c.id)}
              <td>
                {#if c.type === 'text'}
                  <input class="input" type="text" value={row.customFields?.[c.id] ?? ''} on:input={(e) => updateCustomField(row.id, c.id, e.currentTarget.value)} />
                {:else if c.type === 'number'}
                  <div class="split unit-split">
                    <input
                      class="input"
                      type="number"
                      step={c.constraints?.numberFormat === 'integer' ? '1' : 'any'}
                      min={c.constraints?.positiveOnly ? '0' : c.constraints?.allowNegative ? undefined : '0'}
                      value={row.customFields?.[c.id] ?? ''}
                      on:input={(e) => updateCustomField(row.id, c.id, e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))}
                    />
                    {#if c.constraints?.unit}<span class="unit-suffix">{c.constraints.unit}</span>{/if}
                  </div>
                {:else if c.type === 'dropdown'}
                  <select class="input" value={customSelectValue(row, c)} on:change={(e) => handleDropdownChange(row.id, c, e.currentTarget.value)}>
                    <option value="" disabled>Select…</option>
                    {#each c.constraints?.options ?? [] as opt}<option value={opt}>{opt}</option>{/each}
                    {#if c.constraints?.allowCustomValue}<option value="__custom__">Other…</option>{/if}
                  </select>
                  {#if c.constraints?.allowCustomValue && customSelectValue(row, c) === '__custom__'}
                    <input
                      class="input"
                      type={c.constraints?.customValueType === 'number' ? 'number' : 'text'}
                      placeholder="Type a value"
                      value={row.customFields?.[c.id] ?? ''}
                      on:input={(e) =>
                        updateCustomField(row.id, c.id, c.constraints?.customValueType === 'number' ? (e.currentTarget.value === '' ? '' : Number(e.currentTarget.value)) : e.currentTarget.value)}
                    />
                  {/if}
                {/if}
              </td>
            {/each}
            <td class="num total" class:unpriced={eff.unpriced}>{eff.unpriced ? '—' : `$${formatNum(eff.finalTotal, 2)}`}</td>
            <td class="text-center"><button class="btn-del" on:click={() => removeRow(row.id)}>✕</button></td>
          </tr>
          {#if flagged?.has(row.id)}
            <tr class="flag-reason-row"><td colspan={columns.length + 2}><span class="flag-reason-note">⚠ {flagged.get(row.id) || 'Flagged by Admin'}</span></td></tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>

  <div class="ledger">
    <div><span class="lbl">Total Mill Weight</span><span class="val">{formatNum(totals.weight, 2)} kg</span></div>
    {#if showDiscount}
      <div><span class="lbl">Total Discount</span><span class="val discount">-${formatNum(totals.discount, 2)}</span></div>
    {/if}
    {#if totals.unpriced > 0}
      <div><span class="lbl">Awaiting Price</span><span class="val warn">{totals.unpriced} row{totals.unpriced === 1 ? '' : 's'}</span></div>
    {/if}
    <div><span class="lbl">Final Total Price</span><span class="val price">${formatNum(totals.total, 2)}</span></div>
  </div>
</div>
