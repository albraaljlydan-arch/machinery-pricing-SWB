import { MATERIALS } from '$lib/constants';
import type { Locale } from '$lib/stores/locale';
import type { ProcurementTask, ProcurementTaskCategory } from '$lib/types';

const categoryLabels: Record<ProcurementTaskCategory, { ar: string; en: string }> = {
  sheets: { ar: 'صفائح', en: 'Sheets' },
  profiles: { ar: 'مقاطع', en: 'Profiles' },
  mills: { ar: 'مواد التفريز', en: 'Mill stock' },
  pipes: { ar: 'أنابيب', en: 'Pipes' },
  squares: { ar: 'مربعات', en: 'Square stock' },
  orders: { ar: 'طلبات جاهزة', en: 'Ready-made items' },
};

function text(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return value === undefined || value === null || value === '' ? '—' : String(value);
}

function materialName(data: Record<string, unknown>, locale: Locale): string {
  const id = text(data, 'materialId');
  const material = MATERIALS.find((entry) => entry.id === id);
  if (!material) return id;
  return locale === 'ar' ? material.nameAr || material.nameEn : material.nameEn;
}

export function procurementCategoryLabel(locale: Locale, category: ProcurementTaskCategory): string {
  return categoryLabels[category][locale];
}

export function procurementTaskTitle(locale: Locale, task: ProcurementTask): string {
  const data = task.source_data || {};
  if (task.source_category === 'orders') {
    return text(data, 'orderName') === '—' ? task.item_name : text(data, 'orderName');
  }
  const material = materialName(data, locale);
  const kind = categoryLabels[task.source_category][locale];
  return locale === 'ar' ? `${kind} · ${material}` : `${material} · ${kind}`;
}

export function procurementTaskDetails(task: ProcurementTask): string {
  const data = task.source_data || {};
  switch (task.source_category) {
    case 'sheets':
      return `${text(data, 'length')} × ${text(data, 'width')} × ${text(data, 'thickness')} mm`;
    case 'profiles':
      return `${text(data, 'profileType')} · ${text(data, 'sectionOpt')} · ${text(data, 'length')} m`;
    case 'mills':
      return `Ø ${text(data, 'diameter')} mm · ${text(data, 'length')} cm`;
    case 'pipes':
      return `OD ${text(data, 'outerDiameter')} / ID ${text(data, 'innerDiameter')} mm · ${text(data, 'length')} cm`;
    case 'squares':
      return `${text(data, 'width')} × ${text(data, 'thickness')} × ${text(data, 'length')}`;
    case 'orders':
      return [text(data, 'description'), text(data, 'properties')].filter((value) => value !== '—').join(' · ') || '—';
  }
}

export type ProcurementTaskStatus = 'pending' | 'partial' | 'shipping' | 'complete';

export function procurementTaskStatus(task: ProcurementTask): ProcurementTaskStatus {
  if (task.received_quantity >= task.total_quantity) return 'complete';
  if (task.purchased_quantity >= task.total_quantity) return 'shipping';
  if (task.purchased_quantity > 0) return 'partial';
  return 'pending';
}

export function procurementProgress(task: ProcurementTask): number {
  return task.total_quantity > 0 ? Math.min(100, Math.round((task.purchased_quantity / task.total_quantity) * 100)) : 0;
}

export function formatTaskQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}
