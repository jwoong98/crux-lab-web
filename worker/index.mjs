// Public Worker crux-lab-web (PLAN DEV-050, DEC-008, DEC-018, DEC-020, DEC-028, DEC-038 4 and 5). wrangler.jsonc runs it
// first for /climbing, /climbing/*, /sitemap.xml and /robots.txt; everything else is the static assets with the SPA fallback.
//
// - GET and HEAD only; any other method goes to the static assets.
// - GUIDE_FROM_KV is not "true" and no X-Guide-Source: kv header: the static assets, as before this Worker (rollback switch).
// - X-Guide-Source: kv reads KV whatever the switch says and never reads or writes the cache (O-21 byte comparison).
//   It never falls back to the static assets (DEC-061 1): a missing key answers 404 with X-Guide-Source: kv-miss and a KV
//   error answers 503, so an empty or partial KV cannot look like the static site.
// - /climbing and /climbing/{slug} without the slash: 308 to the slash form, query kept.
// - /climbing/images/*: static assets first (DEC-028). A 404 or an HTML answer (the SPA index.html) for an image path is a
//   static miss (DEC-061 3), and only then KV img:.
// - Pages: gone: answers 404, else page:, else the static assets (GUIDE_STATIC_FALLBACK "true") or 404. Images the same,
//   the static answer being the one the assets already gave. sitemap.xml and robots.txt: file:, else the static assets.
// - KV throws: the static assets (GUIDE_STATIC_FALLBACK "true") or 503 with Retry-After: 60.
// - KV answers are kept in caches.default for 60 s under the address without the query. HEAD gets the headers only.
// The Worker only reads KV; the CMS Worker writes it. No Supabase on the request path, no secret.

import { fileKey, goneKey, imageKey, pageKey } from './kv-keys.mjs';

const CACHE_CONTROL = 'public, max-age=60';
const HTML = 'text/html; charset=utf-8';
const IMAGE_PREFIX = '/climbing/images/';
const FILE_TYPES = { '/sitemap.xml': 'application/xml; charset=utf-8', '/robots.txt': 'text/plain; charset=utf-8' };
/** The hub or a term page without the trailing slash: /climbing, /climbing/slab (no dot, so not a file). */
const SLASHLESS_PAGE = /^\/climbing(\/[^/.]+)?$/;
/** The hub or a term page: /climbing/, /climbing/slab/. */
const PAGE = /^\/climbing\/([^/.]+\/)?$/;

const NOT_FOUND_HTML = [
  '<!doctype html>',
  '<html lang="ko">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>카드뉴스를 찾을 수 없어요 | 크럭스랩</title>',
  '</head>',
  '<body>',
  '<p>이 주소에는 카드뉴스가 없어요.</p>',
  '<p><a href="/climbing/">클라이밍 용어 모음 전체 보기</a></p>',
  '</body>',
  '</html>',
  '',
].join('\n');

/** Hidden, unpublished or missing page (DEC-020): never the SPA 200. Cached 60 s like any KV answer. */
const notFound = () =>
  new Response(NOT_FOUND_HTML, { status: 404, headers: { 'content-type': HTML, 'cache-control': CACHE_CONTROL } });

const unavailable = () =>
  new Response('카드뉴스를 잠시 불러올 수 없어요. 1분 뒤에 다시 열어 주세요.\n', {
    status: 503,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'retry-after': '60' },
  });

/** X-Guide-Source: kv request whose key KV does not have (DEC-061 1). Never cached. */
const kvMiss = () =>
  new Response('KV에 이 주소의 값이 없어요.\n', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-guide-source': 'kv-miss' },
  });

const ok = (body, type) => new Response(body, { headers: { 'content-type': type, 'cache-control': CACHE_CONTROL } });

/** The assets do not have this image: a 404, or the SPA index.html they answer for any unknown path (DEC-061 3). */
const isStaticMiss = (asset) => asset.status === 404 || (asset.headers.get('content-type') ?? '').startsWith('text/html');

/** HEAD gets the same status and headers without the body. */
const forMethod = (request, response) =>
  request.method === 'HEAD' ? new Response(null, { status: response.status, headers: response.headers }) : response;

/**
 * The KV answer for path (a body, or the 404 of a gone marker), or null when KV has no value for it.
 * @returns {Promise<Response | null>}
 */
async function fromKv(env, path, kind) {
  const kv = env.GUIDE_KV;
  if (kind === 'image') {
    const { value, metadata } = await kv.getWithMetadata(imageKey(path), 'arrayBuffer');
    return value === null ? null : ok(value, metadata?.contentType ?? 'application/octet-stream');
  }
  if (kind === 'file') {
    const value = await kv.get(fileKey(path), 'arrayBuffer');
    return value === null ? null : ok(value, FILE_TYPES[path]);
  }
  if ((await kv.get(goneKey(path))) !== null) return notFound();
  const page = await kv.get(pageKey(path), 'arrayBuffer');
  return page === null ? null : ok(page, HTML);
}

export default {
  /**
   * @param {Request} request
   * @param {{ ASSETS: { fetch(r: Request): Promise<Response> }, GUIDE_KV: any,
   *   GUIDE_FROM_KV?: string, GUIDE_STATIC_FALLBACK?: string }} env
   * @param {{ waitUntil(p: Promise<unknown>): void }} ctx
   */
  async fetch(request, env, ctx) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return env.ASSETS.fetch(request);
    const probe = request.headers.get('X-Guide-Source') === 'kv';
    if (env.GUIDE_FROM_KV !== 'true' && !probe) return env.ASSETS.fetch(request);

    const url = new URL(request.url);
    const path = url.pathname;
    if (SLASHLESS_PAGE.test(path)) {
      url.pathname = `${path}/`;
      return Response.redirect(url.toString(), 308);
    }
    const kind = path.startsWith(IMAGE_PREFIX) ? 'image' : PAGE.test(path) ? 'page' : path in FILE_TYPES ? 'file' : null;
    if (kind === null) return env.ASSETS.fetch(request);

    /** For an image, the static answer when it is a static miss (DEC-028: static images first). */
    let assetMiss;
    if (kind === 'image') {
      const asset = await env.ASSETS.fetch(request);
      if (!isStaticMiss(asset)) return asset;
      assetMiss = asset;
    }
    const fallback = !probe && env.GUIDE_STATIC_FALLBACK === 'true';
    const staticAnswer = () => assetMiss ?? env.ASSETS.fetch(request);

    const cacheKey = new Request(`${url.origin}${path}`);
    if (!probe) {
      const hit = await caches.default.match(cacheKey);
      if (hit) return forMethod(request, hit);
    }
    let response;
    try {
      response = await fromKv(env, path, kind);
    } catch {
      return fallback ? staticAnswer() : forMethod(request, unavailable());
    }
    if (response === null) {
      if (probe) return forMethod(request, kvMiss());
      if (fallback || kind === 'file') return staticAnswer();
      response = notFound();
    }
    if (!probe) ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
    return forMethod(request, response);
  },
};
