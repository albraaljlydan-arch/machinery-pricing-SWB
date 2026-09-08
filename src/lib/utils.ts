import type { SheetRow, ProfileRow, MillRow, PipeRow, SquareRow, OrderRow } from './types';
import { MATERIALS } from './constants';

// ============================================================
//  Types
// ============================================================
export type PricingMode = 'wholesale' | 'retail';

export interface MaterialPriceItem {
  wholesale: number;
  retail: number;
}

// ------------------------------------------------------------
//  Prices are organized by product category (Sheet Metal, Profiles
//  & Tubes, Mill, Pipes & Bushings, Square & Blocks) — matching the
//  app's own tabs — rather than one flat cross-category list.
//  Sheet Metal additionally splits each material's price into three
//  thickness bands, since sheet pricing varies a lot by thickness.
// ------------------------------------------------------------
export const PRICE_CATEGORIES = ['sheet', 'profile', 'mill', 'pipe', 'square'] as const;
export type PriceCategory = typeof PRICE_CATEGORIES[number];

export const SHEET_THICKNESS_RANGES: { id: 'thin' | 'mid' | 'thick'; label: string; test: (t: number) => boolean }[] = [
  { id: 'thin',  label: 'Up to 6 mm',  test: (t) => t <= 6 },
  { id: 'mid',   label: '6 – 10 mm',   test: (t) => t > 6 && t <= 10 },
  { id: 'thick', label: 'Above 10 mm', test: (t) => t > 10 },
];
export type SheetThicknessRangeId = 'thin' | 'mid' | 'thick';

export const getSheetThicknessRange = (thickness: number): SheetThicknessRangeId => {
  const t = Number.isFinite(thickness) ? thickness : 0;
  return (SHEET_THICKNESS_RANGES.find((r) => r.test(t)) ?? SHEET_THICKNESS_RANGES[2]).id;
};

export type CategoryPriceMap = Record<string, MaterialPriceItem>;                          // materialId → price
export type SheetPriceMap = Record<string, Record<SheetThicknessRangeId, MaterialPriceItem>>; // materialId → range → price

export interface MaterialPricesTable {
  sheet: SheetPriceMap;
  profile: CategoryPriceMap;
  mill: CategoryPriceMap;
  pipe: CategoryPriceMap;
  square: CategoryPriceMap;
}

// ============================================================
//  Utility helpers
// ============================================================
export const generateUid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

export const sanitizeQuantity = (val: any): number => {
  const num = parseInt(String(val ?? ''), 10);
  if (isNaN(num) || num < 1) return 1;
  return Math.floor(num);
};

/** Parse any value to a non-negative number; empty/null/NaN → 0 */
export const sanitizeNum = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  const str = String(val).replace(',', '.');
  const num = parseFloat(str);
  if (isNaN(num) || num < 0) return 0;
  return num;
};

// ============================================================
//  Row validation — shared by App.tsx (aggregate totals / banner)
//  and by the tab components themselves (per-field red highlighting).
//  Lives here rather than in App.tsx so tabs can import it directly
//  without creating a circular App.tsx ⇄ Tab import.
// ============================================================
export const getRowError = (row: Record<string, any>): string | null => {
  for (const [key, val] of Object.entries(row)) {
    if (typeof val === 'number' && val < 0) return `Negative value in field: ${key}`;
  }
  return null;
};

export const getPipeError = (row: PipeRow): string | null => {
  const e = getRowError(row); if (e) return e;
  // Only flag once the user has actually entered both diameters — never on
  // empty/untouched fields, and never mid-typing while one side is still 0.
  const outer = sanitizeNum(row.outerDiameter);
  const inner = sanitizeNum(row.innerDiameter);
  if (outer > 0 && inner > 0 && outer <= inner) {
    return 'Outer diameter must be greater than inner diameter';
  }
  return null;
};

// Wall thickness must be strictly less than (the smaller section side ÷ 4).
// Section sides (sideA/sideB) are stored in cm; wall thickness is stored in mm,
// so the cm-based limit is converted to mm (× 10) before comparing.
// Example: a 4cm × 2cm section → smaller side 2cm → 2cm ÷ 4 = 0.5cm = 5mm limit.
export const getMaxWallThicknessMm = (row: ProfileRow): number => {
  const minSideCm = Math.min(sanitizeNum(row.sideA), sanitizeNum(row.sideB));
  return (minSideCm / 4) * 10;
};

export const getProfileError = (row: ProfileRow): string | null => {
  const e = getRowError(row); if (e) return e;
  const maxWallMm = getMaxWallThicknessMm(row);
  if (sanitizeNum(row.wallThickness) >= maxWallMm) {
    return `Wall thickness must be less than ${maxWallMm.toFixed(2)} mm (smaller side ÷ 4)`;
  }
  return null;
};

/** Strip chars that aren't digits, comma, or dot; normalise comma → dot
 *  (kept for backward-compat — new inputs should use sanitizeDecimalInput). */
export const filterDecimalInput = (value: string): string => {
  let cleaned = value.replace(/[^0-9.,]/g, '');
  cleaned = cleaned.replace(/,/g, '.');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned;
};

// ============================================================
//  Strict live-typing filters for numeric text inputs.
//  Used by components/DecimalInput.tsx and components/QuantityInput.tsx —
//  the single shared onChange/onBlur path for every numeric field across
//  Sheet, Profile, Mill, Pipe, Square and Order tabs. These only ever touch
//  the raw *string* a field displays; the actual numbers fed into
//  computeRow()/recompute*Row() still go through sanitizeNum/sanitizeQuantity
//  above, so calculation behaviour is unchanged.
// ============================================================

/**
 * Collapses leading zeros in a string that already contains only digits
 * and (optionally) a single dot — e.g. "00" -> "0", "05" -> "5",
 * "01.5" -> "1.5", "00.5" -> "0.5". A value that starts "0." is left alone
 * so the user can keep typing a decimal ("0.5", "0.007", ...).
 */
export const preventLeadingZeros = (value: string): string => {
  if (value === '' || value === '0') return value;
  if (value.startsWith('0.')) return value;
  if (!value.startsWith('0')) return value;

  const dotIdx = value.indexOf('.');
  if (dotIdx === -1) {
    // Pure digits starting with "0", e.g. "00", "01", "005"
    const stripped = value.replace(/^0+/, '');
    return stripped === '' ? '0' : stripped;
  }
  // Has a dot but doesn't start "0." — e.g. "00.5", "01.25"
  const intPart = value.slice(0, dotIdx).replace(/^0+/, '');
  return (intPart === '' ? '0' : intPart) + value.slice(dotIdx);
};

/**
 * onChange/paste sanitizer for decimal fields (Length, Width, Thickness,
 * Diameter, Weight, price, etc.).
 * - Only digits and "." survive — letters, +, -, *, /, %, $, #, commas, and
 *   every other symbol are stripped immediately.
 * - Only the FIRST dot is kept ("1.2.3" -> "1.23"), so a second dot is
 *   effectively blocked rather than accepted.
 * - Leading zeros are collapsed in real time via preventLeadingZeros.
 * Works identically for typed keystrokes and pasted text, since it always
 * sanitizes the whole resulting string rather than a single character.
 */
export const sanitizeDecimalInput = (value: string): string => {
  if (value === '') return '';
  let cleaned = value.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  return preventLeadingZeros(cleaned);
};

/**
 * onBlur formatter for decimal fields only (never applied to Qty):
 * - ".3"  -> "0.3"   (prepend the missing leading zero)
 * - "5."  -> "5"     (drop a dangling trailing dot)
 * - ""    -> ""      (empty stays empty — no arbitrary auto-fill)
 * - A value that formats to exactly zero ("0", "0.0", "00", "0.00", ...)
 *   is cleared to "" — zero is never a valid, saved dimension. This check
 *   runs AFTER the ".3" -> "0.3" fix above, so a real decimal like "0.3"
 *   (which is not zero) is left untouched and still commits as "0.3".
 */
export const formatOnBlur = (value: string): string => {
  if (value === '') return '';
  let v = value;
  if (v.startsWith('.')) v = '0' + v;
  if (v.endsWith('.')) v = v.slice(0, -1);
  if (v === '') return '';
  if (parseFloat(v) === 0) return '';
  return v;
};

/**
 * onChange/paste sanitizer for the Qty field.
 * - Only digits 0-9 survive — the dot is blocked completely (Qty is a
 *   strict positive-integer field), along with letters/symbols/minus/plus.
 * - Leading zeros are collapsed in real time ("00" -> "0", "01" -> "1").
 * - Zero is never a valid Qty: once the leading-zero collapse above leaves
 *   just "0" (i.e. the field is truly zero, not "01" mid-typing toward
 *   something else), it's cleared to "" instead — the same "no zero" rule
 *   as the decimal fields.
 * Final clamping to a safe integer >= 1 still happens in sanitizeQuantity
 * when the value is written into row state, exactly as before.
 */
export const sanitizeQuantityInput = (value: string): string => {
  if (value === '') return '';
  const cleaned = value.replace(/[^0-9]/g, '');
  if (cleaned === '') return '';
  const stripped = cleaned.replace(/^0+(?=\d)/, '');
  if (stripped === '0') return '';
  return stripped;
};

/**
 * Display-only number formatter — trims unnecessary trailing zeros.
 * Does NOT alter any calculation; purely a presentation helper for
 * the UI and the PDF report.
 *   formatNum(50.00, 2)  -> "50"
 *   formatNum(25.30, 2)  -> "25.3"
 *   formatNum(1.10, 2)   -> "1.1"
 */
export const formatNum = (value: unknown, maxDecimals: number = 2): string => {
  let num: number;
  if (typeof value === 'number') {
    num = Number.isFinite(value) ? value : 0;
  } else {
    const parsed = parseFloat(String(value ?? '').replace(',', '.'));
    num = Number.isFinite(parsed) ? parsed : 0;
  }
  const fixed = num.toFixed(maxDecimals);
  return parseFloat(fixed).toString();
};

// ============================================================
//  Densities in g/cm³  (multiplied by 1000 → kg/m³ in formulas)
//  All material IDs from constants.ts are covered.
// ============================================================
export const DENSITIES: Record<string, number> = {
  steel:            7.85,
  galvanized_steel: 7.85,
  ss206:            7.80,
  ss304:            7.93,
  ss316:            8.00,
  al6061:           2.70,
  al6082:           2.70,
  al7075:           2.81,
  brass:            8.50,
  copper:           8.96,
  polyamide:        1.20,
};

// ============================================================
//  Price helpers  (localStorage → MATERIALS fallback)
// ============================================================
const MATERIAL_PRICES_KEY = 'machinery_material_prices';

const emptyItem = (): MaterialPriceItem => ({ wholesale: 0, retail: 0 });

/** Fresh price table: every material present in every category (and every sheet range), seeded from MATERIALS. */
export const getDefaultMaterialPrices = (): MaterialPricesTable => {
  const table: MaterialPricesTable = { sheet: {}, profile: {}, mill: {}, pipe: {}, square: {} };
  MATERIALS.forEach((mat) => {
    const item = { wholesale: mat.stdPriceKg ?? 0, retail: mat.piecePriceKg ?? 0 };
    table.sheet[mat.id] = { thin: { ...item }, mid: { ...item }, thick: { ...item } };
    table.profile[mat.id] = { ...item };
    table.mill[mat.id] = { ...item };
    table.pipe[mat.id] = { ...item };
    table.square[mat.id] = { ...item };
  });
  return table;
};

/** Old format (pre-category redesign): flat `{ [materialId]: { wholesale, retail } }`. */
const isLegacyFlatTable = (obj: any): boolean => {
  if (!obj || typeof obj !== 'object') return false;
  if (PRICE_CATEGORIES.some((c) => c in obj)) return false;
  return Object.values(obj).some((v: any) => v && typeof v === 'object' && ('wholesale' in v || 'retail' in v));
};

/** Normalizes any raw parsed JSON (old flat format, new nested format, or partial data) onto a complete table. */
export const normalizeMaterialPricesTable = (parsed: any): MaterialPricesTable => {
  const table = getDefaultMaterialPrices();
  if (!parsed || typeof parsed !== 'object') return table;

  if (isLegacyFlatTable(parsed)) {
    // Migrate: the single old price per material is applied to every category and every sheet range,
    // so previously-entered numbers aren't lost — the user can then split them out per category.
    Object.keys(parsed).forEach((materialId) => {
      const raw = parsed[materialId];
      if (!raw) return;
      const priced = { wholesale: sanitizeNum(raw.wholesale), retail: sanitizeNum(raw.retail) };
      if (table.sheet[materialId]) table.sheet[materialId] = { thin: { ...priced }, mid: { ...priced }, thick: { ...priced } };
      (['profile', 'mill', 'pipe', 'square'] as const).forEach((cat) => {
        if (table[cat][materialId]) table[cat][materialId] = { ...priced };
      });
    });
    return table;
  }

  PRICE_CATEGORIES.forEach((cat) => {
    if (cat === 'sheet') {
      Object.keys(table.sheet).forEach((matId) => {
        const savedMat = parsed?.sheet?.[matId];
        if (!savedMat) return;
        (['thin', 'mid', 'thick'] as const).forEach((range) => {
          const savedRange = savedMat[range];
          if (savedRange) {
            table.sheet[matId][range] = { wholesale: sanitizeNum(savedRange.wholesale), retail: sanitizeNum(savedRange.retail) };
          }
        });
      });
    } else {
      Object.keys(table[cat]).forEach((matId) => {
        const savedItem = parsed?.[cat]?.[matId];
        if (savedItem) {
          table[cat][matId] = { wholesale: sanitizeNum(savedItem.wholesale), retail: sanitizeNum(savedItem.retail) };
        }
      });
    }
  });
  return table;
};

export const getSavedMaterialPrices = (): MaterialPricesTable => {
  try {
    const saved = localStorage.getItem(MATERIAL_PRICES_KEY);
    if (!saved) return getDefaultMaterialPrices();
    const parsed = JSON.parse(saved);
    const normalized = normalizeMaterialPricesTable(parsed);
    if (isLegacyFlatTable(parsed)) saveMaterialPrices(normalized); // persist the one-time migration
    return normalized;
  } catch {
    return getDefaultMaterialPrices();
  }
};

export const saveMaterialPrices = (prices: MaterialPricesTable): void => {
  try {
    localStorage.setItem(MATERIAL_PRICES_KEY, JSON.stringify(prices));
  } catch (e) {
    console.error('Failed to save material prices:', e);
  }
};

// ============================================================
//  Safety Factor (%) — persisted in Settings
//  Final Price = Total Price + (Total Price × SafetyFactor / 100)
// ============================================================
const SAFETY_FACTOR_KEY = 'machinery_safety_factor_percent';
const DEFAULT_SAFETY_FACTOR = 1.0;

export const getSavedSafetyFactor = (): number => {
  try {
    const saved = localStorage.getItem(SAFETY_FACTOR_KEY);
    if (saved === null) return DEFAULT_SAFETY_FACTOR;
    const num = parseFloat(saved);
    return Number.isFinite(num) && num >= 0 ? num : DEFAULT_SAFETY_FACTOR;
  } catch {
    return DEFAULT_SAFETY_FACTOR;
  }
};

export const saveSafetyFactor = (value: number): void => {
  try {
    const num = Number.isFinite(value) && value >= 0 ? value : DEFAULT_SAFETY_FACTOR;
    localStorage.setItem(SAFETY_FACTOR_KEY, String(num));
  } catch (e) {
    console.error('Failed to save safety factor:', e);
  }
};

// ============================================================
//  Project Name (Summary & PDF tab)
//  Lifted out of SummaryTab's own useState and persisted here for two
//  reasons: (1) App.tsx only mounts the active tab's component
//  ({activeTab === 'summary' && <SummaryTab .../>}), so a plain local
//  useState inside SummaryTab gets torn down — and the typed name lost —
//  the moment the user switches to another tab; (2) persisting to
//  localStorage (same pattern as the Safety Factor above) means the name
//  also survives a full page refresh, not just tab switching.
// ============================================================
const PROJECT_NAME_KEY = 'machinery_project_name';

export const getSavedProjectName = (): string => {
  try {
    const saved = localStorage.getItem(PROJECT_NAME_KEY);
    return saved !== null ? saved : '';
  } catch {
    return '';
  }
};

export const saveProjectName = (value: string): void => {
  try {
    localStorage.setItem(PROJECT_NAME_KEY, value);
  } catch (e) {
    console.error('Failed to save project name:', e);
  }
};

export const exportPricesToFile = (prices: MaterialPricesTable): void => {
  const json = JSON.stringify(prices, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `material_prices_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importPricesFromFile = (file: File): Promise<MaterialPricesTable> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        resolve(normalizeMaterialPricesTable(parsed));
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });

/**
 * Returns the price per kg for a row.
 * Priority: explicit field on row → localStorage (per category, and per
 * thickness band for sheet) → MATERIALS default
 */
export const getRowPricePerKg = (
  row: any,
  mode: PricingMode = 'retail',
  category: PriceCategory,
  customPricesTable?: MaterialPricesTable
): number => {
  if (!row) return 0;

  // 1. Explicit price field on the row itself
  const explicitPrice = parseFloat(row.pricePerKg ?? row.price ?? '');
  if (!isNaN(explicitPrice) && explicitPrice > 0) return explicitPrice;

  // 2. Saved prices from localStorage (Settings), scoped to this category
  const prices = customPricesTable ?? getSavedMaterialPrices();
  let savedItem: MaterialPriceItem | undefined;
  if (category === 'sheet') {
    const range = getSheetThicknessRange(sanitizeNum(row.thickness));
    savedItem = prices.sheet?.[row.materialId]?.[range];
  } else {
    savedItem = prices[category]?.[row.materialId];
  }
  if (savedItem) {
    const savedPrice = mode === 'wholesale' ? savedItem.wholesale : savedItem.retail;
    if (savedPrice && savedPrice > 0) return savedPrice;
  }

  // 3. Default prices from MATERIALS constant
  const material = MATERIALS.find((m) => m.id === row.materialId);
  if (material) {
    const defaultPrice =
      mode === 'wholesale'
        ? (material.stdPriceKg ?? material.standardSheetPricePerKg ?? 0)
        : (material.piecePriceKg ?? material.customCutPricePerKg ?? 0);
    if (defaultPrice && defaultPrice > 0) return defaultPrice;
  }

  return 0;
};

// ============================================================
//  Per-row compute functions — all units are explicit in comments.
//  Every function sanitizes inputs so NaN never propagates.
// ============================================================

/**
 * Sheet Metal
 * length, width, thickness → mm  (÷ 1000 → m)
 * density g/cm³  ×1000 → kg/m³
 */
export const computeSheetRow = (
  row: SheetRow,
  mode: PricingMode = 'retail',
  pricesTable?: MaterialPricesTable
) => {
  const qty      = sanitizeQuantity(row?.quantity);
  const len      = sanitizeNum(row?.length)    / 1000;  // mm → m
  const w        = sanitizeNum(row?.width)     / 1000;  // mm → m
  const th       = sanitizeNum(row?.thickness) / 1000;  // mm → m
  const density  = (DENSITIES[row?.materialId] ?? 7.85) * 1000;  // kg/m³
  const unitWeight  = len * w * th * density;                     // kg
  const totalWeight = unitWeight * qty;
  const pricePerKg  = getRowPricePerKg(row, mode, 'sheet', pricesTable);
  const totalPrice  = totalWeight * pricePerKg;
  return { unitWeight, totalWeight, totalPrice, pricePerKg };
};

/**
 * Profiles & Tubes
 * sideA, sideB → cm  (÷ 100 → m)
 * wallThickness → mm (÷ 1000 → m)
 * length → m (no conversion)
 */
export const computeProfileRow = (
  row: ProfileRow,
  mode: PricingMode = 'retail',
  pricesTable?: MaterialPricesTable
) => {
  const qty    = sanitizeQuantity(row?.quantity);
  const len    = sanitizeNum(row?.length);                    // m
  const sideA  = sanitizeNum(row?.sideA)          / 100;     // cm → m
  const sideB  = sanitizeNum(row?.sideB)          / 100;     // cm → m
  const wall   = sanitizeNum(row?.wallThickness)  / 1000;    // mm → m
  const density = (DENSITIES[row?.materialId] ?? 7.85) * 1000; // kg/m³

  const outerArea  = sideA * sideB;
  const innerSideA = Math.max(0, sideA - 2 * wall);
  const innerSideB = Math.max(0, sideB - 2 * wall);
  const innerArea  = innerSideA * innerSideB;
  const area       = Math.max(0, outerArea - innerArea);    // m²

  const unitWeight  = area * len * density;                 // kg
  const totalWeight = unitWeight * qty;
  const pricePerKg  = getRowPricePerKg(row, mode, 'profile', pricesTable);
  const totalPrice  = totalWeight * pricePerKg;
  return { unitWeight, totalWeight, totalPrice, pricePerKg };
};

/**
 * Mill (Solid Round Bars)
 * diameter → mm (÷ 1000 → m)
 * length   → cm (÷ 100  → m)
 */
export const computeMillRow = (
  row: MillRow,
  mode: PricingMode = 'retail',
  pricesTable?: MaterialPricesTable
) => {
  const qty     = sanitizeQuantity(row?.quantity);
  const len     = sanitizeNum(row?.length)   / 100;   // cm → m
  const dia     = sanitizeNum(row?.diameter) / 1000;  // mm → m
  const density = (DENSITIES[row?.materialId] ?? 7.85) * 1000; // kg/m³
  const radius  = dia / 2;
  const area    = Math.PI * radius * radius;           // m²
  const unitWeight  = area * len * density;            // kg
  const totalWeight = unitWeight * qty;
  const pricePerKg  = getRowPricePerKg(row, mode, 'mill', pricesTable);
  const totalPrice  = totalWeight * pricePerKg;
  return { unitWeight, totalWeight, totalPrice, pricePerKg };
};

/**
 * Pipes & Bushings
 * outerDiameter, innerDiameter → mm (÷ 1000 → m)
 * length → cm (÷ 100 → m)
 */
export const computePipeRow = (
  row: PipeRow,
  mode: PricingMode = 'retail',
  pricesTable?: MaterialPricesTable
) => {
  const qty    = sanitizeQuantity(row?.quantity);
  const len    = sanitizeNum(row?.length)         / 100;   // cm → m
  const outerD = sanitizeNum(row?.outerDiameter)  / 1000;  // mm → m
  const innerD = sanitizeNum(row?.innerDiameter)  / 1000;  // mm → m
  const density = (DENSITIES[row?.materialId] ?? 7.85) * 1000; // kg/m³
  const outerR  = outerD / 2;
  const innerR  = Math.min(outerR, innerD / 2);            // clamp so area ≥ 0
  const area    = Math.PI * (outerR * outerR - innerR * innerR); // m²
  const unitWeight  = area * len * density;                // kg
  const totalWeight = unitWeight * qty;
  const pricePerKg  = getRowPricePerKg(row, mode, 'pipe', pricesTable);
  const totalPrice  = totalWeight * pricePerKg;
  return { unitWeight, totalWeight, totalPrice, pricePerKg };
};

/**
 * Square Bars & Blocks
 * length, width → cm (÷ 100  → m)
 * thickness     → mm (÷ 1000 → m)
 */
export const computeSquareRow = (
  row: SquareRow,
  mode: PricingMode = 'retail',
  pricesTable?: MaterialPricesTable
) => {
  const qty    = sanitizeQuantity(row?.quantity);
  const len    = sanitizeNum(row?.length)    / 100;   // cm → m
  const w      = sanitizeNum(row?.width)     / 100;   // cm → m
  const th     = sanitizeNum(row?.thickness) / 1000;  // mm → m
  const density = (DENSITIES[row?.materialId] ?? 7.85) * 1000; // kg/m³
  const unitWeight  = len * w * th * density;                  // kg
  const totalWeight = unitWeight * qty;
  const pricePerKg  = getRowPricePerKg(row, mode, 'square', pricesTable);
  const totalPrice  = totalWeight * pricePerKg;
  return { unitWeight, totalWeight, totalPrice, pricePerKg };
};

/** Orders — no weight, just price */
export const computeOrderRow = (row: OrderRow) => {
  const qty       = sanitizeQuantity(row?.quantity);
  const unitPrice = sanitizeNum(row?.unitPrice);
  return { totalPrice: qty * unitPrice };
};

// ============================================================
//  "Recompute and persist" helpers
//  Call these whenever a row changes so row.totalWeight /
//  row.totalCost stay in sync with the rest of the UI.
// ============================================================
const getMode = (row: { type?: string }): PricingMode =>
  row?.type === 'standard' ? 'wholesale' : 'retail';

export const recomputeSheetRow = (
  row: SheetRow,
  pricesTable?: MaterialPricesTable
): SheetRow => {
  const c = computeSheetRow(row, getMode(row), pricesTable);
  return { ...row, totalWeight: Math.max(0, c.totalWeight), totalCost: Math.max(0, c.totalPrice) };
};

export const recomputeProfileRow = (
  row: ProfileRow,
  pricesTable?: MaterialPricesTable
): ProfileRow => {
  const c = computeProfileRow(row, getMode(row), pricesTable);
  return { ...row, totalWeight: Math.max(0, c.totalWeight), totalCost: Math.max(0, c.totalPrice) };
};

export const recomputeMillRow = (
  row: MillRow,
  pricesTable?: MaterialPricesTable
): MillRow => {
  const c = computeMillRow(row, getMode(row), pricesTable);
  return { ...row, totalWeight: Math.max(0, c.totalWeight), totalCost: Math.max(0, c.totalPrice) };
};

export const recomputePipeRow = (
  row: PipeRow,
  pricesTable?: MaterialPricesTable
): PipeRow => {
  const c = computePipeRow(row, getMode(row), pricesTable);
  return { ...row, totalWeight: Math.max(0, c.totalWeight), totalCost: Math.max(0, c.totalPrice) };
};

export const recomputeSquareRow = (
  row: SquareRow,
  pricesTable?: MaterialPricesTable
): SquareRow => {
  const c = computeSquareRow(row, getMode(row), pricesTable);
  return { ...row, totalWeight: Math.max(0, c.totalWeight), totalCost: Math.max(0, c.totalPrice) };
};



// ============================================================================
//  PROCUREMENT-SPECIFIC FUNCTIONS
// ============================================================================

/**
 * onBlur formatter for the Discount field specifically — the one numeric
 * field in the app where 0 must ALWAYS render as "0" (never as blank/grey).
 * Otherwise same rules as formatOnBlur: ".5" → "0.5", "5." → "5", etc.
 */
export const formatDiscountBlur = (value: string): string => {
  if (value === '' || value === null || value === undefined) return '0';
  let v = value.trim();
  if (v === '.') return '0';
  if (v.startsWith('.')) v = '0' + v;
  if (v.endsWith('.')) v = v.slice(0, -1);
  const num = parseFloat(v);
  if (isNaN(num)) return '0';
  return String(num);
};

// ────────────────────────────────────────────────────────────────────────────
//  Untitled Project naming — used whenever a project is auto-saved as a
//  Draft without an explicit name (silent save-on-exit, or the initial
//  "Create New Project" row). Given the list of names already used by this
//  designer, returns "Untitled Project" the first time, then "Untitled
//  Project 2", "Untitled Project 3"... so drafts never silently collide.
// ────────────────────────────────────────────────────────────────────────────
export const nextUntitledProjectName = (existingNames: string[]): string => {
  const base = 'Untitled Project';
  const used = new Set(existingNames.map((n) => (n || '').trim()));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
};

// ────────────────────────────────────────────────────────────────────────────
//  Invoices (Procurement Version — "Invoices" tab)
// ────────────────────────────────────────────────────────────────────────────
const INVOICES_KEY = 'swb_invoices';

export const getSavedInvoices = (): import('./types').InvoiceRow[] => {
  try {
    const raw = localStorage.getItem(INVOICES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

export const saveInvoices = (invoices: import('./types').InvoiceRow[]): void => {
  try {
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
  } catch { /* ignore */ }
};
