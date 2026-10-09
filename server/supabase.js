const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const secretKey = process.env.SUPABASE_SECRET_KEY;
const legacyServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = secretKey || legacyServiceRoleKey;

export function requireSupabaseConfig() {
  if (!supabaseUrl || !apiKey) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY in server/.env.');
  }
}

export async function supabaseRequest(path, options = {}) {
  requireSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: apiKey,
      ...(legacyServiceRoleKey && !secretKey ? { Authorization: `Bearer ${legacyServiceRoleKey}` } : {}),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try {
      detail = JSON.parse(text).message || text;
    } catch { /* Keep the response text for a useful setup error. */ }
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }
  return text ? JSON.parse(text) : null;
}
