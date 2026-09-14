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
  import { theme as appTheme } from '$lib/stores/theme';

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

  // Procurement's real-cost file: a row with no manually-entered $/kg is
  // shown as "—", not silently priced from the catalogue (which would be the
  // designer's estimate — see RowPricingOptions in calc/pricing.ts).
  //
  // Deliberately its OWN prop rather than `mode === 'procurement'`: Admin's
  // review screen renders the DESIGNER's rows with mode="procurement" (just
  // to get the discount columns), and those rows are correctly priced from
  // the catalogue. Only the real procurement/accounting screens pass this.
  export let requireManualPrice = false;
  $: pricingOpts = { requireManualPrice };

  /** The report's palette. Defaults to following the app theme, so the report
   *  is dark inside a dark dashboard. Pass 'light' to pin it — a caller that
   *  wants the report to always look like the printed sheet can. The PDF
   *  export overrides this on its own clone regardless (see exportPdf.ts). */
  export let theme: 'light' | 'dark' | 'auto' = 'auto';
  $: resolvedTheme = theme === 'auto' ? $appTheme : theme;

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

  // 'select' is Procurement's purchase-request checklist (a ✓ pick-list, no
  // rejection reason). 'reject' is Admin's existing flag-for-rejection flow —
  // unchanged default, every existing caller keeps its current look.
  export let flagIcon: 'reject' | 'select' = 'reject';
  // Rows already covered by a previously APPROVED purchase request: shown
  // checked but disabled, so a later daily batch can't re-request (and
  // double-count) the same row.
  export let lockedIds: FlagSet | undefined = undefined;
  $: locked = lockedIds ?? flagsToSets(undefined);

  // Optional per-row status pill (Procurement's checklist only): returning
  // a value renders a small badge in the flag cell instead of/alongside the
  // checkbox — "awaiting factory approval", or "rejected: <note>" so a
  // previously-rejected row is still clearly re-selectable rather than
  // looking untouched.
  export let rowStatus: ((category: keyof FlagSet, id: string) => { label: string; tone: 'locked' | 'pending' | 'rejected' } | undefined) | undefined = undefined;

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
  let sheetTotals = { weight: 0, discount: 0, price: 0, unpriced: 0 };
  let profileTotals = { weight: 0, discount: 0, price: 0, unpriced: 0 };
  let millTotals = { weight: 0, discount: 0, price: 0, unpriced: 0 };
  let pipeTotals = { weight: 0, discount: 0, price: 0, unpriced: 0 };
  let squareTotals = { weight: 0, discount: 0, price: 0, unpriced: 0 };
  let orderTotals = { discount: 0, price: 0 };
  let processingTotals = { discount: 0, price: 0 };

  $: {
    sheetTotals = sheets.reduce(
      (a, r) => {
        const e = applyRowPricing(computeSheetRow(r, priceMode(r)), r, pricingOpts);
        return { weight: a.weight + e.totalWeight, discount: a.discount + e.discount, price: a.price + e.finalTotal, unpriced: a.unpriced + (e.unpriced ? 1 : 0) };
      },
      { weight: 0, discount: 0, price: 0, unpriced: 0 }
    );
    profileTotals = profiles.reduce(
      (a, r) => {
        const e = applyRowPricing(computeProfileRow(r, priceMode(r)), r, pricingOpts);
        return { weight: a.weight + e.totalWeight, discount: a.discount + e.discount, price: a.price + e.finalTotal, unpriced: a.unpriced + (e.unpriced ? 1 : 0) };
      },
      { weight: 0, discount: 0, price: 0, unpriced: 0 }
    );
    millTotals = mills.reduce(
      (a, r) => {
        const e = applyRowPricing(computeMillRow(r, priceMode(r)), r, pricingOpts);
        return { weight: a.weight + e.totalWeight, discount: a.discount + e.discount, price: a.price + e.finalTotal, unpriced: a.unpriced + (e.unpriced ? 1 : 0) };
      },
      { weight: 0, discount: 0, price: 0, unpriced: 0 }
    );
    pipeTotals = pipes.reduce(
      (a, r) => {
        const e = applyRowPricing(computePipeRow(r, priceMode(r)), r, pricingOpts);
        return { weight: a.weight + e.totalWeight, discount: a.discount + e.discount, price: a.price + e.finalTotal, unpriced: a.unpriced + (e.unpriced ? 1 : 0) };
      },
      { weight: 0, discount: 0, price: 0, unpriced: 0 }
    );
    squareTotals = squares.reduce(
      (a, r) => {
        const e = applyRowPricing(computeSquareRow(r, priceMode(r)), r, pricingOpts);
        return { weight: a.weight + e.totalWeight, discount: a.discount + e.discount, price: a.price + e.finalTotal, unpriced: a.unpriced + (e.unpriced ? 1 : 0) };
      },
      { weight: 0, discount: 0, price: 0, unpriced: 0 }
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
  // Rows still waiting for a real $/kg. Whoever reads this report needs to
  // know the total below is understated, not final.
  $: unpricedCount = sheetTotals.unpriced + profileTotals.unpriced + millTotals.unpriced + pipeTotals.unpriced + squareTotals.unpriced;
  $: safeFactorPct = mode === 'designer' ? sanitizeNum(safetyFactor) || 0 : 0;
  $: marginAmount = (grandTotalPrice * safeFactorPct) / 100;
  $: finalPrice = grandTotalPrice + marginAmount;
</script>

<!-- data-report-theme carries the report's OWN palette, separate from the
     app theme. It follows the app by default so the report is dark inside a
     dark dashboard, but exportPdf.ts pins it to "light" on the cloned copy
     it rasterises — so the screen can be dark while the PDF stays a white
     sheet. Every colour below comes from these variables; none is hardcoded,
     which is what previously made the report un-themeable. -->
<div class="report-root" data-report-theme={resolvedTheme}>
  <!-- Cover -->
  <div data-report-page="true" data-always-include="true" class="page">
    <div style="border-bottom:3px solid var(--rp-ink);padding-bottom:12px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
      <div style="display:flex;align-items:center;gap:14px;">
        <!-- Fixed white, not --rp-sheet: the logo is a dark mark with no
             light variant, so it needs a light plate in both themes. -->
        <div style="background:#ffffff;border:1px solid var(--rp-line-soft);border-radius:8px;box-sizing:border-box;padding:6px 10px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
          <img src={REPORT_LOGO_BASE64} alt="Logo" style="height:26px;width:auto;object-fit:contain;display:block;" />
        </div>
        <h1 style="margin:0;font-size:20px;font-weight:bold;color:var(--rp-ink);">{REPORT_BRAND.title}</h1>
      </div>
      <div style="text-align:right;">
        <p style="margin:0;font-size:11px;color:var(--rp-ink-soft);">Date: <strong>{formattedDate}</strong></p>
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
            {@const c = applyRowPricing(computeSheetRow(row, priceMode(row)), row, pricingOpts)}
            {@const isFlagged = showFlags && fs.sheets.has(row.id)}
            {@const rowStat = showFlags ? rowStatus?.('sheets', row.id) : undefined}
            <tr class:flagged-row={isFlagged} class:flagged-select={isFlagged && flagIcon === 'select'}>
              <td class="td">{i + 1}</td><td class="td">{getMaterialName(row.materialId)}</td><td class="td">{fmt(row.thickness, 1)}</td>
              <td class="td">{getSizeLabel(row.sizeOption)}</td><td class="td">{fmt(row.length, 0)}</td><td class="td">{fmt(row.width, 0)}</td>
              <td class="td">{row.type === 'standard' ? 'Wholesale' : 'Retail'}</td><td class="td">{fmtI(row.quantity)}</td>
              <td class="td">{fmt(c.totalWeight, 3)}</td><td class="td">{c.unpriced ? '—' : `$${fmt(c.pricePerKg, 2)}`}</td>
              {#if showDiscount}<td class="td" style="color:var(--rp-negative)">{c.discount > 0 ? `-$${fmt(c.discount, 2)}` : '—'}</td>{/if}
              {#each mode === 'designer' ? sheetCustomCols : [] as cc (cc.id)}<td class="td">{row.customFields?.[cc.id] ?? '—'}</td>{/each}
              <td class="td" style="font-weight:bold">{c.unpriced ? '—' : `$${fmt(c.finalTotal, 2)}`}</td>
              {#if showFlags}
                <td class="td flag-td">
                  {#if rowStat && rowStat.tone !== 'rejected'}<span class="status-pill status-{rowStat.tone}">{rowStat.label}</span>
                  {:else}
                    {#if onToggle}<input type="checkbox" checked={isFlagged} disabled={locked.sheets.has(row.id)} on:change={() => onToggle?.('sheets', row.id)} />
                    {:else if isFlagged}<span class="flag-tag">{flagIcon === 'select' ? '✓' : '⚠'}</span>{/if}
                    {#if rowStat}<div class="status-pill status-rejected">{rowStat.label}</div>{/if}
                  {/if}
                </td>
              {/if}
            </tr>
            {#if isFlagged && !rowStat}
              <tr class="reason-row"><td colspan={sheetCols.length + 2}>
                {#if onToggle}<input class="reason-input" type="text" placeholder={flagIcon === 'select' ? 'Note (optional)…' : 'Reason for rejection…'} value={fs.sheets.get(row.id) ?? ''} on:input={(e) => onReasonChange?.('sheets', row.id, e.currentTarget.value)} />
                {:else}<div class="reason-note">{fs.sheets.get(row.id) || (flagIcon === 'select' ? 'No note.' : 'No reason given.')}</div>{/if}
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
            {@const c = applyRowPricing(computeProfileRow(row, priceMode(row)), row, pricingOpts)}
            {@const isFlagged = showFlags && fs.profiles.has(row.id)}
            {@const rowStat = showFlags ? rowStatus?.('profiles', row.id) : undefined}
            <tr class:flagged-row={isFlagged} class:flagged-select={isFlagged && flagIcon === 'select'}>
              <td class="td">{i + 1}</td><td class="td">{getMaterialName(row.materialId)}</td><td class="td">{row.profileType}</td>
              <td class="td">{fmt(row.sideA, 1)}×{fmt(row.sideB, 1)}</td><td class="td">{fmt(row.wallThickness, 1)}</td>
              <td class="td">{row.type === 'standard' ? 'Wholesale' : 'Retail'}</td><td class="td">{fmt(row.length, 2)}</td><td class="td">{fmtI(row.quantity)}</td>
              <td class="td">{fmt(c.totalWeight, 3)}</td><td class="td">{c.unpriced ? '—' : `$${fmt(c.pricePerKg, 2)}`}</td>
              {#if showDiscount}<td class="td" style="color:var(--rp-negative)">{c.discount > 0 ? `-$${fmt(c.discount, 2)}` : '—'}</td>{/if}
              {#each mode === 'designer' ? profileCustomCols : [] as cc (cc.id)}<td class="td">{row.customFields?.[cc.id] ?? '—'}</td>{/each}
              <td class="td" style="font-weight:bold">{c.unpriced ? '—' : `$${fmt(c.finalTotal, 2)}`}</td>
              {#if showFlags}
                <td class="td flag-td">
                  {#if rowStat && rowStat.tone !== 'rejected'}<span class="status-pill status-{rowStat.tone}">{rowStat.label}</span>
                  {:else}
                    {#if onToggle}<input type="checkbox" checked={isFlagged} disabled={locked.profiles.has(row.id)} on:change={() => onToggle?.('profiles', row.id)} />
                    {:else if isFlagged}<span class="flag-tag">{flagIcon === 'select' ? '✓' : '⚠'}</span>{/if}
                    {#if rowStat}<div class="status-pill status-rejected">{rowStat.label}</div>{/if}
                  {/if}
                </td>
              {/if}
            </tr>
            {#if isFlagged && !rowStat}
              <tr class="reason-row"><td colspan={profileCols.length + 2}>
                {#if onToggle}<input class="reason-input" type="text" placeholder={flagIcon === 'select' ? 'Note (optional)…' : 'Reason for rejection…'} value={fs.profiles.get(row.id) ?? ''} on:input={(e) => onReasonChange?.('profiles', row.id, e.currentTarget.value)} />
                {:else}<div class="reason-note">{fs.profiles.get(row.id) || (flagIcon === 'select' ? 'No note.' : 'No reason given.')}</div>{/if}
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
            {@const c = applyRowPricing(computeMillRow(row, priceMode(row)), row, pricingOpts)}
            {@const isFlagged = showFlags && fs.mills.has(row.id)}
            {@const rowStat = showFlags ? rowStatus?.('mills', row.id) : undefined}
            <tr class:flagged-row={isFlagged} class:flagged-select={isFlagged && flagIcon === 'select'}>
              <td class="td">{i + 1}</td><td class="td">{getMaterialName(row.materialId)}</td><td class="td">{fmt(row.diameter, 1)}</td><td class="td">{fmt(row.length, 1)}</td>
              <td class="td">{row.type === 'standard' ? 'Wholesale' : 'Retail'}</td><td class="td">{fmtI(row.quantity)}</td>
              <td class="td">{fmt(c.totalWeight, 3)}</td><td class="td">{c.unpriced ? '—' : `$${fmt(c.pricePerKg, 2)}`}</td>
              {#if showDiscount}<td class="td" style="color:var(--rp-negative)">{c.discount > 0 ? `-$${fmt(c.discount, 2)}` : '—'}</td>{/if}
              {#each mode === 'designer' ? millCustomCols : [] as cc (cc.id)}<td class="td">{row.customFields?.[cc.id] ?? '—'}</td>{/each}
              <td class="td" style="font-weight:bold">{c.unpriced ? '—' : `$${fmt(c.finalTotal, 2)}`}</td>
              {#if showFlags}
                <td class="td flag-td">
                  {#if rowStat && rowStat.tone !== 'rejected'}<span class="status-pill status-{rowStat.tone}">{rowStat.label}</span>
                  {:else}
                    {#if onToggle}<input type="checkbox" checked={isFlagged} disabled={locked.mills.has(row.id)} on:change={() => onToggle?.('mills', row.id)} />
                    {:else if isFlagged}<span class="flag-tag">{flagIcon === 'select' ? '✓' : '⚠'}</span>{/if}
                    {#if rowStat}<div class="status-pill status-rejected">{rowStat.label}</div>{/if}
                  {/if}
                </td>
              {/if}
            </tr>
            {#if isFlagged && !rowStat}
              <tr class="reason-row"><td colspan={millCols.length + 2}>
                {#if onToggle}<input class="reason-input" type="text" placeholder={flagIcon === 'select' ? 'Note (optional)…' : 'Reason for rejection…'} value={fs.mills.get(row.id) ?? ''} on:input={(e) => onReasonChange?.('mills', row.id, e.currentTarget.value)} />
                {:else}<div class="reason-note">{fs.mills.get(row.id) || (flagIcon === 'select' ? 'No note.' : 'No reason given.')}</div>{/if}
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
            {@const c = applyRowPricing(computePipeRow(row, priceMode(row)), row, pricingOpts)}
            {@const isFlagged = showFlags && fs.pipes.has(row.id)}
            {@const rowStat = showFlags ? rowStatus?.('pipes', row.id) : undefined}
            <tr class:flagged-row={isFlagged} class:flagged-select={isFlagged && flagIcon === 'select'}>
              <td class="td">{i + 1}</td><td class="td">{getMaterialName(row.materialId)}</td><td class="td">{fmt(row.outerDiameter, 1)}</td><td class="td">{fmt(row.innerDiameter, 1)}</td><td class="td">{fmt(row.length, 1)}</td>
              <td class="td">{row.type === 'standard' ? 'Wholesale' : 'Retail'}</td><td class="td">{fmtI(row.quantity)}</td>
              <td class="td">{fmt(c.totalWeight, 3)}</td><td class="td">{c.unpriced ? '—' : `$${fmt(c.pricePerKg, 2)}`}</td>
              {#if showDiscount}<td class="td" style="color:var(--rp-negative)">{c.discount > 0 ? `-$${fmt(c.discount, 2)}` : '—'}</td>{/if}
              {#each mode === 'designer' ? pipeCustomCols : [] as cc (cc.id)}<td class="td">{row.customFields?.[cc.id] ?? '—'}</td>{/each}
              <td class="td" style="font-weight:bold">{c.unpriced ? '—' : `$${fmt(c.finalTotal, 2)}`}</td>
              {#if showFlags}
                <td class="td flag-td">
                  {#if rowStat && rowStat.tone !== 'rejected'}<span class="status-pill status-{rowStat.tone}">{rowStat.label}</span>
                  {:else}
                    {#if onToggle}<input type="checkbox" checked={isFlagged} disabled={locked.pipes.has(row.id)} on:change={() => onToggle?.('pipes', row.id)} />
                    {:else if isFlagged}<span class="flag-tag">{flagIcon === 'select' ? '✓' : '⚠'}</span>{/if}
                    {#if rowStat}<div class="status-pill status-rejected">{rowStat.label}</div>{/if}
                  {/if}
                </td>
              {/if}
            </tr>
            {#if isFlagged && !rowStat}
              <tr class="reason-row"><td colspan={pipeCols.length + 2}>
                {#if onToggle}<input class="reason-input" type="text" placeholder={flagIcon === 'select' ? 'Note (optional)…' : 'Reason for rejection…'} value={fs.pipes.get(row.id) ?? ''} on:input={(e) => onReasonChange?.('pipes', row.id, e.currentTarget.value)} />
                {:else}<div class="reason-note">{fs.pipes.get(row.id) || (flagIcon === 'select' ? 'No note.' : 'No reason given.')}</div>{/if}
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
            {@const c = applyRowPricing(computeSquareRow(row, priceMode(row)), row, pricingOpts)}
            {@const isFlagged = showFlags && fs.squares.has(row.id)}
            {@const rowStat = showFlags ? rowStatus?.('squares', row.id) : undefined}
            <tr class:flagged-row={isFlagged} class:flagged-select={isFlagged && flagIcon === 'select'}>
              <td class="td">{i + 1}</td><td class="td">{getMaterialName(row.materialId)}</td><td class="td">{fmt(row.length, 1)}</td><td class="td">{fmt(row.width, 1)}</td>
              <td class="td">{row.type === 'standard' ? 'Wholesale' : 'Retail'}</td><td class="td">{fmt(row.thickness, 1)}</td><td class="td">{fmtI(row.quantity)}</td>
              <td class="td">{fmt(c.totalWeight, 3)}</td><td class="td">{c.unpriced ? '—' : `$${fmt(c.pricePerKg, 2)}`}</td>
              {#if showDiscount}<td class="td" style="color:var(--rp-negative)">{c.discount > 0 ? `-$${fmt(c.discount, 2)}` : '—'}</td>{/if}
              {#each mode === 'designer' ? squareCustomCols : [] as cc (cc.id)}<td class="td">{row.customFields?.[cc.id] ?? '—'}</td>{/each}
              <td class="td" style="font-weight:bold">{c.unpriced ? '—' : `$${fmt(c.finalTotal, 2)}`}</td>
              {#if showFlags}
                <td class="td flag-td">
                  {#if rowStat && rowStat.tone !== 'rejected'}<span class="status-pill status-{rowStat.tone}">{rowStat.label}</span>
                  {:else}
                    {#if onToggle}<input type="checkbox" checked={isFlagged} disabled={locked.squares.has(row.id)} on:change={() => onToggle?.('squares', row.id)} />
                    {:else if isFlagged}<span class="flag-tag">{flagIcon === 'select' ? '✓' : '⚠'}</span>{/if}
                    {#if rowStat}<div class="status-pill status-rejected">{rowStat.label}</div>{/if}
                  {/if}
                </td>
              {/if}
            </tr>
            {#if isFlagged && !rowStat}
              <tr class="reason-row"><td colspan={squareCols.length + 2}>
                {#if onToggle}<input class="reason-input" type="text" placeholder={flagIcon === 'select' ? 'Note (optional)…' : 'Reason for rejection…'} value={fs.squares.get(row.id) ?? ''} on:input={(e) => onReasonChange?.('squares', row.id, e.currentTarget.value)} />
                {:else}<div class="reason-note">{fs.squares.get(row.id) || (flagIcon === 'select' ? 'No note.' : 'No reason given.')}</div>{/if}
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
            {@const rowStat = showFlags ? rowStatus?.('orders', row.id) : undefined}
            <tr class:flagged-row={isFlagged} class:flagged-select={isFlagged && flagIcon === 'select'}>
              <td class="td">{i + 1}</td><td class="td td-truncate" style="text-align:left">{row.orderName}</td><td class="td td-truncate" style="text-align:left">{row.description || '—'}</td><td class="td td-truncate" style="text-align:left">{row.properties || '—'}</td>
              <td class="td">{fmtI(row.quantity)}</td><td class="td">${fmt(row.unitPrice, 2)}</td>
              {#if showDiscount}<td class="td" style="color:var(--rp-negative)">{d > 0 ? `-$${fmt(d, 2)}` : '—'}</td>{/if}
              {#each mode === 'designer' ? orderCustomCols : [] as cc (cc.id)}<td class="td">{row.customFields?.[cc.id] ?? '—'}</td>{/each}
              <td class="td" style="font-weight:bold">${fmt(raw - d, 2)}</td>
              {#if showFlags}
                <td class="td flag-td">
                  {#if rowStat && rowStat.tone !== 'rejected'}<span class="status-pill status-{rowStat.tone}">{rowStat.label}</span>
                  {:else}
                    {#if onToggle}<input type="checkbox" checked={isFlagged} disabled={locked.orders.has(row.id)} on:change={() => onToggle?.('orders', row.id)} />
                    {:else if isFlagged}<span class="flag-tag">{flagIcon === 'select' ? '✓' : '⚠'}</span>{/if}
                    {#if rowStat}<div class="status-pill status-rejected">{rowStat.label}</div>{/if}
                  {/if}
                </td>
              {/if}
            </tr>
            {#if isFlagged && !rowStat}
              <tr class="reason-row"><td colspan={orderCols.length + 2}>
                {#if onToggle}<input class="reason-input" type="text" placeholder={flagIcon === 'select' ? 'Note (optional)…' : 'Reason for rejection…'} value={fs.orders.get(row.id) ?? ''} on:input={(e) => onReasonChange?.('orders', row.id, e.currentTarget.value)} />
                {:else}<div class="reason-note">{fs.orders.get(row.id) || (flagIcon === 'select' ? 'No note.' : 'No reason given.')}</div>{/if}
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
            <tr class:flagged-row={isFlagged} class:flagged-select={isFlagged && flagIcon === 'select'}>
              <td class="td">{i + 1}</td><td class="td td-truncate" style="text-align:left">{row.process || '—'}</td><td class="td td-truncate" style="text-align:left">{row.description || '—'}</td><td class="td">{row.type || '—'}</td><td class="td td-truncate" style="text-align:left">{row.properties || '—'}</td><td class="td">{row.supplier || '—'}</td>
              {#each mode === 'designer' ? processingCustomCols : [] as cc (cc.id)}<td class="td">{row.customFields?.[cc.id] ?? '—'}</td>{/each}
              <td class="td" style={showDiscount ? '' : 'font-weight:bold'}>${fmt(raw, 2)}</td>
              {#if showDiscount}<td class="td" style="color:var(--rp-negative)">{d > 0 ? `-$${fmt(d, 2)}` : '—'}</td><td class="td" style="font-weight:bold">${fmt(raw - d, 2)}</td>{/if}
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
    <div style="border-top:3px solid var(--rp-ink);margin:0 0 14px 0;"></div>
    <div style="background:var(--rp-summary-bg);border-radius:8px;padding:4px 20px;border:1px solid var(--rp-positive);">
      <div style="color:var(--rp-ink-faint);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Final Cost Summary</div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--rp-band);">
        <span style="color:var(--rp-line);font-size:12px;">Total Price (all categories)</span>
        <span style="color:var(--rp-band-ink);font-size:12px;font-weight:bold;">${fmt(grandTotalPrice, 2)}</span>
      </div>
      {#if mode === 'designer'}
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--rp-band);">
          <span style="color:var(--rp-accent);font-size:12px;">Safety Factor ({fmt(safeFactorPct, 2)}%)</span>
          <span style="color:var(--rp-accent);font-size:12px;font-weight:bold;">+${fmt(marginAmount, 2)}</span>
        </div>
      {:else if grandTotalDiscount > 0}
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--rp-band);">
          <span style="color:var(--rp-negative-soft);font-size:12px;">Total Discount Applied</span>
          <span style="color:var(--rp-negative-soft);font-size:12px;font-weight:bold;">-${fmt(grandTotalDiscount, 2)}</span>
        </div>
      {/if}
      {#if unpricedCount > 0}
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--rp-band);">
          <span style="color:var(--rp-warn);font-size:12px;">⚠ Rows with no price entered yet</span>
          <span style="color:var(--rp-warn);font-size:12px;font-weight:bold;">{unpricedCount} — total below is incomplete</span>
        </div>
      {/if}
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 4px;">
        <span style="color:var(--rp-band-ink);font-size:15px;font-weight:bold;letter-spacing:0.3px;">Final Price</span>
        <span style="color:var(--rp-positive-strong);font-size:18px;font-weight:bold;">${fmt(mode === 'designer' ? finalPrice : grandTotalPrice, 2)}</span>
      </div>
    </div>
  </div>
</div>

<style>
  /* ==========================================================================
     THE REPORT'S OWN PALETTE
     Every colour in this component reads from one of these. Nothing is
     hardcoded any more, which is exactly what used to make the report
     un-themeable and forced it to stay a white sheet even on a dark
     dashboard.
     Scoped to [data-report-theme] rather than the app's html[data-theme] on
     purpose: that is what lets exportPdf.ts pin the CLONE it rasterises to
     the light palette while the real page stays dark. One report, two looks,
     no flicker.
     ========================================================================== */
  .report-root {
    padding: 20px 24px;
    font-family: Arial, Helvetica, sans-serif;
    background: var(--rp-sheet);
    color: var(--rp-ink);

    /* ---- light: the printed sheet. Also exactly what the PDF captures. ---- */
    --rp-sheet: #ffffff;
    --rp-ink: #0f172a;
    --rp-ink-soft: #475569;
    --rp-ink-faint: #94a3b8;
    --rp-line: #cbd5e1;
    --rp-line-soft: #e2e8f0;
    --rp-head-bg: #f1f5f9;
    --rp-flag-bg: #fdecea;
    --rp-flag: #d9342b;
    --rp-flag-ink: #7a1610;
    --rp-flag-faint: #cc9999;
    --rp-negative: #dc2626;
    --rp-negative-soft: #f87171;
    --rp-positive: #10b981;
    --rp-positive-strong: #4ade80;
    --rp-accent: #fb923c;
    --rp-warn: #fbbf24;

    /* The per-section ledger bar and the Grand Summary box are dark bands BY
       DESIGN, in both themes — they are the report's emphasis device, not
       background. So they keep a fixed dark pair and light ink, instead of
       inverting into two bright slabs when the report goes dark. */
    --rp-band: #1e293b;
    --rp-band-ink: #ffffff;
    --rp-summary-bg: #0f172a;
  }

  /* ---- dark: same report, comfortable on a dark dashboard ---- */
  .report-root[data-report-theme='dark'] {
    --rp-sheet: #16212c;
    --rp-ink: #e8eef2;
    --rp-ink-soft: #a9bcca;
    --rp-ink-faint: #7d94a3;
    --rp-line: #33475a;
    --rp-line-soft: #2a3a49;
    --rp-head-bg: #1e2b38;
    --rp-flag-bg: #3a1f1a;
    --rp-flag: #e06a5c;
    --rp-flag-ink: #f2a08c;
    --rp-flag-faint: #8a5f57;
    --rp-negative: #f28b7d;
    --rp-negative-soft: #f28b7d;
    --rp-positive: #3fbd85;
    --rp-positive-strong: #6fdba3;
    --rp-accent: #f0a868;
    --rp-warn: #f2ce8a;

    --rp-band: #101b26;
    --rp-band-ink: #eaf2f7;
    --rp-summary-bg: #0a1420;
  }

  .page {
    margin-bottom: 14px;
    background: var(--rp-sheet);
  }
  .sec-title {
    font-size: 13px;
    font-weight: bold;
    color: var(--rp-ink);
    border-bottom: 2px solid var(--rp-ink);
    padding-bottom: 3px;
    margin: 0 0 8px;
  }
  .rpt-table {
    width: 100%;
    border-collapse: collapse;
    /* `fixed` divides the width evenly instead of letting the browser grow
       columns to fit their content. With twelve columns and no fixed layout,
       a long header like "Thickness (mm)" pushed its neighbour out of the way
       and the two overlapped — which is what the cramped report looked like. */
    table-layout: fixed;
  }
  .th {
    padding: 6px 8px;
    font-size: 9.5px;
    font-weight: bold;
    background: var(--rp-head-bg);
    border: 1px solid var(--rp-line);
    text-align: center;
    /* Headers wrap rather than overflow. nowrap is what let them spill over
       the cell border at A4 width; there is no amount of page width that
       makes nowrap safe for a table this wide. */
    white-space: normal;
    overflow-wrap: break-word;
    line-height: 1.25;
    vertical-align: bottom;
  }
  .td {
    padding: 5px 7px;
    font-size: 9.5px;
    border: 1px solid var(--rp-line);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
    background: var(--rp-band);
    border-radius: 6px;
    padding: 4px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .ledger-lbl {
    color: var(--rp-ink-faint);
    font-size: 11px;
    font-weight: 500;
    margin-bottom: 2px;
  }
  .ledger-val-w {
    color: var(--rp-band-ink);
    font-size: 15px;
    font-weight: bold;
  }
  .ledger-val-p {
    color: var(--rp-positive);
    font-size: 15px;
    font-weight: bold;
  }
  .unit {
    color: var(--rp-ink-faint);
    font-size: 12px;
    font-weight: normal;
  }
  .cov-lbl {
    font-size: 10px;
    color: var(--rp-ink-faint);
    text-transform: uppercase;
    font-weight: 600;
  }
  .cov-val {
    font-size: 13px;
    color: var(--rp-ink);
    font-weight: 700;
  }
  .flagged-row {
    background: var(--rp-flag-bg);
    box-shadow: inset 3px 0 0 var(--rp-flag);
  }
  /* Procurement's purchase checklist: a picked row reads as "included",
     not "wrong" — green, not the rejection red above. */
  .flagged-row.flagged-select {
    background: color-mix(in srgb, var(--rp-positive) 12%, var(--rp-sheet));
    box-shadow: inset 3px 0 0 var(--rp-positive);
  }
  .flag-td {
    text-align: center;
  }
  .flag-td input[type='checkbox'] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--rp-flag);
  }
  .flagged-select .flag-td input[type='checkbox'] {
    accent-color: var(--rp-positive);
  }
  .flag-td input[type='checkbox']:disabled {
    cursor: default;
    opacity: 0.75;
  }
  .flag-tag {
    color: var(--rp-flag);
    font-weight: 700;
    font-size: 12px;
  }
  .flagged-select .flag-tag {
    color: var(--rp-positive);
  }
  .status-pill {
    display: inline-block;
    font-size: 9.5px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 20px;
    white-space: nowrap;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .status-pill.status-locked {
    background: var(--rp-head-bg);
    color: var(--rp-ink-soft);
  }
  .status-pill.status-pending {
    background: var(--rp-warn);
    color: #3a2a10;
  }
  .status-pill.status-rejected {
    background: var(--rp-flag-bg);
    color: var(--rp-flag-ink);
  }
  .reason-row td {
    padding: 6px 8px 10px;
    border: 1px solid var(--rp-line);
    border-top: none;
  }
  .reason-input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--rp-flag);
    background: var(--rp-sheet);
    border-radius: 6px;
    padding: 5px 9px;
    font-size: 11px;
    color: var(--rp-flag-ink);
  }
  .reason-input::placeholder {
    color: var(--rp-flag-faint);
  }
  .reason-note {
    border: 1px solid var(--rp-flag);
    background: var(--rp-flag-bg);
    border-radius: 6px;
    padding: 5px 9px;
    font-size: 11px;
    color: var(--rp-flag-ink);
  }
</style>
