// Backend origin for the content API. Everything in src/lib/blog.ts resolves its
// paths against this, so pointing the site at a different environment (staging, a
// local server) is a one-line change here.
//
// Read from PUBLIC_API_BASE_URL when it is set so a build can be retargeted
// without editing source; the literal is the production default.
export const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL ?? 'https://api.fibu.dev/';
