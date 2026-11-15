// Pure checks of the climbing guide source JSON (skill seo-card-news-page 「원천 JSON」 and 「검증」 1 to 3, 5, 9 for the sources).
// Reads no file and imports nothing but ./terms.mjs, so the CMS browser and the CMS Worker run the same checks as the
// Git build (DESIGN 3-3, DEC-031). Image presence comes in as a function (hasImage), the term table as data (terms).
// problems collects every problem in one list, so one run shows the writer all fixes at once.

import { AFFILIATE_HOSTS, BRAND, CATEGORIES, FIELD_NAME, HUB_IMAGE_SLUG, TERMS } from './terms.mjs';

/** Card kinds in the fixed order of skill 「카드 구성」 cards 2 to 6. */
export const CARD_KINDS = ['meaning', 'feature', 'tips', 'caution', 'summary'];
/** Image name of card {kind} of a term page: images/{slug}-{kind}.webp (skill 「원천 JSON」, DEC-004). */
export const cardImageSlug = (slug, kind) => `${slug}-${kind}`;
const LIST_COUNT = { tips: [3, 3], caution: [2, 3] };
/** Card image alt (skill 「SEO 배치」 이미지 행): 30 to 80 characters, keyword at most once a card and twice over cards 2 to 6. */
const CARD_ALT_LENGTH = [30, 80];
const CARD_ALT_KEYWORD = { each: 1, total: 2 };
const FORBIDDEN_WORDS = ['뉴닉', '고슴', '뉴니커'];
const EM_DASH = String.fromCharCode(0x2014);
const EMOJI = /\p{Extended_Pictographic}/gu;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** guideSource goes into the button address as the from value (skill 「앱 안내와 이동 버튼」). */
export const GUIDE_SOURCE_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Words that promise an effect (skill 「앱 안내와 이동 버튼」 문체). */
const PROMISE_WORDS = ['무조건', '확실히', '완벽하게'];
const PROMO_POINTS = 3;
const PROMO_LEAD = [1, 2];
/** A term page shows 1 or 2 tools (skill 「제휴 블록」). */
const TOOLS_COUNT = [1, 2];
/** Characters (code points) of a tool name and a tool text (skill 「제휴 블록」 문체). */
const TOOL_NAME_LENGTH = [2, 30];
const TOOL_TEXT_LENGTH = [10, 60];
/**
 * Words that promise an effect or push a sale, banned in affiliate.title, tools[].name and tools[].text
 * (skill 「제휴 블록」 금지 표현). The disclosure is the fixed Coupang sentence and is not checked.
 */
export const AFFILIATE_BANNED_WORDS = [
  '무조건',
  '확실히',
  '완벽',
  '보장',
  '최고',
  '최저가',
  '할인',
  '특가',
  '필수템',
  '부상 예방',
  '부상을 막',
  '그레이드가 올라',
  '실력이 늘',
];
/** A price: a number, then optionally a unit like 만 or 천, then 원 ("19,900원", "3만 원"). */
export const PRICE_PATTERN = /\d[\d,.]*\s*(?:[십백천만억]\s*)*원/;
/** A percent: a number, then % or the full-width ％ ("30%", "30％"). */
export const PERCENT_PATTERN = /\d[\d,.]*\s*[%％]/;
/** The disclosure must say a commission is paid (skill 「제휴 블록」 안내 문구). */
const DISCLOSURE_WORD = '수수료';
/** A conditional phrase such as '받을 수 있습니다' is not a clear disclosure (skill 「제휴 블록」 안내 문구): 수 있, 수있, 수도 있. */
const CONDITIONAL_PATTERN = /수\s*도?\s*있/;
/** One sentence: no ., ? or ! anywhere but a single one at the end. */
const ONE_SENTENCE = /^[^.?!]*[.?!]$/;
/** App tag code of tb_attempt style tags (cms CRUX-CMS-02v-1 10): upper case letters, digits and underscores. */
const APP_TAG_FORMAT = /^[A-Z0-9_]+$/;

/**
 * Names no card news may take as its slug: images is the image folder of the guide path (/climbing/images/) and new is the
 * CMS address of a new card news (/guides/new) (cms CRUX-CMS-02v-1 3, DEC-069). The DB slug CHECK refuses images too.
 */
export const RESERVED_SLUGS = ['images', 'new'];

/** The CMS line for a reserved slug ("images는 slug로 쓸 수 없어요"), or null when the slug may be used. @param {string} slug */
export function reservedSlugProblem(slug) {
  return RESERVED_SLUGS.includes(slug) ? `${slug}는 slug로 쓸 수 없어요` : null;
}

/** Every validation problem, one line each, starting with the file name ("slab.json: ..."). */
export class ContentError extends Error {
  /** @param {string[]} errors */
  constructor(errors) {
    super(`클라이밍 용어 원천 검증 실패 ${errors.length}건\n${errors.map((e) => `- ${e}`).join('\n')}`);
    this.name = 'ContentError';
    this.errors = errors;
  }
}

// ---------- text helpers (exported for render and tests of counts) ----------

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** Non-overlapping occurrences of any of the words (longest first). */
export function countWords(text, words) {
  const list = [...new Set(words.filter((w) => typeof w === 'string' && w))].sort((a, b) => b.length - a.length);
  if (!list.length || typeof text !== 'string') return 0;
  return (text.match(new RegExp(list.map(escapeRegExp).join('|'), 'g')) ?? []).length;
}

const noSpaceLength = (s) => s.replace(/\s/g, '').length;
const stripBold = (s) => s.replaceAll('**', '');
const emojiCount = (s) => (s.match(EMOJI) ?? []).length;
const str = (v) => (typeof v === 'string' ? v : '');
const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
const isText = (v) => typeof v === 'string' && v.trim() !== '';
// Date.parse rolls a day that is not on the calendar over (2026-02-31 becomes 2026-03-03), so the date must round-trip.
const isDate = (v) => {
  if (typeof v !== 'string' || !DATE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/** The keyword and its variants of a page. */
export function keywordsOf(page) {
  return [str(page.keyword), ...strings(page.keywordVariants)].filter(Boolean);
}

/** Occurrences of label that are not part of a longer term ("수직" inside "수직벽" does not count). */
function countLabelOutsideTerm(text, label, term) {
  let count = 0;
  for (let i = text.indexOf(label); i !== -1; i = text.indexOf(label, i + label.length)) {
    let inside = false;
    if (term.length > label.length && term.includes(label)) {
      for (let j = text.indexOf(term); j !== -1 && j <= i; j = text.indexOf(term, j + 1)) {
        if (i + label.length <= j + term.length) inside = true;
      }
    }
    if (!inside) count += 1;
  }
  return count;
}

/** Body blocks of a page: the cover lead, then each card's paragraphs and list (skill 「SEO 배치」 본문). */
export function bodyBlocks(page) {
  const cards = Array.isArray(page.cards) ? page.cards : [];
  return [
    { name: 'cover', texts: strings(page.cover?.lead) },
    ...cards.map((c, i) => ({ name: str(c?.kind) || `cards[${i}]`, texts: [...strings(c?.paragraphs), ...strings(c?.list)] })),
  ];
}

/**
 * The hub in one shape: lead as a list, categories as [{ category, heading, intro }] in category order.
 * Accepts categories as a list with a category (or id) field, or as an object keyed by category id.
 */
export function normalizeHub(hub, categoryIds = CATEGORIES.map((c) => c.id)) {
  const raw = hub?.categories;
  const find = (id) => {
    if (Array.isArray(raw)) return raw.find((x) => x && (x.category === id || x.id === id));
    if (raw && typeof raw === 'object') return raw[id];
    return undefined;
  };
  return {
    ...hub,
    lead: typeof hub?.lead === 'string' ? [hub.lead] : strings(hub?.lead),
    categories: categoryIds.map((id) => {
      const c = find(id);
      return { category: id, heading: str(c?.heading), intro: str(c?.intro) };
    }),
  };
}

// ---------- checks ----------

/** Em dash and forbidden names in every string of value, with its path. */
function checkForbidden(value, path, push) {
  if (typeof value === 'string') {
    if (value.includes(EM_DASH)) push(`${path}에 긴 대시(U+2014)를 쓸 수 없어요`);
    for (const w of FORBIDDEN_WORDS) if (value.includes(w)) push(`${path}에 쓸 수 없는 말 '${w}'이 있어요`);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => checkForbidden(v, `${path}[${i}]`, push));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) checkForbidden(v, path ? `${path}.${k}` : k, push);
  }
}

/** Fields read as titles or labels: no emoji, no bold marks. */
function checkPlain(fields, push) {
  for (const [name, text] of fields) {
    if (emojiCount(str(text))) push(`${name}에 이모지를 쓸 수 없어요`);
    if (str(text).includes('**')) push(`${name}에 굵게(**) 표시를 쓸 수 없어요. 굵게는 본문에만 써요`);
  }
}

function checkLength(name, text, min, max, push) {
  const n = str(text).length;
  if (n < min || n > max) push(`${name}은 ${min}~${max}자여야 해요(현재 ${n}자)`);
}

/** @param {((fileName: string) => boolean) | undefined} hasImage no image check when left out */
function checkImages(hasImage, slug, push, exts = ['webp', 'jpg']) {
  if (!hasImage) return;
  for (const ext of exts) {
    if (!hasImage(`${slug}.${ext}`)) push(`이미지 images/${slug}.${ext}가 없어요`);
  }
}

/**
 * A term of the table without an app tag (DEC-027: a card news term need not pair with an app style tag) leaves
 * appTag and appLabel out of its source, and its meaning card has no app label to name.
 */
const hasAppTag = (meta) => isText(meta.appTag);

function checkShape(page, meta, slugs, push) {
  const appFields = hasAppTag(meta) ? ['appTag', 'appLabel'] : [];
  for (const f of ['slug', 'term', 'english', 'category', ...appFields, 'keyword', 'title', 'description']) {
    // With a source appTag, an empty appLabel gets only the appTag line below (DEC-049: one core line per CMS field).
    if (f === 'appLabel' && isText(page.appTag)) continue;
    if (!isText(page[f])) push(`${f}가 비었거나 문자열이 아니에요`);
  }
  // appTag and appLabel stay in this loop: a source that has them while the table has none gets the table message.
  for (const f of ['slug', 'term', 'english', 'category', 'appTag', 'appLabel']) {
    if (isText(page[f]) && page[f] !== meta[f]) push(`${f}가 용어 표와 달라요(표 '${meta[f]}', 현재 '${page[f]}')`);
  }
  if (isText(page.appTag) && !APP_TAG_FORMAT.test(page.appTag)) push('appTag는 영문 대문자, 숫자, 밑줄로 써요');
  if (isText(page.appTag) && !isText(page.appLabel)) push('appTag가 있으면 appLabel도 써야 해요');
  if (page.secondaryKeyword !== undefined && typeof page.secondaryKeyword !== 'string') push('secondaryKeyword는 문자열이에요');
  if (page.keywordVariants !== undefined && (!Array.isArray(page.keywordVariants) || page.keywordVariants.some((v) => typeof v !== 'string'))) {
    push('keywordVariants는 문자열 목록이에요');
  }
  for (const f of ['datePublished', 'dateModified']) if (!isDate(page[f])) push(`${f}는 YYYY-MM-DD 날짜여야 해요(현재 '${page[f]}')`);
  if (isDate(page.datePublished) && isDate(page.dateModified) && page.dateModified < page.datePublished) {
    push(`dateModified(${page.dateModified})가 datePublished(${page.datePublished})보다 앞서요`);
  }

  const cover = page.cover;
  if (!cover || typeof cover !== 'object') push('cover가 없어요');
  else {
    if (!isText(cover.h1)) push('cover.h1이 비었어요');
    if (!Array.isArray(cover.lead) || !cover.lead.length || !cover.lead.every(isText)) push('cover.lead는 비지 않은 문장 목록이에요');
    if (!isText(cover.imageAlt)) push('cover.imageAlt가 비었어요');
  }

  const cards = Array.isArray(page.cards) ? page.cards : [];
  const kinds = cards.map((c) => c?.kind);
  if (kinds.join(',') !== CARD_KINDS.join(',')) {
    push(`cards는 ${CARD_KINDS.join(', ')} 순서로 5장이어야 해요(현재 ${kinds.join(', ') || '없음'})`);
  }
  for (const c of cards) {
    const kind = str(c?.kind) || '?';
    if (!isText(c?.heading)) push(`${kind} heading이 비었어요`);
    if (!isText(c?.imageAlt)) push(`${kind} imageAlt가 비었어요`);
    if (!Array.isArray(c?.paragraphs) || !c.paragraphs.length || !c.paragraphs.every(isText)) push(`${kind} paragraphs는 비지 않은 문장 목록이에요`);
    const range = LIST_COUNT[kind];
    if (range) {
      const n = Array.isArray(c.list) && c.list.every(isText) ? c.list.length : -1;
      if (n < range[0] || n > range[1]) push(`${kind} list는 ${range[0] === range[1] ? range[0] : `${range[0]}~${range[1]}`}개여야 해요(현재 ${n < 0 ? '없음' : n})`);
    } else if (c?.list !== undefined) {
      push(`${kind} 카드에는 list를 쓰지 않아요. list는 tips와 caution에만 써요`);
    }
  }

  const related = page.related;
  if (!Array.isArray(related) || related.length !== 3) push(`related는 slug 3개여야 해요(현재 ${Array.isArray(related) ? related.length : '없음'})`);
  if (Array.isArray(related)) {
    for (const r of related) {
      if (r === meta.slug) push(`related에 자기 자신 '${r}'을 넣을 수 없어요`);
      else if (!slugs.includes(r)) push(`related의 '${r}'은 용어 표에 없는 slug예요`);
    }
    if (new Set(related).size !== related.length) push('related에 같은 slug가 두 번 있어요');
  }

  const sources = page.sources;
  if (!Array.isArray(sources) || sources.length < 2 || sources.length > 4) {
    push(`sources는 2~4개여야 해요(현재 ${Array.isArray(sources) ? sources.length : '없음'})`);
  }
  if (Array.isArray(sources)) {
    sources.forEach((s, i) => {
      if (!isText(s?.title)) push(`sources[${i}] title이 비었어요`);
      if (!isText(s?.publisher)) push(`sources[${i}] publisher가 비었어요`);
      let ok = false;
      try {
        ok = isText(s?.url) && new URL(s.url).protocol === 'https:';
      } catch {
        ok = false;
      }
      if (!ok) push(`sources[${i}] url은 https 주소여야 해요(현재 '${s?.url}')`);
    });
  }

  // An empty label would never move the search in countLabelOutsideTerm forward, so only a filled label is looked for.
  if (hasAppTag(meta) && isText(meta.appLabel) && meta.appLabel !== meta.term) {
    const meaning = cards.find((c) => c?.kind === 'meaning');
    const text = meaning ? [...strings(meaning.paragraphs), ...strings(meaning.list)].join(' ') : '';
    if (countLabelOutsideTerm(text, meta.appLabel, meta.term) < 1) {
      push(`meaning 카드에 앱 표시명 appLabel '${meta.appLabel}'을 한 번 알려 줘야 해요`);
    }
  }
}

/**
 * One text the info card body is built from (scripts/info-cards/cards.mjs checkFragment, same rules in the same order and
 * the same text): some text, one line, no leading markup (##, -, #), no space at either end. One message at most.
 */
function checkFragment(text, where, push) {
  if (typeof text !== 'string' || text.length === 0) push(`${where} 이 비었어요`);
  else if (/[\r\n]/.test(text)) push(`${where} 에 줄바꿈이 있어요`);
  else if (text.startsWith('## ') || text.startsWith('- ') || text.startsWith('#')) push(`${where} 이 서식 기호(##, -, #)로 시작해요`);
  else if (text !== text.trim()) push(`${where} 앞뒤에 공백이 있어요`);
}

/**
 * The texts the info card body of the page is made of (cards.mjs validateSource and cardBody): cover.h1, cover.lead[i],
 * cards[i].heading, cards[i].paragraphs[j], cards[i].list[j]. Publishing writes that body from the same source, so a text that
 * cards.mjs refuses is refused here first. Like cards.mjs, an empty cover.h1 is left to its own message (checkShape), and a
 * lead, paragraphs or list that is not a list is left to checkShape.
 */
function checkFragments(page, push) {
  const cover = page.cover && typeof page.cover === 'object' ? page.cover : undefined;
  if (typeof cover?.h1 === 'string' && cover.h1.length > 0) checkFragment(cover.h1, 'cover.h1', push);
  if (Array.isArray(cover?.lead)) cover.lead.forEach((s, i) => checkFragment(s, `cover.lead[${i}]`, push));
  if (!Array.isArray(page.cards)) return;
  page.cards.forEach((c, i) => {
    checkFragment(c?.heading, `cards[${i}].heading`, push);
    if (Array.isArray(c?.paragraphs)) c.paragraphs.forEach((s, j) => checkFragment(s, `cards[${i}].paragraphs[${j}]`, push));
    if (Array.isArray(c?.list)) c.list.forEach((s, j) => checkFragment(s, `cards[${i}].list[${j}]`, push));
  });
}

function checkSeo(page, push) {
  const kw = keywordsOf(page);
  if (!kw.length) return;
  const k = page.keyword;
  if (!isText(k)) return;
  // Skill 「SEO 배치」: variants join the keyword only in the body counts. Title, description, h1, headings,
  // the first 60 characters and the alt count the keyword itself.
  const count = (text) => countWords(str(text), [k]);

  const title = str(page.title);
  if (title.length > 40) push(`title은 40자 이하여야 해요(현재 ${title.length}자)`);
  if (!title.startsWith(k)) push(`title은 keyword '${k}'로 시작해야 해요`);
  if (!title.includes(FIELD_NAME)) push(`title에 분야 이름 '${FIELD_NAME}'이 없어요`);
  if (!title.endsWith(` | ${BRAND}`)) push(`title은 ' | ${BRAND}'로 끝나야 해요`);

  checkLength('description', page.description, 70, 120, push);
  const dk = count(page.description);
  if (dk < 1 || dk > 2) push(`description keyword '${k}'는 1~2회여야 해요(현재 ${dk}회)`);
  const df = countWords(str(page.description), [FIELD_NAME]);
  if (df !== 1) push(`description에 분야 이름 '${FIELD_NAME}'은 1회여야 해요(현재 ${df}회)`);

  const hk = count(page.cover?.h1);
  if (hk !== 1) push(`cover.h1에 keyword '${k}'는 1회여야 해요(현재 ${hk}회)`);

  const cards = Array.isArray(page.cards) ? page.cards : [];
  for (const kind of ['meaning', 'tips']) {
    const c = cards.find((x) => x?.kind === kind);
    if (c && count(c.heading) < 1) push(`${kind} heading에 keyword '${k}'가 있어야 해요`);
  }
  const withKw = cards.filter((c) => count(c?.heading) > 0).length;
  if (cards.length && (withKw < 2 || withKw > 3)) push(`heading 5개 중 keyword가 든 것은 2~3개여야 해요(현재 ${withKw}개)`);

  const first = strings(page.cover?.lead).join(' ').slice(0, 60);
  if (count(first) < 1) push(`cover.lead 앞 60자 안에 keyword '${k}'가 있어야 해요`);

  const blocks = bodyBlocks(page);
  const body = stripBold(blocks.flatMap((b) => b.texts).join(' '));
  const chars = noSpaceLength(body);
  if (chars < 900 || chars > 1600) push(`body는 공백 뺀 900~1,600자여야 해요(현재 ${chars}자)`);
  const total = countWords(body, kw);
  if (total < 6 || total > 12) push(`body keyword '${k}'는 6~12회여야 해요(현재 ${total}회)`);
  if (total > chars / 100) push(`body keyword ${total}회가 글자 수/100(${(chars / 100).toFixed(1)})을 넘어요. 100자에 1회 이하로 줄여요`);
  for (const b of blocks) {
    const n = countWords(stripBold(b.texts.join(' ')), kw);
    if (n > 3) push(`${b.name} 카드 keyword는 3회 이하여야 해요(현재 ${n}회)`);
  }
  if (isText(page.secondaryKeyword)) {
    const s = countWords(body, [page.secondaryKeyword]);
    if (s < 1 || s > 3) push(`body secondaryKeyword '${page.secondaryKeyword}'는 1~3회여야 해요(현재 ${s}회)`);
  }

  checkLength('cover.imageAlt', page.cover?.imageAlt, 40, 80, push);
  const ak = count(page.cover?.imageAlt);
  if (ak !== 1) push(`cover.imageAlt keyword '${k}'는 1회여야 해요(현재 ${ak}회)`);
}

/** Body text blocks: at most one emoji and one bold span each, and no unclosed bold. label names the block in messages. */
function checkEmphasis(blocks, push) {
  for (const { label, texts } of blocks) {
    const e = emojiCount(texts.join(' '));
    if (e > 1) push(`${label} 이모지는 1개까지예요(현재 ${e}개)`);
    if (texts.some((t) => t.split('**').length % 2 === 0)) push(`${label}에 닫히지 않은 굵게(**) 표시가 있어요`);
    const pairs = texts.reduce((n, t) => n + Math.floor((t.split('**').length - 1) / 2), 0);
    if (pairs > 1) push(`${label} 굵게(**)는 1곳까지예요(현재 ${pairs}곳)`);
  }
}

function checkBody(page, push) {
  checkEmphasis(
    bodyBlocks(page).map((b) => ({ label: `${b.name} 카드`, texts: b.texts })),
    push,
  );
}

/**
 * Image alts of cards 2 to 6 (skill 「SEO 배치」 이미지 행, 「문체」): length, keyword at most once each and twice in all,
 * no emoji and no bold. The alts are not body text, so they stay out of the body length and keyword counts.
 * Like the cover alt, the keyword itself is counted, not its variants.
 */
function checkCardAlts(page, push) {
  const cards = Array.isArray(page.cards) ? page.cards : [];
  const named = cards.map((c) => [`${str(c?.kind) || '?'}.imageAlt`, c?.imageAlt]);
  for (const [name, alt] of named) checkLength(name, alt, CARD_ALT_LENGTH[0], CARD_ALT_LENGTH[1], push);
  checkPlain(named, push);
  const k = page.keyword;
  if (!isText(k)) return;
  let total = 0;
  for (const [name, alt] of named) {
    const n = countWords(str(alt), [k]);
    total += n;
    if (n > CARD_ALT_KEYWORD.each) push(`${name} keyword '${k}'는 ${CARD_ALT_KEYWORD.each}회 이하여야 해요(현재 ${n}회)`);
  }
  if (total > CARD_ALT_KEYWORD.total) {
    push(`카드 imageAlt keyword '${k}'는 다섯 장 합쳐 ${CARD_ALT_KEYWORD.total}회 이하여야 해요(현재 ${total}회)`);
  }
}

function checkHub(hub, categoryIds, push) {
  for (const f of ['title', 'description', 'h1', 'imageAlt']) if (!isText(hub[f])) push(`${f}가 비었어요`);
  const n = normalizeHub(hub, categoryIds);
  if (!n.lead.length || !n.lead.every(isText)) push('lead가 비었어요');
  for (const c of n.categories) {
    if (!isText(c.heading) || !isText(c.intro)) push(`categories에 '${c.category}' 분류의 heading과 intro가 있어야 해요`);
  }
  for (const f of ['datePublished', 'dateModified']) if (!isDate(hub[f])) push(`${f}는 YYYY-MM-DD 날짜여야 해요(현재 '${hub[f]}')`);
  const title = str(hub.title);
  if (title.length > 40) push(`title은 40자 이하여야 해요(현재 ${title.length}자)`);
  if (!title.includes(FIELD_NAME)) push(`title에 분야 이름 '${FIELD_NAME}'이 없어요`);
  if (!title.endsWith(` | ${BRAND}`)) push(`title은 ' | ${BRAND}'로 끝나야 해요`);
  checkLength('description', hub.description, 70, 120, push);
  if (!str(hub.description).includes(FIELD_NAME)) push(`description에 분야 이름 '${FIELD_NAME}'이 없어요`);
  checkLength('imageAlt', hub.imageAlt, 40, 80, push);
  checkPlain(
    [
      ['title', hub.title],
      ['description', hub.description],
      ['h1', hub.h1],
      ['imageAlt', hub.imageAlt],
      ...n.categories.map((c) => [`categories.${c.category} heading`, c.heading]),
    ],
    push,
  );
  // The lead and each category intro are body text: the same emoji and bold limits as a term card.
  checkEmphasis(
    [{ label: 'lead', texts: n.lead }, ...n.categories.map((c) => ({ label: `categories.${c.category} intro`, texts: [c.intro] }))],
    push,
  );
  checkPromo(hub, push);
  checkForbidden(hub, '', push);
}

/**
 * Every text of the app promo block with its path, in block order (title, lead, points, note, button).
 * Exported for the output check of the build.
 */
export function promoTexts(hub) {
  const p = hub?.appPromo && typeof hub.appPromo === 'object' ? hub.appPromo : {};
  const points = Array.isArray(p.points) ? p.points : [];
  return [
    ['appPromo.title', p.title],
    ...(Array.isArray(p.lead) ? p.lead : []).map((t, i) => [`appPromo.lead[${i}]`, t]),
    ...points.flatMap((x, i) => [
      [`appPromo.points[${i}].name`, x?.name],
      [`appPromo.points[${i}].text`, x?.text],
    ]),
    ['appPromo.note', p.note],
    ['appPromo.button', p.button],
  ];
}

/** guideSource, appPromo and analyticsNotice of the hub (skill 「원천 JSON」 _hub.json, 「앱 안내와 이동 버튼」, 「방문 통계」). */
function checkPromo(hub, push) {
  if (!isText(hub.guideSource) || !GUIDE_SOURCE_FORMAT.test(hub.guideSource)) {
    push(`guideSource는 영문 소문자, 숫자, 하이픈으로 된 값이어야 해요(현재 '${hub.guideSource}')`);
  }
  if (!isText(hub.analyticsNotice)) push('analyticsNotice가 비었어요. 푸터의 방문 통계 안내 한 줄이에요');
  const p = hub.appPromo;
  if (!p || typeof p !== 'object' || Array.isArray(p)) {
    push('appPromo가 없어요. title, lead, points, note, button을 넣어요');
    return;
  }
  for (const f of ['title', 'note', 'button']) if (!isText(p[f])) push(`appPromo.${f}가 비었어요`);
  const lead = Array.isArray(p.lead) && p.lead.every(isText) ? p.lead.length : -1;
  if (lead < PROMO_LEAD[0] || lead > PROMO_LEAD[1]) {
    push(`appPromo.lead는 비지 않은 문장 ${PROMO_LEAD[0]}~${PROMO_LEAD[1]}개 목록이어야 해요(현재 ${lead < 0 ? '형식 오류' : lead})`);
  }
  if (!Array.isArray(p.points) || p.points.length !== PROMO_POINTS) {
    push(`appPromo.points는 ${PROMO_POINTS}개여야 해요(현재 ${Array.isArray(p.points) ? p.points.length : '없음'})`);
  }
  (Array.isArray(p.points) ? p.points : []).forEach((x, i) => {
    for (const f of ['name', 'text']) if (!isText(x?.[f])) push(`appPromo.points[${i}].${f}가 비었어요`);
  });
  const texts = promoTexts(hub);
  checkPlain(texts, push);
  for (const [name, text] of texts) {
    for (const w of PROMISE_WORDS) if (str(text).includes(w)) push(`${name}에 효과를 보장하는 말 '${w}'을 쓸 수 없어요`);
  }
}

/**
 * One message per keyword found in a field, for the blocks under the cards that must not carry the page keyword.
 * Keywords are the outer loop, fields the inner one.
 * @param {[string, unknown][]} fields [path, text] pairs @param {string[]} keywords keyword and variants of the page
 * @param {string} suffix closing sentence naming the block @param {(m: string) => void} push
 * @param {string} [owner] the page the keywords belong to, as "{slug} 페이지 ", when the field is not in that page's file
 */
function pushKeywordHits(fields, keywords, suffix, push, owner = '') {
  for (const k of keywords) {
    for (const [name, text] of fields) {
      if (str(text).includes(k)) push(`${name}에 ${owner}keyword '${k}'가 있어요. ${suffix}`);
    }
  }
}

/** No page keyword (or variant) inside the app promo, which every page shows (skill 「앱 안내와 이동 버튼」). */
function checkPromoKeywords(hub, pages, terms, push) {
  const texts = promoTexts(hub);
  terms.forEach((meta, i) => {
    const page = pages[i];
    if (!page || typeof page !== 'object') return;
    pushKeywordHits(texts, keywordsOf(page), '앱 안내 블록에는 keyword를 넣지 않아요', push, `${meta.slug} 페이지 `);
  });
}

/** A page with a non-empty tools list shows the affiliate block (skill 「제휴 블록」). */
const hasTools = (page) => Array.isArray(page?.tools) && page.tools.length > 0;

/** An https address whose hostname is exactly one of AFFILIATE_HOSTS ("link.coupang.com.evil.org" and "x@evil.org" are not). */
function isAffiliateUrl(value) {
  if (!isText(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && AFFILIATE_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

const codePoints = (s) => [...s].length;

/** Banned words, prices and percents in affiliate copy fields (skill 「제휴 블록」 금지 표현). */
function checkAffiliateWords(fields, push) {
  for (const [name, value] of fields) {
    const text = str(value);
    for (const w of AFFILIATE_BANNED_WORDS) if (text.includes(w)) push(`${name}에 쓸 수 없는 말 '${w}'이 있어요. 효과를 약속하거나 판매를 재촉하는 말은 쓰지 않아요`);
    const price = PRICE_PATTERN.exec(text);
    if (price) push(`${name}에 가격 '${price[0]}'을 쓸 수 없어요. 가격은 바뀌므로 쓰지 않아요`);
    const percent = PERCENT_PATTERN.exec(text);
    if (percent) push(`${name}에 퍼센트 '${percent[0]}'를 쓸 수 없어요. 할인율은 바뀌므로 쓰지 않아요`);
  }
}

// Unlike checkLength (UTF-16 units, the SEO lengths), affiliate copy counts code points on purpose (skill 「제휴 블록」 문체, DEV-002).
/** Code point length of a filled field (an empty one is already reported as empty). */
function checkCopyLength(name, value, [min, max], push) {
  if (!isText(value)) return;
  const n = codePoints(value);
  if (n < min || n > max) push(`${name}은 ${min}~${max}자여야 해요(현재 ${n}자)`);
}

/**
 * Optional tools of a term page (skill 「제휴 블록」): 1 or 2 items with name, text and an affiliate url, no emoji, bold or
 * page keyword, no banned word, price or percent, name 2 to 30 characters and text one sentence of 10 to 60 characters.
 */
function checkTools(page, push) {
  const tools = page.tools;
  if (tools === undefined) return;
  if (!Array.isArray(tools)) {
    push('tools는 도구 목록(배열)이에요. name, text, url이 있는 항목 1~2개를 넣어요');
    return;
  }
  if (!tools.length) return;
  if (tools.length < TOOLS_COUNT[0] || tools.length > TOOLS_COUNT[1]) {
    push(`tools는 ${TOOLS_COUNT[0]}~${TOOLS_COUNT[1]}개여야 해요(현재 ${tools.length}개)`);
  }
  const keywords = keywordsOf(page);
  tools.forEach((t, i) => {
    for (const f of ['name', 'text']) if (!isText(t?.[f])) push(`tools[${i}].${f}가 비었어요`);
    if (!isAffiliateUrl(t?.url)) push(`tools[${i}].url은 https 주소이고 호스트가 ${AFFILIATE_HOSTS.join(', ')}여야 해요(현재 '${t?.url}')`);
    const fields = [
      [`tools[${i}].name`, t?.name],
      [`tools[${i}].text`, t?.text],
    ];
    checkPlain(fields, push);
    checkAffiliateWords(fields, push);
    checkCopyLength(`tools[${i}].name`, t?.name, TOOL_NAME_LENGTH, push);
    checkCopyLength(`tools[${i}].text`, t?.text, TOOL_TEXT_LENGTH, push);
    if (isText(t?.text) && !ONE_SENTENCE.test(t.text.trim())) {
      push(`tools[${i}].text는 한 문장이에요. 문장부호(., ?, !)는 끝에 하나만 써요`);
    }
    // One field at a time keeps the message order of fields first, then keywords.
    for (const field of fields) pushKeywordHits([field], keywords, '제휴 블록에는 keyword를 넣지 않아요', push);
  });
}

/**
 * The affiliate notice of the hub (skill 「제휴 블록」): needed as soon as one page has tools, and when present it has
 * a title and a disclosure. The title is a label (no emoji, bold, banned word, price or percent) and neither text carries the
 * keyword of a page that shows the block. The disclosure is the fixed Coupang sentence, so the word checks skip it, but it must
 * say that a commission is paid and say it without a conditional phrase (skill 「제휴 블록」 안내 문구).
 */
function checkAffiliate(hub, pages, terms, push) {
  const withTools = terms.filter((_, i) => hasTools(pages[i]));
  const a = hub.affiliate;
  if (a === undefined) {
    if (withTools.length) {
      push(`affiliate가 없어요. tools가 있는 페이지(${withTools.map((t) => t.slug).join(', ')})의 제휴 블록에 쓸 title과 disclosure를 넣어요`);
    }
    return;
  }
  if (!a || typeof a !== 'object' || Array.isArray(a)) {
    push('affiliate는 title과 disclosure가 있는 객체예요');
    return;
  }
  for (const f of ['title', 'disclosure']) if (!isText(a[f])) push(`affiliate.${f}가 비었어요`);
  if (isText(a.disclosure) && !a.disclosure.includes(DISCLOSURE_WORD)) {
    push(`affiliate.disclosure에 '${DISCLOSURE_WORD}'가 있어야 해요. 수수료를 받는다는 사실을 안내 문구에 써요`);
  }
  const conditional = isText(a.disclosure) ? CONDITIONAL_PATTERN.exec(a.disclosure)?.[0] : undefined;
  if (conditional) push(`affiliate.disclosure에 '${conditional}' 같은 조건부 표현을 쓸 수 없어요. 수수료를 받는다는 사실을 단정해서 써요`);
  checkPlain([['affiliate.title', a.title]], push);
  checkAffiliateWords([['affiliate.title', a.title]], push);
  terms.forEach((meta, i) => {
    if (!hasTools(pages[i])) return;
    const fields = [
      ['affiliate.title', a.title],
      ['affiliate.disclosure', a.disclosure],
    ];
    pushKeywordHits(fields, keywordsOf(pages[i]), '제휴 블록에는 keyword를 넣지 않아요', push, `${meta.slug} 페이지 `);
  });
}

/**
 * Every problem of the pages (in table order) and the hub, one "{file}: {message}" line each, empty when the source is right.
 * @param {{ pages: any[], hub: any }} content
 * @param {{ terms?: import('./terms.mjs').TermMeta[], categoryIds?: string[], hasImage?: (fileName: string) => boolean }} [options]
 *   terms: the term table, in page order; categoryIds: categories the hub must describe (the categories of terms by default);
 *   hasImage: whether images/{fileName} exists ("slab.webp", "slab.jpg", "slab-meaning.webp", "climbing.webp").
 *   It is asked for {slug}.webp and {slug}.jpg of every term and the hub, and {slug}-{kind}.webp for cards 2 to 6 of every
 *   term (no jpg for cards, no card images for the hub). Left out, no image is checked.
 * @returns {string[]}
 */
export function problems(content, { terms = TERMS, categoryIds = [...new Set(terms.map((t) => t.category))], hasImage } = {}) {
  const errors = [];
  const slugs = terms.map((t) => t.slug);
  const pages = Array.isArray(content?.pages) ? content.pages : [];
  terms.forEach((meta, i) => {
    const file = `${meta.slug}.json`;
    const push = (m) => errors.push(`${file}: ${m}`);
    const page = pages[i];
    if (!page || typeof page !== 'object') {
      push('원천이 없어요');
      return;
    }
    checkShape(page, meta, slugs, push);
    checkFragments(page, push);
    checkSeo(page, push);
    checkBody(page, push);
    checkCardAlts(page, push);
    for (const kind of CARD_KINDS) checkImages(hasImage, cardImageSlug(meta.slug, kind), push, ['webp']);
    checkPlain(
      [
        ['title', page.title],
        ['description', page.description],
        ['cover.h1', page.cover?.h1],
        ['cover.imageAlt', page.cover?.imageAlt],
        ...(Array.isArray(page.cards) ? page.cards : []).map((c) => [`${str(c?.kind) || '?'} heading`, c?.heading]),
      ],
      push,
    );
    checkTools(page, push);
    checkForbidden(page, '', push);
    checkImages(hasImage, meta.slug, push);
  });

  const hubPush = (m) => errors.push(`_hub.json: ${m}`);
  if (!content?.hub || typeof content.hub !== 'object') hubPush('원천이 없어요');
  else {
    checkHub(content.hub, categoryIds, hubPush);
    checkPromoKeywords(content.hub, pages, terms, hubPush);
    checkAffiliate(content.hub, pages, terms, hubPush);
  }
  checkImages(hasImage, HUB_IMAGE_SLUG, hubPush);
  return errors;
}

/**
 * Throws a ContentError with every problem (see problems).
 * @param {{ pages: any[], hub: any }} content @param {Parameters<typeof problems>[1]} [options]
 */
export function validate(content, options) {
  const errors = problems(content, options);
  if (errors.length) throw new ContentError(errors);
}
