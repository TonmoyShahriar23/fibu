import type { APIRoute } from 'astro';
import { getAllPublishedBlogs, POSTS_PER_PAGE } from '../lib/blog';

// Every indexable route on the site. The 404 page is deliberately absent — it is
// marked noindex. The post URLs are derived from the same API call that generates
// them, so the sitemap cannot drift from what was actually built; if that call
// fails the sitemap degrades to the static routes rather than breaking the build.
export const GET: APIRoute = async ({ site }) => {
  const origin = site?.origin ?? '';

  const posts = await getAllPublishedBlogs();

  // Listing pages 2..N, matching the routes /blog/page/[page] emits.
  const listingPages = Array.from(
    { length: Math.max(0, Math.ceil(posts.length / POSTS_PER_PAGE) - 1) },
    (_, i) => `/blog/page/${i + 2}`,
  );

  const routes = ['/', '/blog', ...listingPages, ...posts.map((post) => `/blog/${post.slug}`)];

  const lastmod = new Map(
    posts.map((post) => [`/blog/${post.slug}`, post.updatedAt ?? post.publishedAt ?? null]),
  );

  const urls = routes
    .map((route) => {
      const updated = lastmod.get(route);
      const stamp = updated ? `\n    <lastmod>${new Date(updated).toISOString()}</lastmod>` : '';
      return `  <url>\n    <loc>${origin}${route}</loc>${stamp}\n  </url>`;
    })
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
