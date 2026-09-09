/**
 * Generate responsive WebP derivatives for every catalogue image referenced by
 * products.json, plus a compressed OG image.
 *
 * Source:  raw-assets/catalog/<stem>.{jpg,jpeg}   (untracked originals)
 * Output:  public/img/<stem>-{400,600,900}.webp    (gitignored, rebuilt)
 *          public/img/og.jpg                        (1200x630, < 150 KB)
 *
 * Usage: node scripts/build-images.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'raw-assets', 'catalog');
const OUT = path.join(ROOT, 'public', 'img');
const products = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'products.json'), 'utf8'));

// Originals are ~500–650 px wide for 200 of 206 files, so 900w would just be an
// upscale of 600w. 400/600 is the useful range; the 6 hi-res originals still get
// a real 600w. (BUILD-BRIEF asked for 400/600/900 before this was known.)
export const WIDTHS = [400, 600];

const findSrc = (stem) => {
  for (const ext of ['jpg', 'jpeg', 'png', 'JPG', 'JPEG']) {
    const p = path.join(SRC, `${stem}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
};

fs.mkdirSync(OUT, { recursive: true });

const stems = new Set();
for (const p of products) {
  for (const key of ['plain', 'colour']) {
    const f = p.images[key];
    if (f) stems.add(f.replace(/\.[^.]+$/, ''));
  }
}

let srcBytes = 0;
let outBytes = 0;
let made = 0;
const missing = [];

for (const stem of stems) {
  const src = findSrc(stem);
  if (!src) { missing.push(stem); continue; }
  const srcStat = fs.statSync(src);
  srcBytes += srcStat.size;
  let meta = null;
  for (const w of WIDTHS) {
    const dst = path.join(OUT, `${stem}-${w}.webp`);
    const fresh = fs.existsSync(dst) && fs.statSync(dst).mtimeMs >= srcStat.mtimeMs;
    if (!fresh) {
      meta ??= await sharp(src).metadata();
      await sharp(src)
        .resize({ width: Math.min(w, meta.width || w), withoutEnlargement: true })
        .webp({ quality: 72, effort: 5 })
        .toFile(dst);
      made++;
    }
    outBytes += fs.statSync(dst).size;
  }
}

// Site imagery (banners, about-page photo, …): raw-assets/site/<name>.* ->
// public/img/<name>-{width}.webp. Widths from the file's own list or a default.
const SITE_DIR = path.join(ROOT, 'raw-assets', 'site');
const SITE_WIDTHS = {
  'banner-skadis': [900, 1600],
  'about-portrait': [440, 700, 1000],
  'about-mac': [300, 560],
  'about-printer': [340, 620],
  'about-grid': [900, 1600],
};
if (fs.existsSync(SITE_DIR)) {
  for (const f of fs.readdirSync(SITE_DIR)) {
    const name = f.replace(/\.[^.]+$/, '');
    const src = path.join(SITE_DIR, f);
    const widths = SITE_WIDTHS[name] || [800, 1600];
    const meta = await sharp(src).metadata();
    for (const w of widths) {
      const dst = path.join(OUT, `${name}-${w}.webp`);
      await sharp(src)
        .resize({ width: Math.min(w, meta.width || w), withoutEnlargement: true })
        .webp({ quality: 74, effort: 5 })
        .toFile(dst);
      console.log(`site: ${name}-${w}.webp (${(fs.statSync(dst).size / 1024).toFixed(0)} KB)`);
    }
  }
}

// OG image — keep as JPEG for scraper compatibility
const ogSrc = findSrc('thumbnail');
if (ogSrc) {
  const ogDst = path.join(OUT, 'og.jpg');
  // step quality down until under 150 KB
  let q = 78;
  let ogBytes = Infinity;
  do {
    await sharp(ogSrc)
      .resize({ width: 1200, height: 630, fit: 'cover' })
      .jpeg({ quality: q, mozjpeg: true })
      .toFile(ogDst);
    ogBytes = fs.statSync(ogDst).size;
    q -= 6;
  } while (ogBytes > 150 * 1024 && q >= 40);
  console.log(`og.jpg: ${(fs.statSync(ogSrc).size / 1024).toFixed(0)} KB -> ${(ogBytes / 1024).toFixed(0)} KB`);
}

let w600 = 0;
for (const stem of stems) {
  const f = path.join(OUT, `${stem}-600.webp`);
  if (fs.existsSync(f)) w600 += fs.statSync(f).size;
}
const mb = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';
console.log(`\nsource images:   ${stems.size} originals, ${mb(srcBytes)}`);
console.log(`generated:       ${made} rebuilt this run; ${WIDTHS.join('/')}w webp set totals ${mb(outBytes)}`);
console.log(`catalogue @600w: ${mb(w600)} (one 600w per product, the common case)`);
if (missing.length) {
  console.log(`\nMISSING originals (${missing.length}): ${missing.join(', ')}`);
  process.exitCode = 1;
}
