// checks the cloudflare access token on admin requests.
// access sits in front of /api/admin/* and only lets me through, but the worker
// verifies the token itself too, so a misconfigured access rule fails closed (D-008)

const decode = part => Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const decodeJson = part => JSON.parse(new TextDecoder().decode(decode(part)));

let cached;

async function accessKeys(team) {
  if (cached?.team === team && cached.expires > Date.now()) return cached.keys;
  const response = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error(`couldn't load access keys (${response.status})`);
  const { keys } = await response.json();
  cached = { team, keys, expires: Date.now() + 10 * 60 * 1000 };
  return keys;
}

function cookie(request, name) {
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return null;
}

// returns the signed in email, or null. never throws on a bad token.
// env needs ACCESS_TEAM_DOMAIN (like me.cloudflareaccess.com), ACCESS_AUD and ADMIN_EMAIL
export async function verifyAccess(request, env, { keys = accessKeys, now = Date.now() } = {}) {
  const { ACCESS_TEAM_DOMAIN: team, ACCESS_AUD: aud, ADMIN_EMAIL: admin } = env;
  if (!team || !aud || !admin) return null;

  const token = request.headers.get('Cf-Access-Jwt-Assertion') || cookie(request, 'CF_Authorization');
  if (!token) return null;

  try {
    const [head, body, signature] = token.split('.');
    const header = decodeJson(head);
    const payload = decodeJson(body);
    if (header.alg !== 'RS256') return null;

    const jwk = (await keys(team)).find(key => key.kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(signature), new TextEncoder().encode(`${head}.${body}`));
    if (!valid) return null;

    const audiences = [payload.aud].flat();
    if (payload.iss !== `https://${team}` || !audiences.includes(aud)) return null;
    if (!(payload.exp * 1000 > now) || (payload.nbf && payload.nbf * 1000 > now)) return null;
    if (String(payload.email).toLowerCase() !== admin.toLowerCase()) return null;

    return payload.email;
  } catch {
    return null;
  }
}
