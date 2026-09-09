/**
 * Copy the canonical asset folders into public/ so Astro serves them.
 * Image/  is the source of truth at the repo root (also used by the legacy
 * site during the transition); public/Image/ is a build artifact (gitignored).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const pairs = [
  ['Image', 'public/Image'],
];

for (const [from, to] of pairs) {
  const src = path.join(ROOT, from);
  const dst = path.join(ROOT, to);
  if (!fs.existsSync(src)) { console.warn(`skip: ${from} not found`); continue; }
  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
  const n = fs.readdirSync(path.join(dst, 'Catalog')).length;
  console.log(`synced ${from} -> ${to} (${n} catalog files)`);
}
