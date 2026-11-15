// Warm-up of the CMS Worker at module load (DEC-066). The first run of the generator code costs most of a cold request: the
// whole-site check about 6 ms and the first render about 2.5 ms before it is compiled (DEV-051 report, DEC-064 section),
// over the free plan's 10 ms CPU per request (DEC-018). Running a small built-in fixture through the same steps once at
// global scope moves that first compilation into Worker startup.
// Side-effect free: no env, KV, fetch or caches (they do not exist at global scope), no output kept, never throws.

import { problems } from '../scripts/climbing-guide/content-core.mjs';
import { bundleToSite } from '../scripts/climbing-guide/source-bundle.mjs';
import { GA_MEASUREMENT_ID } from '../scripts/climbing-guide/terms.mjs';
import { actionPlan, kvWrites, relatersOf } from './kv-plan.mjs';
import { renderParts } from './render-parts.mjs';

const PAGE_ID = '00000000-0000-4000-8000-00000000a000';

/**
 * One term page in the source JSON shape (cards, lists, sources, tools) that reaches every check and render step. It
 * relates to itself, so the check reports a few related lines; the steps run all the same.
 */
const SOURCE = {
  slug: 'warm-up',
  term: '웜업',
  english: 'Warm-up',
  category: 'move',
  appTag: 'WARM_UP',
  appLabel: '웜업',
  keyword: '웜업',
  keywordVariants: ['몸풀기'],
  secondaryKeyword: '클라이밍 웜업',
  title: '웜업이란? 클라이밍 웜업 뜻과 순서 | 크럭스랩',
  description: '클라이밍 웜업은 오르기 전에 몸을 데우는 준비예요. 크럭스랩에서 웜업의 뜻과 순서, 자주 하는 실수를 짧게 정리했어요. 쉬운 문제부터 시작해요.',
  datePublished: '2026-11-01',
  dateModified: '2026-11-02',
  cover: { h1: '웜업, 오르기 전에 몸 데우기', lead: ['웜업은 쉬운 문제로 몸을 데우는 준비예요.', '**천천히** 시작해요 🧗'], imageAlt: '쉬운 벽 앞에서 어깨를 돌리며 웜업하는 클라이머와 매트가 있는 실내 암장' },
  cards: [
    { kind: 'meaning', heading: '웜업의 뜻', imageAlt: '팔을 앞뒤로 흔들며 손목과 어깨를 푸는 클라이머의 옆모습 그림', paragraphs: ['웜업은 본 등반 전에 하는 준비예요. 앱에서는 웜업 칩으로 골라요.'] },
    { kind: 'feature', heading: '웜업의 특징', imageAlt: '낮은 각도의 벽에서 큰 홀드를 잡고 가볍게 오르는 클라이머 그림', paragraphs: ['쉬운 문제를 여러 번 올라요.', '숨이 조금 찰 만큼만 해요.'] },
    { kind: 'tips', heading: '웜업 요령', imageAlt: '바닥에서 다리를 벌리고 스트레칭하는 클라이머와 타이머 그림', paragraphs: ['순서를 정해 두면 편해요.'], list: ['손목 돌리기', '어깨 돌리기', '쉬운 문제 두 개'] },
    { kind: 'caution', heading: '웜업 실수', imageAlt: '처음부터 작은 홀드에 매달려 손가락을 찡그리는 클라이머 그림', paragraphs: ['처음부터 세게 하지 않아요.'], list: ['작은 홀드부터 잡기', '쉬지 않고 계속하기'] },
    { kind: 'summary', heading: '웜업 한 줄 요약', imageAlt: '웜업을 마치고 물을 마시며 다음 문제를 고르는 클라이머 그림', paragraphs: ['몸을 데운 뒤에 어려운 문제로 가요.'] },
  ],
  related: ['warm-up', 'warm-up', 'warm-up'],
  sources: [
    { title: 'Warm-up', publisher: 'Example', url: 'https://example.com/warm-up' },
    { title: 'Climbing basics', publisher: 'Example', url: 'https://example.com/climbing' },
  ],
  tools: [{ name: '초크', text: '손의 땀을 줄여 주는 가루예요.', url: 'https://link.coupang.com/a/warmup' }],
};

/** The hub in the _hub.json shape, with the affiliate block the tools need. */
const HUB = {
  title: '클라이밍 용어 1가지 | 크럭스랩',
  description: '웜업처럼 암장에서 듣는 클라이밍 용어를 모았어요.',
  h1: '클라이밍 용어 모음',
  lead: ['자주 쓰는 클라이밍 용어를 모았어요.'],
  categories: { move: { heading: '무브 용어', intro: '몸을 옮기는 방법에 따라 붙인 이름이에요.' } },
  imageAlt: '여러 클라이머가 벽을 오르는 실내 암장',
  datePublished: '2026-11-01',
  dateModified: '2026-11-02',
  guideSource: 'climbing-guide',
  appPromo: {
    title: '크럭스랩에서 기록해 보세요',
    lead: ['크럭스랩은 볼더러를 위한 기록 앱이에요.'],
    points: [{ name: '스타일 찾기', text: '시도마다 스타일을 붙여요.' }],
    note: '회원가입 없이 바로 시작해요.',
    button: '지금 시작하기',
  },
  analyticsNotice: '방문 통계를 위해 Google Analytics 쿠키를 써요.',
  affiliate: { title: '연습할 때 쓰는 도구', disclosure: '이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.' },
};

/** A source bundle in the crux_cms_guide_source_bundle shape: the page with its six Storage images, and one hidden page. */
const BUNDLE = {
  action: 'REFLECT',
  target_id: PAGE_ID,
  pages: [
    {
      id: PAGE_ID,
      slug: SOURCE.slug,
      sort_order: 1,
      term: SOURCE.term,
      english: SOURCE.english,
      app_tag: SOURCE.appTag,
      app_label: SOURCE.appLabel,
      category_code: 'MOVE',
      image_source_type: 'STORAGE',
      image_kinds: ['COVER', 'MEANING', 'FEATURE', 'TIPS', 'CAUTION', 'SUMMARY'],
      source: SOURCE,
    },
  ],
  hidden_slugs: ['warm-down'],
  hub: { source: HUB },
  categories: [{ category_code: 'MOVE', guide_label: '무브', sort_order: 1 }],
};

let runs = 0;
/** @type {{ runs: number, ms: number, files: string[], error: string | null }} */
let state = { runs: 0, ms: 0, files: [], error: null };

/** The request steps of publish.mjs on the fixture: bundle to site, whole-site check, plans, partial render, KV writes. */
function warmUp() {
  runs += 1;
  const started = performance.now();
  try {
    const bundle = JSON.parse(JSON.stringify(BUNDLE));
    const site = bundleToSite(bundle);
    problems(site.content, { terms: site.terms, categoryIds: site.categories.map((c) => c.id), hasImage: site.hasImage });
    relatersOf(bundle.pages, SOURCE.slug);
    actionPlan('PUBLISH_GUIDE', bundle, site);
    actionPlan('HIDE_GUIDE', bundle, site, { targetSlug: 'warm-down' });
    const plan = actionPlan('REFLECT', bundle, site, { cursor: 0 });
    const rendered = renderParts(site.content, { terms: site.terms, categories: site.categories, measurementId: GA_MEASUREMENT_ID, privacyHref: '' }, plan);
    kvWrites(plan, rendered.outputs);
    state = { runs, ms: performance.now() - started, files: [...rendered.outputs.keys()], error: null };
  } catch (error) {
    state = { runs, ms: performance.now() - started, files: [], error: error instanceof Error ? error.message : String(error) };
  }
}

warmUp();

/** What the load-time warm-up did: how many times it ran (1 per Worker instance), its time, the files it rendered, any error. */
export const warmUpState = () => ({ ...state, files: [...state.files] });
