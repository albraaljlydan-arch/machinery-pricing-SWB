// Always renders with Western digits (0-9) regardless of the site's
// current language — 'ar' locale's default toLocaleDateString() switches
// to Arabic-Indic numerals (٠١٢٣...), which clashed visually with every
// other number in the app (prices, weights — all JetBrains Mono Western
// digits). 'en-GB' just controls the day/month/year ORDER; 'numberingSystem'
// via the Intl options below is what actually pins the digits themselves.
export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
