// The CMS source bundle (supabase crux_cms_guide_source_bundle, DEV-003) as the inputs of the pure checks and the site render:
// problems(content, { terms, categoryIds, hasImage }) and renderSite(content, { terms, categories, ... }) (DESIGN 3-3).
// The CMS Worker publish, the byte test of the import (supabase/guideImport.test.ts) and the Git build read the same render.
// Pure: no file, no clock, no node: module, so the CMS Worker imports it as is.

import { CARD_KINDS, cardImageSlug } from './content-core.mjs';
import { imagePath } from './render.mjs';
import { HUB_IMAGE_SLUG } from './terms.mjs';

/**
 * @typedef {object} BundlePage one row of bundle.pages
 * @property {string} id tb_guide_page.id
 * @property {string} slug
 * @property {number} sort_order
 * @property {string} term
 * @property {string | null} english
 * @property {string | null} app_tag
 * @property {string | null} app_label
 * @property {string} category_code tb_info_category.category_code (ANGLE)
 * @property {'STATIC' | 'STORAGE'} image_source_type
 * @property {string[]} image_kinds tb_guide_image kinds of the page (COVER, MEANING, ...)
 * @property {any} source the source JSON that is to be published
 */

/**
 * @param {{ pages: BundlePage[], hub: { source: any }, categories: { category_code: string, guide_label: string, sort_order: number }[] }} bundle
 * @returns {{ content: { pages: any[], hub: any }, terms: import('./terms.mjs').TermMeta[], categories: { id: string, label: string }[],
 *   hasImage: (fileName: string) => boolean, storageImages: Array<{ pageId: string, kind: string, objectName: string, publicPath: string }> }}
 *   terms: one row per page in bundle order (category = category_code in lower case);
 *   categories: categories that have a page, by the smallest page sort_order (the bundle order breaks a tie), label = guide_label;
 *   hasImage: image names of skill 「이미지」 ("slab.webp", "slab.jpg", "slab-meaning.webp", "climbing.webp"), true for every
 *   image of a STATIC page and the hub cover, and for a STORAGE page only for the kinds it has a tb_guide_image row of;
 *   storageImages: Storage object name ({id}/cover.webp, {id}/cover.jpg, {id}/{kind}.webp) and public path of each image of a
 *   STORAGE page (DEC-030), for the copy to KV at publish time
 */
export function bundleToSite(bundle) {
  const rows = bundle.pages;
  const terms = rows.map((r) => ({
    order: r.sort_order,
    slug: r.slug,
    term: r.term,
    category: r.category_code.toLowerCase(),
    english: r.english,
    appTag: r.app_tag,
    appLabel: r.app_label,
  }));

  const firstOrder = new Map();
  for (const r of rows) firstOrder.set(r.category_code, Math.min(firstOrder.get(r.category_code) ?? Infinity, r.sort_order));
  const categories = bundle.categories
    .filter((c) => firstOrder.has(c.category_code))
    .sort((a, b) => firstOrder.get(a.category_code) - firstOrder.get(b.category_code))
    .map((c) => ({ id: c.category_code.toLowerCase(), label: c.guide_label }));

  const present = new Set([`${HUB_IMAGE_SLUG}.webp`, `${HUB_IMAGE_SLUG}.jpg`]);
  /** @type {Array<{ pageId: string, kind: string, objectName: string, publicPath: string }>} */
  const storageImages = [];
  for (const r of rows) {
    const has = (kind) => r.image_source_type === 'STATIC' || r.image_kinds.includes(kind);
    if (has('COVER')) present.add(`${r.slug}.webp`).add(`${r.slug}.jpg`);
    for (const kind of CARD_KINDS) if (has(kind.toUpperCase())) present.add(`${cardImageSlug(r.slug, kind)}.webp`);
    if (r.image_source_type !== 'STORAGE') continue;
    for (const kind of r.image_kinds) {
      if (kind === 'COVER') {
        for (const ext of ['webp', 'jpg']) storageImages.push({ pageId: r.id, kind, objectName: `${r.id}/cover.${ext}`, publicPath: imagePath(r.slug, ext) });
        continue;
      }
      const card = kind.toLowerCase();
      storageImages.push({ pageId: r.id, kind, objectName: `${r.id}/${card}.webp`, publicPath: imagePath(cardImageSlug(r.slug, card), 'webp') });
    }
  }

  return {
    content: { pages: rows.map((r) => r.source), hub: bundle.hub.source },
    terms,
    categories,
    hasImage: (fileName) => present.has(fileName),
    storageImages,
  };
}
