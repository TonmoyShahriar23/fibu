import type { APIRoute } from 'astro';

// Every indexable route on the site. The 404 page is deliberately absent — it is
// marked noindex. Add new pages here as they land.
const routes = ['/'];

export const GET: APIRoute = ({ site }) => {
  const origin = site?.origin ?? '';

  const urls = routes
    .map((route) => `  <url>\n    <loc>${origin}${route}</loc>\n  </url>`)
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
