import data from '../data/products.json' with { type: 'json' };

export const products = data;

export const bySlug = new Map(data.map((p) => [p.slug, p]));

export const CATEGORY_LABELS = {
  skadis: 'IKEA SKÅDIS',
  lamps: 'Lamps',
  apple: 'Apple',
  organisers: 'Organisers',
  display: 'Display',
};

export const CATEGORY_ORDER = ['skadis', 'lamps', 'apple', 'organisers', 'display'];

/** Sorted newest-first. */
export function sortedByDate(list = data) {
  return [...list].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/** Series label shown above the card title, or null. */
export function seriesLabel(p) {
  return p.series || null;
}

/** Append UTM params to an outbound store URL. `medium` is "card" or "detail". */
export function withUtm(url, medium) {
  if (!url) return null;
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'jerfolio');
    u.searchParams.set('utm_medium', medium);
    u.searchParams.set('utm_campaign', 'catalog');
    return u.toString();
  } catch {
    return url;
  }
}

/** Store links for a product, in display order, with disabled entries kept. */
export function storeLinks(p, medium) {
  return [
    { key: 'cults', label: 'Cults', url: withUtm(p.links.cults, medium), licence: 'Personal-use licence' },
    { key: 'thangs', label: 'Thangs', url: withUtm(p.links.thangs, medium), licence: 'Commercial licence available' },
    { key: 'pixup', label: 'Pixup', url: withUtm(p.links.pixup, medium), licence: 'Commercial licence' },
  ];
}

/** Responsive image attrs for a stored filename ("56b.jpg" -> stem "56b"). */
const IMG_WIDTHS = [400, 600];
export function img(filename) {
  if (!filename) return null;
  const stem = filename.replace(/\.[^.]+$/, '');
  return {
    src: `/img/${stem}-600.webp`,
    srcset: IMG_WIDTHS.map((w) => `/img/${stem}-${w}.webp ${w}w`).join(', '),
  };
}

export function isIndexable(p) {
  return p.indexable === true;
}

export const indexableProducts = data.filter(isIndexable);
