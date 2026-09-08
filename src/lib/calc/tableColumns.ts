// ============================================================================
//  SINGLE SOURCE OF TRUTH — every column header, for every material
//  category, used by BOTH the live tab AND the FullReport (PDF/preview).
//
//  This is exactly the gap that let Processing show 6 columns in its tab
//  but only 4 in the report: headers were hardcoded twice, once per file,
//  with nothing forcing them to agree. Every category now has ONE array
//  here; both SheetTab.svelte and FullReport.svelte (and so on for every
//  other category) import and render the SAME array — a column added,
//  renamed, or reordered in one place is automatically correct in the
//  other, because there's only one place.
// ============================================================================

export interface ColumnDef {
  key: string;
  label: string;
}

/** Inserts a "Discount ($)" column directly before the final column (which
 *  is always the Total/Cost column) — the same "discount sits right
 *  before the total" rule every tab already follows. Returns the columns
 *  unchanged when `showDiscount` is false (Designer mode). */
export function withDiscount(columns: ColumnDef[], showDiscount: boolean): ColumnDef[] {
  if (!showDiscount) return columns;
  const last = columns[columns.length - 1];
  return [...columns.slice(0, -1), { key: 'discount', label: 'Discount ($)' }, last];
}

/** Applies Developer-set label overrides onto built-in columns (by key) —
 *  renaming only, never reordering or retyping; see fieldConfig.ts for why
 *  built-in reordering isn't included yet. */
export function withLabelOverrides(columns: ColumnDef[], overrides: Record<string, string> | undefined): ColumnDef[] {
  if (!overrides || Object.keys(overrides).length === 0) return columns;
  return columns.map((c) => (overrides[c.key] ? { ...c, label: overrides[c.key] } : c));
}

/** Merges Developer-defined custom columns into a base column list, right
 *  before the final column (always Total/Cost) — same insertion slot
 *  withDiscount already uses. Both the live tab AND FullReport call this
 *  with the SAME custom-column list (fetched from field_configs), so a
 *  column the Developer adds is automatically correct in both places —
 *  the exact single-source-of-truth guarantee this file already gives the
 *  built-in columns. */
export function withCustomColumns(columns: ColumnDef[], customCols: { id: string; name: string }[]): ColumnDef[] {
  if (!customCols || customCols.length === 0) return columns;
  const last = columns[columns.length - 1];
  const customDefs = customCols.map((c) => ({ key: `custom:${c.id}`, label: c.name }));
  return [...columns.slice(0, -1), ...customDefs, last];
}

export const SHEET_COLUMNS: ColumnDef[] = [
  { key: 'material', label: 'Material' },
  { key: 'thickness', label: 'Thickness (mm)' },
  { key: 'size', label: 'Standard Size' },
  { key: 'length', label: 'Length (mm)' },
  { key: 'width', label: 'Width (mm)' },
  { key: 'type', label: 'Type' },
  { key: 'qty', label: 'Qty' },
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'pricePerKg', label: '$/kg' },
  { key: 'total', label: 'Total ($)' },
];

export const PROFILE_COLUMNS: ColumnDef[] = [
  { key: 'material', label: 'Material' },
  { key: 'profileType', label: 'Profile Type' },
  { key: 'section', label: 'Section (cm)' },
  { key: 'wall', label: 'Wall (mm)' },
  { key: 'type', label: 'Type' },
  { key: 'length', label: 'Length (m)' },
  { key: 'qty', label: 'Qty' },
  { key: 'totalLen', label: 'Total Len (m)' },
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'pricePerKg', label: '$/kg' },
  { key: 'total', label: 'Total ($)' },
];

export const MILL_COLUMNS: ColumnDef[] = [
  { key: 'material', label: 'Material' },
  { key: 'diameter', label: 'Diameter (mm)' },
  { key: 'type', label: 'Type' },
  { key: 'length', label: 'Length (cm)' },
  { key: 'qty', label: 'Qty' },
  { key: 'totalLen', label: 'Total Len (m)' },
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'pricePerKg', label: '$/kg' },
  { key: 'total', label: 'Total ($)' },
];

export const PIPE_COLUMNS: ColumnDef[] = [
  { key: 'material', label: 'Material' },
  { key: 'outerD', label: 'Outer Ø (mm)' },
  { key: 'innerD', label: 'Inner Ø (mm)' },
  { key: 'length', label: 'Length (cm)' },
  { key: 'type', label: 'Type' },
  { key: 'qty', label: 'Qty' },
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'pricePerKg', label: '$/kg' },
  { key: 'total', label: 'Total ($)' },
];

export const SQUARE_COLUMNS: ColumnDef[] = [
  { key: 'material', label: 'Material' },
  { key: 'length', label: 'Length (cm)' },
  { key: 'width', label: 'Width (cm)' },
  { key: 'type', label: 'Type' },
  { key: 'thickness', label: 'Thickness (mm)' },
  { key: 'qty', label: 'Qty' },
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'pricePerKg', label: '$/kg' },
  { key: 'total', label: 'Total ($)' },
];

export const ORDER_COLUMNS: ColumnDef[] = [
  { key: 'orderName', label: 'Order Name' },
  { key: 'description', label: 'Description' },
  { key: 'notes', label: 'Notes' },
  { key: 'qty', label: 'Qty' },
  { key: 'unitPrice', label: 'Unit ($)' },
  { key: 'total', label: 'Total ($)' },
];

// Processing genuinely has MORE base columns than every other category
// (Type + Properties + Supplier all exist alongside Process/Description) —
// this exact list, in this exact order, is what was missing from the old
// report (which only had 4 of these 6).
export const PROCESSING_COLUMNS: ColumnDef[] = [
  { key: 'process', label: 'Process' },
  { key: 'description', label: 'Description' },
  { key: 'type', label: 'Type' },
  { key: 'properties', label: 'Properties' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'cost', label: 'Cost ($)' },
];

/** Processing's discount handling is its own shape (Discount AND a
 *  separate Net Cost column both get added, not just one column swapped
 *  in) — same special case in both the tab and the report now. */
export function processingColumnsFor(showDiscount: boolean): ColumnDef[] {
  if (!showDiscount) return PROCESSING_COLUMNS;
  return [...PROCESSING_COLUMNS, { key: 'discount', label: 'Discount ($)' }, { key: 'netCost', label: 'Net Cost ($)' }];
}
