// CMS Worker crux-lab-cms (PLAN DEV-051, DEC-010). wrangler.cms.jsonc runs it first for /api/* only; every other address is
// the CMS static assets (dist-cms) with the SPA fallback, whose headers come from public-cms/_headers.
// POST /api/publish is the publish API; any other /api address or method answers JSON with the same no-index headers.
// warm-up.mjs runs a built-in fixture through the check and render once when the Worker loads (DEC-066).

import './warm-up.mjs';
import { apiResponse, handlePublish } from './publish.mjs';

export default {
  /**
   * @param {Request} request
   * @param {{ ASSETS: { fetch(r: Request): Promise<Response> }, GUIDE_KV: any, SUPABASE_URL: string, SUPABASE_ANON_KEY: string,
   *   PRIVACY_PUBLISHED?: string }} env
   */
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/publish') {
      if (request.method !== 'POST') return apiResponse(405, { kind: 'FAILED' }, { allow: 'POST' });
      return handlePublish({ request, env, fetchFn: (input, init) => fetch(input, init) });
    }
    if (pathname.startsWith('/api/')) return apiResponse(404, { kind: 'FAILED' });
    return env.ASSETS.fetch(request);
  },
};
