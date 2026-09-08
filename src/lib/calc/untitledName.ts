// Given the list of project names a designer already has, returns
// "Untitled Project" the first time, then "Untitled Project 2",
// "Untitled Project 3"... so drafts never silently collide when a name
// was never set (used both on Create New and on silent auto-save-on-exit).
export function nextUntitledProjectName(existingNames: string[]): string {
  const base = 'Untitled Project';
  const used = new Set(existingNames.map((n) => (n || '').trim()));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}
