import { writable } from 'svelte/store';

export type Locale = 'ar' | 'en';

const STORAGE_KEY = 'swb-locale';

function createLocaleStore() {
  const initial: Locale = (typeof localStorage !== 'undefined' && (localStorage.getItem(STORAGE_KEY) as Locale)) || 'ar';
  const { subscribe, set: rawSet } = writable<Locale>(initial);

  function set(value: Locale) {
    rawSet(value);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, value);
  }

  return { subscribe, set };
}

// Only the DASHBOARD (Admin/Designer/Factory/Accounting shells) reacts to
// this — the root layout flips document.documentElement.dir when it
// changes. The calculator explicitly forces dir="ltr" on its own root
// element regardless of this store's value — see Calculator.svelte.
export const locale = createLocaleStore();
