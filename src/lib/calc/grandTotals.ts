import type { SheetRow, ProfileRow, MillRow, PipeRow, SquareRow, OrderRow, OperationRow } from '../types';
import { computeSheetRow, computeProfileRow, computeMillRow, computePipeRow, computeSquareRow, computeOrderRow, getRowError, getProfileError, getPipeError, sanitizeNum } from '../utils';
import { applyRowPricing } from './pricing';

export interface GrandTotals {
  totalWeight: number;
  totalDiscount: number;
  /** rawTotal (before discount) across every category — only meaningfully
   *  different from totalPrice in Procurement mode. */
  totalBeforeDiscount: number;
  /** Final total after every row's own discount — what the project is
   *  actually worth. */
  totalPrice: number;
}

function priceMode(row: { type: 'standard' | 'per_piece' }) {
  return row.type === 'standard' ? 'wholesale' : 'retail';
}

export interface CategoryBreakdownRow {
  label: string;
  weight: number | null; // null for categories with no weight (Orders/Processing)
  price: number;
}

/** Per-category subtotals (post-discount) — what the Summary tab shows the
 *  Owner instead of just one grand total, since they're knowledgeable
 *  enough to want to see where the number actually comes from. */
export function computeCategoryBreakdown(rows: {
  sheets: SheetRow[];
  profiles: ProfileRow[];
  mills: MillRow[];
  pipes: PipeRow[];
  squares: SquareRow[];
  orders: OrderRow[];
  operations: OperationRow[];
}): CategoryBreakdownRow[] {
  const priceModeOf = priceMode;

  const sheetTotals = rows.sheets.reduce(
    (a, r) => (getRowError(r) ? a : (() => { const e = applyRowPricing(computeSheetRow(r, priceModeOf(r)), r); return { weight: a.weight + e.totalWeight, price: a.price + e.finalTotal }; })()),
    { weight: 0, price: 0 }
  );
  const profileTotals = rows.profiles.reduce(
    (a, r) => (getProfileError(r) ? a : (() => { const e = applyRowPricing(computeProfileRow(r, priceModeOf(r)), r); return { weight: a.weight + e.totalWeight, price: a.price + e.finalTotal }; })()),
    { weight: 0, price: 0 }
  );
  const millTotals = rows.mills.reduce(
    (a, r) => (getRowError(r) ? a : (() => { const e = applyRowPricing(computeMillRow(r, priceModeOf(r)), r); return { weight: a.weight + e.totalWeight, price: a.price + e.finalTotal }; })()),
    { weight: 0, price: 0 }
  );
  const pipeTotals = rows.pipes.reduce(
    (a, r) => (getPipeError(r) ? a : (() => { const e = applyRowPricing(computePipeRow(r, priceModeOf(r)), r); return { weight: a.weight + e.totalWeight, price: a.price + e.finalTotal }; })()),
    { weight: 0, price: 0 }
  );
  const squareTotals = rows.squares.reduce(
    (a, r) => (getRowError(r) ? a : (() => { const e = applyRowPricing(computeSquareRow(r, priceModeOf(r)), r); return { weight: a.weight + e.totalWeight, price: a.price + e.finalTotal }; })()),
    { weight: 0, price: 0 }
  );
  const orderPrice = rows.orders.reduce((a, r) => {
    const raw = Math.max(0, computeOrderRow(r).totalPrice);
    const d = Math.min(Math.max(0, sanitizeNum(r.discount)), raw);
    return a + (raw - d);
  }, 0);
  const processingPrice = rows.operations.reduce((a, r) => {
    const raw = Math.max(0, sanitizeNum(r.cost));
    const d = Math.min(Math.max(0, sanitizeNum(r.discount)), raw);
    return a + (raw - d);
  }, 0);

  return [
    { label: 'Sheet Metal', weight: sheetTotals.weight, price: sheetTotals.price },
    { label: 'Profiles & Tubes', weight: profileTotals.weight, price: profileTotals.price },
    { label: 'Mill (Round Bars)', weight: millTotals.weight, price: millTotals.price },
    { label: 'Pipes & Bushings', weight: pipeTotals.weight, price: pipeTotals.price },
    { label: 'Square Bars & Blocks', weight: squareTotals.weight, price: squareTotals.price },
    { label: 'Orders', weight: null, price: orderPrice },
    { label: 'Processing Costs', weight: null, price: processingPrice },
  ].filter((row) => row.price > 0 || (row.weight ?? 0) > 0);
}

export function computeGrandTotals(rows: {
  sheets: SheetRow[];
  profiles: ProfileRow[];
  mills: MillRow[];
  pipes: PipeRow[];
  squares: SquareRow[];
  orders: OrderRow[];
  operations: OperationRow[];
}): GrandTotals {
  let totalWeight = 0;
  let totalDiscount = 0;
  let totalBeforeDiscount = 0;
  let totalPrice = 0;

  for (const row of rows.sheets) {
    if (getRowError(row)) continue;
    const eff = applyRowPricing(computeSheetRow(row, priceMode(row)), row);
    totalWeight += eff.totalWeight;
    totalDiscount += eff.discount;
    totalBeforeDiscount += eff.rawTotal;
    totalPrice += eff.finalTotal;
  }
  for (const row of rows.profiles) {
    if (getProfileError(row)) continue;
    const eff = applyRowPricing(computeProfileRow(row, priceMode(row)), row);
    totalWeight += eff.totalWeight;
    totalDiscount += eff.discount;
    totalBeforeDiscount += eff.rawTotal;
    totalPrice += eff.finalTotal;
  }
  for (const row of rows.mills) {
    if (getRowError(row)) continue;
    const eff = applyRowPricing(computeMillRow(row, priceMode(row)), row);
    totalWeight += eff.totalWeight;
    totalDiscount += eff.discount;
    totalBeforeDiscount += eff.rawTotal;
    totalPrice += eff.finalTotal;
  }
  for (const row of rows.pipes) {
    if (getPipeError(row)) continue;
    const eff = applyRowPricing(computePipeRow(row, priceMode(row)), row);
    totalWeight += eff.totalWeight;
    totalDiscount += eff.discount;
    totalBeforeDiscount += eff.rawTotal;
    totalPrice += eff.finalTotal;
  }
  for (const row of rows.squares) {
    if (getRowError(row)) continue;
    const eff = applyRowPricing(computeSquareRow(row, priceMode(row)), row);
    totalWeight += eff.totalWeight;
    totalDiscount += eff.discount;
    totalBeforeDiscount += eff.rawTotal;
    totalPrice += eff.finalTotal;
  }
  for (const row of rows.orders) {
    const raw = Math.max(0, computeOrderRow(row).totalPrice);
    const discount = Math.min(Math.max(0, sanitizeNum(row.discount)), raw);
    totalDiscount += discount;
    totalBeforeDiscount += raw;
    totalPrice += raw - discount;
  }
  for (const row of rows.operations) {
    const raw = Math.max(0, sanitizeNum(row.cost));
    const discount = Math.min(Math.max(0, sanitizeNum(row.discount)), raw);
    totalDiscount += discount;
    totalBeforeDiscount += raw;
    totalPrice += raw - discount;
  }

  return { totalWeight, totalDiscount, totalBeforeDiscount, totalPrice };
}
