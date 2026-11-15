// Supabase calls of the CMS Worker (PLAN DEV-051, DEC-010, DEC-064 4): PostgREST RPC and the authenticated Storage object
// endpoint of guide-images, both with the admin's own access token and the public anon key. No service_role key and no
// secret: the server rules stay in the security definer functions and policies, which check the caller's admin row.

/** @typedef {{ SUPABASE_URL: string, SUPABASE_ANON_KEY: string }} SupabaseEnv */

const base = (env) => env.SUPABASE_URL.replace(/\/+$/, '');

/**
 * POST {SUPABASE_URL}/rest/v1/rpc/{name} with the named arguments.
 * @param {SupabaseEnv} env @param {string} token the admin's access token @param {string} name @param {Record<string, unknown>} args
 * @param {(input: string, init?: RequestInit) => Promise<Response>} fetchFn
 * @returns {Promise<{ ok: true, data: any } | { ok: false, status: number, code?: string, message?: string, detail?: string }>}
 *   data: the JSON answer, null for a void function (204 or an empty body); a PostgREST error gives its HTTP status and
 *   code, message, details (detail here); a network failure is status 0
 */
export async function rpc(env, token, name, args, fetchFn) {
  let response;
  try {
    response = await fetchFn(`${base(env)}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(args),
    });
  } catch (error) {
    return { ok: false, status: 0, message: error instanceof Error ? error.message : String(error) };
  }
  const text = await response.text();
  if (response.ok) {
    if (!text) return { ok: true, data: null };
    try {
      return { ok: true, data: JSON.parse(text) };
    } catch {
      return { ok: false, status: response.status, message: text.slice(0, 200) };
    }
  }
  /** @type {{ code?: string, message?: string, details?: string | null }} */
  let body = {};
  try {
    body = JSON.parse(text) ?? {};
  } catch {
    body = { message: text };
  }
  /** @type {{ ok: false, status: number, code?: string, message?: string, detail?: string }} */
  const fail = { ok: false, status: response.status };
  if (typeof body.code === 'string') fail.code = body.code;
  if (typeof body.message === 'string') fail.message = body.message;
  if (typeof body.details === 'string') fail.detail = body.details;
  return fail;
}

/**
 * The bytes of a guide-images object ({tb_guide_page.id}/cover.webp, DEC-030) as stored now: the authenticated object
 * endpoint with the admin's token (the admin select policy of DEC-043), not the public address, whose CDN copy can be an
 * older upload under the same name (DEC-064 4). Throws when the answer is not 2xx.
 * @param {SupabaseEnv} env @param {string} token @param {string} objectName
 * @param {(input: string, init?: RequestInit) => Promise<Response>} fetchFn
 * @returns {Promise<ArrayBuffer>}
 */
export async function downloadObject(env, token, objectName, fetchFn) {
  const response = await fetchFn(`${base(env)}/storage/v1/object/authenticated/guide-images/${objectName}`, {
    method: 'GET',
    headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Storage ${objectName} ${response.status}`);
  return response.arrayBuffer();
}
