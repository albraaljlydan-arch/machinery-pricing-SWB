/** Two-letter avatar initials: first letters of the first two words of the
 *  person's name, falling back to the start of their email. */
export function initialsOf(name: string, fallback: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return fallback.slice(0, 2).toUpperCase() || '??';
}
