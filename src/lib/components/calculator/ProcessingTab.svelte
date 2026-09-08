<script lang="ts">
  import { onMount } from 'svelte';
  import './shared-tab.css';
  import type { OperationRow } from '$lib/types';
  import { generateUid, sanitizeNum, formatNum } from '$lib/utils';
  import { processingColumnsFor, withCustomColumns, withLabelOverrides } from '$lib/calc/tableColumns';
  import { loadFieldConfig, emptyFieldConfig, type FieldConfigData, type CustomFieldDef } from '$lib/calc/fieldConfig';
  import DecimalInput from './DecimalInput.svelte';
  import DiscountInput from './DiscountInput.svelte';

  export let mode: 'designer' | 'procurement' = 'designer';
  export let rows: OperationRow[];
  export let flagged: Map<string, string> | undefined = undefined;

  let fieldConfig: FieldConfigData = emptyFieldConfig;
  onMount(async () => {
    if (mode === 'designer') fieldConfig = await loadFieldConfig('designer_processing');
  });
  $: customCols = fieldConfig.customColumns;

  $: showDiscount = mode === 'procurement';
  $: columns = withCustomColumns(
    withLabelOverrides(processingColumnsFor(showDiscount), mode === 'designer' ? fieldConfig.labelOverrides : undefined),
    mode === 'designer' ? customCols : []
  );

  function updateCustomField(rowId: string, fieldId: string, value: string | number) {
    rows = rows.map((r) => (r.id === rowId ? { ...r, customFields: { ...(r.customFields ?? {}), [fieldId]: value } } : r));
  }
  function customSelectValue(row: OperationRow, c: CustomFieldDef): string {
    const val = row.customFields?.[c.id];
    if (val === undefined || val === '') return '';
    const opts = c.constraints?.options ?? [];
    return opts.includes(String(val)) ? String(val) : '__custom__';
  }
  function handleDropdownChange(rowId: string, c: CustomFieldDef, value: string) {
    updateCustomField(rowId, c.id, value === '__custom__' ? '' : value);
  }

  function rawCost(row: OperationRow) {
    return Math.max(0, sanitizeNum(row.cost));
  }
  function clampedDiscount(row: OperationRow) {
    return Math.min(Math.max(0, sanitizeNum(row.discount)), rawCost(row));
  }
  function netCost(row: OperationRow) {
    return rawCost(row) - clampedDiscount(row);
  }
  function addRow() {
    rows = [...rows, { id: generateUid(), process: '', description: '', type: '', properties: '', supplier: '', cost: 0, discount: 0 }];
  }
  function removeRow(id: string) {
    rows = rows.filter((r) => r.id !== id);
  }

  $: totals = rows.reduce(
    (acc, row) => {
      acc.discount += clampedDiscount(row);
      acc.total += netCost(row);
      return acc;
    },
    { discount: 0, total: 0 }
  );
</script>

<div class="card">
  <div class="card-header">
    <div class="card-title"><span class="tag">07</span><h2>Processing Costs</h2></div>
    <button class="btn-add" on:click={addRow}>+ Add Operation</button>
  </div>

  <div class="table-wrap">
    <table>
      <colgroup>
        <col style="width: 3.39%" /><col style="width: 17.51%" /><col style="width: 19.77%" />
        <col style="width: 12.43%" /><col style="width: 17.51%" /><col style="width: 13.56%" />
        {#each mode === 'designer' ? customCols : [] as c (c.id)}<col style="width: 9%" />{/each}
        <col style="width: {showDiscount ? '9%' : '12.43%'}" />
        {#if showDiscount}<col style="width: 9%" /><col style="width: 9%" />{/if}
        <col style="width: 3.40%" />
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
          <tr class:row-flagged={flagged?.has(row.id)}>
            <td class="idx">{i + 1}</td>
            <td><input class="input" type="text" bind:value={row.process} placeholder="Process…" /></td>
            <td><input class="input" type="text" bind:value={row.description} placeholder="Description…" /></td>
            <td><input class="input" type="text" bind:value={row.type} placeholder="Type…" /></td>
            <td><input class="input" type="text" bind:value={row.properties} placeholder="Properties…" /></td>
            <td><input class="input" type="text" bind:value={row.supplier} placeholder="Supplier…" /></td>
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
            <td><DecimalInput bind:value={row.cost} placeholder="$" /></td>
            {#if showDiscount}
              <td><DiscountInput bind:value={row.discount} /></td>
              <td class="num total">${formatNum(netCost(row), 2)}</td>
            {/if}
            <td class="text-center"><button class="btn-del" on:click={() => removeRow(row.id)}>✕</button></td>
          </tr>
          {#if flagged?.has(row.id)}
            <tr class="flag-reason-row"><td colspan={columns.length + 2}><span class="flag-reason-note">⚠ {flagged.get(row.id) || 'Flagged by Admin'}</span></td></tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>

  <div class="ledger" style="justify-content: flex-end; gap: 32px;">
    {#if showDiscount}
      <div><span class="lbl">Total Discount</span><span class="val discount">-${formatNum(totals.discount, 2)}</span></div>
    {/if}
    <div><span class="lbl">Total Processing Cost</span><span class="val price">${formatNum(totals.total, 2)}</span></div>
  </div>
</div>
