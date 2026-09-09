/**
 * Copy the small static assets Astro serves from public/.
 * (Catalogue photos are handled separately by build-images.mjs -> public/img/.)
 *
 *   Image/logo.svg          -> public/Image/logo.svg
 *   Image/Catalog/*.png|svg -> public/Image/Catalog/   (store + ui icons, ~120 KB)
 *
 * public/Image/ is gitignored and rebuilt. The legacy Image/Homepage and
 * Image/Contactus folders are not copied — the Astro site does not use them.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DST = path.join(ROOT, 'public', 'Image');

fs.rmSync(DST, { recursive: true, force: true });
fs.mkdirSync(path.join(DST, 'Catalog'), { recursive: true });

fs.copyFileSync(path.join(ROOT, 'Image', 'logo.svg'), path.join(DST, 'logo.svg'));

const catSrc = path.join(ROOT, 'Image', 'Catalog');
let n = 0;
for (const f of fs.readdirSync(catSrc)) {
  if (/\.(png|svg|jpe?g)$/i.test(f)) {
    fs.copyFileSync(path.join(catSrc, f), path.join(DST, 'Catalog', f));
    n++;
  }
}
console.log(`synced logo.svg + ${n} icon file(s) to public/Image/`);
