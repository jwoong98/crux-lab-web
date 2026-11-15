// What each publish action renders and writes to Workers KV (DEC-064 3), pure. The Cloudflare free plan allows 50
// subrequests and 10 ms CPU per request (DEC-018), so an action renders only the files it can change, and REFLECT, which
// rewrites everything, runs in batches with a cursor.
//
// - PUBLISH_GUIDE: the target page, the published pages whose related names the target (their links show its term), the hub
//   and sitemap.xml; the target's STORAGE images (DEC-038 6); then the target's gone marker goes.
// - HIDE_GUIDE: the target's gone marker, then its page key goes; the hub and sitemap.xml.
// - PUBLISH_HUB: every published page (each shows hub texts), the hub and sitemap.xml.
// - REFLECT: one batch of units from the cursor. A unit is a published page (its STORAGE images, its page, its gone marker
//   dropped) or a hidden page (gone marker, page key dropped). The last batch adds the hub, sitemap.xml and robots.txt.

import { pagePath } from '../scripts/climbing-guide/render.mjs';
import { GUIDE_PATH } from '../scripts/climbing-guide/terms.mjs';
import { fileKey, goneKey, imageKey, pageKey } from '../worker/kv-keys.mjs';

/**
 * Term pages one REFLECT batch renders. CPU bound: the whole-site check costs about 6 ms on a cold start and 2 ms warm,
 * rendering six pages about 2.7 ms cold and 0.8 ms warm (Node, DEV-051 report DEC-064 section).
 */
export const REFLECT_BATCH_PAGES = 6;

/**
 * KV writes and Storage reads one REFLECT batch may use for its units. Subrequest bound: 50 per request on the free plan
 * minus the source bundle call, the reflect transaction (first batch), the hub, sitemap.xml and robots.txt puts and the
 * reflect mark (last batch), 6 in all, leaves 44; 40 keeps 4 spare. A STATIC page costs 2, a STORAGE page 16 (7 reads,
 * 7 puts), a hidden page 2.
 */
export const REFLECT_BATCH_SUBREQUESTS = 40;

/** Slugs of the pages whose related names slug, in page order. */
export const relatersOf = (pages, slug) =>
  pages.filter((p) => p.slug !== slug && Array.isArray(p.source?.related) && p.source.related.includes(slug)).map((p) => p.slug);

/**
 * @typedef {{ pageId: string, kind: string, objectName: string, publicPath: string }} StorageImage
 * @typedef {{ slugs: string[], images: StorageImage[], hidden: string[], shown: string[], hub: boolean, sitemap: boolean,
 *   robots: boolean, next: number | null, total: number | null }} Plan
 *   slugs: term pages to render and put, in write order; images: Storage objects to copy; hidden: slugs whose gone marker
 *   goes in and page key goes; shown: slugs whose gone marker goes; next: the cursor of the next REFLECT batch, null when
 *   this is the last request; total: REFLECT units in all
 */

/**
 * @param {string} action @param {any} bundle the source bundle @param {{ storageImages: StorageImage[] }} site bundleToSite
 * @param {{ targetSlug?: string | null, cursor?: number }} options targetSlug: the HIDE_GUIDE target (the bundle leaves it out)
 * @returns {Plan}
 */
export function actionPlan(action, bundle, site, { targetSlug = null, cursor = 0 } = {}) {
  const none = { slugs: [], images: [], hidden: [], shown: [], hub: true, sitemap: true, robots: false, next: null, total: null };
  if (action === 'PUBLISH_GUIDE') {
    const target = bundle.pages.find((p) => p.id === bundle.target_id);
    if (!target) throw new Error('the bundle has no PUBLISH_GUIDE target');
    return {
      ...none,
      slugs: [target.slug, ...relatersOf(bundle.pages, target.slug)],
      images: site.storageImages.filter((i) => i.pageId === target.id),
      shown: [target.slug],
    };
  }
  if (action === 'HIDE_GUIDE') return { ...none, hidden: [targetSlug] };
  if (action === 'PUBLISH_HUB') return { ...none, slugs: bundle.pages.map((p) => p.slug) };

  const units = [
    ...bundle.pages.map((p) => {
      const images = site.storageImages.filter((i) => i.pageId === p.id);
      return { slug: p.slug, page: true, images, cost: 2 + 2 * images.length };
    }),
    ...bundle.hidden_slugs.map((slug) => ({ slug, page: false, images: [], cost: 2 })),
  ];
  const start = Math.min(cursor, units.length);
  let end = start;
  let pages = 0;
  let subrequests = 0;
  while (end < units.length) {
    const u = units[end];
    const page = u.page ? 1 : 0;
    if (end > start && (pages + page > REFLECT_BATCH_PAGES || subrequests + u.cost > REFLECT_BATCH_SUBREQUESTS)) break;
    pages += page;
    subrequests += u.cost;
    end += 1;
  }
  const batch = units.slice(start, end);
  const last = end === units.length;
  return {
    slugs: batch.filter((u) => u.page).map((u) => u.slug),
    images: batch.flatMap((u) => u.images),
    hidden: batch.filter((u) => !u.page).map((u) => u.slug),
    shown: batch.filter((u) => u.page).map((u) => u.slug),
    hub: last,
    sitemap: last,
    robots: last,
    next: last ? null : end,
    total: units.length,
  };
}

/** Published path (no leading slash) of a rendered page: /climbing/slab/ to climbing/slab/index.html. */
const pageFile = (pathname) => `${pathname.slice(1)}index.html`;

/**
 * The KV writes of a plan, in order: images (before the pages that show them), gone markers of hidden pages before their
 * page keys go (DEC-020), term pages, the hub, sitemap.xml, robots.txt, and last the gone markers of pages shown again.
 * @param {Plan} plan @param {Map<string, string>} outputs renderParts outputs for the plan
 * @returns {Array<{ verb: 'put' | 'delete', key: string, value?: string, objectName?: string }>}
 */
export function kvWrites(plan, outputs) {
  const body = (rel) => {
    const text = outputs.get(rel);
    if (typeof text !== 'string') throw new Error(`no render for ${rel}`);
    return text;
  };
  /** @type {Array<{ verb: 'put' | 'delete', key: string, value?: string, objectName?: string }>} */
  const writes = plan.images.map((i) => ({ verb: 'put', key: imageKey(i.publicPath), objectName: i.objectName }));
  for (const slug of plan.hidden) {
    writes.push({ verb: 'put', key: goneKey(pagePath(slug)), value: '1' }, { verb: 'delete', key: pageKey(pagePath(slug)) });
  }
  for (const slug of plan.slugs) writes.push({ verb: 'put', key: pageKey(pagePath(slug)), value: body(pageFile(pagePath(slug))) });
  if (plan.hub) writes.push({ verb: 'put', key: pageKey(GUIDE_PATH), value: body(pageFile(GUIDE_PATH)) });
  if (plan.sitemap) writes.push({ verb: 'put', key: fileKey('/sitemap.xml'), value: body('sitemap.xml') });
  if (plan.robots) writes.push({ verb: 'put', key: fileKey('/robots.txt'), value: body('robots.txt') });
  for (const slug of plan.shown) writes.push({ verb: 'delete', key: goneKey(pagePath(slug)) });
  return writes;
}
