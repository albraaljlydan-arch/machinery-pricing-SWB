import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'swb-theme';

function createThemeStore() {
  const initial: Theme = (typeof localStorage !== 'undefined' && (localStorage.getItem(STORAGE_KEY) as Theme)) || 'light';
  const { subscribe, set: rawSet } = writable<Theme>(initial);

  function set(value: Theme) {
    rawSet(value);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, value);
  }

  return { subscribe, set };
}

export const theme = createThemeStore();
