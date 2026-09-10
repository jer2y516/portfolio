import { products, isIndexable } from '../lib/products.js';
import { SITE } from '../lib/site.js';

// Only pages we actually want indexed. Product pages are gated on content depth
// (specs filled) via isIndexable — thin pages stay out of the sitemap.
export function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${SITE}/guides/ikea-skadis`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${SITE}/about`, priority: '0.5', changefreq: 'monthly' },
    ...products.filter(isIndexable).map((p) => ({
      loc: `${SITE}/product/${p.slug}`,
      priority: '0.6',
      changefreq: 'monthly',
      lastmod: p.date || today,
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
