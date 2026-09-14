import type { ProcurementData, ProjectData, OrderRow, OperationRow } from '../types';

// ============================================================================
//  SEEDING PROCUREMENT'S FILE
//
//  Procurement inherits the designer's SPECS (what was actually built —
//  material, dimensions, quantities) and NONE of the designer's money. Every
//  price, discount and cached total is wiped, so Procurement types the real
//  invoice prices into visibly empty fields rather than nudging an estimate.
//
//  Copying the specs, instead of handing over a wholly blank calculator, is
//  the deliberate part: re-typing every dimension by hand is slow AND is how
//  the purchase file quietly drifts away from the thing that got manufactured.
//  Anyone who genuinely bought something unrelated to the spec can still
//  empty it — see blankProcurementData().
//
//  Row ids are kept as-is on purpose: a procurement row stays traceable back
//  to the designer row it came from.
// ============================================================================

/** The money fields shared by the five weight-based material categories. */
interface PricedRow {
  manualPrice?: number;
  discount?: number;
  totalWeight?: number;
  totalCost?: number;
}

/** 0 (not undefined) for manualPrice/discount because DecimalInput renders 0
 *  as an EMPTY box showing its placeholder — which is the whole point here.
 *  totalWeight/totalCost are dropped entirely: they're stale cached results
 *  of the designer's prices, and every screen recomputes them anyway. */
function clearRowMoney<T extends PricedRow>(row: T): T {
  const { totalWeight: _w, totalCost: _c, ...spec } = row;
  return { ...spec, manualPrice: 0, discount: 0 } as T;
}

function clearOrderMoney(row: OrderRow): OrderRow {
  return { ...row, unitPrice: 0, discount: 0 };
}

function clearOperationMoney(row: OperationRow): OperationRow {
  // `supplier` is cleared too — the designer's guess at who'd supply this is
  // not the supplier Procurement actually bought from.
  return { ...row, cost: 0, discount: 0, supplier: '' };
}

/** Builds Procurement's starting file from the designer's project data:
 *  same rows, all money blank. */
export function seedProcurementData(pd: Partial<ProjectData> | undefined | null): ProcurementData {
  const d = pd ?? {};
  return {
    sheetRows: (d.sheetRows ?? []).map(clearRowMoney),
    profileRows: (d.profileRows ?? []).map(clearRowMoney),
    millRows: (d.millRows ?? []).map(clearRowMoney),
    pipeRows: (d.pipeRows ?? []).map(clearRowMoney),
    squareRows: (d.squareRows ?? []).map(clearRowMoney),
    orderRows: (d.orderRows ?? []).map(clearOrderMoney),
    operations: (d.operations ?? []).map(clearOperationMoney),
    // Invoices are Procurement's own paperwork, so there is nothing to
    // inherit from the designer — but projects that predate the two-file
    // split stored them at the TOP level of project_data. Carrying those
    // across is the one exception: they're real records with real Drive
    // links, and clearing them would be plain data loss.
    invoiceRows: d.invoiceRows ?? [],
    seededAt: new Date().toISOString(),
  };
}

/** A completely empty purchase file — for when what was bought bears no
 *  relation to the designer's spec and copying it would only be noise. */
export function blankProcurementData(): ProcurementData {
  return {
    sheetRows: [],
    profileRows: [],
    millRows: [],
    pipeRows: [],
    squareRows: [],
    orderRows: [],
    operations: [],
    invoiceRows: [],
    seededAt: new Date().toISOString(),
  };
}

/** Reads the stored procurement file, tolerating the pre-`procurement` shape
 *  of project_data (returns null so the caller seeds a fresh one). */
export function readProcurementData(pd: Partial<ProjectData> | undefined | null): ProcurementData | null {
  const p = pd?.procurement;
  if (!p || !p.seededAt) return null;
  return {
    sheetRows: p.sheetRows ?? [],
    profileRows: p.profileRows ?? [],
    millRows: p.millRows ?? [],
    pipeRows: p.pipeRows ?? [],
    squareRows: p.squareRows ?? [],
    orderRows: p.orderRows ?? [],
    operations: p.operations ?? [],
    invoiceRows: p.invoiceRows ?? [],
    seededAt: p.seededAt,
  };
}
