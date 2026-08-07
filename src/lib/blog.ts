// Blog data access. Every call here runs at build time (the site is `output:
// static`), so the guiding rule is that a flaky or unreachable API must never
// fail the build — each function logs a warning and degrades to empty/null
// instead of throwing. A page that renders an empty state is recoverable; a
// build that dies is not.
import { API_BASE_URL } from '../config/api';

export interface BlogAuthor {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

/** One post as returned by /api/blogs. `content` is a stringified TipTap document. */
export interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  featuredImage: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
  author: BlogAuthor | null;
}

/** Envelope the list endpoint wraps its rows in. */
export interface BlogListResult {
  data: Blog[];
  total: number;
  skip: number;
  take: number;
}

export type BlogOrderBy = 'publishedAt' | 'createdAt' | 'updatedAt' | 'title';
export type OrderDirection = 'asc' | 'desc';

export interface GetBlogsOptions {
  skip?: number;
  take?: number;
  isPublished?: boolean;
  orderBy?: BlogOrderBy;
  orderDirection?: OrderDirection;
}

/** Cards per listing page — 12 is the 3x4 grid the Figma listing frame shows. */
export const POSTS_PER_PAGE = 12;

/** A hung API should stall one request, not the whole build. */
const REQUEST_TIMEOUT_MS = 15_000;

// A static build asks for the same data repeatedly: the listing, the sitemap and
// the landing-page preview all want the published list, and getStaticPaths fetches
// every post that [slug].astro then renders. Memoising on the resolved URL keeps
// that to one request each. Promises are cached rather than values so concurrent
// callers share a single in-flight request.
const requestCache = new Map<string, Promise<unknown>>();

async function request<T>(path: string): Promise<T | null> {
  const url = new URL(path, API_BASE_URL).href;

  const cached = requestCache.get(url);
  if (cached) return cached as Promise<T | null>;

  const pending = (async (): Promise<T | null> => {
    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      // A missing post is a normal outcome the callers translate into a 404 page,
      // so it is not worth a warning; anything else is a genuine fault.
      if (response.status === 404) return null;

      if (!response.ok) {
        console.warn(`[blog] ${response.status} ${response.statusText} from ${url}`);
        return null;
      }

      return (await response.json()) as T;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`[blog] request to ${url} failed: ${reason}`);
      return null;
    }
  })();

  requestCache.set(url, pending);
  return pending;
}

function buildQuery(options: GetBlogsOptions): string {
  const params = new URLSearchParams();

  // Only send what the caller actually specified — an explicit `skip=0` is
  // harmless but omitting undefined keys keeps cache keys stable across callers
  // that pass the same intent with different shorthand.
  if (options.skip !== undefined) params.set('skip', String(options.skip));
  if (options.take !== undefined) params.set('take', String(options.take));
  if (options.isPublished !== undefined) params.set('isPublished', String(options.isPublished));
  if (options.orderBy !== undefined) params.set('orderBy', options.orderBy);
  if (options.orderDirection !== undefined) params.set('orderDirection', options.orderDirection);

  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * GET /api/blogs — a page of posts plus the total row count.
 *
 * Returns an empty result (not a throw) when the API is unreachable, so callers
 * can render an empty state rather than break the build.
 */
export async function getBlogs(options: GetBlogsOptions = {}): Promise<BlogListResult> {
  const result = await request<BlogListResult>(`/api/blogs${buildQuery(options)}`);

  // Guard the shape as well as the request: a proxy or error page that answers
  // 200 with something unexpected should still land on the empty state.
  if (!result || !Array.isArray(result.data)) {
    return { data: [], total: 0, skip: options.skip ?? 0, take: options.take ?? POSTS_PER_PAGE };
  }

  return {
    data: result.data,
    total: typeof result.total === 'number' ? result.total : result.data.length,
    skip: typeof result.skip === 'number' ? result.skip : (options.skip ?? 0),
    take: typeof result.take === 'number' ? result.take : (options.take ?? POSTS_PER_PAGE),
  };
}

/** GET /api/blogs/slug/:slug — null when the post does not exist or the fetch failed. */
export async function getBlogBySlug(slug: string): Promise<Blog | null> {
  if (!slug) return null;
  const blog = await request<Blog>(`/api/blogs/slug/${encodeURIComponent(slug)}`);
  return blog && typeof blog.slug === 'string' ? blog : null;
}

/** GET /api/blogs/:id — null when the post does not exist or the fetch failed. */
export async function getBlogById(id: string): Promise<Blog | null> {
  if (!id) return null;
  const blog = await request<Blog>(`/api/blogs/${encodeURIComponent(id)}`);
  return blog && typeof blog.id === 'string' ? blog : null;
}

/**
 * Every published post, newest first, across however many pages the API needs.
 *
 * getStaticPaths and the sitemap both need the complete set rather than one
 * page. The loop stops on an empty page or once `total` is reached, and is
 * capped so a misbehaving API cannot spin forever.
 */
export async function getAllPublishedBlogs(): Promise<Blog[]> {
  const PAGE = 100;
  const MAX_PAGES = 50;
  const all: Blog[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, total } = await getBlogs({
      skip: page * PAGE,
      take: PAGE,
      isPublished: true,
      orderBy: 'publishedAt',
      orderDirection: 'desc',
    });

    all.push(...data);

    if (data.length < PAGE || all.length >= total) break;
  }

  return all;
}

/* ---------------------------------------------------------------------------
 * Presentation helpers
 * ------------------------------------------------------------------------- */

/** The listing/detail designs both date a post by `publishedAt`, falling back to creation. */
export function postDate(post: Pick<Blog, 'publishedAt' | 'createdAt'>): string | null {
  return post.publishedAt ?? post.createdAt ?? null;
}

/** "17 June, 2024" — the format the Figma single-post header uses. */
export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  // Fixed locale and UTC so the string does not shift with the build machine.
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(date)
    .replace(/^(\d+) (\w+) (\d+)$/, '$1 $2, $3');
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/**
 * "22 hours ago" — the timestamp style on the Figma blog card.
 *
 * On a static site this is frozen at build time, so BlogCard ships a small script
 * that recomputes it in the browser from the `datetime` attribute. This value is
 * what non-JS visitors and crawlers see.
 */
export function relativeTime(iso: string | null, now: Date = new Date()): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diff = date.getTime() - now.getTime();
  const absolute = Math.abs(diff);

  if (absolute < 60_000) return 'just now';

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (absolute >= ms) return formatter.format(Math.round(diff / ms), unit);
  }

  return 'just now';
}

/** Byline for a card or post header. */
export function authorName(post: Pick<Blog, 'author'>): string {
  return post.author?.fullName?.trim() || 'Fibu Team';
}

// Posts arrive without artwork more often than not, so cards fall back to the
// illustration set already shipped for the blog. Picking by a hash of the id
// keeps a given post on the same image across builds instead of shuffling.
const FALLBACK_IMAGES = Array.from({ length: 12 }, (_, i) => `/images/blog-${i + 1}.png`);

export function postImage(post: Pick<Blog, 'id' | 'featuredImage'>): string {
  const featured = post.featuredImage?.trim();
  if (featured) return featured;

  let hash = 0;
  for (const char of post.id ?? '') hash = (hash * 31 + char.charCodeAt(0)) >>> 0;

  return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
}
