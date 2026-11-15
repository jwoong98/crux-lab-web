// Partial site render of the CMS Worker (DEC-064 3): only the files a publish can change, so one request stays inside the
// Cloudflare free plan CPU time. It composes the generator's own functions the way scripts/climbing-guide/render-site.mjs
// does (same options, same output checks, same "{path}: {message}" problems); render-parts.test.mjs holds every file to the
// bytes renderSite gives. guide.css is never rendered: it stays a static asset.

import { keywordsOf } from '../scripts/climbing-guide/content-core.mjs';
import { checkPageOutput } from '../scripts/climbing-guide/output-check.mjs';
import { HOME_URL, HUB_URL, pageUrl, renderHubPage, renderRobots, renderSitemap, renderTermPage, SITEMAP_PATH } from '../scripts/climbing-guide/render.mjs';
import { GUIDE_PATH } from '../scripts/climbing-guide/terms.mjs';

/**
 * @param {{ pages: any[], hub: any }} content checked source (pages in table order and the hub)
 * @param {{ terms: any[], categories: { id: string, label: string }[], measurementId: string, privacyHref: string }} options
 *   the renderSite options
 * @param {{ slugs: string[], hub: boolean, sitemap: boolean, robots: boolean }} parts term pages to render (by slug) and
 *   whether to render the hub page, sitemap.xml and robots.txt
 * @returns {{ outputs: Map<string, string>, problems: string[] }} published path (no leading slash) to content in the
 *   renderSite order (hub, term pages, sitemap.xml, robots.txt), and the output check problems of the rendered pages
 */
export function renderParts(content, { terms, categories, measurementId, privacyHref }, parts) {
  const guideDir = GUIDE_PATH.replace(/^\/|\/$/g, '');
  const hub = content.hub;
  /** @type {Map<string, string>} */
  const outputs = new Map();
  /** @type {string[]} */
  const problems = [];
  const page = (rel, html, expected) => {
    outputs.set(rel, html);
    for (const m of checkPageOutput(html, expected)) problems.push(`${rel}: ${m}`);
  };

  if (parts.hub) {
    page(`${guideDir}/index.html`, renderHubPage(hub, content.pages, { terms, categories, measurementId, privacyHref }), { hub, measurementId, privacyHref });
  }
  const wanted = new Set(parts.slugs);
  for (const p of content.pages) {
    if (!wanted.has(p.slug)) continue;
    page(`${guideDir}/${p.slug}/index.html`, renderTermPage(p, { terms, categories, hub, measurementId, privacyHref }), {
      slug: p.slug,
      keywords: keywordsOf(p),
      hub,
      measurementId,
      tools: p.tools ?? [],
      privacyHref,
    });
  }
  if (parts.sitemap) {
    outputs.set(
      SITEMAP_PATH.slice(1),
      renderSitemap([
        { loc: HOME_URL },
        { loc: HUB_URL, lastmod: hub.dateModified },
        ...content.pages.map((p) => ({ loc: pageUrl(p.slug), lastmod: p.dateModified })),
      ]),
    );
  }
  if (parts.robots) outputs.set('robots.txt', renderRobots());
  return { outputs, problems };
}
