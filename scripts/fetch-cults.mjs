/**
 * Pull the owner's own Cults3D listings (descriptions, tags, license, dates)
 * into raw-assets/cults_export.json — RAW REFERENCE MATERIAL, never shipped
 * verbatim (see CLAUDE.md content rule #2: site descriptions must be original
 * and more useful than the store's).
 *
 * You run this, not Claude — the API key never enters the assistant session.
 *
 *   1. Generate a key at  https://cults3d.com/en/api/keys
 *   2. Create a file called  .env  in the project root with two lines:
 *          CULTS_USER=YourCultsUsername
 *          CULTS_KEY=the-key-you-just-generated
 *   3. Run:  node scripts/fetch-cults.mjs
 *
 * Output: raw-assets/cults_export.json  (gitignored)
 * Rate limits: ~60 req / 30 s, 500 / day — one run is well within that.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT_ = path.resolve(import.meta.dirname, '..');
// minimal .env loader (no dependency)
try {
  for (const line of fs.readFileSync(path.join(ROOT_, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env — fall back to real env vars */ }

const ENDPOINT = 'https://cults3d.com/graphql';
const USER = process.env.CULTS_USER;
const KEY = process.env.CULTS_KEY;

if (!USER || !KEY) {
  console.error('Set CULTS_USER and CULTS_KEY environment variables. See the header of this file.');
  process.exit(2);
}

const auth = 'Basic ' + Buffer.from(`${USER}:${KEY}`).toString('base64');
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'raw-assets', 'cults_export.json');

async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

// paginate myself.creations; `offset`/`limit` are the documented list args
const PAGE = 30;
const CREATION_FIELDS = `
  id
  name
  slug
  url
  shortUrl
  description
  tagNames
  publishedAt
  updatedAt
  license { name }
  category { name }
`;

async function fetchAll() {
  const all = [];
  for (let offset = 0; ; offset += PAGE) {
    const data = await gql(
      `query($limit:Int!,$offset:Int!){
         myself { creations(limit:$limit, offset:$offset){ ${CREATION_FIELDS} } }
       }`,
      { limit: PAGE, offset },
    );
    const batch = data?.myself?.creations ?? [];
    all.push(...batch);
    console.log(`  fetched ${all.length}…`);
    if (batch.length < PAGE) break;
    await new Promise((r) => setTimeout(r, 1200)); // be gentle
  }
  return all;
}

const creations = await fetchAll();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), creations }, null, 2));
console.log(`\nwrote ${creations.length} creations -> raw-assets/cults_export.json`);

// quick coverage check against products.json
try {
  const products = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/products.json'), 'utf8'));
  const cultsSlugs = new Set(creations.map((c) => c.slug));
  const missing = products.filter((p) => {
    const s = (p.links.cults || '').match(/3d-model\/[^/]+\/([^/?#]+)/)?.[1];
    return s && !cultsSlugs.has(s);
  });
  if (missing.length) {
    console.log(`\n${missing.length} products have no matching Cults creation by slug:`);
    missing.forEach((p) => console.log(`  #${p.id} ${p.slug}`));
  } else {
    console.log('all product Cults slugs matched.');
  }
} catch { /* products.json optional here */ }
