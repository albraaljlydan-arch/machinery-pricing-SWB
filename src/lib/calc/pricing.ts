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
  /** Only ever true under `requireManualPrice`: nobody has typed a real
   *  $/kg into this row yet, so it is worth $0 and its Total renders "—". */
  unpriced: boolean;
}

export interface RowPricingOptions {
  /** Procurement's real-cost file: a row counts as priced ONLY once someone
   *  types a $/kg into it.
   *
   *  Without this, `computed.pricePerKg` silently falls back to the
   *  catalogue price (getRowPricePerKg in utils.ts → the saved price table →
   *  the MATERIALS constant) — which is precisely the designer's *estimate*,
   *  the number Procurement exists to replace. An untouched row would then
   *  show an empty $/kg box next to a confident-looking Total that nobody
   *  ever entered.
   *
   *  With it, an untouched row is `unpriced`: $0, excluded from the totals,
   *  and rendered as "—" so it's obvious at a glance what still needs a
   *  real price. */
  requireManualPrice?: boolean;
}

export function applyRowPricing(computed: ComputedBase, row: RowWithPricing, options: RowPricingOptions = {}): EffectivePricing {
  const hasManualPrice = !!row.manualPrice && row.manualPrice > 0;
  const unpriced = !!options.requireManualPrice && !hasManualPrice;
  const pricePerKg = hasManualPrice ? row.manualPrice! : unpriced ? 0 : computed.pricePerKg;
  const rawTotal = unpriced ? 0 : hasManualPrice ? computed.totalWeight * row.manualPrice! : computed.totalPrice;
  const discount = Math.min(Math.max(0, sanitizeNum(row.discount)), rawTotal);
  const finalTotal = rawTotal - discount;
  return { ...computed, autoPricePerKg: computed.pricePerKg, pricePerKg, rawTotal, discount, finalTotal, hasManualPrice, unpriced };
}
