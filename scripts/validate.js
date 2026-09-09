#!/usr/bin/env node
/**
 * Validate src/data/products.json. Exits non-zero on any failure so CI blocks
 * the build. Checks (per BUILD-BRIEF 1.1):
 *   - every referenced image file exists
 *   - outbound links have a valid shape
 *   - categories[] is never empty
 *   - no mojibake / U+FFFD anywhere in the record
 * Plus: unique ids, unique slugs, known category/tag vocabulary.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PRODUCTS = path.join(ROOT, 'src', 'data', 'products.json');
// Originals live untracked in raw-assets/catalog/; build-images.mjs turns them
// into public/img/ (committed). Validate the generated 600w webp — the file
// that actually deploys — so a new product without built images fails CI.
const IMG_DIR = path.join(ROOT, 'public', 'img');

const CATEGORIES = new Set(['skadis', 'lamps', 'apple', 'organisers', 'display']);
// keep in sync with TAG_VOCAB in build-products.mjs / docs/tags.md
const TAGS = new Set([
  'magsafe', 'apple-watch', 'headphones', 'bambu-lab-led-kit',
  'no-supports', 'print-in-place', 'multi-color', 'modular',
  'charging', 'cable-management', 'retro', 'planter', 'k-pop', 'seasonal',
]);

// mojibake: replacement char, or Latin-1-mis-decode signatures
const MOJIBAKE_RE = /�|Ã[-¿]|Â[ -¿]|â€|�/;

const errors = [];
const warnings = [];
const err = (id, msg) => errors.push(`  [#${id}] ${msg}`);
const warn = (id, msg) => warnings.push(`  [#${id}] ${msg}`);

let products;
try {
  products = JSON.parse(fs.readFileSync(PRODUCTS, 'utf8'));
} catch (e) {
  console.error(`FATAL: cannot read/parse ${PRODUCTS}\n${e.message}`);
  process.exit(2);
}

const imgFiles = new Set(fs.readdirSync(IMG_DIR));
const seenId = new Map();
const seenSlug = new Map();

const linkShapeOK = (url, host) =>
  typeof url === 'string' && /^https:\/\/[^\s"'<>]+$/.test(url) && url.includes(host);

for (const p of products) {
  const id = p.id ?? '?';

  if (!Number.isInteger(p.id)) err(id, 'id is not an integer');
  if (seenId.has(p.id)) err(id, `duplicate id (also #${seenId.get(p.id)})`);
  seenId.set(p.id, id);

  if (typeof p.slug !== 'string' || !/^[a-z0-9-]+$/.test(p.slug)) err(id, `bad slug "${p.slug}"`);
  if (seenSlug.has(p.slug)) err(id, `duplicate slug "${p.slug}"`);
  seenSlug.set(p.slug, id);

  // images — the generated 600w webp must exist in public/img/
  for (const kind of ['plain', 'colour']) {
    const f = p.images?.[kind];
    if (!f) { err(id, `images.${kind} is null`); continue; }
    const stem = f.replace(/\.[^.]+$/, '');
    for (const w of [400, 600]) {
      if (!imgFiles.has(`${stem}-${w}.webp`)) err(id, `images.${kind}: public/img/${stem}-${w}.webp missing — run npm run build:img`);
    }
  }

  // links
  if (!linkShapeOK(p.links?.cults, 'cults3d.com')) err(id, `links.cults bad shape: ${p.links?.cults}`);
  if (p.links?.thangs != null && !linkShapeOK(p.links.thangs, 'thangs.com')) err(id, `links.thangs bad shape: ${p.links.thangs}`);
  if (p.links?.pixup != null && !linkShapeOK(p.links.pixup, 'http')) err(id, `links.pixup bad shape: ${p.links.pixup}`);

  // categories
  if (!Array.isArray(p.categories) || p.categories.length === 0) err(id, 'categories[] is empty');
  else for (const c of p.categories) if (!CATEGORIES.has(c)) err(id, `unknown category "${c}"`);
  for (const t of (p.tags || [])) if (!TAGS.has(t)) err(id, `unknown tag "${t}"`);
  if (p.provisionalCategory) warn(id, `provisional category [${p.categories}] — confirm in docs/uncategorised-review.md`);

  // dates
  if (p.date != null && !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) err(id, `bad date "${p.date}"`);

  // mojibake — scan the whole record
  const blob = JSON.stringify(p);
  if (MOJIBAKE_RE.test(blob)) err(id, 'mojibake / U+FFFD detected in record');

  // indexable gate: specs must be filled to be indexable
  if (p.indexable) {
    const specVals = Object.values(p.specs || {});
    if (specVals.every((v) => v == null)) err(id, 'indexable:true but all specs are null (doorway page)');
  }
}

if (products.length !== 101) warn('-', `expected 101 products, got ${products.length}`);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  console.log(warnings.join('\n'));
}
if (errors.length) {
  console.error(`\nVALIDATION FAILED — ${errors.length} error(s):`);
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`\n✓ products.json valid — ${products.length} products, 0 errors`);
