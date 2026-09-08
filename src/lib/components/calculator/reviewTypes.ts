import type { FlagSet } from '$lib/calc/reviewFlags';

export interface ReviewCategory {
  key: keyof FlagSet;
  label: string; // short tab chip label, e.g. "Sheet Metal"
  fullTitle: string; // e.g. "1 — Sheet Metal"
  headers: string[];
  rows: { id: string }[];
  renderCells: (row: any) => (string | number)[];
}
