import type { Locale } from '$lib/stores/locale';

// ============================================================================
//  MACHINE OPERATIONS — ONE LIST, STABLE VALUES, TRANSLATED LABELS
//
//  The operation list used to be a bare array of English strings inside
//  followup/+page.svelte, written straight into factory_operations.
//  operation_type and then echoed back raw in four different tables. So an
//  Arabic dashboard displayed "Laser Cutting" in every progress view.
//
//  The split here is deliberate:
//    - `id` is what goes in the DATABASE. It stays English and never
//      changes, so existing rows keep matching and the value is stable to
//      group and filter on.
//    - the label is what a person SEES, translated at render time.
//
//  operationLabel() falls back to the raw stored value, which is what makes
//  a custom operation someone typed themselves display correctly — it isn't
//  in this list and shouldn't be.
// ============================================================================

export interface OperationType {
  id: string;
  ar: string;
  en: string;
}

export const OPERATION_TYPES: OperationType[] = [
  { id: 'Laser Cutting', ar: 'قص بالليزر', en: 'Laser Cutting' },
  { id: 'CNC Machining', ar: 'تشغيل CNC', en: 'CNC Machining' },
  { id: 'Turning', ar: 'خراطة', en: 'Turning' },
  { id: 'Bending & Rolling', ar: 'ثني ودرفلة', en: 'Bending & Rolling' },
  { id: 'Coiling', ar: 'لف الحلزون', en: 'Coiling' },
  { id: 'Welding', ar: 'لحام', en: 'Welding' },
  { id: 'Assembly', ar: 'تجميع', en: 'Assembly' },
];

/** Sentinel for the "type your own" choice. Never stored — the moment the
 *  entry is saved, the typed text itself becomes the operation_type. */
export const CUSTOM_OPERATION = '__custom__';

/** Display label for a stored operation_type. Unknown values (anything
 *  someone typed as a custom operation) are returned as-is. */
export function operationLabel(loc: Locale, id: string): string {
  const found = OPERATION_TYPES.find((o) => o.id === id);
  if (!found) return id;
  return loc === 'ar' ? found.ar : found.en;
}
