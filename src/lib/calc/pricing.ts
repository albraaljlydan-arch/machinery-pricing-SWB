import { sanitizeNum } from '../utils';

// ============================================================================
//  Shared pricing logic for every material tab (Sheet/Profile/Mill/Pipe/
//  Square/Order/Processing), used identically in BOTH Designer mode and
//  Procurement mode — this is "the one base" both calculators are built on.
//
//  In Designer mode, row.manualPrice/row.discount are simply never set
//  (the UI never shows those controls), so this collapses to exactly the
//  automatic weight × $/kg math it always was. In Procurement mode, the
//  same function honors a manual $/kg override and a per-row discount —
//  no separate code path, no duplicated tab logic to keep in sync.
// ============================================================================

export interface RowWithPricing {
  manualPrice?: number;
  discount?: number;
}

export interface ComputedBase {
  totalWeight: number;
  totalPrice: number;
  pricePerKg: number;
}

export interface EffectivePricing extends ComputedBase {
  /** The automatically-derived $/kg, before any manual override — shown as
   *  a placeholder/reference even when a manual price is active. */
  autoPricePerKg: number;
  /** weight × effective $/kg, before the row's own discount is subtracted. */
  rawTotal: number;
  /** Clamped to [0, rawTotal] — a discount can never go negative or exceed
   *  this row's own total. */
  discount: number;
  /** rawTotal − discount — what actually lands in the tab's Total ($) cell. */
  finalTotal: number;
  hasManualPrice: boolean;
}

export function applyRowPricing(computed: ComputedBase, row: RowWithPricing): EffectivePricing {
  const hasManualPrice = !!row.manualPrice && row.manualPrice > 0;
  const pricePerKg = hasManualPrice ? row.manualPrice! : computed.pricePerKg;
  const rawTotal = hasManualPrice ? computed.totalWeight * row.manualPrice! : computed.totalPrice;
  const discount = Math.min(Math.max(0, sanitizeNum(row.discount)), rawTotal);
  const finalTotal = rawTotal - discount;
  return { ...computed, autoPricePerKg: computed.pricePerKg, pricePerKg, rawTotal, discount, finalTotal, hasManualPrice };
}
