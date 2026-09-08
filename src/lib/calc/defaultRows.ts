import { generateUid } from '../utils';
import type { SheetRow, ProfileRow, MillRow, PipeRow, SquareRow, OrderRow, OperationRow, InvoiceRow } from '../types';

// ============================================================================
//  Default starting rows for a brand-new project — ONE definition shared by
//  both Designer and Procurement (a new project always starts from the same
//  baseline regardless of who's looking at it).
// ============================================================================

const defaultMaterial = 'ss304'; // Stainless 304 — the default across every tab, per spec

export function makeDefaultSheetRows(): SheetRow[] {
  // sizeOption is a REAL preset id (not 'custom'), which is what locks
  // Length/Width to fixed, disabled fields — matching the reference
  // picture exactly. 'custom' is only for Retail/Per-Piece rows where the
  // dimensions genuinely need to be typed freely.
  return [{ id: generateUid(), materialId: defaultMaterial, sizeOption: '3000_1500', length: 3000, width: 1500, thickOpt: '2', thickness: 2, quantity: 1, type: 'standard', discount: 0 }];
}

export function makeDefaultProfileRows(): ProfileRow[] {
  return [{ id: generateUid(), materialId: defaultMaterial, profileType: 'square', sectionOpt: '2*2', sideA: 2, sideB: 2, wallThickOpt: '2', wallThickness: 2, length: 6, quantity: 1, type: 'standard', discount: 0 }];
}

export function makeDefaultMillRows(): MillRow[] {
  return [{ id: generateUid(), materialId: defaultMaterial, diameterOpt: '10', diameter: 10, length: 30, quantity: 1, type: 'per_piece', discount: 0 }];
}

export function makeDefaultPipeRows(): PipeRow[] {
  return [{ id: generateUid(), materialId: defaultMaterial, outerDiameter: 50, innerDiameter: 40, length: 100, quantity: 1, type: 'per_piece', discount: 0 }];
}

export function makeDefaultSquareRows(): SquareRow[] {
  return [{ id: generateUid(), materialId: defaultMaterial, length: 5, width: 5, thickness: 20, quantity: 1, type: 'per_piece', discount: 0 }];
}

export function makeDefaultOrderRows(): OrderRow[] {
  return [{ id: generateUid(), orderName: 'Ball Bearing', description: '6205ZZ Deep Groove Ball Bearing', properties: 'SKF / Standard', quantity: 4, unitPrice: 12.5, discount: 0 }];
}

// A new project starts with only the first 5 processes pre-seeded (Welding
// and Assembly were dropped per the latest spec) — the process name is
// still a free-text field, so nothing stops adding Welding/Assembly (or
// anything else) as an extra row by hand.
export function makeDefaultOperations(): OperationRow[] {
  const names = ['Laser Cut', 'Bending & Rolling', 'Turning', 'CNC', '3D Printed'];
  return names.map((process) => ({ id: generateUid(), process, description: '', type: '', properties: '', supplier: '', cost: 0, discount: 0 }));
}

export function makeDefaultInvoiceRows(): InvoiceRow[] {
  return [];
}
