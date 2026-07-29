// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Canonical origin. Everything SEO-related derives from this: <link rel="canonical">,
  // Open Graph URLs, robots.txt and sitemap.xml. Change it here and the whole site follows.
  site: 'https://fibu.dev',
  vite: {
    plugins: [tailwindcss()]
  }
});