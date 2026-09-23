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

/** Every value the profiles.role column may hold. 'followup' (the Follow-up
 *  Engineer who logs machine operations) was missing here even though the
 *  role exists in the database, has its own /followup dashboard, and is what
 *  the root layout's `/${userRole}` redirect resolves to for those accounts —
 *  so it type-checked as unreachable while being perfectly reachable. */
export type UserRole = 'designer' | 'admin' | 'factory' | 'procurement' | 'accounting' | 'followup' | 'developer' | 'customer';

export type ProjectStatus = 'Draft' | 'Pending Admin' | 'Awaiting Production' | 'In Production' | 'Complete Production' | 'Completed' | 'Rejected';

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

// ============================================================================
//  PROCUREMENT'S OWN FILE
// ============================================================================

/** Procurement's file — the REAL purchase, at real invoice prices.
 *
 *  Deliberately a separate set of rows from the designer's, not an edit of
 *  them: the designer's numbers are an *estimate* (catalogue $/kg from the
 *  price table), and Procurement's job is to replace them with what was
 *  actually paid. If both lived in the same rows, the first Procurement
 *  save would erase the estimate forever — and estimate-vs-actual is
 *  exactly what makes this file worth keeping.
 *
 *  It's nested inside ProjectData (rather than a new `projects` column) for
 *  the same reason `reviewFlags` is: it travels with the project and
 *  survives round-trips to Supabase without a migration.
 *
 *  Seeded from the designer's specs with every money field cleared — see
 *  calc/procurementSeed.ts. */
export interface ProcurementData {
  sheetRows: SheetRow[];
  profileRows: ProfileRow[];
  millRows: MillRow[];
  pipeRows: PipeRow[];
  squareRows: SquareRow[];
  orderRows: OrderRow[];
  operations: OperationRow[];
  invoiceRows: InvoiceRow[];
  /** When Procurement first opened this project. Its presence is what
   *  distinguishes "never opened" (seed it now) from "opened, and its rows
   *  are empty because Procurement emptied them on purpose". */
  seededAt: string;
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
  /** Procurement's separate real-cost file; absent until Procurement first
   *  opens the project. The seven row arrays above stay the designer's
   *  estimate untouched. */
  procurement?: ProcurementData;
  /** LEGACY: where Procurement's invoices lived before `procurement` existed,
   *  back when Procurement edited the designer's rows in place. Read once,
   *  when seeding a purchase file for a project that predates the split, so
   *  those invoices (and their Drive links) aren't lost. Carried through
   *  saves untouched; never written fresh. */
  invoiceRows?: InvoiceRow[];
}

// ============================================================================
//  PROCUREMENT PURCHASE REQUESTS — daily material pick-lists, approved by
//  Factory before those materials count as secured. A parallel log, exactly
//  like `factory_operations` for the Follow-up Engineer: it never changes
//  `projects.status`. Lives in its own `purchase_requests` table (not inside
//  ProjectData) because, unlike reviewFlags/procurement, every past day's
//  submission must be kept, not just the latest one.
// ============================================================================

export type PurchaseApprovalStatus = 'pending' | 'approved' | 'rejected';

/** Same shape as ReviewFlags/RowFlag (id + free text) — here the text is a
 *  Procurement-written NOTE, not a rejection reason. Only sheets/profiles/
 *  mills/pipes/squares/orders ever have entries; processing has no
 *  `quantity` field and never participates in a purchase request. */
export type PurchaseRowFlags = Partial<Record<'sheets' | 'profiles' | 'mills' | 'pipes' | 'squares' | 'orders', RowFlag[]>>;

export interface PurchaseRequestRow {
  id: string;
  project_id: string;
  project_name_snapshot: string;
  work_date: string; // yyyy-mm-dd
  requested_by: string;
  requested_row_ids: PurchaseRowFlags;
  pieces_today: number;
  pieces_cumulative: number;
  total_pieces: number;
  daily_percent: number;
  cumulative_percent: number;
  approval_status: PurchaseApprovalStatus;
  /** Set by Factory when rejecting. Shown back to Procurement only — never
   *  to Admin. */
  rejection_note: string | null;
  created_at: string;
}


export type ProcurementTaskCategory = 'sheets' | 'profiles' | 'mills' | 'pipes' | 'squares' | 'orders';

export interface ProcurementTask {
  id: string;
  project_id: string;
  project_name_snapshot: string;
  source_category: ProcurementTaskCategory;
  source_row_id: string;
  item_name: string;
  details: string | null;
  source_data: Record<string, unknown>;
  unit_label: string;
  total_quantity: number;
  purchased_quantity: number;
  received_quantity: number;
  created_at: string;
  completed_at: string | null;
}

export interface ProcurementTaskUpdate {
  id: string;
  task_id: string;
  project_id: string;
  quantity: number;
  supplier: string;
  unit_price: number | null;
  expected_arrival_date: string | null;
  received_at: string | null;
  notes: string | null;
  work_date: string;
  logged_by: string;
  created_at: string;
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

// ============================================================================
//  CUSTOMER INTAKE — a customer's initial machine request, manually matched
//  by Factory to a designer, then a text chat between the two. Lives in its
//  own tables (not `projects`) because a request may never become a real
//  production project, and because a customer account has no business
//  reading/writing `projects` at all.
// ============================================================================

export type CustomerRequestStatus = 'New' | 'Assigned' | 'Rejected' | 'Closed';

export interface CustomerRequest {
  id: string;
  customer_id: string;
  title: string;
  description: string;
  /** Free-form initial specs (machine type, quantity, dimensions/capacity, etc.) — kept as JSON rather than fixed columns since the useful fields vary by machine type. */
  spec_data: Record<string, string | number>;
  status: CustomerRequestStatus;
  assigned_designer_id?: string | null;
  assigned_by?: string | null;
  assigned_at?: string | null;
  factory_note?: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  request_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

// ============================================================================
//  PROJECT EVENTS — the audit trail behind Admin's timeline and the
//  per-designer performance figures. A project can be rejected and
//  resubmitted any number of times, so this is a log, not a set of date
//  columns on `projects`.
// ============================================================================

export type ProjectEventType = 'created' | 'submitted' | 'approved' | 'rejected' | 'production_started' | 'production_finished' | 'completed';

export interface ProjectEvent {
  id: string;
  project_id: string;
  event_type: ProjectEventType;
  actor_id: string | null;
  note: string | null;
  created_at: string;
}
