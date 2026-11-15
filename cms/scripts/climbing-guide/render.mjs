// Pure HTML, XML and text renderers of the climbing guide (skill seo-card-news-page 「카드 구성」, 「SEO 배치」).
// No function here touches files or the clock: every date comes from the source JSON, so two runs give the same bytes.
// Addresses are built in one place (pageUrl, pagePath, imagePath, imageUrl, SITEMAP_PATH) so canonical, og:url and the sitemap always agree.
// Paths inside the HTML are root-relative; term page links end with a slash like the served address.

import { cardImageSlug, ContentError, normalizeHub } from './content-core.mjs';
import { BRAND, CATEGORIES, GUIDE_PATH, HUB_IMAGE_SLUG, HUB_NAME, IMAGE_SIZE, SITE_URL, TERMS } from './terms.mjs';

/** Same Google Fonts address as app/index.html. */
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Noto+Sans+KR:wght@400;500;700&display=swap';
const CARD_TOTAL = 6;

export const HOME_URL = `${SITE_URL}/`;
export const HUB_URL = `${SITE_URL}${GUIDE_PATH}`;
/** @param {string} slug */
export const pagePath = (slug) => `${GUIDE_PATH}${slug}/`;
/** @param {string} slug */
export const pageUrl = (slug) => `${SITE_URL}${pagePath(slug)}`;
/** @param {string} slug @param {'webp' | 'jpg'} ext */
export const imagePath = (slug, ext) => `${GUIDE_PATH}images/${slug}.${ext}`;
/** Absolute jpg address for og:image, twitter:image and JSON-LD image. @param {string} slug */
export const imageUrl = (slug) => `${SITE_URL}${imagePath(slug, 'jpg')}`;
export const CSS_PATH = `${GUIDE_PATH}guide.css`;
export const SITEMAP_PATH = '/sitemap.xml';
/** Host the analytics tag runs on (skill 「방문 통계」: the host of SITE_URL). */
export const SITE_HOST = new URL(SITE_URL).hostname;
/** A GA4 measurement id. Checked before it goes into the inline script. */
export const MEASUREMENT_ID_FORMAT = /^G-[A-Z0-9]+$/;

/**
 * Button address of the app promo (skill 「앱 안내와 이동 버튼」): /?from={guideSource}&term={slug} on a term page,
 * /?from={guideSource} on the hub page. Not escaped for HTML.
 * @param {string} guideSource @param {string} [slug]
 */
export const promoHref = (guideSource, slug) =>
  `/?from=${encodeURIComponent(guideSource)}${slug ? `&term=${encodeURIComponent(slug)}` : ''}`;

const BRAND_ORG = { '@type': 'Organization', name: BRAND, url: HOME_URL };

/** @param {string} text */
export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Escaped body text with **bold** turned into <strong>. */
function inline(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/** JSON for a script block: no raw "<", so "</script>" in a value cannot close the block. */
export function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/** 2026-11-11 to 2026.11.11 */
const dotDate = (date) => date.replaceAll('-', '.');

/** @param {string} id @param {{ id: string, label: string }[]} categories */
const categoryLabel = (id, categories) => categories.find((c) => c.id === id)?.label ?? id;

function breadcrumbLd(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
  };
}

/**
 * GA4 tag lines (skill 「방문 통계」): an inline script that loads gtag.js asynchronously only on SITE_HOST,
 * with Google signals and ad personalization off. No lines when the id is empty.
 * @param {string} measurementId
 */
function analyticsTag(measurementId) {
  if (!measurementId) return [];
  if (typeof measurementId !== 'string' || !MEASUREMENT_ID_FORMAT.test(measurementId)) {
    throw new ContentError([`GA 측정 ID '${measurementId}'는 G-로 시작하고 영문 대문자와 숫자로 이어져야 해요`]);
  }
  return [
    '<script>',
    `  if (location.hostname === '${SITE_HOST}') {`,
    '    window.dataLayer = window.dataLayer || [];',
    '    window.gtag = function () { window.dataLayer.push(arguments); };',
    "    window.gtag('js', new Date());",
    `    window.gtag('config', '${measurementId}', { allow_google_signals: false, allow_ad_personalization_signals: false });`,
    "    var s = document.createElement('script');",
    '    s.async = true;',
    `    s.src = 'https://www.googletagmanager.com/gtag/js?id=${measurementId}';`,
    '    document.head.appendChild(s);',
    '  }',
    '</script>',
  ];
}

function head({ title, description, url, ogType, imageSlug, imageAlt, extra = [], graph, measurementId }) {
  const e = escapeHtml;
  const image = imageUrl(imageSlug);
  return [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    ...analyticsTag(measurementId),
    `<title>${e(title)}</title>`,
    `<meta name="description" content="${e(description)}">`,
    `<link rel="canonical" href="${e(url)}">`,
    '<meta name="theme-color" content="#121212">',
    `<meta property="og:type" content="${ogType}">`,
    '<meta property="og:locale" content="ko_KR">',
    `<meta property="og:site_name" content="${e(BRAND)}">`,
    `<meta property="og:title" content="${e(title)}">`,
    `<meta property="og:description" content="${e(description)}">`,
    `<meta property="og:url" content="${e(url)}">`,
    `<meta property="og:image" content="${e(image)}">`,
    `<meta property="og:image:width" content="${IMAGE_SIZE}">`,
    `<meta property="og:image:height" content="${IMAGE_SIZE}">`,
    `<meta property="og:image:alt" content="${e(imageAlt)}">`,
    ...extra,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${e(title)}">`,
    `<meta name="twitter:description" content="${e(description)}">`,
    `<meta name="twitter:image" content="${e(image)}">`,
    `<meta name="twitter:image:alt" content="${e(imageAlt)}">`,
    '<link rel="icon" href="/icon.svg" type="image/svg+xml">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link rel="stylesheet" href="${e(FONT_URL)}">`,
    `<link rel="stylesheet" href="${CSS_PATH}">`,
    `<script type="application/ld+json">${jsonLd({ '@context': 'https://schema.org', '@graph': graph })}</script>`,
  ];
}

function breadcrumbNav(current, parents) {
  return [
    '<nav class="breadcrumb" aria-label="현재 위치">',
    '  <ol>',
    ...parents.map(([name, href]) => `    <li><a href="${href}">${escapeHtml(name)}</a></li>`),
    `    <li aria-current="page">${escapeHtml(current)}</li>`,
    '  </ol>',
    '</nav>',
  ];
}

/** Link text of the privacy policy line in the footer. */
export const PRIVACY_LINK_TEXT = '개인정보 처리방침';

/**
 * Footer: home link, the analytics notice of the hub source (skill 「방문 통계」) and, only with privacyHref, the privacy
 * policy link right after the notice (PLAN 「계획 작성 중 정한 것」 2: off until the policy page is published).
 * @param {any} hub @param {string} privacyHref
 */
function footer(hub, privacyHref) {
  return [
    '<footer class="site-footer">',
    `  <a href="/">${escapeHtml(BRAND)} 홈</a>`,
    `  <p class="analytics-notice">${escapeHtml(hub.analyticsNotice)}</p>`,
    ...(privacyHref ? [`  <p class="privacy-notice"><a href="${escapeHtml(privacyHref)}">${PRIVACY_LINK_TEXT}</a></p>`] : []),
    '</footer>',
  ];
}

/**
 * App promo block (skill 「앱 안내와 이동 버튼」): title p, lead p, points ul, note p and the button link last. No heading tag.
 * @param {any} hub source of the hub with appPromo @param {string} href unescaped button address
 */
function promoBlock(hub, href) {
  const e = escapeHtml;
  const p = hub.appPromo;
  return [
    `<aside class="app-promo" aria-label="${e(BRAND)} 앱 안내">`,
    `  <p class="app-promo-title">${e(p.title)}</p>`,
    ...p.lead.map((t) => `  <p class="app-promo-lead">${e(t)}</p>`),
    '  <ul class="app-promo-points">',
    ...p.points.map(
      (x) => `    <li><span class="app-promo-point-name">${e(x.name)}</span> <span class="app-promo-point-text">${e(x.text)}</span></li>`,
    ),
    '  </ul>',
    `  <p class="app-promo-note">${e(p.note)}</p>`,
    `  <a class="app-promo-button" href="${e(href)}">${e(p.button)}</a>`,
    '</aside>',
  ];
}

/**
 * The hub affiliate notice when the term page has tools, undefined when it has none.
 * @param {any} page validated source JSON of the term @param {any} hub validated _hub.json
 */
function affiliateOf(page, hub) {
  if (!Array.isArray(page.tools) || !page.tools.length) return undefined;
  const a = hub.affiliate;
  if (!a || typeof a !== 'object') throw new TypeError(`renderTermPage needs the hub affiliate notice for the tools of ${page.slug}`);
  return a;
}

/**
 * First part disclosure of a term page with tools (skill 「제휴 블록」 안내 문구 1): one line right after the cover h1 and
 * before the first lead, with the hub disclosure escaped as is. No lines when the page has no tools.
 * @param {any} page validated source JSON of the term @param {any} hub validated _hub.json with affiliate when tools exist
 * @returns {string[]}
 */
function topDisclosure(page, hub) {
  const a = affiliateOf(page, hub);
  return a ? [`<p class="ad-disclosure">${escapeHtml(a.disclosure)}</p>`] : [];
}

/**
 * Affiliate tools block of a term page (skill 「제휴 블록」): the sources box look with the notice title, the disclosure
 * before the first link, and one sponsored link per tool. No heading tag. No lines when the page has no tools.
 * Every text is escaped as is (no bold), so the block carries exactly the source text.
 * @param {any} page validated source JSON of the term @param {any} hub validated _hub.json with affiliate when tools exist
 * @returns {string[]}
 */
function toolsBlock(page, hub) {
  const a = affiliateOf(page, hub);
  if (!a) return [];
  const e = escapeHtml;
  return [
    `<section class="sources-box tools-box" aria-label="${e(a.title)}">`,
    `  <p class="aside-title">${e(a.title)}</p>`,
    `  <p class="tools-disclosure">${e(a.disclosure)}</p>`,
    '  <ul class="sources tools">',
    ...page.tools.map(
      (t) => `    <li><a href="${e(t.url)}" rel="sponsored nofollow noopener" target="_blank">${e(t.name)}</a><span class="src-pub">${e(t.text)}</span></li>`,
    ),
    '  </ul>',
    '</section>',
  ];
}

function requireHub(hub) {
  if (!hub || typeof hub !== 'object' || !hub.appPromo) throw new TypeError('renderTermPage needs the hub source (appPromo, analyticsNotice, guideSource)');
}

function documentHtml(headLines, bodyLines) {
  const indent = (lines, n) => lines.map((l) => (l ? ' '.repeat(n) + l : l));
  return ['<!doctype html>', '<html lang="ko">', '<head>', ...indent(headLines, 2), '</head>', '<body>', ...indent(bodyLines, 2), '</body>', '</html>', ''].join('\n');
}

/** Image of a term card 2 to 6, right after its h2 (skill 「카드 구성」, 「SEO 배치」 이미지 행): webp only, loaded lazily. */
function cardImage(slug, kind, alt) {
  return `<img class="card-img" src="${imagePath(cardImageSlug(slug, kind), 'webp')}" alt="${escapeHtml(alt)}" width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" loading="lazy">`;
}

function coverImage(slug, alt) {
  return `<img class="card-img" src="${imagePath(slug, 'webp')}" alt="${escapeHtml(alt)}" width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" fetchpriority="high">`;
}

/**
 * One term page: 6 stacked cards (the cover carries the first part disclosure only with tools), the affiliate tools
 * block (only with tools), related terms, hub link, sources, app promo, breadcrumb and footer.
 * @param {any} page validated source JSON of the term
 * @param {{ terms?: import('./terms.mjs').TermMeta[], categories?: { id: string, label: string }[], hub: any, measurementId?: string, privacyHref?: string }} options
 *   terms: table used for related term names; categories: labels of the category badge; hub: validated _hub.json
 *   (app promo, affiliate notice and footer text); measurementId: GA4 id, empty for no tag;
 *   privacyHref: privacy policy address for the footer link, empty for no link
 */
export function renderTermPage(page, { terms = TERMS, categories = CATEGORIES, hub, measurementId = '', privacyHref = '' } = {}) {
  requireHub(hub);
  const e = escapeHtml;
  const url = pageUrl(page.slug);
  const graph = [
    {
      '@type': 'Article',
      headline: page.cover.h1,
      description: page.description,
      image: [imageUrl(page.slug)],
      datePublished: page.datePublished,
      dateModified: page.dateModified,
      inLanguage: 'ko-KR',
      author: BRAND_ORG,
      publisher: BRAND_ORG,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    },
    breadcrumbLd([
      [BRAND, HOME_URL],
      [HUB_NAME, HUB_URL],
      [page.term, url],
    ]),
  ];
  const headLines = head({
    title: page.title,
    description: page.description,
    url,
    ogType: 'article',
    imageSlug: page.slug,
    imageAlt: page.cover.imageAlt,
    extra: [
      `<meta property="article:published_time" content="${e(page.datePublished)}">`,
      `<meta property="article:modified_time" content="${e(page.dateModified)}">`,
    ],
    graph,
    measurementId,
  });

  const cover = [
    '<section class="card card-cover" id="card-cover">',
    `  <p class="card-no">1/${CARD_TOTAL}</p>`,
    `  <p class="card-meta"><span class="badge">${e(categoryLabel(page.category, categories))}</span><time datetime="${e(page.datePublished)}">${e(dotDate(page.datePublished))}</time></p>`,
    `  <h1>${e(page.cover.h1)}</h1>`,
    ...topDisclosure(page, hub).map((l) => `  ${l}`),
    ...page.cover.lead.map((t) => `  <p class="lead">${inline(t)}</p>`),
    `  ${coverImage(page.slug, page.cover.imageAlt)}`,
    '</section>',
  ];
  const cards = page.cards.flatMap((c, i) => {
    const tag = c.kind === 'tips' ? 'ol' : 'ul';
    return [
      `<section class="card" id="card-${e(c.kind)}">`,
      `  <p class="card-no">${i + 2}/${CARD_TOTAL}</p>`,
      `  <h2>${e(c.heading)}</h2>`,
      `  ${cardImage(page.slug, c.kind, c.imageAlt)}`,
      ...c.paragraphs.map((t) => `  <p>${inline(t)}</p>`),
      ...(Array.isArray(c.list) ? [`  <${tag} class="card-list">`, ...c.list.map((t) => `    <li>${inline(t)}</li>`), `  </${tag}>`] : []),
      '</section>',
    ];
  });
  const bySlug = new Map(terms.map((t) => [t.slug, t]));
  const related = [
    '<nav class="related" aria-label="함께 보면 좋은 용어">',
    '  <p class="aside-title">함께 보면 좋은 용어</p>',
    '  <ul>',
    ...page.related.map((slug) => {
      const t = bySlug.get(slug);
      return `    <li><a href="${pagePath(slug)}"><span class="rel-term">${e(t.term)}</span><span class="rel-en">${e(t.english)}</span></a></li>`;
    }),
    '  </ul>',
    '</nav>',
    `<p class="hub-link-wrap"><a class="hub-link" href="${GUIDE_PATH}">${e(HUB_NAME)} 전체 보기</a></p>`,
  ];
  const sources = [
    '<section class="sources-box" aria-label="참고 자료">',
    '  <p class="aside-title">참고 자료</p>',
    '  <ol class="sources">',
    ...page.sources.map(
      (s) =>
        `    <li><a href="${e(s.url)}" rel="noopener">${e(s.title)}</a><span class="src-pub">${e(s.publisher)}</span><span class="src-url">${e(s.url)}</span></li>`,
    ),
    '  </ol>',
    '</section>',
  ];
  const body = [
    ...breadcrumbNav(page.term, [
      [BRAND, '/'],
      [HUB_NAME, GUIDE_PATH],
    ]),
    '<main class="guide">',
    '  <article class="cards">',
    ...[...cover, ...cards].map((l) => `    ${l}`),
    '  </article>',
    ...[...toolsBlock(page, hub), ...related, ...sources, ...promoBlock(hub, promoHref(hub.guideSource, page.slug))].map((l) => `  ${l}`),
    '</main>',
    ...footer(hub, privacyHref),
  ];
  return documentHtml(headLines, body);
}

/**
 * The hub page: cover card, one card per category listing its term pages, app promo and footer.
 * @param {any} hub source of the hub (_hub.json)
 * @param {any[]} pages validated term sources
 * @param {{ terms?: import('./terms.mjs').TermMeta[], categories?: { id: string, label: string }[], measurementId?: string, privacyHref?: string }} [options]
 *   categories: order of the category cards (a category without a term of the table gets no card);
 *   measurementId: GA4 id, empty for no tag; privacyHref: privacy policy address for the footer link, empty for no link
 */
export function renderHubPage(hub, pages, { terms = TERMS, categories = CATEGORIES, measurementId = '', privacyHref = '' } = {}) {
  const e = escapeHtml;
  const ids = categories.map((c) => c.id).filter((id) => terms.some((t) => t.category === id));
  const h = normalizeHub(hub, ids);
  const pageBySlug = new Map(pages.map((p) => [p.slug, p]));
  const graph = [
    {
      '@type': 'CollectionPage',
      '@id': HUB_URL,
      url: HUB_URL,
      name: h.h1,
      description: h.description,
      inLanguage: 'ko-KR',
      datePublished: h.datePublished,
      dateModified: h.dateModified,
      image: [imageUrl(HUB_IMAGE_SLUG)],
      isPartOf: { '@type': 'WebSite', name: BRAND, url: HOME_URL },
      publisher: BRAND_ORG,
      mainEntity: { '@id': `${HUB_URL}#terms` },
    },
    {
      '@type': 'ItemList',
      '@id': `${HUB_URL}#terms`,
      itemListElement: terms.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: pageUrl(t.slug), name: t.term })),
    },
    breadcrumbLd([
      [BRAND, HOME_URL],
      [HUB_NAME, HUB_URL],
    ]),
  ];
  const headLines = head({
    title: h.title,
    description: h.description,
    url: HUB_URL,
    ogType: 'website',
    imageSlug: HUB_IMAGE_SLUG,
    imageAlt: h.imageAlt,
    graph,
    measurementId,
  });
  const cover = [
    '<section class="card card-cover" id="card-cover">',
    `  <p class="card-meta"><span class="badge">용어 ${terms.length}개</span><time datetime="${e(h.dateModified)}">${e(dotDate(h.dateModified))}</time></p>`,
    `  <h1>${e(h.h1)}</h1>`,
    ...h.lead.map((t) => `  <p class="lead">${inline(t)}</p>`),
    `  ${coverImage(HUB_IMAGE_SLUG, h.imageAlt)}`,
    '</section>',
  ];
  const sections = h.categories.flatMap((c) => [
    `<section class="card category" id="${e(c.category)}">`,
    `  <h2>${e(c.heading)}</h2>`,
    `  <p>${inline(c.intro)}</p>`,
    '  <ul class="term-list">',
    ...terms
      .filter((t) => t.category === c.category)
      .map((t) => {
        const p = pageBySlug.get(t.slug);
        return [
          `    <li><a href="${pagePath(t.slug)}">`,
          `<img src="${imagePath(t.slug, 'webp')}" alt="${e(p?.cover?.imageAlt ?? '')}" width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" loading="lazy">`,
          `<span class="t-text"><span class="t-term">${e(t.term)}</span><span class="t-en">${e(t.english)}</span>`,
          `<span class="t-sum">${e(p?.cover?.h1 ?? '')}</span></span></a></li>`,
        ].join('');
      }),
    '  </ul>',
    '</section>',
  ]);
  const body = [
    ...breadcrumbNav(HUB_NAME, [[BRAND, '/']]),
    '<main class="guide">',
    '  <article class="cards">',
    ...[...cover, ...sections].map((l) => `    ${l}`),
    '  </article>',
    ...promoBlock(hub, promoHref(hub.guideSource)).map((l) => `  ${l}`),
    '</main>',
    ...footer(hub, privacyHref),
  ];
  return documentHtml(headLines, body);
}

/**
 * @param {{ loc: string, lastmod?: string }[]} entries
 */
export function renderSitemap(entries) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.flatMap(({ loc, lastmod }) => [
      '  <url>',
      `    <loc>${escapeHtml(loc)}</loc>`,
      ...(lastmod ? [`    <lastmod>${escapeHtml(lastmod)}</lastmod>`] : []),
      '  </url>',
    ]),
    '</urlset>',
    '',
  ].join('\n');
}

export function renderRobots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}${SITEMAP_PATH}\n`;
}
