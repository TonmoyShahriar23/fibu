// Turns a post's stored `content` into HTML that is safe to hand to `set:html`.
//
// The API stores content as a stringified TipTap (ProseMirror) document — a node
// tree, not markup. That is the happy path here, and it is what makes this safe:
// the tree is walked and every tag is emitted by this file, while every piece of
// author-supplied text goes through `escapeHtml`. No untrusted markup is ever
// passed through, so there is no HTML parsing to get wrong.
//
// If the content is not a TipTap document, it is treated as PLAIN TEXT and
// escaped. That deliberately renders raw HTML visibly rather than executing it.
// Should the API ever start serving real HTML, the fix is to add a vetted
// sanitiser (isomorphic-dompurify) here — not to relax this into a regex
// tag-stripper, which is the usual way this kind of code grows an XSS hole.

interface TipTapMark {
  type?: string;
  attrs?: Record<string, unknown> | null;
}

interface TipTapNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown> | null;
  marks?: TipTapMark[] | null;
  content?: TipTapNode[] | null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Allowlist URL schemes. Anything not plainly http(s), mailto, tel, a site-root
 * path or a fragment is dropped — which is what keeps `javascript:`, `data:` and
 * `vbscript:` out of href/src.
 */
function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // Control characters are how scheme filters get smuggled past ("java\tscript:").
  if (/[\u0000-\u001f\u007f-\u009f]/.test(trimmed)) return null;

  return /^(?:https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(trimmed) ? trimmed : null;
}

function attr(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

/** Text plus its inline marks. Text is escaped first, then wrapped. */
function renderText(node: TipTapNode): string {
  let html = escapeHtml(node.text ?? '');
  if (!html) return '';

  for (const mark of node.marks ?? []) {
    switch (mark?.type) {
      case 'bold':
      case 'strong':
        html = `<strong>${html}</strong>`;
        break;
      case 'italic':
      case 'em':
        html = `<em>${html}</em>`;
        break;
      case 'underline':
        html = `<u>${html}</u>`;
        break;
      case 'strike':
      case 's':
        html = `<s>${html}</s>`;
        break;
      case 'code':
        html = `<code>${html}</code>`;
        break;
      case 'subscript':
        html = `<sub>${html}</sub>`;
        break;
      case 'superscript':
        html = `<sup>${html}</sup>`;
        break;
      case 'link': {
        const href = safeUrl(mark.attrs?.href);
        // A link whose target was rejected still shows its text, just unlinked.
        if (!href) break;
        // rel is forced rather than taken from attrs: the stored value is
        // author-controlled and this is a security control, not styling.
        html = `<a${attr('href', href)} target="_blank" rel="noopener noreferrer nofollow">${html}</a>`;
        break;
      }
      default:
        break;
    }
  }

  return html;
}

function renderNodes(nodes: TipTapNode[] | null | undefined): string {
  return (nodes ?? []).map(renderNode).join('');
}

function renderNode(node: TipTapNode): string {
  if (!node || typeof node !== 'object') return '';

  switch (node.type) {
    case 'text':
      return renderText(node);

    case 'paragraph': {
      const inner = renderNodes(node.content);
      // TipTap uses empty paragraphs as spacing; the CSS handles rhythm already.
      return inner ? `<p>${inner}</p>` : '';
    }

    case 'heading': {
      const raw = Number(node.attrs?.level);
      // The post title is the page's h1, so content headings start at h2.
      const level = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 5) + 1 : 2;
      return `<h${level}>${renderNodes(node.content)}</h${level}>`;
    }

    case 'bulletList':
      return `<ul>${renderNodes(node.content)}</ul>`;

    case 'orderedList': {
      const start = Number(node.attrs?.start);
      const startAttr = Number.isFinite(start) && start !== 1 ? attr('start', String(Math.trunc(start))) : '';
      return `<ol${startAttr}>${renderNodes(node.content)}</ol>`;
    }

    case 'listItem':
      return `<li>${renderNodes(node.content)}</li>`;

    case 'blockquote':
      return `<blockquote>${renderNodes(node.content)}</blockquote>`;

    case 'codeBlock': {
      // Language only ever reaches the DOM as a class, and only if it looks like
      // a language name (c++, c#, objective-c all pass).
      const language = node.attrs?.language;
      const safe = typeof language === 'string' && /^[a-z0-9#+._-]{1,32}$/i.test(language) ? language : null;
      const classAttr = safe ? attr('class', `language-${safe}`) : '';
      // Code is raw text: escape it and emit nothing else.
      const code = escapeHtml((node.content ?? []).map((child) => child.text ?? '').join(''));
      return `<pre><code${classAttr}>${code}</code></pre>`;
    }

    case 'image': {
      const src = safeUrl(node.attrs?.src);
      if (!src) return '';
      const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : '';
      const title = typeof node.attrs?.title === 'string' ? node.attrs.title : '';
      return `<img${attr('src', src)}${attr('alt', alt)}${title ? attr('title', title) : ''} loading="lazy" decoding="async" />`;
    }

    case 'hardBreak':
      return '<br />';

    case 'horizontalRule':
      return '<hr />';

    case 'doc':
      return renderNodes(node.content);

    default:
      // Unknown node: keep whatever text it wraps rather than dropping content.
      return renderNodes(node.content);
  }
}

function parseDocument(raw: string): TipTapNode | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray((parsed as TipTapNode).content)) {
      return parsed as TipTapNode;
    }
  } catch {
    // Not JSON — handled by the plain-text path.
  }
  return null;
}

/** Escaped plain text split into paragraphs on blank lines. */
function renderPlainText(raw: string): string {
  return raw
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

/** Safe HTML for a post body. Empty string when there is nothing to render. */
export function renderContent(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return '';

  const doc = parseDocument(raw);
  return doc ? renderNode(doc) : renderPlainText(raw);
}

/** Flattened text, used for excerpts and meta descriptions. */
export function contentToText(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return '';

  const doc = parseDocument(raw);

  if (!doc) return raw.replace(/\s+/g, ' ').trim();

  const parts: string[] = [];

  const walk = (node: TipTapNode) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'text' && node.text) parts.push(node.text);
    // A block boundary should not glue two sentences together.
    if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'listItem') parts.push(' ');
    for (const child of node.content ?? []) walk(child);
  };

  walk(doc);

  return parts.join('').replace(/\s+/g, ' ').trim();
}

/**
 * A post's summary line: the stored excerpt when there is one, otherwise the
 * opening of the body trimmed at a word boundary.
 */
export function excerptFor(
  post: { excerpt?: string | null; metaDescription?: string | null; content?: string | null },
  limit = 160,
): string {
  const stored = post.excerpt?.trim() || post.metaDescription?.trim();
  const source = stored || contentToText(post.content);

  if (!source) return '';
  if (source.length <= limit) return source;

  const clipped = source.slice(0, limit);
  const lastSpace = clipped.lastIndexOf(' ');

  return `${clipped.slice(0, lastSpace > 40 ? lastSpace : limit).trimEnd()}…`;
}
