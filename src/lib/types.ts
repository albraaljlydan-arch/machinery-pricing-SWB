// ============================================================================
//  TYPES — SWB Technology Manufacturing Order System
// ============================================================================

export interface Material {
  id: string;
  nameEn: string;
  nameAr?: string;
  density: number;           // kg/m³  (e.g., 7850 for steel)
  stdPriceKg?: number;       // wholesale $/kg
  piecePriceKg?: number;     // retail $/kg
  standardSheetPricePerKg?: number;  // legacy alias
  customCutPricePerKg?: number;      // legacy alias
}

export interface TypeOption {
  v: 'standard' | 'per_piece';
  l: string;
}

// ============================================================================
//  ROW TYPES — each material tab's row structure
// ============================================================================

export interface SheetRow {
  id: string;
  materialId: string;
  sizeOption: string;
  length: number;       // mm
  width: number;        // mm
  thickOpt: string;
  thickness: number;    // mm
  quantity: number;
  type: 'standard' | 'per_piece';
  totalWeight?: number;
  totalCost?: number;
  /** Procurement only: manual $/kg override; falls back to auto-calc when empty/0 */
  manualPrice?: number;
  /** Procurement only: per-row discount ($) subtracted from this row's total */
  discount?: number;
  /** Values for any Developer-added custom columns, keyed by column id. */
  customFields?: Record<string, string | number>;
}

export interface ProfileRow {
  id: string;
  materialId: string;
  profileType: 'square' | 'rectangular' | 'round' | 'custom';
  sectionOpt: string;
  sideA: number;          // cm
  sideB: number;          // cm
  wallThickOpt: string;
  wallThickness: number;  // mm
  length: number;         // m
  quantity: number;
  type: 'standard' | 'per_piece';
  totalWeight?: number;
  totalCost?: number;
  /** Procurement only: manual $/kg override */
  manualPrice?: number;
  /** Procurement only: per-row discount ($) */
  discount?: number;
  /** Values for any Developer-added custom columns, keyed by column id. */
  customFields?: Record<string, string | number>;
}

export interface MillRow {
  id: string;
  materialId: string;
  diameterOpt: string;
  diameter: number;   // mm
  length: number;     // cm
  quantity: number;
  type: 'standard' | 'per_piece';
  totalWeight?: number;
  totalCost?: number;
  /** Procurement only: manual $/kg override */
  manualPrice?: number;
  /** Procurement only: per-row discount ($) */
  discount?: number;
  /** Values for any Developer-added custom columns, keyed by column id.
   *  Optional and untyped on purpose — custom columns are defined at
   *  runtime (see lib/calc/fieldConfig.ts), not in this fixed interface. */
  customFields?: Record<string, string | number>;
}

export interface PipeRow {
  id: string;
  materialId: string;
  outerDiameter: number;  // mm
  innerDiameter: number;  // mm
  length: number;         // cm
  quantity: number;
  type: 'standard' | 'per_piece';
  totalWeight?: number;
  totalCost?: number;
  /** Procurement only: manual $/kg override */
  manualPrice?: number;
  /** Procurement only: per-row discount ($) */
  discount?: number;
  /** Values for any Developer-added custom columns, keyed by column id. */
  customFields?: Record<string, string | number>;
}

export interface SquareRow {
  id: string;
  materialId: string;
  width: number;      // cm
  thickness: number;  // mm
  length: number;     // cm
  quantity: number;
  type: 'standard' | 'per_piece';
  totalWeight?: number;
  totalCost?: number;
  /** Procurement only: manual $/kg override */
  manualPrice?: number;
  /** Procurement only: per-row discount ($) */
  discount?: number;
  /** Values for any Developer-added custom columns, keyed by column id. */
  customFields?: Record<string, string | number>;
}

export interface OrderRow {
  id: string;
  orderName: string;
  description: string;
  properties: string;
  quantity: number;
  unitPrice: number;
  /** Procurement only: per-row discount ($) */
  discount?: number;
  /** Values for any Developer-added custom columns, keyed by column id. */
  customFields?: Record<string, string | number>;
}

export interface OperationRow {
  id: string;
  process: string;
  description: string;
  type: string;
  properties: string;
  supplier: string;
  cost: number;
  /** Procurement only: per-row discount ($) */
  discount?: number;
  /** Values for any Developer-added custom columns, keyed by column id. */
  customFields?: Record<string, string | number>;
}

// ============================================================================
//  PROCUREMENT-SPECIFIC TYPES
// ============================================================================

export interface InvoiceRow {
  id: string;
  invoiceNo: string;   // manual text input, user-typed (e.g. "001", "A-101")
  date: string;        // yyyy-mm-dd, defaults to today
  client: string;      // client / company / shop name
  driveLink: string;   // Google Drive (or other cloud) URL to the invoice file
  notes: string;       // free text notes (payment status, delivery notes, etc.)
  invoiceValue: number; // invoice amount in dollars; validated input (positive, decimals allowed)
}

// ============================================================================
//  USER ROLES & PROJECT TYPES
// ============================================================================

export type UserRole = 'designer' | 'admin' | 'factory' | 'procurement' | 'accounting' | 'developer';

export type ProjectStatus = 'Draft' | 'Pending Admin' | 'In Production' | 'Complete Production' | 'Completed' | 'Rejected';

// ============================================================================
//  ADMIN REJECT-FLAGGING
// ============================================================================

/** Which specific rows, per category, the Admin flagged as wrong on Reject.
 *  Row ids match each row's own `id` field (SheetRow.id, ProfileRow.id...).
 *  Stored inside ProjectData so it travels with the project and survives
 *  round-trips to Supabase without needing its own table/column. */
export interface RowFlag {
  id: string;
  reason: string;
}

export interface ReviewFlags {
  sheets?: RowFlag[];
  profiles?: RowFlag[];
  mills?: RowFlag[];
  pipes?: RowFlag[];
  squares?: RowFlag[];
  orders?: RowFlag[];
  processing?: RowFlag[];
}

export interface ProjectData {
  projectName: string;
  client: string;
  safetyFactor: number;
  sheetRows: SheetRow[];
  profileRows: ProfileRow[];
  millRows: MillRow[];
  pipeRows: PipeRow[];
  squareRows: SquareRow[];
  orderRows: OrderRow[];
  operations: OperationRow[];
  /** Set by Admin on Reject; read (highlighted) by the Designer, cleared on Approve. */
  reviewFlags?: ReviewFlags;
}

export interface Project {
  id: string;
  user_id?: string;
  project_name: string;
  client?: string;
  total_cost: number;
  status: ProjectStatus;
  created_at: string;
  project_data?: ProjectData;
}
