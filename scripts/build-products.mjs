/**
 * Build src/data/products.json from the master CSV.
 *
 * The CSV ("Product list - master.csv", gitignored) is the source of truth for
 * product identity, images, dates and outbound links. Specs / descriptions /
 * FAQ are intentionally left null — never invented here.
 *
 * Usage:  node scripts/build-products.mjs [--write]
 *         without --write it prints the reconciliation report only.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CSV = path.join(ROOT, 'Product list - master.csv');
const IMG_DIR = path.join(ROOT, 'raw-assets', 'catalog'); // untracked originals
const OUT = path.join(ROOT, 'src', 'data', 'products.json');
const CATALOG = path.join(ROOT, 'catalog.html');

// ---------- CSV ----------
function parseCSV(str) {
  str = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (q) {
      if (c === '"') { if (str[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// ---------- helpers ----------
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const cultsSlug = (url) => {
  const m = url.match(/3d-model\/[^/]+\/([^/?#]+)/);
  return m ? m[1] : null;
};

// obvious source typos -> corrected display name (every change is reported)
const NAME_FIXES = [
  [/\bSKAIDS\b/gi, 'SKÅDIS'],
  [/\bSKADIS\b/g, 'SKÅDIS'],
  [/\bSakdis\b/gi, 'Skådis'],
  [/^KEA /i, 'IKEA '],
  [/\borgnaiser\b/gi, 'organiser'],
];

const SERIES_RE = /^\s*ikea\s+sk[aå]dis\s*/i;

// CSV flag -> new taxonomy
const FLAG_TO_CATEGORY = {
  'Lamp': 'lamps',
  'Apple Accessories': 'apple',
  'IKEA SKADIS': 'skadis',
  'Toy Display': 'display',
  'Space Organiser': 'organisers',
};
const FLAG_TO_TAG = {
  'K pop Idol': 'k-pop',
  'Planter': 'planter',
};

// ---------- tags (SEO, additive, cross-category) ----------
// Vocabulary — keep tight; every tag must be a real search phrase and must NOT
// just duplicate one of the 5 categories. See docs/tags.md.
export const TAG_VOCAB = [
  // compatibility
  'magsafe', 'apple-watch', 'headphones', 'bambu-lab-led-kit',
  // print / build
  'no-supports', 'print-in-place', 'multi-color', 'modular',
  // use / theme
  'charging', 'cable-management', 'retro', 'planter', 'k-pop', 'seasonal',
];

// derivable from the product name (conservative — avoid false positives)
const NAME_TAG_RULES = [
  ['magsafe', /mag\s?safe|wireless charg/i],
  ['apple-watch', /apple watch/i],
  ['headphones', /head\s?phone|ear\s?phone|airpods? max/i],
  ['charging', /charg(?:er|ing)|\bdock\b/i],
  ['cable-management', /cable (?:management|storage)/i],
  ['modular', /\bmodular\b|multi[-\s]?layered|multi[-\s]?device|\bstackable\b|3[-\s]?in[-\s]?1/i],
  ['planter', /\bplanter\b|plant pot|terraflora/i],
  ['retro', /\bretro\b|\bvintage\b|\b80s\b|crt monitor|imac g3|music records? lamp|records? player/i],
  ['seasonal', /christmas|halloween|\beaster\b|valentine/i],
  ['multi-color', /colou?r swatch|multi[-\s]?colou?r/i],
  ['bambu-lab-led-kit', /bambu\s?lab.{0,12}led|led kit\s?00\d/i],
];

// Cults tagNames (lower-cased) -> our vocabulary. Applied only when
// raw-assets/cults_export.json is present.
const CULTS_TAG_MAP = {
  'support free': 'no-supports', 'support-free': 'no-supports', 'no support': 'no-supports',
  'no supports': 'no-supports', 'supportless': 'no-supports', 'no-support': 'no-supports',
  'print in place': 'print-in-place', 'print-in-place': 'print-in-place', 'in place': 'print-in-place',
  'magsafe': 'magsafe', 'mag safe': 'magsafe',
  'apple watch': 'apple-watch',
  'headphone': 'headphones', 'headphones': 'headphones', 'earphone': 'headphones', 'headphone stand': 'headphones',
  'modular': 'modular',
  'cable management': 'cable-management', 'cable-management': 'cable-management',
  'planter': 'planter', 'plant pot': 'planter', 'plant': 'planter',
  'multicolor': 'multi-color', 'multi color': 'multi-color', 'multi-color': 'multi-color',
  'multicolour': 'multi-color', 'ams': 'multi-color',
  'retro': 'retro', 'vintage': 'retro',
  'christmas': 'seasonal', 'xmas': 'seasonal', 'holiday': 'seasonal',
  'kpop': 'k-pop', 'k-pop': 'k-pop', 'k pop': 'k-pop',
  'wireless charger': 'charging', 'wireless charging': 'charging', 'charging dock': 'charging',
  'bambu lab led': 'bambu-lab-led-kit', 'led kit': 'bambu-lab-led-kit',
};

// optional Cults export (owner runs scripts/fetch-cults.mjs)
let cultsBySlug = new Map();
try {
  const exp = JSON.parse(fs.readFileSync(path.join(ROOT, 'raw-assets', 'cults_export.json'), 'utf8'));
  cultsBySlug = new Map((exp.creations || []).map((c) => [c.slug, c]));
} catch { /* not fetched yet */ }

function deriveTags(name, slug, csvTags) {
  const set = new Set(csvTags);
  const hay = name.toLowerCase();
  for (const [tag, re] of NAME_TAG_RULES) if (re.test(hay)) set.add(tag);
  const cults = cultsBySlug.get(slug);
  if (cults?.tagNames) {
    for (const t of cults.tagNames) {
      const mapped = CULTS_TAG_MAP[String(t).toLowerCase().trim()];
      if (mapped) set.add(mapped);
    }
  }
  return [...set].filter((t) => TAG_VOCAB.includes(t)).sort();
}

// Products with no CSV category flag. PROVISIONAL best-guess categories so the
// build stays valid — every one is listed in docs/uncategorised-review.md for
// the owner to confirm or override.
const PROVISIONAL_CATEGORY = {
  '3': ['organisers'],   // Flowing Heart Incense Dish — desk tray/dish
  '15': ['organisers'],  // Minimal Tray Set
  '17': ['organisers'],  // Bambu Lab Colour Swatches — filament reference tool (weak fit)
  '20': ['organisers'],  // "Not Cigarette" Cigarette Box — small storage box
  '23': ['lamps'],       // Minimal Lantern Bubble Tea — it is a lantern
  '32': ['display'],     // Minimal Mesh Gaming Console Stand
  '41': ['display'],     // Egg Capsule for Tiny Toys
  '52': ['display'],     // Gacha / box toys modular display shelf
  '84': ['organisers'],  // Christmas Accessories Vol.1 — seasonal (weak fit)
  '85': ['organisers'],  // Ninja Memo Board Pin Set
  '97': ['organisers'],  // Aura Architectural Ribbed Square Planter (also tag: planter)
};

// ---------- images ----------
const imgFiles = fs.readdirSync(IMG_DIR);
const findImage = (stem) => {
  // stem like "56" or "56b"; tolerate .jpg/.jpeg/.png and case
  const re = new RegExp(`^${stem}\\.(jpe?g|png)$`, 'i');
  return imgFiles.find((f) => re.test(f)) || null;
};

// ---------- catalog.html (for reconciliation only) ----------
const catalogHtml = fs.readFileSync(CATALOG, 'utf8');
const catalogCards = {};
{
  const cardRe = /<div class="product-card"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let m;
  while ((m = cardRe.exec(catalogHtml))) {
    const block = m[0];
    const img = (block.match(/Image\/Catalog\/(\d+)b?\.(?:jpe?g|png)/i) || [])[1];
    if (!img) continue;
    const title = (block.match(/class="product-title">([^<]*)</) || [])[1]?.trim();
    const cults = (block.match(/href="(https:\/\/cults3d\.com[^"]+)"/) || [])[1];
    catalogCards[img] = { title, cults };
  }
}

// ---------- build ----------
const raw = parseCSV(fs.readFileSync(CSV, 'utf8'));
const header = raw[0].map((s) => s.trim());
const flagCols = header.slice(5);

const report = { nameFixes: [], missingImages: [], linkConflicts: [], uncategorised: [], slugCollisions: [], categoryCounts: {}, tagCounts: {} };
const seenSlugs = new Map();
const products = [];

for (const r of raw.slice(1)) {
  const rawName = (r[0] || '').trim();
  if (!rawName) continue; // blank spacer row

  let date = (r[1] || '').trim();
  const dm = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dm) date = `${dm[1]}-${dm[2].padStart(2, '0')}-${dm[3].padStart(2, '0')}`;
  const cults = (r[2] || '').trim();
  let thangs = (r[3] || '').trim();
  if (/^no$/i.test(thangs) || thangs === '') thangs = null;
  const imgCell = (r[4] || '').trim();
  const imgNum = (imgCell.match(/(\d+)/) || [])[1];
  const flags = flagCols.map((c, j) => (/yes/i.test(r[5 + j] || '') ? c : null)).filter(Boolean);

  // name
  let name = rawName;
  for (const [re, to] of NAME_FIXES) name = name.replace(re, to);
  name = name.replace(/\s+/g, ' ').trim();
  if (name !== rawName) report.nameFixes.push({ img: imgNum, from: rawName, to: name });

  // images
  const id = Number(imgNum);
  const colour = findImage(imgNum);
  const plain = findImage(`${imgNum}b`);
  if (!colour) report.missingImages.push({ img: imgNum, name, kind: 'colour' });
  if (!plain) report.missingImages.push({ img: imgNum, name, kind: 'plain' });

  // slug
  let slug = cultsSlug(cults) || slugify(name);
  if (seenSlugs.has(slug)) {
    report.slugCollisions.push({ slug, a: seenSlugs.get(slug), b: imgNum });
    slug = `${slug}-${imgNum}`;
  }
  seenSlugs.set(slug, imgNum);

  // series + shortName
  const series = SERIES_RE.test(name) ? 'IKEA SKÅDIS' : null;
  let shortName = name.replace(SERIES_RE, '').trim();
  shortName = shortName.split('|')[0].trim();               // drop secondary SEO title
  shortName = shortName.replace(/[　-鿿＀-￯]+$/g, '').trim(); // drop trailing CJK
  if (!shortName) shortName = name;

  // taxonomy
  let categories = [...new Set(flags.map((f) => FLAG_TO_CATEGORY[f]).filter(Boolean))];
  // "Space Organiser" (53/101) is not a useful filter on its own. Keep `organisers`
  // only when nothing more specific applies; otherwise the specific category wins.
  if (categories.length > 1 && categories.includes('organisers')) {
    categories = categories.filter((c) => c !== 'organisers');
  }
  const csvTags = flags.map((f) => FLAG_TO_TAG[f]).filter(Boolean);
  const tags = deriveTags(name, slug, csvTags);
  let provisional = false;
  if (categories.length === 0 && PROVISIONAL_CATEGORY[imgNum]) {
    categories = [...PROVISIONAL_CATEGORY[imgNum]];
    provisional = true;
    report.uncategorised.push({ img: imgNum, name, flags, guess: categories.join(',') });
  } else if (categories.length === 0) {
    report.uncategorised.push({ img: imgNum, name, flags, guess: '(none)' });
  }
  for (const c of categories) report.categoryCounts[c] = (report.categoryCounts[c] || 0) + 1;
  for (const t of tags) report.tagCounts[t] = (report.tagCounts[t] || 0) + 1;

  // reconcile vs catalog.html
  const card = catalogCards[imgNum];
  if (card) {
    if (card.cults && cults && card.cults.replace(/\/$/, '') !== cults.replace(/\/$/, '')) {
      report.linkConflicts.push({ img: imgNum, name, catalogHtml: card.cults, csv: cults });
    }
  }

  products.push({
    id,
    slug,
    name,
    shortName,
    series,
    date: date || null,
    categories,
    ...(provisional ? { provisionalCategory: true } : {}),
    tags,
    images: {
      plain: plain || null,
      colour: colour || null,
    },
    links: {
      cults: cults || null,
      thangs: thangs || null,
      pixup: null,
    },
    specs: {
      layerHeight: null, infill: null, supports: null, printTime: null,
      filament: null, dimensions: null, hardware: null, formats: null,
    },
    description: null,
    seoTitle: null,
    metaDescription: null,
    faq: [],
    indexable: false,
  });
}

// ---------- output ----------
console.log(`\nproducts: ${products.length}`);
console.log('category counts:', report.categoryCounts);
console.log('tag counts:', report.tagCounts);
console.log(`\nname fixes (${report.nameFixes.length}):`);
report.nameFixes.forEach((f) => console.log(`  [${f.img}] ${f.from}  ->  ${f.to}`));
console.log(`\nlink conflicts catalog.html vs CSV (${report.linkConflicts.length}):`);
report.linkConflicts.forEach((c) => console.log(`  [${c.img}] ${c.name}\n      html: ${c.catalogHtml}\n      csv : ${c.csv}`));
console.log(`\nmissing images (${report.missingImages.length}):`);
report.missingImages.forEach((m) => console.log(`  [${m.img}] ${m.name} — no ${m.kind}`));
console.log(`\nslug collisions (${report.slugCollisions.length}):`);
report.slugCollisions.forEach((c) => console.log(`  ${c.slug}  (imgs ${c.a} & ${c.b})`));
console.log(`\nUNCATEGORISED (${report.uncategorised.length}) — need your call:`);
report.uncategorised.forEach((u) => console.log(`  [${u.img}] ${u.name}`));

if (process.argv.includes('--write')) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(products, null, 2) + '\n');
  console.log(`\nwrote ${OUT}`);

  const doc = [
    '# Uncategorised products — needs owner confirmation',
    '',
    'The master CSV has no category flag for these 11. `build-products.mjs` assigned a',
    'PROVISIONAL category (marked `provisionalCategory: true` in products.json) so the',
    'build stays valid. Confirm or override each, then update `PROVISIONAL_CATEGORY` in',
    'the build script.',
    '',
    '| img | product | provisional category | note |',
    '|----:|---------|----------------------|------|',
    ...report.uncategorised.map((u) => `| ${u.img} | ${u.name.replace(/\|/g, '\\|')} | \`${u.guess}\` | |`),
    '',
    '## Also confirm',
    '',
    `- \`organisers\` category is now ${report.categoryCounts.organisers} items (was 53). Rule: a product keeps`,
    '  `organisers` only when no more specific category (skadis/lamps/apple/display) applies.',
    '- `planter` is a **tag** (3 items), not a category. Aura (97) is planter-only so it',
    '  currently has a provisional `organisers` category.',
    '- `k-pop` demoted from category to tag (1 item).',
    '',
  ].join('\n');
  fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'docs', 'uncategorised-review.md'), doc + '\n');
  console.log(`wrote docs/uncategorised-review.md`);

  const fixDoc = [
    '# Display-name normalisations applied by build-products.mjs',
    '',
    'Source CSV had inconsistent / mistyped names. These were corrected for the',
    '`name` field. `slug` is unaffected (it comes from the Cults URL).',
    '',
    '| img | CSV name | corrected `name` |',
    '|----:|----------|------------------|',
    ...report.nameFixes.map((f) => `| ${f.img} | ${f.from.replace(/\|/g, '\\|')} | ${f.to.replace(/\|/g, '\\|')} |`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'docs', 'name-normalisations.md'), fixDoc + '\n');
  console.log(`wrote docs/name-normalisations.md`);
}
