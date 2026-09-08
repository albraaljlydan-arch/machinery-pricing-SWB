<script lang="ts">
  import { onMount } from 'svelte';
  import './shared-tab.css';
  import type { SquareRow } from '$lib/types';
  import { MATERIALS, TYPE_OPTIONS } from '$lib/constants';
  import { computeSquareRow, generateUid, formatNum } from '$lib/utils';
  import { applyRowPricing } from '$lib/calc/pricing';
  import { SQUARE_COLUMNS, withDiscount, withCustomColumns, withLabelOverrides } from '$lib/calc/tableColumns';
  import { loadFieldConfig, emptyFieldConfig, type FieldConfigData, type CustomFieldDef } from '$lib/calc/fieldConfig';
  import DecimalInput from './DecimalInput.svelte';
  import QuantityInput from './QuantityInput.svelte';
  import DiscountInput from './DiscountInput.svelte';

  export let mode: 'designer' | 'procurement' = 'designer';
  export let rows: SquareRow[];
  export let flagged: Map<string, string> | undefined = undefined;

  let fieldConfig: FieldConfigData = emptyFieldConfig;
  onMount(async () => {
    if (mode === 'designer') fieldConfig = await loadFieldConfig('designer_square');
  });
  $: customCols = fieldConfig.customColumns;

  $: showManualPrice = mode === 'procurement';
  $: showDiscount = mode === 'procurement';
  $: columns = withCustomColumns(
    withLabelOverrides(withDiscount(SQUARE_COLUMNS, showDiscount), mode === 'designer' ? fieldConfig.labelOverrides : undefined),
    mode === 'designer' ? customCols : []
  );

  function updateCustomField(rowId: string, fieldId: string, value: string | number) {
    rows = rows.map((r) => (r.id === rowId ? { ...r, customFields: { ...(r.customFields ?? {}), [fieldId]: value } } : r));
  }
  function customSelectValue(row: SquareRow, c: CustomFieldDef): string {
    const val = row.customFields?.[c.id];
    if (val === undefined || val === '') return '';
    const opts = c.constraints?.options ?? [];
    return opts.includes(String(val)) ? String(val) : '__custom__';
  }
  function handleDropdownChange(rowId: string, c: CustomFieldDef, value: string) {
    updateCustomField(rowId, c.id, value === '__custom__' ? '' : value);
  }

  function effective(row: SquareRow) {
    return applyRowPricing(computeSquareRow(row, row.type === 'standard' ? 'wholesale' : 'retail'), row);
  }
  function addRow() {
    rows = [...rows, { id: generateUid(), materialId: 'ss304', length: 5, width: 5, thickness: 20, quantity: 1, type: 'standard', discount: 0 }];
  }
  function removeRow(id: string) {
    rows = rows.filter((r) => r.id !== id);
  }
  function updateRow(id: string, patch: Partial<SquareRow>) {
    rows = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
  }

  $: totals = rows.reduce(
    (acc, row) => {
      const eff = effective(row);
      acc.weight += eff.totalWeight;
      acc.discount += eff.discount;
      acc.total += eff.finalTotal;
      return acc;
    },
    { weight: 0, discount: 0, total: 0 }
  );
</script>

<div class="card">
  <div class="card-header">
    <div class="card-title"><span class="tag">05</span><h2>Square Bars &amp; Blocks</h2></div>
    <button class="btn-add" on:click={addRow}>+ Add Square</button>
  </div>

  <div class="table-wrap">
    <table>
      <colgroup>
        <col style="width: 3.37%" /><col style="width: 15.87%" /><col style="width: 8.93%" />
        <col style="width: 8.93%" /><col style="width: 17.36%" /><col style="width: 9.42%" />
        <col style="width: 5.95%" /><col style="width: 8.93%" />
        <col style="width: {showDiscount ? '6%' : '8.13%'}" />
        {#if showDiscount}<col style="width: 6%" />{/if}
        {#each mode === 'designer' ? customCols : [] as c (c.id)}<col style="width: 9%" />{/each}
        <col style="width: {showDiscount ? '7%' : '9.52%'}" />
        <col style="width: 3.59%" />
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
          <tr class:row-flagged={flagged?.has(row.id)}>
            <td class="idx">{i + 1}</td>
            <td>
              <select class="input" value={row.materialId} on:change={(e) => updateRow(row.id, { materialId: e.currentTarget.value })}>
                {#each MATERIALS as m}<option value={m.id}>{m.nameEn}</option>{/each}
              </select>
            </td>
            <td><DecimalInput bind:value={row.length} placeholder="cm" /></td>
            <td><DecimalInput bind:value={row.width} placeholder="cm" /></td>
            <td>
              <select class="input" value={row.type} on:change={(e) => updateRow(row.id, { type: e.currentTarget.value as SquareRow['type'] })}>
                {#each TYPE_OPTIONS as t}<option value={t.v}>{t.l}</option>{/each}
              </select>
            </td>
            <td><DecimalInput bind:value={row.thickness} placeholder="mm" /></td>
            <td><QuantityInput bind:value={row.quantity} /></td>
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
            <td class="num total">${formatNum(eff.finalTotal, 2)}</td>
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
    <div><span class="lbl">Total Square Weight</span><span class="val">{formatNum(totals.weight, 2)} kg</span></div>
    {#if showDiscount}
      <div><span class="lbl">Total Discount</span><span class="val discount">-${formatNum(totals.discount, 2)}</span></div>
    {/if}
    <div><span class="lbl">Final Total Price</span><span class="val price">${formatNum(totals.total, 2)}</span></div>
  </div>
</div>
