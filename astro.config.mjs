import { defineConfig } from 'astro/config';
import { SITE } from './src/lib/site.js';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  devToolbar: { enabled: false },
  // the catalogue now lives at the site root
  redirects: { '/catalog': '/' },
});
