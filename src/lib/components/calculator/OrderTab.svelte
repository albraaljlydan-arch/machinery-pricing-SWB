<script lang="ts">
  import { onMount } from 'svelte';
  import './shared-tab.css';
  import type { OrderRow } from '$lib/types';
  import { generateUid, sanitizeNum, formatNum } from '$lib/utils';
  import { ORDER_NAMES, INVENTORY_DATABASE, getItemsForOrderName, getItemById, addInventoryItem } from '$lib/data/inventoryData';
  import { ORDER_COLUMNS, withDiscount, withCustomColumns, withLabelOverrides } from '$lib/calc/tableColumns';
  import { loadFieldConfig, emptyFieldConfig, type FieldConfigData, type CustomFieldDef } from '$lib/calc/fieldConfig';
  import type { SearchableSelectOption } from './searchableSelectTypes';
  import DecimalInput from './DecimalInput.svelte';
  import QuantityInput from './QuantityInput.svelte';
  import DiscountInput from './DiscountInput.svelte';
  import SearchableSelect from './SearchableSelect.svelte';

  export let mode: 'designer' | 'procurement' = 'designer';
  export let rows: OrderRow[];
  export let flagged: Map<string, string> | undefined = undefined;

  let fieldConfig: FieldConfigData = emptyFieldConfig;
  onMount(async () => {
    if (mode === 'designer') fieldConfig = await loadFieldConfig('designer_order');
  });
  $: customCols = fieldConfig.customColumns;

  $: showDiscount = mode === 'procurement';
  $: columns = withCustomColumns(
    withLabelOverrides(withDiscount(ORDER_COLUMNS, showDiscount), mode === 'designer' ? fieldConfig.labelOverrides : undefined),
    mode === 'designer' ? customCols : []
  );

  function updateCustomField(rowId: string, fieldId: string, value: string | number) {
    rows = rows.map((r) => (r.id === rowId ? { ...r, customFields: { ...(r.customFields ?? {}), [fieldId]: value } } : r));
  }
  function customSelectValue(row: OrderRow, c: CustomFieldDef): string {
    const val = row.customFields?.[c.id];
    if (val === undefined || val === '') return '';
    const opts = c.constraints?.options ?? [];
    return opts.includes(String(val)) ? String(val) : '__custom__';
  }
  function handleCustomDropdownChange(rowId: string, c: CustomFieldDef, value: string) {
    updateCustomField(rowId, c.id, value === '__custom__' ? '' : value);
  }

  // Row ids currently showing a free-text Description input instead of the
  // searchable dropdown — entered via that row's "+ Add New Item" option.
  let customDescriptionRows = new Set<string>();

  function rawTotal(row: OrderRow) {
    return Math.max(0, sanitizeNum(row.quantity) * sanitizeNum(row.unitPrice));
  }
  function clampedDiscount(row: OrderRow) {
    return Math.min(Math.max(0, sanitizeNum(row.discount)), rawTotal(row));
  }
  function finalTotal(row: OrderRow) {
    return rawTotal(row) - clampedDiscount(row);
  }

  function addRow() {
    rows = [...rows, { id: generateUid(), orderName: '', description: '', properties: '', quantity: 1, unitPrice: 0, discount: 0 }];
  }
  function removeRow(id: string) {
    rows = rows.filter((r) => r.id !== id);
    customDescriptionRows.delete(id);
  }
  function updateRow(id: string, patch: Partial<OrderRow>) {
    rows = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
  }

  // Picking an Order Name sets the name and, when that name only maps to a
  // single catalog entry, immediately auto-fills the Description too. When
  // a name has several variants, Description is cleared so the next
  // dropdown — now scoped to just that name — is where the exact spec gets picked.
  function handleOrderNameSelect(id: string, orderName: string) {
    const matches = getItemsForOrderName(orderName);
    const description = matches.length === 1 ? matches[0].description : '';
    updateRow(id, { orderName, description });
  }

  // Picking a Description sets both fields from the matched catalog entry.
  function handleDescriptionSelect(id: string, itemId: string) {
    const item = getItemById(itemId);
    if (!item) return;
    updateRow(id, { orderName: item.orderName, description: item.description });
  }

  // "+ Add New Item" on the Order Name dropdown: the typed text becomes the
  // row's Order Name directly — no database write yet, that happens once a
  // Description is committed for it.
  function handleAddNewOrderName(id: string, query: string) {
    updateRow(id, { orderName: query, description: '' });
  }

  // "+ Add New Item" on the Description dropdown: swap that cell to a
  // free-text field pre-filled with the search text.
  function handleAddNewDescription(id: string, query: string) {
    updateRow(id, { description: query });
    customDescriptionRows = new Set(customDescriptionRows).add(id);
  }

  // Leaving the free-text field commits the new item to the catalog (so
  // it's instantly available in every dropdown) and switches the cell back
  // to the normal dropdown.
  function commitCustomDescription(row: OrderRow) {
    const description = row.description.trim();
    const orderName = (row.orderName || 'Custom Item').trim();
    if (description) {
      addInventoryItem(orderName, description, 'Custom');
      if (row.orderName !== orderName) updateRow(row.id, { orderName });
    }
    const next = new Set(customDescriptionRows);
    next.delete(row.id);
    customDescriptionRows = next;
  }

  function cancelCustomDescription(id: string) {
    const next = new Set(customDescriptionRows);
    next.delete(id);
    customDescriptionRows = next;
  }

  // Order Name options: every distinct catalog name. `keywords` also pulls
  // in that name's descriptions, so typing a size like "M6" surfaces "Bolt"
  // even though "M6" isn't in the name itself.
  $: orderNameOptions = ORDER_NAMES.map(
    (name): SearchableSelectOption => ({
      value: name,
      label: name,
      keywords: getItemsForOrderName(name).map((i) => i.description).join(' '),
    })
  );

  function descriptionOptionsFor(row: OrderRow): SearchableSelectOption[] {
    const scoped = row.orderName ? getItemsForOrderName(row.orderName) : INVENTORY_DATABASE;
    return scoped.map((item) => ({
      value: item.id,
      label: item.description,
      sublabel: row.orderName ? undefined : item.orderName,
      keywords: `${item.orderName} ${item.description}`,
    }));
  }
  function selectedDescId(row: OrderRow): string | undefined {
    const scoped = row.orderName ? getItemsForOrderName(row.orderName) : INVENTORY_DATABASE;
    return scoped.find((item) => item.description === row.description)?.id;
  }

  $: totals = rows.reduce(
    (acc, row) => {
      acc.discount += clampedDiscount(row);
      acc.total += finalTotal(row);
      return acc;
    },
    { discount: 0, total: 0 }
  );
</script>

<div class="card card-order-tab">
  <div class="card-header">
    <div class="card-title"><span class="tag">06</span><h2>Orders</h2></div>
    <button class="btn-add" on:click={addRow}>+ Add Order</button>
  </div>

  <div class="table-wrap" style="overflow: visible;">
    <table>
      <colgroup>
        <col style="width: 3.2%" /><col style="width: 16%" /><col style="width: 19%" />
        <col style="width: 19%" /><col style="width: 5.8%" /><col style="width: 8.5%" />
        {#if showDiscount}<col style="width: 8%" />{/if}
        {#each mode === 'designer' ? customCols : [] as c (c.id)}<col style="width: 9%" />{/each}
        <col style="width: {showDiscount ? '7%' : '11.5%'}" />
        <col style="width: 3.5%" />
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
            <td>
              <SearchableSelect
                displayValue={row.orderName}
                value={row.orderName}
                options={orderNameOptions}
                placeholder="Select order name"
                searchPlaceholder="Search parts…"
                emptyMessage="No matching parts"
                allowAddNew
                on:change={(e) => handleOrderNameSelect(row.id, e.detail)}
                on:addNew={(e) => handleAddNewOrderName(row.id, e.detail)}
              />
            </td>
            <td>
              {#if customDescriptionRows.has(row.id)}
                <input
                  class="input"
                  value={row.description}
                  placeholder="Type the new item's description…"
                  on:input={(e) => updateRow(row.id, { description: e.currentTarget.value })}
                  on:blur={() => commitCustomDescription(row)}
                  on:keydown={(e) => {
                    if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                    if (e.key === 'Escape') cancelCustomDescription(row.id);
                  }}
                />
              {:else}
                <SearchableSelect
                  displayValue={row.description}
                  value={selectedDescId(row)}
                  options={descriptionOptionsFor(row)}
                  placeholder={row.orderName ? 'Select description' : 'Select or search…'}
                  searchPlaceholder="Search parts…"
                  emptyMessage="No matching parts"
                  allowAddNew
                  on:change={(e) => handleDescriptionSelect(row.id, e.detail)}
                  on:addNew={(e) => handleAddNewDescription(row.id, e.detail)}
                />
              {/if}
            </td>
            <td><input class="input" type="text" bind:value={row.properties} placeholder="Notes…" /></td>
            <td><QuantityInput bind:value={row.quantity} /></td>
            <td><DecimalInput bind:value={row.unitPrice} placeholder="$" /></td>
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
                  <select class="input" value={customSelectValue(row, c)} on:change={(e) => handleCustomDropdownChange(row.id, c, e.currentTarget.value)}>
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
            <td class="num total">${formatNum(finalTotal(row), 2)}</td>
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
    <div><span class="lbl">Final Total Price</span><span class="val price">${formatNum(totals.total, 2)}</span></div>
  </div>
</div>
