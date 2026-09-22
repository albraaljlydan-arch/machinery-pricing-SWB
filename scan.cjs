const fs = require('fs');
const path = require('path');

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'calculator') continue;
      walk(full, out);
    } else if (entry.name.endsWith('.svelte')) {
      out.push(full);
    }
  }
}

const files = [];
walk('src/routes', files);
walk('src/lib/components', files);

const arabicRe = /[؀-ۿ]/;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  // find text between > and < that's not just whitespace/braces, ignoring <script>/<style> blocks
  let inScript = false, inStyle = false;
  lines.forEach((line, idx) => {
    if (/<script/.test(line)) inScript = true;
    if (/<\/script/.test(line)) inScript = false;
    if (/<style/.test(line)) inStyle = true;
    if (/<\/style/.test(line)) inStyle = false;
    if (inScript || inStyle) return;

    // text nodes
    const textMatches = [...line.matchAll(/>([^<>{}]{2,120})</g)];
    for (const m of textMatches) {
      const txt = m[1].trim();
      if (!txt) continue;
      if (!/[A-Za-z؀-ۿ]/.test(txt)) continue; // must have letters
      console.log(`${file}:${idx + 1}: TEXT: ${JSON.stringify(txt)}`);
    }

    const attrMatches = [...line.matchAll(/(placeholder|aria-label|title|alt)="([^"{}]{2,120})"/g)];
    for (const m of attrMatches) {
      console.log(`${file}:${idx + 1}: ATTR ${m[1]}: ${JSON.stringify(m[2])}`);
    }
  });
}
