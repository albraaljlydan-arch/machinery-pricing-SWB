import { supabase } from '$lib/supabaseClient';

// ============================================================================
//  DEVELOPER-DEFINED CUSTOM COLUMNS
//
//  Lets the 'developer' role add extra columns to a calculator tab (Designer
//  version only, for now — Procurement's calculator is deliberately out of
//  scope, it has its own separate pricing/discount shape) without touching
//  code, AND rename the built-in columns' labels. Definitions are stored
//  server-side (one row per tab in Supabase's `field_configs` table), so
//  every Designer sees the same columns — this is NOT a per-browser/local
//  setting.
//
//  Column NAMES are expected to be entered in English by the Developer, even
//  if the Developer's own dashboard is showing Arabic at the time — the
//  calculator itself is always English for the end user (Designer), so a
//  label typed in Arabic here would leak Arabic into an otherwise
//  English-only screen.
//
//  NOTE ON SCOPE: reordering only applies among the custom (added) columns —
//  built-in columns can be renamed but not moved. Moving a built-in
//  column's actual data-entry position would require every tab's row
//  markup to become fully key-driven instead of a fixed sequence, which
//  risks exactly the header/data-cell mismatch bug this project has
//  already hit once; that's a separate, bigger pass, not silently
//  half-done here.
// ============================================================================

export type CustomFieldType = 'text' | 'number' | 'dropdown';

export interface CustomFieldConstraints {
  /** number type only */
  numberFormat?: 'integer' | 'decimal';
  positiveOnly?: boolean;
  allowNegative?: boolean;
  /** number type only — a short suffix shown next to the input, e.g. 'mm' */
  unit?: string;
  /** dropdown type only */
  options?: string[];
  allowCustomValue?: boolean;
  /** dropdown type only — what kind of input the "Other…" override shows */
  customValueType?: 'text' | 'number';
}

export interface CustomFieldDef {
  id: string;
  name: string;
  type: CustomFieldType;
  constraints?: CustomFieldConstraints;
}

export interface FieldConfigData {
  customColumns: CustomFieldDef[];
  /** built-in column key -> override display label, e.g. { diameter: 'Rod Ø' } */
  labelOverrides: Record<string, string>;
}

const EMPTY: FieldConfigData = { customColumns: [], labelOverrides: {} };

/** One row per tab, e.g. 'designer_mill'. Reads old rows saved before
 *  labelOverrides existed (a plain CustomFieldDef[] array) transparently,
 *  so nothing already saved breaks. */
export async function loadFieldConfig(target: string): Promise<FieldConfigData> {
  const { data, error } = await supabase.from('field_configs').select('columns').eq('target', target).maybeSingle();
  if (error || !data || !data.columns) return { customColumns: [], labelOverrides: {} };
  const raw = data.columns;
  if (Array.isArray(raw)) return { customColumns: raw as CustomFieldDef[], labelOverrides: {} };
  return { customColumns: raw.customColumns ?? [], labelOverrides: raw.labelOverrides ?? {} };
}

export async function saveFieldConfig(target: string, data: FieldConfigData): Promise<{ error: string | null }> {
  const { error } = await supabase.from('field_configs').upsert({ target, columns: data, updated_at: new Date().toISOString() }, { onConflict: 'target' });
  return { error: error?.message ?? null };
}

export { EMPTY as emptyFieldConfig };
