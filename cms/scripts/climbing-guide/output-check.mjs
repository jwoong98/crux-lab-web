// Output checks of one generated climbing guide page (skill seo-card-news-page 「검증」 7 to 9: app promo block, button
// address, footer notice, analytics tag, affiliate tools block, first part disclosure). Pure: reads only the markup the
// generator writes, so the Git build and the CMS Worker check every page the same way before it is published.

import { escapeHtml, PRIVACY_LINK_TEXT, promoHref, SITE_HOST } from './render.mjs';

/**
 * A block under the cards carries no heading tag (h2 stays for cards 2 to 6) and no page keyword (skill 「검증」 7, 9).
 * @param {string} block markup of the block @param {string} label block name in messages ('앱 안내 블록', '제휴 블록')
 * @param {string[]} keywords keyword and variants of the page @param {(m: string) => void} push
 * @param {string} titleName what the block title is called in the heading tag message ('안내 제목', '블록 제목')
 */
function checkBlockText(block, label, keywords, push, titleName) {
  if (/<h[1-6][\s>]/i.test(block)) push(`${label} 안에 제목 태그(h1~h6)를 쓸 수 없어요. ${titleName}은 p로 써요`);
  for (const k of keywords) {
    if (block.includes(k) || block.includes(escapeHtml(k))) push(`${label} 안에 keyword '${k}'가 있어요`);
  }
}

/**
 * Affiliate tools block problems of one page (skill 「검증」 9): one block on a term page with tools and none elsewhere,
 * right after the cards and right before the related terms, the hub disclosure as is right after the title and before
 * the first link, sponsored in the rel of every link, no heading tag and no page keyword.
 */
function checkToolsOutput(html, { slug, keywords, hub, tools }, push) {
  const blocks = [...html.matchAll(/<section class="sources-box tools-box"[\s\S]*?<\/section>/g)];
  const want = slug && tools.length ? 1 : 0;
  if (blocks.length !== want) push(`제휴 블록은 ${want}개여야 해요(현재 ${blocks.length}개)`);
  if (!blocks.length) return;
  const block = blocks[0][0];
  const start = blocks[0].index ?? 0;
  const end = start + block.length;
  if (!/<\/article>\s*$/.test(html.slice(0, start))) push('제휴 블록은 카드(article.cards) 바로 뒤에 있어야 해요');
  if (!/^\s*<nav class="related"/.test(html.slice(end))) push('제휴 블록은 관련 용어(nav.related) 바로 앞에 있어야 해요');
  checkBlockText(block, '제휴 블록', keywords, push, '블록 제목');

  const disclosureAt = block.indexOf('<p class="tools-disclosure">');
  const firstLink = block.search(/<a\s/);
  if (disclosureAt === -1 || (firstLink !== -1 && firstLink < disclosureAt)) push('안내 문구(tools-disclosure)는 첫 링크보다 앞에 있어야 해요');
  if (!/^<section[^>]*>\s*<p class="aside-title">[^<]*<\/p>\s*<p class="tools-disclosure">/.test(block)) {
    push('안내 문구(tools-disclosure)는 블록 제목 바로 다음 요소여야 해요');
  }
  const text = /<p class="tools-disclosure">([^<]*)<\/p>/.exec(block)?.[1];
  const disclosure = hub?.affiliate?.disclosure;
  if (typeof disclosure !== 'string' || text !== escapeHtml(disclosure)) push('안내 문구가 _hub.json affiliate.disclosure와 글자가 달라요');

  for (const [, attrs] of block.matchAll(/<a\s([^>]*)>/g)) {
    const rel = /\brel="([^"]*)"/.exec(attrs)?.[1] ?? '';
    if (!rel.split(/\s+/).includes('sponsored')) push(`제휴 블록의 링크 rel에 sponsored가 있어야 해요(현재 '${rel}')`);
  }
}

/**
 * First part disclosure problems of one page (skill 「제휴 블록」 안내 문구 1, 검증 9): one ad-disclosure line on a term page
 * with tools and none elsewhere, the element right after the cover h1, with the hub disclosure as is.
 */
function checkTopDisclosure(html, { slug, hub, tools }, push) {
  const count = (html.match(/<p class="ad-disclosure">/g) ?? []).length;
  const want = slug && tools.length ? 1 : 0;
  if (count !== want) push(`페이지 첫 부분 안내 문구(ad-disclosure)는 ${want}개여야 해요(현재 ${count}개)`);
  if (!want || !count) return;
  const cover = /<section class="card card-cover"[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
  if (!/<\/h1>\s*<p class="ad-disclosure">/.test(cover)) push('페이지 첫 부분 안내 문구(ad-disclosure)는 표지 제목(h1) 바로 다음 요소여야 해요');
  const text = /<p class="ad-disclosure">([^<]*)<\/p>/.exec(html)?.[1];
  const disclosure = hub?.affiliate?.disclosure;
  if (typeof disclosure !== 'string' || text !== escapeHtml(disclosure)) push('페이지 첫 부분 안내 문구가 _hub.json affiliate.disclosure와 글자가 달라요');
}

/**
 * Privacy policy link (PLAN 「계획 작성 중 정한 것」 2): with privacyHref, exactly one link to it in the footer; without it,
 * no privacy policy link anywhere on the page, so the pages keep their bytes until the policy page is published.
 * @param {string} html @param {string} footerHtml the footer markup of html @param {string} privacyHref
 * @param {(m: string) => void} push
 */
function checkPrivacyLink(html, footerHtml, privacyHref, push) {
  if (privacyHref) {
    const n = footerHtml.split(`<a href="${escapeHtml(privacyHref)}">${PRIVACY_LINK_TEXT}</a>`).length - 1;
    if (n !== 1) push(`푸터에 ${PRIVACY_LINK_TEXT} 링크(${privacyHref})는 1개여야 해요(현재 ${n}개)`);
    return;
  }
  const n = [...html.matchAll(/<a\s[^>]*>([^<]*)<\/a>/g)].filter((m) => m[1] === PRIVACY_LINK_TEXT).length;
  if (n) push(`${PRIVACY_LINK_TEXT} 링크는 privacyHref를 줄 때만 둬요(현재 ${n}개)`);
}

/**
 * Problems of one generated page against skill 「검증」 7, 8 and 9 and the privacy policy link. Reads only the markup this
 * generator writes.
 * @param {string} html generated page
 * @param {{ slug?: string, keywords?: string[], hub: any, measurementId?: string, tools?: any[], privacyHref?: string }} expected
 *   slug: the term page slug, left out for the hub page; keywords: keyword and variants of the term page;
 *   hub: validated _hub.json; measurementId: the GA4 id the page was built with ('' for none);
 *   tools: the tools of the term page source ([] for none and for the hub page);
 *   privacyHref: the privacy policy address the page was built with ('' for no link)
 * @returns {string[]} one message per problem, empty when the page is right
 */
export function checkPageOutput(html, { slug, keywords = [], hub, measurementId = '', tools = [], privacyHref = '' }) {
  const errors = [];
  const push = (m) => errors.push(m);
  checkToolsOutput(html, { slug, keywords, hub, tools }, push);
  checkTopDisclosure(html, { slug, hub, tools }, push);

  const blocks = [...html.matchAll(/<aside class="app-promo"[\s\S]*?<\/aside>/g)];
  if (blocks.length !== 1) push(`앱 안내 블록은 1개여야 해요(현재 ${blocks.length}개)`);
  if (blocks.length) {
    const block = blocks[0][0];
    const start = blocks[0].index ?? 0;
    const end = start + block.length;
    checkBlockText(block, '앱 안내 블록', keywords, push, '안내 제목');
    if (slug) {
      const sources = html.lastIndexOf('<section class="sources-box"');
      if (sources === -1 || sources > start) push('앱 안내 블록은 참고 자료 뒤에 있어야 해요');
    } else {
      const lastCategory = html.lastIndexOf('<section class="card category"');
      if (lastCategory === -1 || lastCategory > start || html.lastIndexOf('</article>') > start) {
        push('앱 안내 블록은 마지막 분류 카드 뒤에 있어야 해요');
      }
    }
    if (!/^\s*<\/main>\s*<footer[\s>]/.test(html.slice(end))) push('앱 안내 블록은 푸터 바로 위에 있어야 해요');
    const links = block.match(/<a\s/g) ?? [];
    const last = /<a\s([^>]*)>[^<]*<\/a>\s*<\/aside>$/.exec(block);
    if (links.length !== 1 || !last) push('이동 버튼(a)은 앱 안내 블록의 마지막 요소로 1개만 있어야 해요');
    if (last) {
      const attrs = last[1];
      const href = (/\bhref="([^"]*)"/.exec(attrs)?.[1] ?? '').replaceAll('&amp;', '&');
      const want = promoHref(hub.guideSource, slug);
      if (href !== want) push(`버튼 주소는 '${want}'여야 해요(현재 '${href}')`);
      if (/\btarget=/.test(attrs)) push('이동 버튼은 새 창으로 열지 않아요(target을 쓰지 않아요)');
    }
  }

  const footerStart = html.indexOf('<footer');
  const footerHtml = footerStart === -1 ? '' : html.slice(footerStart, html.indexOf('</footer>', footerStart));
  if (!footerHtml.includes(`<p class="analytics-notice">${escapeHtml(hub.analyticsNotice)}</p>`)) {
    push('푸터에 방문 통계 안내(analyticsNotice)가 없어요');
  }
  checkPrivacyLink(html, footerHtml, privacyHref, push);

  // Every <script> element whose markup (attributes included, so a src form too) names googletagmanager.com is a tag.
  const tags = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].filter((m) => m[0].includes('googletagmanager.com'));
  if (measurementId) {
    if (tags.length !== 1) push(`방문 통계 태그는 1개여야 해요(현재 ${tags.length}개)`);
    const tag = tags[0];
    if (tag) {
      const code = tag[1];
      if ((tag.index ?? 0) > html.indexOf('</head>')) push('방문 통계 태그는 head 안에 있어야 해요');
      if (!code.includes(`if (location.hostname === '${SITE_HOST}')`)) push(`방문 통계 태그에 호스트 검사(location.hostname === '${SITE_HOST}')가 없어요`);
      for (const setting of ['allow_google_signals: false', 'allow_ad_personalization_signals: false']) {
        if (!code.includes(setting)) push(`방문 통계 태그에 설정 ${setting}가 없어요`);
      }
      if (!code.includes(`'config', '${measurementId}'`) || !code.includes(`gtag/js?id=${measurementId}'`)) {
        push(`방문 통계 태그의 측정 ID가 ${measurementId}가 아니에요`);
      }
      if (!code.includes('s.async = true;')) push('gtag.js는 비동기(async)로 불러와야 해요');
    }
  } else if (/googletagmanager|gtag\(/.test(html)) {
    push('측정 ID가 없는데 방문 통계 태그가 있어요');
  }
  return errors;
}
