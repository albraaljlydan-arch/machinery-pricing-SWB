<script lang="ts">
  import { onMount } from 'svelte';
  import './shared-tab.css';
  import type { PipeRow } from '$lib/types';
  import { MATERIALS, TYPE_OPTIONS } from '$lib/constants';
  import { computePipeRow, generateUid, formatNum, getPipeError } from '$lib/utils';
  import { applyRowPricing } from '$lib/calc/pricing';
  import { PIPE_COLUMNS, withDiscount, withCustomColumns, withLabelOverrides } from '$lib/calc/tableColumns';
  import { loadFieldConfig, emptyFieldConfig, type FieldConfigData, type CustomFieldDef } from '$lib/calc/fieldConfig';
  import DecimalInput from './DecimalInput.svelte';
  import QuantityInput from './QuantityInput.svelte';
  import DiscountInput from './DiscountInput.svelte';

  export let mode: 'designer' | 'procurement' = 'designer';
  export let rows: PipeRow[];
  export let flagged: Map<string, string> | undefined = undefined;

  let fieldConfig: FieldConfigData = emptyFieldConfig;
  onMount(async () => {
    if (mode === 'designer') fieldConfig = await loadFieldConfig('designer_pipe');
  });
  $: customCols = fieldConfig.customColumns;

  $: showManualPrice = mode === 'procurement';
  // Procurement's file must start with a genuinely EMPTY $/kg — no falling
  // back to the catalogue price, which is the designer's estimate. See
  // RowPricingOptions in calc/pricing.ts.
  $: requireManualPrice = mode === 'procurement';
  $: showDiscount = mode === 'procurement';
  $: columns = withCustomColumns(
    withLabelOverrides(withDiscount(PIPE_COLUMNS, showDiscount), mode === 'designer' ? fieldConfig.labelOverrides : undefined),
    mode === 'designer' ? customCols : []
  );

  function updateCustomField(rowId: string, fieldId: string, value: string | number) {
    rows = rows.map((r) => (r.id === rowId ? { ...r, customFields: { ...(r.customFields ?? {}), [fieldId]: value } } : r));
  }
  function customSelectValue(row: PipeRow, c: CustomFieldDef): string {
    const val = row.customFields?.[c.id];
    if (val === undefined || val === '') return '';
    const opts = c.constraints?.options ?? [];
    return opts.includes(String(val)) ? String(val) : '__custom__';
  }
  function handleDropdownChange(rowId: string, c: CustomFieldDef, value: string) {
    updateCustomField(rowId, c.id, value === '__custom__' ? '' : value);
  }

  function effective(row: PipeRow, needsManualPrice = requireManualPrice) {
    return applyRowPricing(computePipeRow(row, row.type === 'standard' ? 'wholesale' : 'retail'), row, { requireManualPrice: needsManualPrice });
  }
  function addRow() {
    rows = [...rows, { id: generateUid(), materialId: 'ss304', outerDiameter: 50, innerDiameter: 40, length: 100, quantity: 1, type: 'standard', discount: 0 }];
  }
  function removeRow(id: string) {
    rows = rows.filter((r) => r.id !== id);
  }
  function updateRow(id: string, patch: Partial<PipeRow>) {
    rows = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
  }

  // `requireManualPrice` is passed explicitly rather than read off the
  // closure so this stays a tracked dependency of the reactive statement.
  $: totals = rows.reduce(
    (acc, row) => {
      if (getPipeError(row)) return acc;
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
    <div class="card-title"><span class="tag">04</span><h2>Pipes &amp; Bushings</h2></div>
    <button class="btn-add" on:click={addRow}>+ Add Pipe</button>
  </div>

  <div class="table-wrap">
    <table>
      <colgroup>
        <col style="width: 3.32%" /><col style="width: 15.64%" /><col style="width: 9.78%" />
        <col style="width: 9.78%" /><col style="width: 8.80%" /><col style="width: 17.11%" />
        <col style="width: 5.87%" /><col style="width: 8.80%" />
        <col style="width: {showDiscount ? '6.5%' : '8.02%'}" />
        {#if showDiscount}<col style="width: 6.5%" />{/if}
        {#each mode === 'designer' ? customCols : [] as c (c.id)}<col style="width: 9%" />{/each}
        <col style="width: {showDiscount ? '7%' : '9.38%'}" />
        <col style="width: 3.50%" />
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
          {@const err = getPipeError(row)}
          <tr class:error-row={!!err} class:row-flagged={flagged?.has(row.id)}>
            <td class="idx">{i + 1}</td>
            <td>
              <select class="input" value={row.materialId} on:change={(e) => updateRow(row.id, { materialId: e.currentTarget.value })}>
                {#each MATERIALS as m}<option value={m.id}>{m.nameEn}</option>{/each}
              </select>
            </td>
            <td><DecimalInput bind:value={row.outerDiameter} placeholder="mm" /></td>
            <td>
              <DecimalInput bind:value={row.innerDiameter} placeholder="mm" />
              {#if err}<div class="err-text">{err}</div>{/if}
            </td>
            <td><DecimalInput bind:value={row.length} placeholder="cm" /></td>
            <td>
              <select class="input" value={row.type} on:change={(e) => updateRow(row.id, { type: e.currentTarget.value as PipeRow['type'] })}>
                {#each TYPE_OPTIONS as t}<option value={t.v}>{t.l}</option>{/each}
              </select>
            </td>
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
            <td class="num total" class:unpriced={eff.unpriced}>{err || eff.unpriced ? '—' : `$${formatNum(eff.finalTotal, 2)}`}</td>
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
    <div><span class="lbl">Total Pipe Weight</span><span class="val">{formatNum(totals.weight, 2)} kg</span></div>
    {#if showDiscount}
      <div><span class="lbl">Total Discount</span><span class="val discount">-${formatNum(totals.discount, 2)}</span></div>
    {/if}
    {#if totals.unpriced > 0}
      <div><span class="lbl">Awaiting Price</span><span class="val warn">{totals.unpriced} row{totals.unpriced === 1 ? '' : 's'}</span></div>
    {/if}
    <div><span class="lbl">Final Total Price</span><span class="val price">${formatNum(totals.total, 2)}</span></div>
  </div>
</div>
