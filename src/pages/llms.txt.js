import { products, isIndexable, sortedByDate } from '../lib/products.js';
import { SITE } from '../lib/site.js';

// /llms.txt — every page we consider worth citing. Product pages appear here
// only once their specs are filled (isIndexable), same gate as the sitemap.
export function GET() {
  const indexable = sortedByDate(products.filter(isIndexable));

  const lines = [
    '# Jer{folio}',
    '',
    '> 3D-printable lamps, IKEA SKÅDIS pegboard accessories, Apple charging stands and',
    '> desk organisers by Jerry Ho (Hong Kong). Files are hosted on external stores;',
    '> this site is the catalogue and reference.',
    '',
    '## Core pages',
    `- [Catalogue](${SITE}/): all ${products.length} designs, filterable and searchable`,
    `- [IKEA SKÅDIS guide](${SITE}/guides/ikea-skadis): the ${products.filter((p) => p.categories.includes('skadis')).length} pegboard accessories`,
    '',
    '## Product pages',
    indexable.length
      ? indexable.map((p) => `- [${p.name}](${SITE}/product/${p.slug})`).join('\n')
      : '_None published yet — product pages are added here as their print specs are filled in._',
    '',
  ];
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain' } });
}
