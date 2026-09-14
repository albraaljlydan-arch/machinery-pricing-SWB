<script lang="ts">
  import { onMount } from 'svelte';
  import './shared-tab.css';
  import type { SheetRow } from '$lib/types';
  import { MATERIALS, STANDARD_SIZES, STANDARD_THICKNESSES, TYPE_OPTIONS } from '$lib/constants';
  import { computeSheetRow, generateUid, formatNum, getRowError } from '$lib/utils';
  import { applyRowPricing } from '$lib/calc/pricing';
  import { SHEET_COLUMNS, withDiscount, withCustomColumns, withLabelOverrides } from '$lib/calc/tableColumns';
  import { loadFieldConfig, emptyFieldConfig, type FieldConfigData, type CustomFieldDef } from '$lib/calc/fieldConfig';
  import DecimalInput from './DecimalInput.svelte';
  import QuantityInput from './QuantityInput.svelte';
  import DiscountInput from './DiscountInput.svelte';

  export let mode: 'designer' | 'procurement' = 'designer';
  export let rows: SheetRow[];
  export let flagged: Map<string, string> | undefined = undefined;

  let fieldConfig: FieldConfigData = emptyFieldConfig;
  onMount(async () => {
    if (mode === 'designer') fieldConfig = await loadFieldConfig('designer_sheet');
  });
  $: customCols = fieldConfig.customColumns;

  $: showManualPrice = mode === 'procurement';
  $: showDiscount = mode === 'procurement';
  // Procurement's file must start with a genuinely EMPTY $/kg — no falling
  // back to the catalogue price, which is the designer's estimate. See
  // RowPricingOptions in calc/pricing.ts.
  $: requireManualPrice = mode === 'procurement';
  $: columns = withCustomColumns(
    withLabelOverrides(withDiscount(SHEET_COLUMNS, showDiscount), mode === 'designer' ? fieldConfig.labelOverrides : undefined),
    mode === 'designer' ? customCols : []
  );

  function updateCustomField(rowId: string, fieldId: string, value: string | number) {
    rows = rows.map((r) => (r.id === rowId ? { ...r, customFields: { ...(r.customFields ?? {}), [fieldId]: value } } : r));
  }
  function customSelectValue(row: SheetRow, c: CustomFieldDef): string {
    const val = row.customFields?.[c.id];
    if (val === undefined || val === '') return '';
    const opts = c.constraints?.options ?? [];
    return opts.includes(String(val)) ? String(val) : '__custom__';
  }
  function handleDropdownChange(rowId: string, c: CustomFieldDef, value: string) {
    updateCustomField(rowId, c.id, value === '__custom__' ? '' : value);
  }

  function effective(row: SheetRow, needsManualPrice = requireManualPrice) {
    return applyRowPricing(computeSheetRow(row, row.type === 'standard' ? 'wholesale' : 'retail'), row, { requireManualPrice: needsManualPrice });
  }

  function addRow() {
    rows = [...rows, { id: generateUid(), materialId: 'ss304', sizeOption: '3000_1500', length: 3000, width: 1500, thickOpt: '2', thickness: 2, quantity: 1, type: 'standard', discount: 0 }];
  }
  function removeRow(id: string) {
    rows = rows.filter((r) => r.id !== id);
  }
  function updateRow(id: string, patch: Partial<SheetRow>) {
    rows = rows.map((r) => {
      if (r.id !== id) return r;
      let next = { ...r, ...patch };
      if (patch.sizeOption) {
        const std = STANDARD_SIZES.find((s) => s.id === patch.sizeOption);
        if (std && std.id !== 'custom') {
          next.length = std.length;
          next.width = std.width;
          next.type = 'standard';
        } else {
          next.type = 'per_piece';
        }
      }
      if (patch.thickOpt && patch.thickOpt !== 'custom') {
        const t = STANDARD_THICKNESSES.find((i) => i.id === patch.thickOpt);
        if (t) next.thickness = t.value;
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
    <div class="card-title"><span class="tag">01</span><h2>Sheet Metal Table</h2></div>
    <button class="btn-add" on:click={addRow}>+ Add Sheet</button>
  </div>

  <div class="table-wrap">
    <table>
      <colgroup>
        <col style="width: 2.68%" />
        <col style="width: 12.61%" />
        <col style="width: 14.97%" />
        <col style="width: 13.40%" />
        <col style="width: 6.93%" />
        <col style="width: 6.93%" />
        <col style="width: 13.79%" />
        <col style="width: 4.73%" />
        <col style="width: 7.09%" />
        <col style="width: {showDiscount ? '5.5%' : '6.46%'}" />
        {#if showDiscount}<col style="width: 5.5%" />{/if}
        {#each mode === 'designer' ? customCols : [] as c (c.id)}<col style="width: 9%" />{/each}
        <col style="width: {showDiscount ? '6.5%' : '7.57%'}" />
        <col style="width: 2.84%" />
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
          {@const isCustomSize = row.sizeOption === 'custom'}
          {@const isCustomThick = row.thickOpt === 'custom'}
          <tr class:row-flagged={flagged?.has(row.id)}>
            <td class="idx">{i + 1}</td>
            <td>
              <select class="input" value={row.materialId} on:change={(e) => updateRow(row.id, { materialId: e.currentTarget.value })}>
                {#each MATERIALS as m}<option value={m.id}>{m.nameEn}</option>{/each}
              </select>
            </td>
            <td>
              {#if isCustomThick}
                <div class="split">
                  <select class="input" value={row.thickOpt} on:change={(e) => updateRow(row.id, { thickOpt: e.currentTarget.value })}>
                    {#each STANDARD_THICKNESSES as t}<option value={t.id}>{t.label}</option>{/each}
                  </select>
                  <DecimalInput bind:value={row.thickness} placeholder="mm" />
                </div>
              {:else}
                <select class="input" value={row.thickOpt} on:change={(e) => updateRow(row.id, { thickOpt: e.currentTarget.value })}>
                  {#each STANDARD_THICKNESSES as t}<option value={t.id}>{t.label}</option>{/each}
                </select>
              {/if}
            </td>
            <td>
              <select class="input" value={row.sizeOption} on:change={(e) => updateRow(row.id, { sizeOption: e.currentTarget.value })}>
                {#each STANDARD_SIZES as s}<option value={s.id}>{s.label}</option>{/each}
              </select>
            </td>
            <td><DecimalInput bind:value={row.length} disabled={!isCustomSize} placeholder="mm" /></td>
            <td><DecimalInput bind:value={row.width} disabled={!isCustomSize} placeholder="mm" /></td>
            <td>
              <select class="input" value={row.type} disabled>
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
    <div>
      <span class="lbl">Total Sheet Weight</span>
      <span class="val">{formatNum(totals.weight, 2)}<span style="font-size:13px;font-weight:normal;color:#94a3b8;margin-inline-start:3px;">kg</span></span>
    </div>
    {#if showDiscount}
      <div><span class="lbl">Total Discount</span><span class="val discount">-${formatNum(totals.discount, 2)}</span></div>
    {/if}
    {#if totals.unpriced > 0}
      <div><span class="lbl">Awaiting Price</span><span class="val warn">{totals.unpriced} row{totals.unpriced === 1 ? '' : 's'}</span></div>
    {/if}
    <div><span class="lbl">Final Total Price</span><span class="val price">${formatNum(totals.total, 2)}</span></div>
  </div>
</div>
