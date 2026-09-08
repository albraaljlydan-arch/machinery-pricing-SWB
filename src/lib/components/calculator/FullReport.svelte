<script lang="ts">
  import { onMount } from 'svelte';
  import type { SheetRow, ProfileRow, MillRow, PipeRow, SquareRow, OrderRow, OperationRow } from '$lib/types';
  import { MATERIALS, STANDARD_SIZES, REPORT_BRAND } from '$lib/constants';
  import { computeSheetRow, computeProfileRow, computeMillRow, computePipeRow, computeSquareRow, computeOrderRow, sanitizeNum, formatNum } from '$lib/utils';
  import { applyRowPricing } from '$lib/calc/pricing';
  import { REPORT_LOGO_BASE64 } from '$lib/calc/reportLogo';
  import { SHEET_COLUMNS, PROFILE_COLUMNS, MILL_COLUMNS, PIPE_COLUMNS, SQUARE_COLUMNS, ORDER_COLUMNS, processingColumnsFor, withDiscount, withCustomColumns, withLabelOverrides } from '$lib/calc/tableColumns';
  import { loadFieldConfig, emptyFieldConfig, type FieldConfigData } from '$lib/calc/fieldConfig';
  import { flagsToSets, type FlagSet } from '$lib/calc/reviewFlags';

  export let mode: 'designer' | 'procurement' = 'designer';
  export let projectName: string;
  export let engineer: string;
  export let client: string;
  export let status: string;
  export let formattedDate: string;
  export let safetyFactor = 0; // designer only
  export let sheets: SheetRow[];
  export let profiles: ProfileRow[];
  export let mills: MillRow[];
  export let pipes: PipeRow[];
  export let squares: SquareRow[];
  export let orders: OrderRow[];
  export let operations: OperationRow[];

  // Reviewer flagging, layered on top of the report exactly like ReviewTable
  // used to do on its own screen — passing flagSets makes a "Flag" column
  // appear on every table; passing onToggle/onReasonChange as well makes it
  // interactive (Admin's live review), while omitting them just renders the
  // flags read-only (the Designer's rejection view).
  export let flagSets: FlagSet | undefined = undefined;
  export let onToggle: ((category: keyof FlagSet, id: string) => void) | undefined = undefined;
  export let onReasonChange: ((category: keyof FlagSet, id: string, reason: string) => void) | undefined = undefined;
  $: showFlags = !!flagSets;
  $: fs = flagSets ?? flagsToSets(undefined);

  const fmt = (v: unknown, d = 2) => formatNum(v, d);
  const fmtI = (v: unknown) => String(Math.round(sanitizeNum(v)));
  const getMaterialName = (id: string) => MATERIALS.find((m) => m.id === id)?.nameEn ?? id;
  const getSizeLabel = (id: string) => STANDARD_SIZES.find((s) => s.id === id)?.label ?? id;
  const priceMode = (row: { type: string }) => (row.type === 'standard' ? 'wholesale' : 'retail');
  $: showDiscount = mode === 'procurement';

  let fc: Record<string, FieldConfigData> = {
    sheet: emptyFieldConfig,
    profile: emptyFieldConfig,
    mill: emptyFieldConfig,
    pipe: emptyFieldConfig,
    square: emptyFieldConfig,
    order: emptyFieldConfig,
    processing: emptyFieldConfig,
  };
  onMount(async () => {
    if (mode !== 'designer') return;
    const [sheet, profile, mill, pipe, square, order, processing] = await Promise.all([
      loadFieldConfig('designer_sheet'),
      loadFieldConfig('designer_profile'),
      loadFieldConfig('designer_mill'),
      loadFieldConfig('designer_pipe'),
      loadFieldConfig('designer_square'),
      loadFieldConfig('designer_order'),
      loadFieldConfig('designer_processing'),
    ]);
    fc = { sheet, profile, mill, pipe, square, order, processing };
  });
  $: sheetCustomCols = fc.sheet.customColumns;
  $: profileCustomCols = fc.profile.customColumns;
  $: millCustomCols = fc.mill.customColumns;
  $: pipeCustomCols = fc.pipe.customColumns;
  $: squareCustomCols = fc.square.customColumns;
  $: orderCustomCols = fc.order.customColumns;
  $: processingCustomCols = fc.processing.customColumns;

  $: sheetCols = withCustomColumns(withLabelOverrides(withDiscount(SHEET_COLUMNS, showDiscount), mode === 'designer' ? fc.sheet.labelOverrides : undefined), mode === 'designer' ? sheetCustomCols : []);
  $: profileCols = withCustomColumns(
    withLabelOverrides(withDiscount(PROFILE_COLUMNS, showDiscount), mode === 'designer' ? fc.profile.labelOverrides : undefined),
    mode === 'designer' ? profileCustomCols : []
  );
  $: millCols = withCustomColumns(withLabelOverrides(withDiscount(MILL_COLUMNS, showDiscount), mode === 'designer' ? fc.mill.labelOverrides : undefined), mode === 'designer' ? millCustomCols : []);
  $: pipeCols = withCustomColumns(withLabelOverrides(withDiscount(PIPE_COLUMNS, showDiscount), mode === 'designer' ? fc.pipe.labelOverrides : undefined), mode === 'designer' ? pipeCustomCols : []);
  $: squareCols = withCustomColumns(
    withLabelOverrides(withDiscount(SQUARE_COLUMNS, showDiscount), mode === 'designer' ? fc.square.labelOverrides : undefined),
    mode === 'designer' ? squareCustomCols : []
  );
  $: orderCols = withCustomColumns(withLabelOverrides(withDiscount(ORDER_COLUMNS, showDiscount), mode === 'designer' ? fc.order.labelOverrides : undefined), mode === 'designer' ? orderCustomCols : []);
  $: processingCols = withCustomColumns(
    withLabelOverrides(processingColumnsFor(showDiscount), mode === 'designer' ? fc.processing.labelOverrides : undefined),
    mode === 'designer' ? processingCustomCols : []
  );

  // Per-category totals accumulated while rendering — same pattern as the original.
  let sheetTotals = { weight: 0, discount: 0, price: 0 };
  let profileTotals = { weight: 0, discount: 0, price: 0 };
  let millTotals = { weight: 0, discount: 0, price: 0 };
  let pipeTotals = { weight: 0, discount: 0, price: 0 };
  let squareTotals = { weight: 0, discount: 0, price: 0 };
  let orderTotals = { discount: 0, price: 0 };
  let processingTotals = { discount: 0, price: 0 };

  $: {
    sheetTotals = sheets.reduce(
      (a, r) => {
        const e = applyRowPricing(computeSheetRow(r, priceMode(r)), r);
        return { weight: a.weight + e.totalWeight, discount: a.discount + e.discount, price: a.price + e.finalTotal };
      },
      { weight: 0, discount: 0, price: 0 }
    );
    profileTotals = profiles.reduce(
      (a, r) => {
        const e = applyRowPricing(computeProfileRow(r, priceMode(r)), r);
        return { weight: a.weight + e.totalWeight, discount: a.discount + e.discount, price: a.price + e.finalTotal };
      },
      { weight: 0, discount: 0, price: 0 }
    );
    millTotals = mills.reduce(
      (a, r) => {
        const e = applyRowPricing(computeMillRow(r, priceMode(r)), r);
        return { weight: a.weight + e.totalWeight, discount: a.discount + e.discount, price: a.price + e.finalTotal };
      },
      { weight: 0, discount: 0, price: 0 }
    );
    pipeTotals = pipes.reduce(
      (a, r) => {
        const e = applyRowPricing(computePipeRow(r, priceMode(r)), r);
        return { weight: a.weight + e.totalWeight, discount: a.discount + e.discount, price: a.price + e.finalTotal };
      },
      { weight: 0, discount: 0, price: 0 }
    );
    squareTotals = squares.reduce(
      (a, r) => {
        const e = applyRowPricing(computeSquareRow(r, priceMode(r)), r);
        return { weight: a.weight + e.totalWeight, discount: a.discount + e.discount, price: a.price + e.finalTotal };
      },
      { weight: 0, discount: 0, price: 0 }
    );
    orderTotals = orders.reduce(
      (a, r) => {
        const raw = Math.max(0, computeOrderRow(r).totalPrice);
        const d = Math.min(Math.max(0, sanitizeNum(r.discount)), raw);
        return { discount: a.discount + d, price: a.price + (raw - d) };
      },
      { discount: 0, price: 0 }
    );
    processingTotals = operations.reduce(
      (a, r) => {
        const raw = Math.max(0, sanitizeNum(r.cost));
        const d = Math.min(Math.max(0, sanitizeNum(r.discount)), raw);
        return { discount: a.discount + d, price: a.price + (raw - d) };
      },
      { discount: 0, price: 0 }
    );
  }

  $: grandTotalPrice = sheetTotals.price + profileTotals.price + millTotals.price + pipeTotals.price + squareTotals.price + orderTotals.price + processingTotals.price;
  $: grandTotalDiscount = sheetTotals.discount + profileTotals.discount + millTotals.discount + pipeTotals.discount + squareTotals.discount + orderTotals.discount + processingTotals.discount;
  $: safeFactorPct = mode === 'designer' ? sanitizeNum(safetyFactor) || 0 : 0;
  $: marginAmount = (grandTotalPrice * safeFactorPct) / 100;
  $: finalPrice = grandTotalPrice + marginAmount;
</script>

<div style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;background:#ffffff;color:#0f172a;">
  <!-- Cover -->
  <div data-report-page="true" data-always-include="true" class="page">
    <div style="border-bottom:3px solid #0f172a;padding-bottom:12px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;padding:6px 10px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
          <img src={REPORT_LOGO_BASE64} alt="Logo" style="height:26px;width:auto;object-fit:contain;display:block;" />
        </div>
        <h1 style="margin:0;font-size:20px;font-weight:bold;color:#0f172a;">{REPORT_BRAND.title}</h1>
      </div>
      <div style="text-align:right;">
        <p style="margin:0;font-size:11px;color:#475569;">Date: <strong>{formattedDate}</strong></p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:10px;">
      <div><div class="cov-lbl">Project</div><div class="cov-val">{projectName || '—'}</div></div>
      <div><div class="cov-lbl">From</div><div class="cov-val">{engineer}</div></div>
      <div><div class="cov-lbl">To</div><div class="cov-val">{client}</div></div>
      <div><div class="cov-lbl">Status</div><div class="cov-val">{status}</div></div>
    </div>
  </div>

  <!-- Sheet Metal -->
  {#if sheets.length > 0}
    <div data-report-page="true" class="page">
      <h3 class="sec-title">1 — Sheet Metal</h3>
      <table class="rpt-table">
        <thead><tr><th class="th">#</th>{#each sheetCols as col}<th class="th">{col.label}</th>{/each}{#if showFlags}<th class="th">Flag</th>{/if}</tr></thead>
        <tbody>
          {#each sheets as row, i (row.id)}
            {@const c = applyRowPricing(computeSheetRow(row, priceMode(row)), row)}
            {@const isFlagged = showFlags && fs.sheets.has(row.id)}
            <tr class:flagged-row={isFlagged}>
              <td class="td">{i + 1}</td><td class="td">{getMaterialName(row.materialId)}</td><td class="td">{fmt(row.thickness, 1)}</td>
              <td class="td">{getSizeLabel(row.sizeOption)}</td><td class="td">{fmt(row.length, 0)}</td><td class="td">{fmt(row.width, 0)}</td>
              <td class="td">{row.type === 'standard' ? 'Wholesale' : 'Retail'}</td><td class="td">{fmtI(row.quantity)}</td>
              <td class="td">{fmt(c.totalWeight, 3)}</td><td class="td">${fmt(c.pricePerKg, 2)}</td>
              {#if showDiscount}<td class="td" style="color:#dc2626">{c.discount > 0 ? `-$${fmt(c.discount, 2)}` : '—'}</td>{/if}
              {#each mode === 'designer' ? sheetCustomCols : [] as cc (cc.id)}<td class="td">{row.customFields?.[cc.id] ?? '—'}</td>{/each}
              <td class="td" style="font-weight:bold">${fmt(c.finalTotal, 2)}</td>
              {#if showFlags}
                <td class="td flag-td">
                  {#if onToggle}<input type="checkbox" checked={isFlagged} on:change={() => onToggle?.('sheets', row.id)} />{:else if isFlagged}<span class="flag-tag">⚠</span>{/if}
                </td>
              {/if}
            </tr>
            {#if isFlagged}
              <tr class="reason-row"><td colspan={sheetCols.length + 2}>
                {#if onToggle}<input class="reason-input" type="text" placeholder="Reason for rejection…" value={fs.sheets.get(row.id) ?? ''} on:input={(e) => onReasonChange?.('sheets', row.id, e.currentTarget.value)} />
                {:else}<div class="reason-note">{fs.sheets.get(row.id) || 'No reason given.'}</div>{/if}
              </td></tr>
            {/if}
          {/each}
        </tbody>
      </table>
      <div class="ledger"><div><div class="ledger-lbl">Sheet Metal Total Weight</div><div class="ledger-val-w">{fmt(sheetTotals.weight, 3)} <span class="unit">kg</span></div></div><div style="text-align:right"><div class="ledger-lbl">Sheet Metal Total Price</div><div class="ledger-val-p">${fmt(sheetTotals.price, 2)}</div></div></div>
    </div>
  {/if}

  <!-- Profiles -->
  {#if profiles.length > 0}
    <div data-report-page="true" class="page">
      <h3 class="sec-title">2 — Profiles &amp; Tubes</h3>
      <table class="rpt-table">
        <thead><tr><th class="th">#</th>{#each profileCols as col}<th class="th">{col.label}</th>{/each}{#if showFlags}<th class="th">Flag</th>{/if}</tr></thead>
        <tbody>
          {#each profiles as row, i (row.id)}
            {@const c = applyRowPricing(computeProfileRow(row, priceMode(row)), row)}
            {@const isFlagged = showFlags && fs.profiles.has(row.id)}
            <tr class:flagged-row={isFlagged}>
              <td class="td">{i + 1}</td><td class="td">{getMaterialName(row.materialId)}</td><td class="td">{row.profileType}</td>
              <td class="td">{fmt(row.sideA, 1)}×{fmt(row.sideB, 1)}</td><td class="td">{fmt(row.wallThickness, 1)}</td>
              <td class="td">{row.type === 'standard' ? 'Wholesale' : 'Retail'}</td><td class="td">{fmt(row.length, 2)}</td><td class="td">{fmtI(row.quantity)}</td>
              <td class="td">{fmt(c.totalWeight, 3)}</td><td class="td">${fmt(c.pricePerKg, 2)}</td>
              {#if showDiscount}<td class="td" style="color:#dc2626">{c.discount > 0 ? `-$${fmt(c.discount, 2)}` : '—'}</td>{/if}
              {#each mode === 'designer' ? profileCustomCols : [] as cc (cc.id)}<td class="td">{row.customFields?.[cc.id] ?? '—'}</td>{/each}
              <td class="td" style="font-weight:bold">${fmt(c.finalTotal, 2)}</td>
              {#if showFlags}
                <td class="td flag-td">
                  {#if onToggle}<input type="checkbox" checked={isFlagged} on:change={() => onToggle?.('profiles', row.id)} />{:else if isFlagged}<span class="flag-tag">⚠</span>{/if}
                </td>
              {/if}
            </tr>
            {#if isFlagged}
              <tr class="reason-row"><td colspan={profileCols.length + 2}>
                {#if onToggle}<input class="reason-input" type="text" placeholder="Reason for rejection…" value={fs.profiles.get(row.id) ?? ''} on:input={(e) => onReasonChange?.('profiles', row.id, e.currentTarget.value)} />
                {:else}<div class="reason-note">{fs.profiles.get(row.id) || 'No reason given.'}</div>{/if}
              </td></tr>
            {/if}
          {/each}
        </tbody>
      </table>
      <div class="ledger"><div><div class="ledger-lbl">Profiles Total Weight</div><div class="ledger-val-w">{fmt(profileTotals.weight, 3)} <span class="unit">kg</span></div></div><div style="text-align:right"><div class="ledger-lbl">Profiles Total Price</div><div class="ledger-val-p">${fmt(profileTotals.price, 2)}</div></div></div>
    </div>
  {/if}

  <!-- Mill -->
  {#if mills.length > 0}
    <div data-report-page="true" class="page">
      <h3 class="sec-title">3 — Mill (Solid Round Bars)</h3>
      <table class="rpt-table">
        <thead><tr><th class="th">#</th>{#each millCols as col}<th class="th">{col.label}</th>{/each}{#if showFlags}<th class="th">Flag</th>{/if}</tr></thead>
        <tbody>
          {#each mills as row, i (row.id)}
            {@const c = applyRowPricing(computeMillRow(row, priceMode(row)), row)}
            {@const isFlagged = showFlags && fs.mills.has(row.id)}
            <tr class:flagged-row={isFlagged}>
              <td class="td">{i + 1}</td><td class="td">{getMaterialName(row.materialId)}</td><td class="td">{fmt(row.diameter, 1)}</td><td class="td">{fmt(row.length, 1)}</td>
              <td class="td">{row.type === 'standard' ? 'Wholesale' : 'Retail'}</td><td class="td">{fmtI(row.quantity)}</td>
              <td class="td">{fmt(c.totalWeight, 3)}</td><td class="td">${fmt(c.pricePerKg, 2)}</td>
              {#if showDiscount}<td class="td" style="color:#dc2626">{c.discount > 0 ? `-$${fmt(c.discount, 2)}` : '—'}</td>{/if}
              {#each mode === 'designer' ? millCustomCols : [] as cc (cc.id)}<td class="td">{row.customFields?.[cc.id] ?? '—'}</td>{/each}
              <td class="td" style="font-weight:bold">${fmt(c.finalTotal, 2)}</td>
              {#if showFlags}
                <td class="td flag-td">
                  {#if onToggle}<input type="checkbox" checked={isFlagged} on:change={() => onToggle?.('mills', row.id)} />{:else if isFlagged}<span class="flag-tag">⚠</span>{/if}
                </td>
              {/if}
            </tr>
            {#if isFlagged}
              <tr class="reason-row"><td colspan={millCols.length + 2}>
                {#if onToggle}<input class="reason-input" type="text" placeholder="Reason for rejection…" value={fs.mills.get(row.id) ?? ''} on:input={(e) => onReasonChange?.('mills', row.id, e.currentTarget.value)} />
                {:else}<div class="reason-note">{fs.mills.get(row.id) || 'No reason given.'}</div>{/if}
              </td></tr>
            {/if}
          {/each}
        </tbody>
      </table>
      <div class="ledger"><div><div class="ledger-lbl">Mill Total Weight</div><div class="ledger-val-w">{fmt(millTotals.weight, 3)} <span class="unit">kg</span></div></div><div style="text-align:right"><div class="ledger-lbl">Mill Total Price</div><div class="ledger-val-p">${fmt(millTotals.price, 2)}</div></div></div>
    </div>
  {/if}

  <!-- Pipes -->
  {#if pipes.length > 0}
    <div data-report-page="true" class="page">
      <h3 class="sec-title">4 — Pipes &amp; Bushings</h3>
      <table class="rpt-table">
        <thead><tr><th class="th">#</th>{#each pipeCols as col}<th class="th">{col.label}</th>{/each}{#if showFlags}<th class="th">Flag</th>{/if}</tr></thead>
        <tbody>
          {#each pipes as row, i (row.id)}
            {@const c = applyRowPricing(computePipeRow(row, priceMode(row)), row)}
            {@const isFlagged = showFlags && fs.pipes.has(row.id)}
            <tr class:flagged-row={isFlagged}>
              <td class="td">{i + 1}</td><td class="td">{getMaterialName(row.materialId)}</td><td class="td">{fmt(row.outerDiameter, 1)}</td><td class="td">{fmt(row.innerDiameter, 1)}</td><td class="td">{fmt(row.length, 1)}</td>
              <td class="td">{row.type === 'standard' ? 'Wholesale' : 'Retail'}</td><td class="td">{fmtI(row.quantity)}</td>
              <td class="td">{fmt(c.totalWeight, 3)}</td><td class="td">${fmt(c.pricePerKg, 2)}</td>
              {#if showDiscount}<td class="td" style="color:#dc2626">{c.discount > 0 ? `-$${fmt(c.discount, 2)}` : '—'}</td>{/if}
              {#each mode === 'designer' ? pipeCustomCols : [] as cc (cc.id)}<td class="td">{row.customFields?.[cc.id] ?? '—'}</td>{/each}
              <td class="td" style="font-weight:bold">${fmt(c.finalTotal, 2)}</td>
              {#if showFlags}
                <td class="td flag-td">
                  {#if onToggle}<input type="checkbox" checked={isFlagged} on:change={() => onToggle?.('pipes', row.id)} />{:else if isFlagged}<span class="flag-tag">⚠</span>{/if}
                </td>
              {/if}
            </tr>
            {#if isFlagged}
              <tr class="reason-row"><td colspan={pipeCols.length + 2}>
                {#if onToggle}<input class="reason-input" type="text" placeholder="Reason for rejection…" value={fs.pipes.get(row.id) ?? ''} on:input={(e) => onReasonChange?.('pipes', row.id, e.currentTarget.value)} />
                {:else}<div class="reason-note">{fs.pipes.get(row.id) || 'No reason given.'}</div>{/if}
              </td></tr>
            {/if}
          {/each}
        </tbody>
      </table>
      <div class="ledger"><div><div class="ledger-lbl">Pipe Total Weight</div><div class="ledger-val-w">{fmt(pipeTotals.weight, 3)} <span class="unit">kg</span></div></div><div style="text-align:right"><div class="ledger-lbl">Pipe Total Price</div><div class="ledger-val-p">${fmt(pipeTotals.price, 2)}</div></div></div>
    </div>
  {/if}

  <!-- Squares -->
  {#if squares.length > 0}
    <div data-report-page="true" class="page">
      <h3 class="sec-title">5 — Square Bars &amp; Blocks</h3>
      <table class="rpt-table">
        <thead><tr><th class="th">#</th>{#each squareCols as col}<th class="th">{col.label}</th>{/each}{#if showFlags}<th class="th">Flag</th>{/if}</tr></thead>
        <tbody>
          {#each squares as row, i (row.id)}
            {@const c = applyRowPricing(computeSquareRow(row, priceMode(row)), row)}
            {@const isFlagged = showFlags && fs.squares.has(row.id)}
            <tr class:flagged-row={isFlagged}>
              <td class="td">{i + 1}</td><td class="td">{getMaterialName(row.materialId)}</td><td class="td">{fmt(row.length, 1)}</td><td class="td">{fmt(row.width, 1)}</td>
              <td class="td">{row.type === 'standard' ? 'Wholesale' : 'Retail'}</td><td class="td">{fmt(row.thickness, 1)}</td><td class="td">{fmtI(row.quantity)}</td>
              <td class="td">{fmt(c.totalWeight, 3)}</td><td class="td">${fmt(c.pricePerKg, 2)}</td>
              {#if showDiscount}<td class="td" style="color:#dc2626">{c.discount > 0 ? `-$${fmt(c.discount, 2)}` : '—'}</td>{/if}
              {#each mode === 'designer' ? squareCustomCols : [] as cc (cc.id)}<td class="td">{row.customFields?.[cc.id] ?? '—'}</td>{/each}
              <td class="td" style="font-weight:bold">${fmt(c.finalTotal, 2)}</td>
              {#if showFlags}
                <td class="td flag-td">
                  {#if onToggle}<input type="checkbox" checked={isFlagged} on:change={() => onToggle?.('squares', row.id)} />{:else if isFlagged}<span class="flag-tag">⚠</span>{/if}
                </td>
              {/if}
            </tr>
            {#if isFlagged}
              <tr class="reason-row"><td colspan={squareCols.length + 2}>
                {#if onToggle}<input class="reason-input" type="text" placeholder="Reason for rejection…" value={fs.squares.get(row.id) ?? ''} on:input={(e) => onReasonChange?.('squares', row.id, e.currentTarget.value)} />
                {:else}<div class="reason-note">{fs.squares.get(row.id) || 'No reason given.'}</div>{/if}
              </td></tr>
            {/if}
          {/each}
        </tbody>
      </table>
      <div class="ledger"><div><div class="ledger-lbl">Square Total Weight</div><div class="ledger-val-w">{fmt(squareTotals.weight, 3)} <span class="unit">kg</span></div></div><div style="text-align:right"><div class="ledger-lbl">Square Total Price</div><div class="ledger-val-p">${fmt(squareTotals.price, 2)}</div></div></div>
    </div>
  {/if}

  <!-- Orders -->
  {#if orders.length > 0}
    <div data-report-page="true" class="page">
      <h3 class="sec-title">6 — Orders</h3>
      <table class="rpt-table">
        <thead><tr><th class="th">#</th>{#each orderCols as col}<th class="th">{col.label}</th>{/each}{#if showFlags}<th class="th">Flag</th>{/if}</tr></thead>
        <tbody>
          {#each orders as row, i (row.id)}
            {@const raw = Math.max(0, computeOrderRow(row).totalPrice)}
            {@const d = Math.min(Math.max(0, sanitizeNum(row.discount)), raw)}
            {@const isFlagged = showFlags && fs.orders.has(row.id)}
            <tr class:flagged-row={isFlagged}>
              <td class="td">{i + 1}</td><td class="td td-truncate" style="text-align:left">{row.orderName}</td><td class="td td-truncate" style="text-align:left">{row.description || '—'}</td><td class="td td-truncate" style="text-align:left">{row.properties || '—'}</td>
              <td class="td">{fmtI(row.quantity)}</td><td class="td">${fmt(row.unitPrice, 2)}</td>
              {#if showDiscount}<td class="td" style="color:#dc2626">{d > 0 ? `-$${fmt(d, 2)}` : '—'}</td>{/if}
              {#each mode === 'designer' ? orderCustomCols : [] as cc (cc.id)}<td class="td">{row.customFields?.[cc.id] ?? '—'}</td>{/each}
              <td class="td" style="font-weight:bold">${fmt(raw - d, 2)}</td>
              {#if showFlags}
                <td class="td flag-td">
                  {#if onToggle}<input type="checkbox" checked={isFlagged} on:change={() => onToggle?.('orders', row.id)} />{:else if isFlagged}<span class="flag-tag">⚠</span>{/if}
                </td>
              {/if}
            </tr>
            {#if isFlagged}
              <tr class="reason-row"><td colspan={orderCols.length + 2}>
                {#if onToggle}<input class="reason-input" type="text" placeholder="Reason for rejection…" value={fs.orders.get(row.id) ?? ''} on:input={(e) => onReasonChange?.('orders', row.id, e.currentTarget.value)} />
                {:else}<div class="reason-note">{fs.orders.get(row.id) || 'No reason given.'}</div>{/if}
              </td></tr>
            {/if}
          {/each}
        </tbody>
      </table>
      <div class="ledger" style="justify-content:flex-end"><div style="text-align:right"><div class="ledger-lbl">Order Total Price</div><div class="ledger-val-p">${fmt(orderTotals.price, 2)}</div></div></div>
    </div>
  {/if}

  <!-- Processing -->
  {#if operations.length > 0}
    <div data-report-page="true" class="page">
      <h3 class="sec-title">7 — Processing Costs</h3>
      <table class="rpt-table">
        <thead><tr><th class="th">#</th>{#each processingCols as col}<th class="th">{col.label}</th>{/each}{#if showFlags}<th class="th">Flag</th>{/if}</tr></thead>
        <tbody>
          {#each operations as row, i (row.id)}
            {@const raw = Math.max(0, sanitizeNum(row.cost))}
            {@const d = Math.min(Math.max(0, sanitizeNum(row.discount)), raw)}
            {@const isFlagged = showFlags && fs.processing.has(row.id)}
            <tr class:flagged-row={isFlagged}>
              <td class="td">{i + 1}</td><td class="td td-truncate" style="text-align:left">{row.process || '—'}</td><td class="td td-truncate" style="text-align:left">{row.description || '—'}</td><td class="td">{row.type || '—'}</td><td class="td td-truncate" style="text-align:left">{row.properties || '—'}</td><td class="td">{row.supplier || '—'}</td>
              {#each mode === 'designer' ? processingCustomCols : [] as cc (cc.id)}<td class="td">{row.customFields?.[cc.id] ?? '—'}</td>{/each}
              <td class="td" style={showDiscount ? '' : 'font-weight:bold'}>${fmt(raw, 2)}</td>
              {#if showDiscount}<td class="td" style="color:#dc2626">{d > 0 ? `-$${fmt(d, 2)}` : '—'}</td><td class="td" style="font-weight:bold">${fmt(raw - d, 2)}</td>{/if}
              {#if showFlags}
                <td class="td flag-td">
                  {#if onToggle}<input type="checkbox" checked={isFlagged} on:change={() => onToggle?.('processing', row.id)} />{:else if isFlagged}<span class="flag-tag">⚠</span>{/if}
                </td>
              {/if}
            </tr>
            {#if isFlagged}
              <tr class="reason-row"><td colspan={processingCols.length + 2}>
                {#if onToggle}<input class="reason-input" type="text" placeholder="Reason for rejection…" value={fs.processing.get(row.id) ?? ''} on:input={(e) => onReasonChange?.('processing', row.id, e.currentTarget.value)} />
                {:else}<div class="reason-note">{fs.processing.get(row.id) || 'No reason given.'}</div>{/if}
              </td></tr>
            {/if}
          {/each}
        </tbody>
      </table>
      <div class="ledger" style="justify-content:flex-end"><div style="text-align:right"><div class="ledger-lbl">Processing Total Cost</div><div class="ledger-val-p">${fmt(processingTotals.price, 2)}</div></div></div>
    </div>
  {/if}

  <!-- Grand summary -->
  <div data-report-page="true" data-no-split="true" data-always-include="true" class="page" style="padding:0">
    <div style="border-top:3px solid #0f172a;margin:0 0 14px 0;"></div>
    <div style="background:#0f172a;border-radius:8px;padding:4px 20px;border:1px solid #10b981;">
      <div style="color:#94a3b8;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Final Cost Summary</div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #1e293b;">
        <span style="color:#cbd5e1;font-size:12px;">Total Price (all categories)</span>
        <span style="color:#fff;font-size:12px;font-weight:bold;">${fmt(grandTotalPrice, 2)}</span>
      </div>
      {#if mode === 'designer'}
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #1e293b;">
          <span style="color:#fb923c;font-size:12px;">Safety Factor ({fmt(safeFactorPct, 2)}%)</span>
          <span style="color:#fb923c;font-size:12px;font-weight:bold;">+${fmt(marginAmount, 2)}</span>
        </div>
      {:else if grandTotalDiscount > 0}
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #1e293b;">
          <span style="color:#f87171;font-size:12px;">Total Discount Applied</span>
          <span style="color:#f87171;font-size:12px;font-weight:bold;">-${fmt(grandTotalDiscount, 2)}</span>
        </div>
      {/if}
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 4px;">
        <span style="color:#fff;font-size:15px;font-weight:bold;letter-spacing:0.3px;">Final Price</span>
        <span style="color:#4ade80;font-size:18px;font-weight:bold;">${fmt(mode === 'designer' ? finalPrice : grandTotalPrice, 2)}</span>
      </div>
    </div>
  </div>
</div>

<style>
  .page {
    margin-bottom: 14px;
    background: #ffffff;
  }
  .sec-title {
    font-size: 13px;
    font-weight: bold;
    color: #0f172a;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 3px;
    margin: 0 0 8px;
  }
  .rpt-table {
    width: 100%;
    border-collapse: collapse;
  }
  .th {
    padding: 6px 8px;
    font-size: 9.5px;
    font-weight: bold;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    text-align: center;
    white-space: nowrap;
  }
  .td {
    padding: 5px 7px;
    font-size: 9.5px;
    border: 1px solid #cbd5e1;
    text-align: center;
    white-space: nowrap;
  }
  /* The ONE deliberate exception: Order's Description/Notes can be long
     free text — instead of wrapping (tall, uneven rows) or growing the
     whole table wider, this truncates with an ellipsis and stays exactly
     one line, same height as every other cell. */
  .td-truncate {
    max-width: 170px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ledger {
    margin-top: 10px;
    background: #1e293b;
    border-radius: 6px;
    padding: 4px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .ledger-lbl {
    color: #94a3b8;
    font-size: 11px;
    font-weight: 500;
    margin-bottom: 2px;
  }
  .ledger-val-w {
    color: #ffffff;
    font-size: 15px;
    font-weight: bold;
  }
  .ledger-val-p {
    color: #10b981;
    font-size: 15px;
    font-weight: bold;
  }
  .unit {
    color: #94a3b8;
    font-size: 12px;
    font-weight: normal;
  }
  .cov-lbl {
    font-size: 10px;
    color: #94a3b8;
    text-transform: uppercase;
    font-weight: 600;
  }
  .cov-val {
    font-size: 13px;
    color: #0f172a;
    font-weight: 700;
  }
  .flagged-row {
    background: #fdecea;
    box-shadow: inset 3px 0 0 #d9342b;
  }
  .flag-td {
    text-align: center;
  }
  .flag-td input[type='checkbox'] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #d9342b;
  }
  .flag-tag {
    color: #d9342b;
    font-weight: 700;
    font-size: 12px;
  }
  .reason-row td {
    padding: 6px 8px 10px;
    border: 1px solid #cbd5e1;
    border-top: none;
  }
  .reason-input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #d9342b;
    background: #fff;
    border-radius: 6px;
    padding: 5px 9px;
    font-size: 11px;
    color: #7a1610;
  }
  .reason-input::placeholder {
    color: #c99;
  }
  .reason-note {
    border: 1px solid #d9342b;
    background: #fdecea;
    border-radius: 6px;
    padding: 5px 9px;
    font-size: 11px;
    color: #7a1610;
  }
</style>
