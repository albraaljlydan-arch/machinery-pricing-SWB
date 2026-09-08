import type { Material, TypeOption } from './types';

// ============================================================
//  Materials — density in kg/m³ (stored for reference; DENSITIES
//  in utils.ts in g/cm³ is what the calculation engine uses).
//  stdPriceKg  = wholesale price per kg
//  piecePriceKg = retail price per kg
// ============================================================
export const MATERIALS: Material[] = [
  { id: 'steel',            nameEn: 'St37',               density: 7850, stdPriceKg: 1.10, piecePriceKg: 1.40 },
  { id: 'galvanized_steel', nameEn: 'Galvanized Steel',   density: 7850, stdPriceKg: 1.35, piecePriceKg: 1.70 },
  { id: 'ss206',            nameEn: 'Stainless 206',      density: 7800, stdPriceKg: 2.50, piecePriceKg: 3.10 },
  { id: 'ss304',            nameEn: 'Stainless 304',      density: 7930, stdPriceKg: 3.80, piecePriceKg: 4.60 },
  { id: 'ss316',            nameEn: 'Stainless 316',      density: 8000, stdPriceKg: 4.80, piecePriceKg: 5.80 },
  { id: 'al6061',           nameEn: 'Aluminum 6061',      density: 2700, stdPriceKg: 3.50, piecePriceKg: 4.20 },
  { id: 'al6082',           nameEn: 'Aluminum 6082',      density: 2700, stdPriceKg: 3.80, piecePriceKg: 4.50 },
  { id: 'al7075',           nameEn: 'Aluminum 7075',      density: 2800, stdPriceKg: 5.20, piecePriceKg: 6.30 },
  { id: 'copper',           nameEn: 'Copper',             density: 8960, stdPriceKg: 9.50, piecePriceKg: 11.50 },
  { id: 'polyamide',        nameEn: 'Polyamide',           density: 1200, stdPriceKg: 4.50, piecePriceKg: 5.50 },
];

export const TYPE_OPTIONS: TypeOption[] = [
  { v: 'standard',  l: 'Wholesale (Standard)' },
  { v: 'per_piece', l: 'Retail (Per-Piece)' },
];

export const STANDARD_SIZES = [
  { id: 'custom',    label: '✍️ Custom',        length: 0,    width: 0    },
  { id: '2500_1250', label: '2500 × 1250 mm',   length: 2500, width: 1250 },
  { id: '3000_1500', label: '3000 × 1500 mm',   length: 3000, width: 1500 },
  { id: '4000_2000', label: '4000 × 2000 mm',   length: 4000, width: 2000 },
];

export const SHEET_SIZES = STANDARD_SIZES;

export const STANDARD_THICKNESSES = [
  { id: 'custom', label: '✍️ Custom', value: 0   },
  { id: '0.8',    label: '0.8 mm',   value: 0.8 },
  { id: '1',      label: '1 mm',     value: 1   },
  { id: '1.2',    label: '1.2 mm',   value: 1.2 },
  { id: '1.5',    label: '1.5 mm',   value: 1.5 },
  { id: '2',      label: '2 mm',     value: 2   },
  { id: '3',      label: '3 mm',     value: 3   },
  { id: '4',      label: '4 mm',     value: 4   },
  { id: '5',      label: '5 mm',     value: 5   },
  { id: '6',      label: '6 mm',     value: 6   },
  { id: '8',      label: '8 mm',     value: 8   },
  { id: '10',     label: '10 mm',    value: 10  },
  { id: '12',     label: '12 mm',    value: 12  },
  { id: '15',     label: '15 mm',    value: 15  },
  { id: '20',     label: '20 mm',    value: 20  },
  { id: '25',     label: '25 mm',    value: 25  },
  { id: '30',     label: '30 mm',    value: 30  },
  { id: '35',     label: '35 mm',    value: 35  },
];

export const PROFILE_TYPES = [
  { id: 'square',      label: 'Square Tube'       },
  { id: 'rectangular', label: 'Rectangular Tube'  },
  { id: 'custom',      label: '✍️ Custom Profile' },
];

export const SQUARE_SECTIONS = [
  { id: '2*2', label: '2 × 2 cm', a: 2, b: 2 },
  { id: '3*3', label: '3 × 3 cm', a: 3, b: 3 },
  { id: '4*4', label: '4 × 4 cm', a: 4, b: 4 },
  { id: '5*5', label: '5 × 5 cm', a: 5, b: 5 },
  { id: '6*6', label: '6 × 6 cm', a: 6, b: 6 },
  { id: '8*8', label: '8 × 8 cm', a: 8, b: 8 },
];

export const RECT_SECTIONS = [
  { id: '2*1',   label: '2 × 1 cm',   a: 2, b: 1   },
  { id: '4*2',   label: '4 × 2 cm',   a: 4, b: 2   },
  { id: '5*2.5', label: '5 × 2.5 cm', a: 5, b: 2.5 },
  { id: '6*3',   label: '6 × 3 cm',   a: 6, b: 3   },
  { id: '8*4',   label: '8 × 4 cm',   a: 8, b: 4   },
];

export const PROFILE_WALL_THICKNESSES = [
  { id: 'custom', label: '✍️ Custom', value: 0   },
  { id: '1',      label: '1 mm',     value: 1   },
  { id: '1.5',    label: '1.5 mm',   value: 1.5 },
  { id: '2',      label: '2 mm',     value: 2   },
  { id: '2.5',    label: '2.5 mm',   value: 2.5 },
  { id: '3',      label: '3 mm',     value: 3   },
  { id: '4',      label: '4 mm',     value: 4   },
  { id: '5',      label: '5 mm',     value: 5   },
  { id: '6',      label: '6 mm',     value: 6   },
  { id: '7',      label: '7 mm',     value: 7   },
  { id: '8',      label: '8 mm',     value: 8   },
  { id: '9',      label: '9 mm',     value: 9   },
  { id: '10',     label: '10 mm',    value: 10  },
];

// ============================================================
//  Sheet Metal thickness bands — Settings.tsx prices Sheet Metal
//  per band (thin/mid/thick) instead of a single flat price per
//  material, because thin/mid/thick sheet is sourced and priced
//  very differently in practice. Boundaries are inclusive on the
//  upper edge of thin/mid; anything above THICK_MIN falls in "thick".
//  getSheetThicknessBand() in utils.ts is the single place that
//  turns a raw thickness (mm) into one of these band ids — never
//  duplicate this cutoff logic elsewhere.
// ============================================================
export type SheetThicknessBand = 'thin' | 'mid' | 'thick';

export const SHEET_THIN_MAX_MM = 2;   // thin:  0    < t <= 2mm
export const SHEET_MID_MAX_MM  = 6;   // mid:   2mm  < t <= 6mm
                                       // thick: t > 6mm

export const SHEET_THICKNESS_BANDS: { id: SheetThicknessBand; label: string }[] = [
  { id: 'thin',  label: `Thin (≤ ${SHEET_THIN_MAX_MM}mm)` },
  { id: 'mid',   label: `Mid (${SHEET_THIN_MAX_MM}–${SHEET_MID_MAX_MM}mm)` },
  { id: 'thick', label: `Thick (> ${SHEET_MID_MAX_MM}mm)` },
];

// ============================================================
//  Settings.tsx category list — one entry per pricing category.
//  "flat" categories store a single {wholesale, retail} price per
//  material; "sheet" is the only "banded" category (see above).
// ============================================================
export type PriceCategory = 'sheet' | 'profile' | 'mill' | 'pipe' | 'square';

export const PRICE_CATEGORIES: { id: PriceCategory; label: string; banded: boolean }[] = [
  { id: 'sheet',   label: 'Sheet Metal',       banded: true  },
  { id: 'profile', label: 'Profiles & Tubes',  banded: false },
  { id: 'mill',    label: 'Mill',              banded: false },
  { id: 'pipe',    label: 'Pipes & Bushings',  banded: false },
  { id: 'square',  label: 'Square & Blocks',   banded: false },
];

export const ROD_DIAMETERS = [
  { id: 'custom', label: '✍️ Custom', value: 0   },
  { id: '6',      label: 'Ø 6',      value: 6   },
  { id: '8',      label: 'Ø 8',      value: 8   },
  { id: '10',     label: 'Ø 10',     value: 10  },
  { id: '12',     label: 'Ø 12',     value: 12  },
  { id: '14',     label: 'Ø 14',     value: 14  },
  { id: '15',     label: 'Ø 15',     value: 15  },
  { id: '16',     label: 'Ø 16',     value: 16  },
  { id: '20',     label: 'Ø 20',     value: 20  },
  { id: '25',     label: 'Ø 25',     value: 25  },
  { id: '30',     label: 'Ø 30',     value: 30  },
  { id: '35',     label: 'Ø 35',     value: 35  },
  { id: '40',     label: 'Ø 40',     value: 40  },
  { id: '45',     label: 'Ø 45',     value: 45  },
  { id: '50',     label: 'Ø 50',     value: 50  },
  { id: '55',     label: 'Ø 55',     value: 55  },
  { id: '60',     label: 'Ø 60',     value: 60  },
  { id: '65',     label: 'Ø 65',     value: 65  },
  { id: '70',     label: 'Ø 70',     value: 70  },
  { id: '75',     label: 'Ø 75',     value: 75  },
  { id: '80',     label: 'Ø 80',     value: 80  },
  { id: '85',     label: 'Ø 85',     value: 85  },
  { id: '90',     label: 'Ø 90',     value: 90  },
  { id: '95',     label: 'Ø 95',     value: 95  },
  { id: '100',    label: 'Ø 100',    value: 100 },
  { id: '110',    label: 'Ø 110',    value: 110 },
  { id: '120',    label: 'Ø 120',    value: 120 },
];

// ============================================================
//  Report Branding
// ============================================================
export const REPORT_BRAND = {
  title: "Manufacturing Order",
  footer: "Generated by the Manufacturing Order System",
};

