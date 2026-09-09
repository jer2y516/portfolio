/**
 * Maintain content/descriptions.json — the hand-written product copy that
 * build-products.mjs merges into products.json.
 *
 *   node scripts/gen-descriptions.mjs
 *
 * - adds a skeleton entry for any product slug not yet in the file
 * - never touches an entry that already has text
 * - writes content/descriptions.reference.md: the cleaned Cults description +
 *   real comments for each product, as drafting / review context (git-ignored,
 *   never shipped)
 *
 * Rules for the `description` text (see CLAUDE.md content rules):
 * - 45–70 words, our own voice, factual "technical catalogue" tone
 * - never invent specs (layer height, infill, dimensions, print time)
 * - never reuse Cults phrasing; extract the facts, drop the marketing
 * - say what is NOT included (sockets, bulbs, magnets, hardware)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PRODUCTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/products.json'), 'utf8'));
const OUT = path.join(ROOT, 'content', 'descriptions.json');
const REF = path.join(ROOT, 'content', 'descriptions.reference.md');

let cults = new Map();
try {
  const exp = JSON.parse(fs.readFileSync(path.join(ROOT, 'raw-assets/cults_export.json'), 'utf8'));
  cults = new Map(exp.creations.map((c) => [c.slug, c]));
} catch { /* optional */ }

const cultsSlug = (url) => (url || '').match(/3d-model\/[^/]+\/([^/?#]+)/)?.[1] || null;
const cleanDesc = (t) => (t || '')
  .replace(/All JerH STLs[\s\S]*?thangs\.com\/designer\/Jer_Ho\s*/i, '')
  .replace(/[\s\S]*?(?=Introducing|Included the following|Inspired by|🌟|This )/i, (m) => (m.length < 400 ? '' : m))
  .replace(/\r/g, '')
  .trim();

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};

let added = 0;
const refLines = ['# Description drafting reference', '',
  '_Cleaned Cults text + real comments. Reference only — never copied verbatim._', ''];

for (const p of PRODUCTS) {
  if (!existing[p.slug]) {
    existing[p.slug] = { description: '', faq: [], source: 'auto' };
    added++;
  }
  const c = cults.get(cultsSlug(p.links.cults));
  refLines.push(`## ${p.id} · ${p.slug}`);
  refLines.push(`category: ${p.categories.join(', ')} | tags: ${p.tags.join(', ') || '—'}`);
  refLines.push('');
  refLines.push('**Cults (reference):**');
  refLines.push('> ' + (cleanDesc(c?.description).replace(/\n+/g, ' ').slice(0, 900) || '—'));
  if (c?.tags?.length) refLines.push(`\n_Cults tags:_ ${c.tags.join(', ')}`);
  if (c?.comments?.length) {
    refLines.push('\n**Comments:**');
    for (const cm of c.comments) refLines.push('- ' + (cm.text || '').replace(/\s+/g, ' ').trim());
  }
  refLines.push('\n---\n');
}

// keep the JSON ordered by product id for easy review
const ordered = {};
for (const p of PRODUCTS) ordered[p.slug] = existing[p.slug];
fs.writeFileSync(OUT, JSON.stringify(ordered, null, 2) + '\n');
fs.writeFileSync(REF, refLines.join('\n'));

const filled = Object.values(ordered).filter((e) => e.description.trim()).length;
console.log(`content/descriptions.json: ${Object.keys(ordered).length} entries, ${filled} written, ${added} new skeletons`);
console.log(`content/descriptions.reference.md written`);
