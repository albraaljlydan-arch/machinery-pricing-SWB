<script lang="ts">
  // ==========================================================================
  //  MATERIAL PRICES — wholesale/retail per material, one tab per calculator
  //  category, and the Sheet Metal tab split again by thickness band.
  //  Procurement edits (editable); Admin and Designer see the same screen
  //  read-only. Saving writes material_category_prices / sheet_band_prices,
  //  which the calculator reads (lib/calc/materialPrices.ts), so each price
  //  lands in the matching calculator tab — and sheet prices in the band that
  //  matches each row's thickness — for every designer.
  // ==========================================================================
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { MATERIALS } from '$lib/constants';
  import { locale } from '$lib/stores/locale';
  import { toast } from '$lib/stores/toast';
  import { t, type DictKey } from '$lib/i18n/dict';
  import { formatDate } from '$lib/calc/formatDate';
  import { subscribeToTable } from '$lib/realtime';
  import {
    CATEGORY_PRICES_TABLE,
    SHEET_BANDS_TABLE,
    SHEET_BAND_PRICES_TABLE,
    loadSharedMaterialPrices,
    type SharedPrices,
    type SheetBand,
  } from '$lib/calc/materialPrices';
  import type { PriceCategory } from '$lib/utils';
  import type { Locale } from '$lib/stores/locale';

  export let editable = false;

  const TABS: { id: PriceCategory; label: DictKey }[] = [
    { id: 'sheet', label: 'priceTabSheet' },
    { id: 'profile', label: 'priceTabProfile' },
    { id: 'mill', label: 'priceTabMill' },
    { id: 'pipe', label: 'priceTabPipe' },
    { id: 'square', label: 'priceTabSquare' },
  ];

  // One price table per key: a category ('profile', …, or 'sheet' before the
  // bands SQL has run) or a thickness band ('band:<id>').
  type Cell = { wholesale: string; retail: string };
  type Grid = Record<string, Record<string, Cell>>;

  let active: PriceCategory = 'sheet';
  let activeBand = '';
  let bands: SheetBand[] = [];
  let bandsReady = false;
  let grid: Grid = {};
  let saved: Grid = {};
  let updatedAt: Record<string, string> = {};
  let loading = true;
  let saving = false;
  let setupRequired = false;
  let loadError = '';

  const bandKey = (id: string) => `band:${id}`;
  $: activeKey = active === 'sheet' && bandsReady ? bandKey(activeBand) : active;

  function defaultTable(): Record<string, Cell> {
    const table: Record<string, Cell> = {};
    for (const m of MATERIALS) table[m.id] = { wholesale: String(m.stdPriceKg ?? 0), retail: String(m.piecePriceKg ?? 0) };
    return table;
  }

  function newest(current: string | undefined, candidate: string | undefined) {
    return candidate && (!current || candidate > current) ? candidate : current;
  }

  // Every material appears in every table; a missing row shows the same
  // price the calculator would fall back to.
  function fromShared(shared: SharedPrices) {
    const next: Grid = {};
    const latest: Record<string, string> = {};
    for (const tab of TABS) next[tab.id] = defaultTable();
    for (const row of shared.rows) {
      if (!next[row.category]?.[row.material_id]) continue;
      next[row.category][row.material_id] = { wholesale: String(row.wholesale_price), retail: String(row.retail_price) };
      latest[row.category] = newest(latest[row.category], row.updated_at) ?? latest[row.category];
    }
    for (const band of shared.bands) next[bandKey(band.id)] = structuredClone(next.sheet);
    for (const row of shared.bandPrices) {
      const key = bandKey(row.band_id);
      if (!next[key]?.[row.material_id]) continue;
      next[key][row.material_id] = { wholesale: String(row.wholesale_price), retail: String(row.retail_price) };
      latest[key] = newest(latest[key], row.updated_at) ?? latest[key];
    }
    bands = shared.bands;
    bandsReady = !shared.bandsError && shared.bands.length > 0;
    if (!bands.some((band) => band.id === activeBand)) activeBand = bands[0]?.id ?? '';
    grid = next;
    saved = structuredClone(next);
    updatedAt = latest;
  }

  async function load() {
    const result = await loadSharedMaterialPrices();
    loading = false;
    if (result.error !== null) {
      // PostgREST reports a table that was never created as missing from its schema cache.
      setupRequired = /material_category_prices|schema cache|does not exist/i.test(result.error);
      loadError = setupRequired ? '' : result.error;
      return;
    }
    setupRequired = false;
    loadError = '';
    // Another user's save must not wipe edits in progress here.
    if (!dirty) fromShared(result);
  }

  let stopLive: (() => void)[] = [];
  onMount(() => {
    load();
    stopLive = [CATEGORY_PRICES_TABLE, SHEET_BANDS_TABLE, SHEET_BAND_PRICES_TABLE].map((table) => subscribeToTable(table, load));
  });
  onDestroy(() => stopLive.forEach((stop) => stop()));

  function isDirtyCell(key: string, materialId: string, g: Grid, s: Grid) {
    const a = g[key]?.[materialId], b = s[key]?.[materialId];
    return !!a && !!b && (a.wholesale !== b.wholesale || a.retail !== b.retail);
  }
  $: dirtyKeys = new Set(Object.keys(grid).filter((key) => MATERIALS.some((m) => isDirtyCell(key, m.id, grid, saved))));
  $: dirty = dirtyKeys.size > 0;
  $: sheetDirty = [...dirtyKeys].some((key) => key === 'sheet' || key.startsWith('band:'));
  $: tabDirty = (id: PriceCategory) => (id === 'sheet' ? sheetDirty : dirtyKeys.has(id));

  function validPrice(value: string) {
    return value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
  }

  // Digits and a single decimal point only — prices and limits are never negative.
  function cleanNumber(raw: string) {
    let value = raw.replace(/[^\d.]/g, '');
    const dot = value.indexOf('.');
    if (dot !== -1) value = value.slice(0, dot + 1) + value.slice(dot + 1).replace(/\./g, '');
    return value;
  }

  function setCell(materialId: string, field: keyof Cell, raw: string) {
    grid[activeKey][materialId] = { ...grid[activeKey][materialId], [field]: cleanNumber(raw) };
    grid = grid;
  }

  function discard() {
    grid = structuredClone(saved);
  }

  async function save() {
    const categoryRows: { category: PriceCategory; material_id: string; wholesale_price: number; retail_price: number }[] = [];
    const bandRows: { band_id: string; material_id: string; wholesale_price: number; retail_price: number }[] = [];
    for (const key of dirtyKeys) {
      for (const m of MATERIALS) {
        if (!isDirtyCell(key, m.id, grid, saved)) continue;
        const cell = grid[key][m.id];
        if (!validPrice(cell.wholesale) || !validPrice(cell.retail)) {
          if (key.startsWith('band:')) { active = 'sheet'; activeBand = key.slice(5); } else active = key as PriceCategory;
          toast.notify(t($locale, 'pricesInvalid'), 'error');
          return;
        }
        const prices = { material_id: m.id, wholesale_price: Number(cell.wholesale), retail_price: Number(cell.retail) };
        if (key.startsWith('band:')) bandRows.push({ band_id: key.slice(5), ...prices });
        else categoryRows.push({ category: key as PriceCategory, ...prices });
      }
    }
    if (!categoryRows.length && !bandRows.length) return;

    saving = true;
    const results = await Promise.all([
      categoryRows.length ? supabase.from(CATEGORY_PRICES_TABLE).upsert(categoryRows, { onConflict: 'category,material_id' }) : null,
      bandRows.length ? supabase.from(SHEET_BAND_PRICES_TABLE).upsert(bandRows, { onConflict: 'band_id,material_id' }) : null,
    ]);
    const error = results.find((r) => r?.error)?.error;
    if (error) {
      saving = false;
      toast.notify(t($locale, 'pricesSaveError') + error.message, 'error');
      return;
    }
    // Reload from the server so this screen and this browser's calculator
    // both show exactly what was stored.
    const result = await loadSharedMaterialPrices();
    saving = false;
    if (result.error === null) fromShared(result);
    toast.notify(t($locale, 'pricesSavedToast'), 'success');
  }

  // ---- thickness band labels -----------------------------------------------
  const num = (n: number) => String(Number(n.toFixed(3)));

  /** "Up to 5 mm", "5 – 10 mm", "Above 10 mm" — from the band's limit and
   *  the previous band's (limits sorted ascending, open band last). */
  function rangeLabel(loc: Locale, previous: number | null, limit: number | null) {
    if (limit !== null && previous === null) return t(loc, 'sheetBandUpTo').replace('{b}', num(limit));
    if (limit !== null && previous !== null) return t(loc, 'sheetBandRange').replace('{a}', num(previous)).replace('{b}', num(limit));
    if (previous !== null) return t(loc, 'sheetBandAbove').replace('{a}', num(previous));
    return t(loc, 'sheetBandAll');
  }
  $: bandLabels = bands.map((band, i) => rangeLabel($locale, i > 0 ? bands[i - 1].up_to_mm : null, band.up_to_mm));

  // ---- band settings panel -------------------------------------------------
  type Draft = { key: string; id: string | null; limit: string };
  let showBandSettings = false;
  let drafts: Draft[] = [];
  let openBandId = '';
  let savingBands = false;
  let draftSeq = 0;

  function openBandSettings() {
    drafts = bands.filter((b) => b.up_to_mm !== null).map((b) => ({ key: b.id, id: b.id, limit: num(b.up_to_mm!) }));
    openBandId = bands.find((b) => b.up_to_mm === null)?.id ?? '';
    showBandSettings = true;
  }

  const validLimit = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) > 0;
  $: draftLimits = drafts.map((d) => Number(d.limit));
  $: draftsValid = drafts.every((d) => validLimit(d.limit)) && new Set(draftLimits).size === draftLimits.length;

  // Ranges preview in limit order, so each card says what it will cover.
  $: sortedDrafts = [...drafts].sort((a, b) => (validLimit(a.limit) ? Number(a.limit) : Infinity) - (validLimit(b.limit) ? Number(b.limit) : Infinity));
  $: draftCovers = Object.fromEntries(sortedDrafts.map((d, i) => [d.key, validLimit(d.limit) ? rangeLabel($locale, i > 0 && validLimit(sortedDrafts[i - 1].limit) ? Number(sortedDrafts[i - 1].limit) : null, Number(d.limit)) : '—']));
  $: largestLimit = draftLimits.filter((n) => Number.isFinite(n) && n > 0).reduce((max, n) => Math.max(max, n), 0);
  $: openCovers = rangeLabel($locale, largestLimit > 0 ? largestLimit : null, null);

  function sortDrafts() {
    drafts = sortedDrafts;
  }

  function addBand() {
    drafts = [...drafts, { key: `new-${++draftSeq}`, id: null, limit: num(largestLimit + 5) }];
  }

  function removeBand(key: string) {
    drafts = drafts.filter((d) => d.key !== key);
  }

  async function saveBands() {
    if (!draftsValid || !openBandId) {
      toast.notify(t($locale, 'sheetBandsInvalid'), 'error');
      return;
    }
    savingBands = true;
    const payload = [...sortedDrafts.map((d) => ({ id: d.id, up_to_mm: Number(d.limit) })), { id: openBandId, up_to_mm: null }];
    const { error } = await supabase.rpc('save_sheet_bands', { p_bands: payload });
    if (error) {
      savingBands = false;
      toast.notify(t($locale, 'sheetBandsSaveError') + error.message, 'error');
      return;
    }
    const result = await loadSharedMaterialPrices();
    savingBands = false;
    if (result.error === null) fromShared(result);
    showBandSettings = false;
    toast.notify(t($locale, 'sheetBandsSaved'), 'success');
  }

  function beforeUnload(event: BeforeUnloadEvent) {
    if (editable && dirty) event.preventDefault();
  }

  function money(value: string) {
    return '$' + Number(value || 0).toFixed(2);
  }
</script>

<svelte:window on:beforeunload={beforeUnload} />

<div class="prices">
  <p class="hint">{editable ? t($locale, 'pricesEditorHint') : t($locale, 'pricesReadonlyHint')}</p>

  <div class="tabs" role="tablist" aria-label={t($locale, 'materialPrices')}>
    {#each TABS as tab}
      <button type="button" role="tab" aria-selected={active === tab.id} class:active={active === tab.id} on:click={() => (active = tab.id)}>
        {t($locale, tab.label)}
        {#if tabDirty(tab.id)}<span class="dirty-dot" title={t($locale, 'pricesUnsaved')}></span>{/if}
      </button>
    {/each}
  </div>

  <div class="panel" role="tabpanel">
    {#if loading}
      <div class="state">{t($locale, 'loading')}</div>
    {:else if setupRequired}
      <div class="state error">{t($locale, 'pricesSetupRequired')}</div>
    {:else if loadError}
      <div class="state error">{t($locale, 'pricesLoadError') + loadError}</div>
    {:else}
      {#if active === 'sheet'}
        {#if bandsReady}
          <div class="band-bar">
            <div class="band-tabs" role="tablist" aria-label={t($locale, 'sheetBandsSettings')}>
              {#each bands as band, i (band.id)}
                <button type="button" role="tab" aria-selected={activeBand === band.id} class:active={activeBand === band.id} on:click={() => (activeBand = band.id)}>
                  <span dir="auto">{bandLabels[i]}</span>
                  {#if dirtyKeys.has(bandKey(band.id))}<span class="dirty-dot"></span>{/if}
                </button>
              {/each}
            </div>
            {#if editable}
              <button type="button" class="gear-btn" class:on={showBandSettings} on:click={() => (showBandSettings ? (showBandSettings = false) : openBandSettings())} disabled={dirty && !showBandSettings} title={dirty ? t($locale, 'sheetBandsSaveFirst') : t($locale, 'sheetBandsSettings')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
                {t($locale, 'sheetBandsSettings')}
              </button>
            {/if}
          </div>

          {#if showBandSettings}
            <section class="band-settings" aria-label={t($locale, 'sheetBandsSettings')}>
              <header>
                <h4>{t($locale, 'sheetBandsSettings')}</h4>
                <p>{t($locale, 'sheetBandsSettingsHint')}</p>
              </header>
              <div class="band-cards">
                {#each drafts as draft, i (draft.key)}
                  <div class="band-card" class:new={draft.id === null}>
                    <div class="band-card-head">
                      <b>{t($locale, 'sheetBandN').replace('{n}', String(i + 1))}</b>
                      <button type="button" class="icon-danger" on:click={() => removeBand(draft.key)} aria-label={t($locale, 'sheetBandDelete')} title={t($locale, 'sheetBandDelete')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
                      </button>
                    </div>
                    <label>
                      <span>{t($locale, 'sheetBandLimitLabel')}</span>
                      <input type="text" inputmode="decimal" dir="ltr" class:invalid={!validLimit(draft.limit) || draftLimits.filter((n) => n === Number(draft.limit)).length > 1} value={draft.limit} on:input={(e) => { draft.limit = cleanNumber(e.currentTarget.value); drafts = drafts; }} on:blur={sortDrafts} />
                    </label>
                    <small dir="auto">{t($locale, 'sheetBandCovers').replace('{range}', draftCovers[draft.key] ?? '—')}</small>
                  </div>
                {/each}
                <div class="band-card open">
                  <div class="band-card-head"><b>{t($locale, 'sheetBandN').replace('{n}', String(drafts.length + 1))}</b></div>
                  <p class="open-range" dir="auto">{openCovers}</p>
                </div>
              </div>
              <p class="new-hint">{t($locale, 'sheetBandsNewHint')}</p>
              <div class="band-actions">
                <button type="button" class="btn ghost add" on:click={addBand}>＋ {t($locale, 'sheetBandAdd')}</button>
                <span class="spacer"></span>
                <button type="button" class="btn ghost" on:click={() => (showBandSettings = false)} disabled={savingBands}>{t($locale, 'cancelBtn')}</button>
                <button type="button" class="btn primary" on:click={saveBands} disabled={savingBands || !draftsValid}>{savingBands ? t($locale, 'savingGeneric') : t($locale, 'sheetBandsSave')}</button>
              </div>
            </section>
          {/if}
        {:else if editable}
          <p class="notice">{t($locale, 'sheetBandsSetupRequired')}</p>
        {/if}
      {/if}

      <table>
        <thead>
          <tr>
            <th class="col-name">{t($locale, 'colMaterial')}</th>
            <th>{t($locale, 'colWholesalePrice')}</th>
            <th>{t($locale, 'colRetailPrice')}</th>
          </tr>
        </thead>
        <tbody>
          {#each MATERIALS as m (m.id)}
            {@const cell = grid[activeKey]?.[m.id] ?? { wholesale: '0', retail: '0' }}
            <tr class:changed={isDirtyCell(activeKey, m.id, grid, saved)}>
              <td class="col-name" dir="ltr">{m.nameEn}</td>
              {#if editable}
                <td><input class="price-input" class:invalid={!validPrice(cell.wholesale)} type="text" inputmode="decimal" dir="ltr" aria-label="{m.nameEn} — {t($locale, 'colWholesalePrice')}" value={cell.wholesale} on:input={(e) => setCell(m.id, 'wholesale', e.currentTarget.value)} /></td>
                <td><input class="price-input" class:invalid={!validPrice(cell.retail)} type="text" inputmode="decimal" dir="ltr" aria-label="{m.nameEn} — {t($locale, 'colRetailPrice')}" value={cell.retail} on:input={(e) => setCell(m.id, 'retail', e.currentTarget.value)} /></td>
              {:else}
                <td class="num">{money(cell.wholesale)}</td>
                <td class="num">{money(cell.retail)}</td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>

      <div class="foot">
        <span class="updated">
          {#if updatedAt[activeKey]}{t($locale, 'pricesLastUpdated')}: <b class="num">{formatDate(updatedAt[activeKey])}</b>{/if}
        </span>
        {#if editable}
          <div class="actions">
            {#if dirty}<span class="unsaved">{t($locale, 'pricesUnsaved')}</span>{/if}
            <button type="button" class="btn ghost" on:click={discard} disabled={!dirty || saving}>{t($locale, 'pricesDiscard')}</button>
            <button type="button" class="btn primary" on:click={save} disabled={!dirty || saving}>{saving ? t($locale, 'savingGeneric') : t($locale, 'save')}</button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .prices {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .hint {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.7;
    color: var(--ink-soft);
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 5px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--card);
    width: fit-content;
    max-width: 100%;
  }
  .tabs button {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--ink-soft);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    padding: 8px 14px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .tabs button:hover {
    background: var(--paper);
    color: var(--ink);
  }
  .tabs button.active {
    background: var(--navy);
    color: #fff;
  }
  .dirty-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--amber);
  }

  .band-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 14px;
  }
  .band-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .band-tabs button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--border);
    border-radius: 20px;
    background: var(--paper);
    color: var(--ink-soft);
    font: inherit;
    font-size: 12.5px;
    font-weight: 700;
    padding: 6px 14px;
    cursor: pointer;
  }
  .band-tabs button.active {
    border-color: var(--navy-3);
    background: color-mix(in srgb, var(--navy-3) 14%, var(--card));
    color: var(--ink);
  }
  .gear-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    color: var(--ink-soft);
    font: inherit;
    font-size: 12.5px;
    font-weight: 700;
    padding: 7px 12px;
    cursor: pointer;
  }
  .gear-btn svg {
    width: 16px;
    height: 16px;
    transition: transform 0.3s ease;
  }
  .gear-btn:hover:not(:disabled) svg,
  .gear-btn.on svg {
    transform: rotate(60deg);
  }
  .gear-btn.on {
    border-color: var(--navy-3);
    color: var(--ink);
  }
  .gear-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .notice {
    margin: 0 0 14px;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--info-bg, var(--paper));
    color: var(--info-ink, var(--ink-soft));
    font-size: 12.5px;
    line-height: 1.7;
  }

  .band-settings {
    margin-bottom: 16px;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--paper);
  }
  .band-settings h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 800;
    color: var(--ink);
  }
  .band-settings header p {
    margin: 4px 0 14px;
    font-size: 12px;
    line-height: 1.7;
    color: var(--ink-soft);
  }
  .band-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 12px;
  }
  .band-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--card);
  }
  .band-card.new {
    border-style: dashed;
    border-color: var(--navy-3);
  }
  .band-card.open {
    background: color-mix(in srgb, var(--navy-3) 6%, var(--card));
  }
  .band-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 28px;
  }
  .band-card-head b {
    font-size: 13px;
    color: var(--ink);
  }
  .band-card label {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 11.5px;
    font-weight: 700;
    color: var(--ink-soft);
  }
  .band-card input {
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 7px 10px;
    font-family: var(--font-num);
    font-size: 13px;
    background: var(--paper);
    color: var(--ink);
  }
  .band-card input.invalid {
    border-color: var(--danger);
  }
  .band-card small {
    font-size: 11.5px;
    color: var(--ink-soft);
  }
  .open-range {
    margin: auto 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink);
  }
  .icon-danger {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid color-mix(in srgb, var(--danger) 40%, var(--border));
    border-radius: 6px;
    background: transparent;
    color: var(--danger);
    cursor: pointer;
  }
  .icon-danger svg {
    width: 15px;
    height: 15px;
  }
  .icon-danger:hover {
    background: var(--danger-bg);
  }
  .new-hint {
    margin: 12px 0 0;
    font-size: 11.5px;
    color: var(--ink-soft);
  }
  .band-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 12px;
  }
  .band-actions .spacer {
    flex: 1;
  }

  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 18px 20px;
    overflow-x: auto;
  }
  .state {
    padding: 30px;
    text-align: center;
    color: var(--ink-soft);
    font-size: 13px;
  }
  .state.error {
    color: var(--danger-deep);
    background: var(--danger-bg);
    border-radius: 8px;
    line-height: 1.7;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th {
    text-align: center;
    font-size: 11px;
    color: var(--steel-2);
    padding: 9px 12px;
    background: var(--paper);
    border-bottom: 1px solid var(--border);
    font-weight: 700;
  }
  td {
    text-align: center;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
  }
  tr:last-child td {
    border-bottom: none;
  }
  tr.changed td {
    background: color-mix(in srgb, var(--amber) 9%, transparent);
  }
  .col-name {
    text-align: start;
    font-weight: 700;
    color: var(--ink);
  }
  :global(html[dir='rtl']) .prices td.col-name {
    text-align: right;
  }
  .num {
    font-family: var(--font-num);
    font-variant-numeric: tabular-nums;
  }
  .price-input {
    width: 110px;
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 6px 9px;
    font-size: 13px;
    font-family: var(--font-num);
    font-variant-numeric: tabular-nums;
    text-align: center;
    background: var(--paper);
    color: var(--ink);
  }
  .price-input:focus-visible {
    outline: 2px solid var(--navy-3);
    outline-offset: 1px;
  }
  .price-input.invalid {
    border-color: var(--danger);
  }

  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 16px;
  }
  .updated {
    font-size: 12px;
    color: var(--ink-soft);
  }
  .actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }
  .unsaved {
    font-size: 12px;
    font-weight: 700;
    color: var(--amber-ink, var(--amber));
  }
  .btn {
    border-radius: 8px;
    padding: 8px 18px;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid transparent;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn.primary {
    background: var(--success);
    color: #fff;
  }
  .btn.ghost {
    background: transparent;
    border-color: var(--border);
    color: var(--ink-soft);
  }

  @media (max-width: 640px) {
    .panel {
      padding: 12px;
    }
    .tabs {
      width: 100%;
    }
    .tabs button {
      flex: 1 1 auto;
      justify-content: center;
      padding: 8px 10px;
    }
    .price-input {
      width: 84px;
    }
  }
</style>
