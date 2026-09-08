import { writable } from 'svelte/store';

const STORAGE_KEY = 'swb-safety-factor';

function createSafetyFactorStore() {
  const initial = typeof localStorage !== 'undefined' ? Number(localStorage.getItem(STORAGE_KEY)) || 0 : 0;
  const { subscribe, set: rawSet } = writable<number>(initial);

  function set(value: number) {
    const safe = isNaN(value) ? 0 : Math.max(0, value);
    rawSet(safe);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, String(safe));
  }

  return { subscribe, set };
}

// A dashboard-level setting (Settings page), not a per-project field — the
// margin the Designer's PDF report always applies, until changed here.
export const safetyFactor = createSafetyFactorStore();
