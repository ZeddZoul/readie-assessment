// Backstop for the "no any anywhere" rule: flags `any` used in type positions.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['src', 'tests'];
const pattern = /(:\s*any\s*([;,)\]>=|&]|$)|<any[\s,>\[]|\bany\[\]|\bas\s+any\b|[,|]\s*any\s*[>;,)|])/;
const hits = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(name)) {
      readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        if (pattern.test(line)) hits.push(`${p}:${i + 1}: ${line.trim()}`);
      });
    }
  }
};
roots.forEach(walk);
if (hits.length) {
  console.error('Found `any`:\n' + hits.join('\n'));
  process.exit(1);
}
console.log('No `any` found.');
