// Climbing term card news (TASK 20261111-094032_climbing-guide-cards, fact 2).
// The one table of the 17 term pages: slug, Korean term (PM list), category, English name,
// app tag code and app label (session 3️⃣ tb_attempt angle_tag, hold_tag, move_tag and src/domain/styleTags.ts).
// The app code and app label are copied here, never imported, so this script never reads src at run time.

/** Site address without a trailing slash. Canonical, og:url and sitemap URLs are built from it in one place. */
export const SITE_URL = 'https://pastcrux.com';
/**
 * Google Analytics 4 measurement id (G-...) shared with the app (skill 「방문 통계」). Empty: the pages carry no tag.
 * TASK 20261112-154358_card-news-app-funnel fact 4: the team lead fills it in from G-01 and builds again.
 */
export const GA_MEASUREMENT_ID = 'G-TPVFQMNH4D';
/**
 * Hosts an affiliate tool link may point at (skill 「제휴 블록」 링크 주소). Matched exactly against the URL hostname.
 * TASK 20261112-183409_revenue-model-constraints 「제휴 블록 자리」 5: Coupang Partners short links only.
 */
export const AFFILIATE_HOSTS = ['link.coupang.com'];
/** Path of the guide pages, with both slashes. */
export const GUIDE_PATH = '/climbing/';
/** Brand name for titles, breadcrumbs and JSON-LD author and publisher (DEC-005). */
export const BRAND = '크럭스랩';
/** Field name every title and description must carry (skill 「SEO 배치」). */
export const FIELD_NAME = '클라이밍';
/** Name of the hub page in breadcrumbs. */
export const HUB_NAME = '클라이밍 용어';
/** Image slug of the hub page (images/climbing.webp, .jpg). */
export const HUB_IMAGE_SLUG = 'climbing';
/** Generated images are 1024 x 1024 (skill 「이미지」). */
export const IMAGE_SIZE = 1024;

/** @typedef {'angle' | 'hold' | 'move'} Category */

/** @type {{ id: Category, label: string }[]} Category order on the hub page. */
export const CATEGORIES = [
  { id: 'angle', label: '벽 각도' },
  { id: 'hold', label: '홀드' },
  { id: 'move', label: '무브' },
];

/**
 * @typedef {object} TermMeta
 * @property {number} order
 * @property {string} slug
 * @property {string} term
 * @property {Category} category
 * @property {string} english
 * @property {string | null} appTag app style tag code, null for a term without an app tag (DEC-027)
 * @property {string | null} appLabel app label of the tag, null when appTag is null
 */

/** @type {TermMeta[]} */
export const TERMS = [
  { order: 1, slug: 'slab', term: '슬랩', category: 'angle', english: 'Slab', appTag: 'SLAB', appLabel: '슬랩' },
  { order: 2, slug: 'vertical-wall', term: '수직벽', category: 'angle', english: 'Vertical wall', appTag: 'VERTICAL', appLabel: '수직' },
  { order: 3, slug: 'overhang', term: '오버행', category: 'angle', english: 'Overhang', appTag: 'OVERHANG', appLabel: '오버행' },
  { order: 4, slug: 'roof', term: '루프벽', category: 'angle', english: 'Roof', appTag: 'ROOF', appLabel: '루프' },
  { order: 5, slug: 'crimp', term: '크림프', category: 'hold', english: 'Crimp', appTag: 'CRIMP', appLabel: '크림프' },
  { order: 6, slug: 'sloper', term: '슬로퍼', category: 'hold', english: 'Sloper', appTag: 'SLOPER', appLabel: '슬로퍼' },
  { order: 7, slug: 'pinch', term: '핀치', category: 'hold', english: 'Pinch', appTag: 'PINCH', appLabel: '핀치' },
  { order: 8, slug: 'pocket', term: '포켓', category: 'hold', english: 'Pocket', appTag: 'POCKET', appLabel: '포켓' },
  { order: 9, slug: 'jug', term: '저그', category: 'hold', english: 'Jug', appTag: 'JUG', appLabel: '저그' },
  { order: 10, slug: 'undercling', term: '언더', category: 'hold', english: 'Undercling', appTag: 'UNDER_SIDE', appLabel: '언더·사이드' },
  { order: 11, slug: 'sidepull', term: '사이드', category: 'hold', english: 'Sidepull', appTag: 'UNDER_SIDE', appLabel: '언더·사이드' },
  { order: 12, slug: 'dyno', term: '다이노', category: 'move', english: 'Dyno', appTag: 'DYNO', appLabel: '다이노' },
  { order: 13, slug: 'coordination', term: '코디네이션', category: 'move', english: 'Coordination', appTag: 'COORDINATION', appLabel: '코디네이션' },
  { order: 14, slug: 'static', term: '스태틱', category: 'move', english: 'Static', appTag: 'STATIC_TENSION', appLabel: '정적·텐션' },
  { order: 15, slug: 'compression', term: '컴프레션', category: 'move', english: 'Compression', appTag: 'COMPRESSION', appLabel: '컴프레션' },
  { order: 16, slug: 'heel-toe-hook', term: '힐/토훅', category: 'move', english: 'Heel hook / Toe hook', appTag: 'HEEL_TOE_HOOK', appLabel: '힐·토훅' },
  { order: 17, slug: 'mantle', term: '맨틀링', category: 'move', english: 'Mantle', appTag: 'MANTLE', appLabel: '맨틀' },
];
