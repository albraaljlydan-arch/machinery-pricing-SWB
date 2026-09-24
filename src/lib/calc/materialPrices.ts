import { supabase } from '$lib/supabaseClient';
import { subscribeToTable } from '$lib/realtime';
import { getDefaultMaterialPrices, sanitizeNum, setSharedMaterialPrices, type CategoryPriceMap, type MaterialPricesTable, type PriceCategory } from '$lib/utils';

// ============================================================================
//  SHARED MATERIAL PRICES — one wholesale/retail price per material inside
//  each calculator category, maintained by Procurement in the
//  material_category_prices table (see supabase-material-category-prices.sql).
//  Loaded once at sign-in and kept live, so the calculator's
//  getRowPricePerKg() prices every tab from the same table for everyone.
// ============================================================================

export const CATEGORY_PRICES_TABLE = 'material_category_prices';
export const SHEET_BANDS_TABLE = 'sheet_thickness_bands';
export const SHEET_BAND_PRICES_TABLE = 'sheet_band_prices';

export interface CategoryPriceRow {
  category: PriceCategory;
  material_id: string;
  wholesale_price: number;
  retail_price: number;
  updated_at?: string;
}

export interface SheetBand {
  id: string;
  up_to_mm: number | null;
}

export interface SheetBandPriceRow {
  band_id: string;
  material_id: string;
  wholesale_price: number;
  retail_price: number;
  updated_at?: string;
}

export interface SharedPrices {
  rows: CategoryPriceRow[];
  /** Sorted by limit, open-ended band last. Empty until the bands SQL runs. */
  bands: SheetBand[];
  bandPrices: SheetBandPriceRow[];
  /** Set when the thickness-band tables are missing or failed to load. */
  bandsError: string | null;
}

/** Ascending by limit with the open-ended (null) band last. */
export function sortBands<T extends { up_to_mm: number | null }>(bands: T[]): T[] {
  return [...bands].sort((a, b) => (a.up_to_mm ?? Infinity) - (b.up_to_mm ?? Infinity));
}

/** Database rows → the calculator's price table. With thickness bands, sheet
 *  prices come from the band a row's thickness falls in; before the bands SQL
 *  has run, the single Sheet Metal price applies to every thickness.
 *  Materials without a row keep their default price. */
export function rowsToPriceTable(rows: CategoryPriceRow[], bands: SheetBand[] = [], bandPrices: SheetBandPriceRow[] = []): MaterialPricesTable {
  const table = getDefaultMaterialPrices();
  for (const row of rows) {
    const item = { wholesale: sanitizeNum(row.wholesale_price), retail: sanitizeNum(row.retail_price) };
    if (row.category === 'sheet') {
      if (table.sheet[row.material_id]) table.sheet[row.material_id] = { thin: { ...item }, mid: { ...item }, thick: { ...item } };
    } else if (table[row.category]?.[row.material_id]) {
      table[row.category][row.material_id] = item;
    }
  }
  if (bands.length) {
    table.sheetBands = sortBands(bands).map((band) => {
      // Start from the single sheet price (or default), then this band's stored prices.
      const prices: CategoryPriceMap = {};
      for (const materialId of Object.keys(table.sheet)) prices[materialId] = { ...table.sheet[materialId].thin };
      for (const p of bandPrices) {
        if (p.band_id === band.id && prices[p.material_id]) prices[p.material_id] = { wholesale: sanitizeNum(p.wholesale_price), retail: sanitizeNum(p.retail_price) };
      }
      return { upToMm: band.up_to_mm, prices };
    });
  }
  return table;
}

/** Fetches the shared prices and installs them for the calculator. Returns
 *  them, or an error message (e.g. the SQL file has not been run yet — the
 *  calculator then keeps its previous fallback prices). */
export async function loadSharedMaterialPrices(): Promise<({ error: null } & SharedPrices) | { error: string }> {
  const [categoryRes, bandRes, bandPriceRes] = await Promise.all([
    supabase.from(CATEGORY_PRICES_TABLE).select('category, material_id, wholesale_price, retail_price, updated_at'),
    supabase.from(SHEET_BANDS_TABLE).select('id, up_to_mm'),
    supabase.from(SHEET_BAND_PRICES_TABLE).select('band_id, material_id, wholesale_price, retail_price, updated_at'),
  ]);
  if (categoryRes.error) return { error: categoryRes.error.message };
  const rows = (categoryRes.data || []).map((row) => ({
    ...row,
    wholesale_price: Number(row.wholesale_price),
    retail_price: Number(row.retail_price),
  })) as CategoryPriceRow[];

  const bandsError = bandRes.error?.message ?? bandPriceRes.error?.message ?? null;
  const bands = bandsError ? [] : sortBands((bandRes.data || []).map((b) => ({ id: b.id as string, up_to_mm: b.up_to_mm === null ? null : Number(b.up_to_mm) })));
  const bandPrices = bandsError ? [] : ((bandPriceRes.data || []).map((p) => ({
    ...p,
    wholesale_price: Number(p.wholesale_price),
    retail_price: Number(p.retail_price),
  })) as SheetBandPriceRow[]);

  setSharedMaterialPrices(rows.length || bands.length ? rowsToPriceTable(rows, bands, bandPrices) : null);
  return { error: null, rows, bands, bandPrices, bandsError };
}

let stopLiveUpdates: (() => void)[] = [];

/** Called when a user signs in: load now, then reload whenever Procurement
 *  saves, so a calculator left open for days never prices with stale data. */
export async function startSharedMaterialPrices(): Promise<void> {
  if (!stopLiveUpdates.length) {
    const reload = () => void loadSharedMaterialPrices();
    stopLiveUpdates = [CATEGORY_PRICES_TABLE, SHEET_BANDS_TABLE, SHEET_BAND_PRICES_TABLE].map((table) => subscribeToTable(table, reload));
  }
  await loadSharedMaterialPrices();
}

/** Called on sign-out: the next account must not inherit this one's cache. */
export function stopSharedMaterialPrices(): void {
  stopLiveUpdates.forEach((stop) => stop());
  stopLiveUpdates = [];
  setSharedMaterialPrices(null);
}
