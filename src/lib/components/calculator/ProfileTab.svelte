<script lang="ts">
  import { onMount } from 'svelte';
  import './shared-tab.css';
  import type { ProfileRow } from '$lib/types';
  import { MATERIALS, PROFILE_TYPES, SQUARE_SECTIONS, RECT_SECTIONS, PROFILE_WALL_THICKNESSES, TYPE_OPTIONS } from '$lib/constants';
  import { computeProfileRow, generateUid, formatNum, getProfileError, getMaxWallThicknessMm } from '$lib/utils';
  import { applyRowPricing } from '$lib/calc/pricing';
  import { PROFILE_COLUMNS, withDiscount, withCustomColumns, withLabelOverrides } from '$lib/calc/tableColumns';
  import { loadFieldConfig, emptyFieldConfig, type FieldConfigData, type CustomFieldDef } from '$lib/calc/fieldConfig';
  import DecimalInput from './DecimalInput.svelte';
  import QuantityInput from './QuantityInput.svelte';
  import DiscountInput from './DiscountInput.svelte';

  export let mode: 'designer' | 'procurement' = 'designer';
  export let rows: ProfileRow[];
  export let flagged: Map<string, string> | undefined = undefined;

  let fieldConfig: FieldConfigData = emptyFieldConfig;
  onMount(async () => {
    if (mode === 'designer') fieldConfig = await loadFieldConfig('designer_profile');
  });
  $: customCols = fieldConfig.customColumns;

  $: showManualPrice = mode === 'procurement';
  // Procurement's file must start with a genuinely EMPTY $/kg — no falling
  // back to the catalogue price, which is the designer's estimate. See
  // RowPricingOptions in calc/pricing.ts.
  $: requireManualPrice = mode === 'procurement';
  $: showDiscount = mode === 'procurement';
  $: columns = withCustomColumns(
    withLabelOverrides(withDiscount(PROFILE_COLUMNS, showDiscount), mode === 'designer' ? fieldConfig.labelOverrides : undefined),
    mode === 'designer' ? customCols : []
  );

  function updateCustomField(rowId: string, fieldId: string, value: string | number) {
    rows = rows.map((r) => (r.id === rowId ? { ...r, customFields: { ...(r.customFields ?? {}), [fieldId]: value } } : r));
  }
  function customSelectValue(row: ProfileRow, c: CustomFieldDef): string {
    const val = row.customFields?.[c.id];
    if (val === undefined || val === '') return '';
    const opts = c.constraints?.options ?? [];
    return opts.includes(String(val)) ? String(val) : '__custom__';
  }
  function handleDropdownChange(rowId: string, c: CustomFieldDef, value: string) {
    updateCustomField(rowId, c.id, value === '__custom__' ? '' : value);
  }

  function effective(row: ProfileRow, needsManualPrice = requireManualPrice) {
    return applyRowPricing(computeProfileRow(row, row.type === 'standard' ? 'wholesale' : 'retail'), row, { requireManualPrice: needsManualPrice });
  }
  function sectionsFor(t: ProfileRow['profileType']) {
    return t === 'square' ? SQUARE_SECTIONS : t === 'rectangular' ? RECT_SECTIONS : [];
  }

  function addRow() {
    rows = [...rows, { id: generateUid(), materialId: 'ss304', profileType: 'square', sectionOpt: '2*2', sideA: 2, sideB: 2, wallThickOpt: '2', wallThickness: 2, length: 6, quantity: 1, type: 'standard', discount: 0 }];
  }
  function removeRow(id: string) {
    rows = rows.filter((r) => r.id !== id);
  }
  function updateRow(id: string, patch: Partial<ProfileRow>) {
    rows = rows.map((r) => {
      if (r.id !== id) return r;
      let next = { ...r, ...patch };
      if (patch.profileType) {
        if (patch.profileType === 'square') {
          next.sectionOpt = '2*2'; next.sideA = 2; next.sideB = 2;
        } else if (patch.profileType === 'rectangular') {
          next.sectionOpt = '4*2'; next.sideA = 4; next.sideB = 2;
        } else {
          next.sectionOpt = 'custom';
        }
      }
      if (patch.sectionOpt && patch.sectionOpt !== 'custom') {
        const preset = sectionsFor(next.profileType).find((s) => s.id === patch.sectionOpt);
        if (preset) { next.sideA = preset.a; next.sideB = preset.b; }
      }
      if (patch.wallThickOpt && patch.wallThickOpt !== 'custom') {
        const preset = PROFILE_WALL_THICKNESSES.find((w) => w.id === patch.wallThickOpt);
        if (preset) next.wallThickness = preset.value;
      }
      // Wholesale (Standard) profile bars are only ever sold in fixed 6m
      // lengths — so switching Type to "standard" locks Length at 6 and
      // the input below goes disabled. Switching to "per_piece" (Retail)
      // reopens it for any custom length.
      if (patch.type === 'standard') {
        next.length = 6;
      }
      return next;
    });
  }
  function isLengthLocked(row: ProfileRow) {
    return row.type === 'standard';
  }

  // `requireManualPrice` is passed explicitly rather than read off the
  // closure so this stays a tracked dependency of the reactive statement.
  $: totals = rows.reduce(
    (acc, row) => {
      if (getProfileError(row)) return acc;
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
    <div class="card-title"><span class="tag">02</span><h2>Profiles &amp; Tubes</h2></div>
    <button class="btn-add" on:click={addRow}>+ Add Profile</button>
  </div>

  <div class="table-wrap">
    <table>
      <colgroup>
        <col style="width: 2.34%" /><col style="width: 11.01%" /><col style="width: 10.32%" />
        <col style="width: 13.08%" /><col style="width: 13.08%" /><col style="width: 12.04%" />
        <col style="width: 6.19%" /><col style="width: 4.13%" /><col style="width: 6.88%" />
        <col style="width: 6.19%" />
        <col style="width: {showDiscount ? '4.7%' : '5.64%'}" />
        {#if showDiscount}<col style="width: 4.7%" />{/if}
        {#each mode === 'designer' ? customCols : [] as c (c.id)}<col style="width: 9%" />{/each}
        <col style="width: {showDiscount ? '5.5%' : '6.61%'}" />
        <col style="width: 2.49%" />
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
          {@const err = getProfileError(row)}
          {@const isCustomSection = row.sectionOpt === 'custom' || row.profileType === 'custom'}
          {@const isCustomWall = row.wallThickOpt === 'custom'}
          {@const maxWall = getMaxWallThicknessMm(row)}
          {@const totalLen = (row.length || 0) * (row.quantity || 0)}
          <tr class:error-row={!!err} class:row-flagged={flagged?.has(row.id)}>
            <td class="idx">{i + 1}</td>
            <td>
              <select class="input" value={row.materialId} on:change={(e) => updateRow(row.id, { materialId: e.currentTarget.value })}>
                {#each MATERIALS as m}<option value={m.id}>{m.nameEn}</option>{/each}
              </select>
            </td>
            <td>
              <select class="input" value={row.profileType} on:change={(e) => updateRow(row.id, { profileType: e.currentTarget.value as ProfileRow['profileType'] })}>
                {#each PROFILE_TYPES as p}<option value={p.id}>{p.label}</option>{/each}
              </select>
            </td>
            <td>
              {#if isCustomSection}
                <div class="split">
                  <DecimalInput bind:value={row.sideA} placeholder="A" />
                  <DecimalInput bind:value={row.sideB} placeholder="B" />
                </div>
              {:else}
                <select class="input" value={row.sectionOpt} on:change={(e) => updateRow(row.id, { sectionOpt: e.currentTarget.value })}>
                  {#each sectionsFor(row.profileType) as s}<option value={s.id}>{s.label}</option>{/each}
                  <option value="custom">✍️ Custom</option>
                </select>
              {/if}
            </td>
            <td>
              {#if isCustomWall}
                <DecimalInput bind:value={row.wallThickness} placeholder="mm" />
              {:else}
                <select class="input" value={row.wallThickOpt} on:change={(e) => updateRow(row.id, { wallThickOpt: e.currentTarget.value })}>
                  {#each PROFILE_WALL_THICKNESSES.filter((w) => w.id === 'custom' || w.value <= maxWall) as w}<option value={w.id}>{w.label}</option>{/each}
                </select>
              {/if}
              {#if err}<div class="err-text">{err}</div>{/if}
            </td>
            <td>
              <select class="input" value={row.type} on:change={(e) => updateRow(row.id, { type: e.currentTarget.value as ProfileRow['type'] })}>
                {#each TYPE_OPTIONS as t}<option value={t.v}>{t.l}</option>{/each}
              </select>
            </td>
            <td><DecimalInput bind:value={row.length} disabled={isLengthLocked(row)} placeholder="m" /></td>
            <td><QuantityInput bind:value={row.quantity} /></td>
            <td class="num">{formatNum(totalLen, 2)}</td>
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
    <div><span class="lbl">Total Profile Weight</span><span class="val">{formatNum(totals.weight, 2)} kg</span></div>
    {#if showDiscount}
      <div><span class="lbl">Total Discount</span><span class="val discount">-${formatNum(totals.discount, 2)}</span></div>
    {/if}
    {#if totals.unpriced > 0}
      <div><span class="lbl">Awaiting Price</span><span class="val warn">{totals.unpriced} row{totals.unpriced === 1 ? '' : 's'}</span></div>
    {/if}
    <div><span class="lbl">Final Total Price</span><span class="val price">${formatNum(totals.total, 2)}</span></div>
  </div>
</div>
