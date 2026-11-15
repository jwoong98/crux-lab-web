// POST /api/publish of the CMS Worker crux-lab-cms (PLAN DEV-051, cms 기획 3️⃣, DEC-008, DEC-010, DEC-031, DEC-038 3 and 6,
// DEC-043, DEC-051, DEC-064). Order:
//   1. Body check (400) and the admin's token (401).
//   2. crux_cms_guide_source_bundle with that token: 401 stays 401, 42501 (not an admin) is 403.
//   3. HIDE_GUIDE only (DEC-064 1): crux_cms_guide_list gives the target's slug; a published page whose related names it is
//      409 HIDE_BLOCKED (02p) before any content check.
//   4. The generator checks on the whole site the bundle describes (core problems(), the generator's own text DEC-031),
//      then the output checks of the files this action renders (kv-plan.mjs, render-parts.mjs). Any problem is 409
//      CHECK_FAILED and nothing has changed.
//   5. The action's transaction RPC (REFLECT: on its first batch only): no answer or a 5xx is 500 UNKNOWN (it may have
//      committed, DEC-082), PT409 UPDATED_ELSEWHERE is 409 CONFLICT, PT409 HIDE_BLOCKED is 409 HIDE_BLOCKED with the slugs,
//      401 and 42501 as in 2, anything else 500 FAILED. The transaction leaves tb_guide_hub at FAIL (반영 대기).
//   6. KV writes of the rendered files, then crux_cms_reflect_mark DONE (200 DONE) or FAIL with the reason (200
//      REFLECT_FAILED; the DB change stays and REFLECT writes the same keys again). A REFLECT batch that is not the last
//      answers 200 CONTINUE with the next cursor and marks nothing.
// The Worker holds no secret: Supabase checks the admin on every call. The public Worker only reads these KV keys.

import { problems } from '../scripts/climbing-guide/content-core.mjs';
import { bundleToSite } from '../scripts/climbing-guide/source-bundle.mjs';
import { GA_MEASUREMENT_ID } from '../scripts/climbing-guide/terms.mjs';
import { actionPlan, kvWrites, relatersOf } from './kv-plan.mjs';
import { renderParts } from './render-parts.mjs';
import { downloadObject, rpc } from './supabaseRest.mjs';

/** Every /api answer: JSON, never cached, never indexed, never framed (cms 기획 2️⃣ 78, PLAN DEV-051). */
const API_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex, nofollow',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
};

/** @param {number} status @param {unknown} body @param {Record<string, string>} [headers] */
export const apiResponse = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { ...API_HEADERS, ...headers } });

const FAILED = { kind: 'FAILED' };
/** The transaction's result is not known (no answer, a 5xx, a throw after it was sent): it may have committed (DEC-082). */
const UNKNOWN = { kind: 'UNKNOWN' };
const PRIVACY_HREF = '/privacy/';
/** The CMS text for a category the editor cannot offer (cms 기획 CRUX-CMS-02v-1 7): no category row, or one without guide_label. */
const NO_CATEGORY = '분류를 골라 주세요';
const REFLECT_ERROR_MAX = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Each action: whether the body needs id and base_updated_at, its transaction RPC (DEV-003) and the RPC arguments.
 * @type {Record<string, { id: boolean, base: boolean, transaction: string, args: (body: any) => Record<string, unknown> }>}
 */
const ACTIONS = {
  PUBLISH_GUIDE: { id: true, base: true, transaction: 'crux_cms_guide_publish', args: (b) => ({ p_id: b.id, p_base_updated_at: b.base_updated_at }) },
  HIDE_GUIDE: { id: true, base: false, transaction: 'crux_cms_guide_hide', args: (b) => ({ p_id: b.id }) },
  PUBLISH_HUB: { id: false, base: true, transaction: 'crux_cms_hub_publish', args: (b) => ({ p_base_updated_at: b.base_updated_at }) },
  REFLECT: { id: false, base: false, transaction: 'crux_cms_guide_reflect', args: () => ({}) },
};

/**
 * The request body { action, id, base_updated_at, cursor }, or null when it is not one the actions accept.
 * base_updated_at is required for the two publishes so the transaction refuses a draft saved after the bundle was read
 * (PT409). cursor (REFLECT only, default 0) is a whole number the previous CONTINUE answer gave.
 */
async function readBody(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  if (!body || typeof body !== 'object' || !Object.hasOwn(ACTIONS, body.action)) return null;
  const spec = ACTIONS[body.action];
  if (spec.id && !(typeof body.id === 'string' && UUID.test(body.id))) return null;
  if (spec.base && !(typeof body.base_updated_at === 'string' && body.base_updated_at !== '')) return null;
  if (body.action === 'REFLECT' && body.cursor !== undefined && !(Number.isInteger(body.cursor) && body.cursor >= 0)) return null;
  return body;
}

const bearerToken = (request) => /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '')?.[1] ?? null;

/** 401 (token expired or refused) and 42501 (no longer an admin) of any Supabase call. */
function authFailure(result) {
  if (result.status === 401) return apiResponse(401, { kind: 'UNAUTHORIZED' });
  if (result.code === '42501') return apiResponse(403, { kind: 'FORBIDDEN' });
  return null;
}

/** HIDE_BLOCKED carries the blocking slugs as a JSON array in the error detail (DEV-003). */
function blockingSlugs(detail) {
  try {
    const slugs = JSON.parse(detail ?? '[]');
    return Array.isArray(slugs) ? slugs.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function transactionFailure(result) {
  if (result.status === 0 || result.status >= 500) return apiResponse(500, UNKNOWN);
  const auth = authFailure(result);
  if (auth) return auth;
  if (result.code === 'PT409' && result.message === 'UPDATED_ELSEWHERE') return apiResponse(409, { kind: 'CONFLICT' });
  if (result.code === 'PT409' && result.message === 'HIDE_BLOCKED') return apiResponse(409, { kind: 'HIDE_BLOCKED', slugs: blockingSlugs(result.detail) });
  return apiResponse(500, FAILED);
}

/**
 * The whole-site source check (DEC-051 categories first, then core problems).
 * @returns {{ problems: string[] } | { site: ReturnType<typeof bundleToSite> }}
 */
function checkSite(bundle) {
  // DEC-051: bundleToSite needs a category row with a guide label for every page; say so instead of failing with 500.
  const offered = new Set(bundle.categories.map((c) => c.category_code));
  const uncategorized = bundle.pages.filter((p) => !offered.has(p.category_code)).map((p) => `${p.slug}.json: ${NO_CATEGORY}`);
  if (uncategorized.length) return { problems: uncategorized };
  const site = bundleToSite(bundle);
  const found = problems(site.content, { terms: site.terms, categoryIds: site.categories.map((c) => c.id), hasImage: site.hasImage });
  return found.length ? { problems: found } : { site };
}

/** Runs the writes one by one and stops at the first failure. @returns {Promise<string | null>} the failure, or null */
async function writeKv(env, token, writes, fetchFn) {
  const kv = env.GUIDE_KV;
  for (const w of writes) {
    try {
      if (w.verb === 'delete') await kv.delete(w.key);
      else if (w.objectName) {
        const bytes = await downloadObject(env, token, w.objectName, fetchFn);
        await kv.put(w.key, bytes, { metadata: { contentType: w.objectName.endsWith('.jpg') ? 'image/jpeg' : 'image/webp' } });
      } else await kv.put(w.key, w.value);
    } catch (error) {
      return `${w.verb} ${w.key}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  return null;
}

/** @param {{ transactionSent: boolean }} state set once the transaction request goes out */
async function publish(request, env, fetchFn, state) {
  const body = await readBody(request);
  if (!body) return apiResponse(400, FAILED);
  const token = bearerToken(request);
  if (!token) return apiResponse(401, { kind: 'UNAUTHORIZED' });
  const call = (name, args) => rpc(env, token, name, args, fetchFn);
  const spec = ACTIONS[body.action];
  const cursor = body.action === 'REFLECT' ? (body.cursor ?? 0) : 0;

  const source = await call('crux_cms_guide_source_bundle', { p_action: body.action, p_id: spec.id ? body.id : null });
  if (!source.ok) return authFailure(source) ?? apiResponse(500, FAILED);
  const bundle = source.data;

  let targetSlug = null;
  if (body.action === 'HIDE_GUIDE') {
    const list = await call('crux_cms_guide_list', {});
    if (!list.ok) return authFailure(list) ?? apiResponse(500, FAILED);
    targetSlug = list.data?.pages?.find((p) => p.id === bundle.target_id)?.slug ?? null;
    if (!targetSlug) return apiResponse(500, FAILED);
    const blockers = relatersOf(bundle.pages, targetSlug);
    if (blockers.length) return apiResponse(409, { kind: 'HIDE_BLOCKED', slugs: blockers });
  }

  const checked = checkSite(bundle);
  if ('problems' in checked) return apiResponse(409, { kind: 'CHECK_FAILED', problems: checked.problems });
  const { site } = checked;
  const plan = actionPlan(body.action, bundle, site, { targetSlug, cursor });
  const rendered = renderParts(
    site.content,
    { terms: site.terms, categories: site.categories, measurementId: GA_MEASUREMENT_ID, privacyHref: env.PRIVACY_PUBLISHED === 'true' ? PRIVACY_HREF : '' },
    plan,
  );
  if (rendered.problems.length) return apiResponse(409, { kind: 'CHECK_FAILED', problems: rendered.problems });
  const writes = kvWrites(plan, rendered.outputs);

  if (body.action !== 'REFLECT' || cursor === 0) {
    state.transactionSent = true;
    const transaction = await call(spec.transaction, spec.args(body));
    if (!transaction.ok) return transactionFailure(transaction);
  }

  const failure = await writeKv(env, token, writes, fetchFn);
  if (failure === null && plan.next !== null) return apiResponse(200, { kind: 'CONTINUE', cursor: plan.next, done: plan.next, total: plan.total });
  // The answer follows the KV result; a failed mark leaves the last reflect_status, which the CMS list shows.
  await call(
    'crux_cms_reflect_mark',
    failure === null ? { p_reflect_status: 'DONE', p_reflect_error: null } : { p_reflect_status: 'FAIL', p_reflect_error: failure.slice(0, REFLECT_ERROR_MAX) },
  );
  return apiResponse(200, { kind: failure === null ? 'DONE' : 'REFLECT_FAILED' });
}

/**
 * @param {{ request: Request, env: { SUPABASE_URL: string, SUPABASE_ANON_KEY: string, PRIVACY_PUBLISHED?: string, GUIDE_KV: any },
 *   fetchFn: (input: string, init?: RequestInit) => Promise<Response> }} input
 * @returns {Promise<Response>} 200 { kind: 'DONE' | 'REFLECT_FAILED' } | { kind: 'CONTINUE', cursor, done, total } (REFLECT),
 *   409 { kind: 'CHECK_FAILED', problems } | { kind: 'CONFLICT' } | { kind: 'HIDE_BLOCKED', slugs }, 403 { kind: 'FORBIDDEN' },
 *   401 { kind: 'UNAUTHORIZED' }, 400 or 500 { kind: 'FAILED' }, 500 { kind: 'UNKNOWN' }
 */
export async function handlePublish({ request, env, fetchFn }) {
  const state = { transactionSent: false };
  try {
    return await publish(request, env, fetchFn, state);
  } catch {
    return apiResponse(500, state.transactionSent ? UNKNOWN : FAILED);
  }
}
