import type { ReviewFlags, RowFlag } from '../types';

// Each category maps a flagged row's id -> the reason Admin typed for it,
// so the Designer sees exactly why that specific row was rejected instead
// of just "this row is wrong".
export interface FlagSet {
  sheets: Map<string, string>;
  profiles: Map<string, string>;
  mills: Map<string, string>;
  pipes: Map<string, string>;
  squares: Map<string, string>;
  orders: Map<string, string>;
  processing: Map<string, string>;
}

function toMap(list?: RowFlag[]): Map<string, string> {
  return new Map((list || []).map((f) => [f.id, f.reason]));
}
function toList(map: Map<string, string>): RowFlag[] {
  return Array.from(map.entries()).map(([id, reason]) => ({ id, reason }));
}

export function flagsToSets(flags?: ReviewFlags): FlagSet {
  return {
    sheets: toMap(flags?.sheets),
    profiles: toMap(flags?.profiles),
    mills: toMap(flags?.mills),
    pipes: toMap(flags?.pipes),
    squares: toMap(flags?.squares),
    orders: toMap(flags?.orders),
    processing: toMap(flags?.processing),
  };
}

export function setsToFlags(sets: FlagSet): ReviewFlags {
  return {
    sheets: toList(sets.sheets),
    profiles: toList(sets.profiles),
    mills: toList(sets.mills),
    pipes: toList(sets.pipes),
    squares: toList(sets.squares),
    orders: toList(sets.orders),
    processing: toList(sets.processing),
  };
}

export function countFlags(sets: FlagSet): number {
  return sets.sheets.size + sets.profiles.size + sets.mills.size + sets.pipes.size + sets.squares.size + sets.orders.size + sets.processing.size;
}
