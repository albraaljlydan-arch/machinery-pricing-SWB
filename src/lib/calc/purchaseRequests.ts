import type { ProjectData, PurchaseApprovalStatus, PurchaseRequestRow, PurchaseRowFlags, RowFlag } from '../types';
import { flagsToSets, setsToFlags, type FlagSet } from './reviewFlags';

// The six row categories that carry a `quantity` field, i.e. are actually
// "pieces" that can be purchased. `operations` (the Processing tab) has no
// quantity and is deliberately excluded everywhere in this file — it never
// appears in the purchase-request checklist, its piece count, or its total.
export const PURCHASE_CATEGORIES = ['sheets', 'profiles', 'mills', 'pipes', 'squares', 'orders'] as const;
export type PurchaseCategory = (typeof PURCHASE_CATEGORIES)[number];

export const EMPTY_PURCHASE_ROW_FLAGS: PurchaseRowFlags = { sheets: [], profiles: [], mills: [], pipes: [], squares: [], orders: [] };

function rowsFor(pd: ProjectData | undefined, cat: PurchaseCategory): { id: string; quantity: number }[] {
  switch (cat) {
    case 'sheets':
      return pd?.sheetRows ?? [];
    case 'profiles':
      return pd?.profileRows ?? [];
    case 'mills':
      return pd?.millRows ?? [];
    case 'pipes':
      return pd?.pipeRows ?? [];
    case 'squares':
      return pd?.squareRows ?? [];
    case 'orders':
      return pd?.orderRows ?? [];
  }
}

function idsOf(flags: PurchaseRowFlags, cat: PurchaseCategory): Set<string> {
  return new Set((flags[cat] ?? []).map((f) => f.id));
}

/** Total piece count across every purchasable row in the project. */
export function totalPieces(pd: ProjectData | undefined): number {
  return PURCHASE_CATEGORIES.reduce((sum, cat) => sum + rowsFor(pd, cat).reduce((s, r) => s + (Number(r.quantity) || 0), 0), 0);
}

/** Piece count for just the rows named in `flags`. */
export function pieceSumForIds(pd: ProjectData | undefined, flags: PurchaseRowFlags): number {
  return PURCHASE_CATEGORIES.reduce((sum, cat) => {
    const ids = idsOf(flags, cat);
    if (ids.size === 0) return sum;
    return sum + rowsFor(pd, cat).filter((r) => ids.has(r.id)).reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  }, 0);
}

export function unionRowFlags(a: PurchaseRowFlags, b: PurchaseRowFlags): PurchaseRowFlags {
  const out: PurchaseRowFlags = { ...EMPTY_PURCHASE_ROW_FLAGS };
  for (const cat of PURCHASE_CATEGORIES) {
    const merged = new Map<string, string>();
    for (const f of a[cat] ?? []) merged.set(f.id, f.reason);
    for (const f of b[cat] ?? []) merged.set(f.id, f.reason || merged.get(f.id) || '');
    out[cat] = Array.from(merged.entries()).map(([id, reason]) => ({ id, reason }));
  }
  return out;
}

/** DB's PurchaseRowFlags -> the Map-based FlagSet FullReport's `flagSets`/
 *  `lockedIds` props expect. Reuses reviewFlags.ts's own converter — the
 *  shapes are identical, "reason" just means "note" here. */
export function rowFlagsToFlagSet(flags: PurchaseRowFlags): FlagSet {
  return flagsToSets(flags);
}

/** FlagSet (Map-based UI state) -> PurchaseRowFlags, keeping only the six
 *  purchasable categories (drops the unused `processing` key). */
export function flagSetToRowFlags(fs: FlagSet): PurchaseRowFlags {
  const full = setsToFlags(fs);
  const out: PurchaseRowFlags = { ...EMPTY_PURCHASE_ROW_FLAGS };
  for (const cat of PURCHASE_CATEGORIES) out[cat] = full[cat] ?? [];
  return out;
}

/** For every row id that appears in ANY past request for a project, keeps
 *  only the most recent (by created_at) request that touched it — that
 *  request's status + rejection_note is what should drive this row's UI
 *  state right now (locked+checked if approved/pending, re-selectable with
 *  a "rejected" badge otherwise). `requests` does not need to be sorted;
 *  this sorts its own copy. */
export function latestRowStatus(requests: PurchaseRequestRow[]): Map<string, { status: PurchaseApprovalStatus; note: string | null }> {
  const sorted = [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const result = new Map<string, { status: PurchaseApprovalStatus; note: string | null }>();
  for (const r of sorted) {
    for (const cat of PURCHASE_CATEGORIES) {
      for (const f of r.requested_row_ids[cat] ?? []) {
        if (!result.has(f.id)) result.set(f.id, { status: r.approval_status, note: r.rejection_note });
      }
    }
  }
  return result;
}

export type { RowFlag };
