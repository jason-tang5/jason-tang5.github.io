import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, slugify } from '../src/blog-markup.mjs';
import { blog, validatePost } from '../worker/blog.mjs';
import { verifyAccess } from '../worker/access.mjs';

test('parses paragraphs, headings, images and code', () => {
  const blocks = parse([
    'First line',
    'same paragraph.',
    '',
    '## A heading',
    '![A dog](/assets/photos/dog-12.webp "good dog")',
    '```js',
    'const x = "<script>";',
    '',
    '```',
    'After.',
  ].join('\r\n'));

  assert.deepEqual(blocks, [
    { type: 'paragraph', text: 'First line same paragraph.' },
    { type: 'heading', text: 'A heading' },
    { type: 'image', src: '/assets/photos/dog-12.webp', alt: 'A dog', caption: 'good dog' },
    { type: 'code', language: 'js', code: 'const x = "<script>";\n' },
    { type: 'paragraph', text: 'After.' },
  ]);
});

test('images with unsafe addresses stay as plain text', () => {
  assert.deepEqual(parse('![x](javascript:alert(1))'), [{ type: 'paragraph', text: '![x](javascript:alert(1))' }]);
  assert.deepEqual(parse('![x](//evil.example/a.png)')[0].type, 'paragraph');
});

test('slugs are lowercase words joined by dashes', () => {
  assert.equal(slugify('  Hello, Wörld! 2026 '), 'hello-world-2026');
  assert.equal(slugify('!!!'), '');
});

const good = { title: 'Hi', date: '2026-09-26', leadImage: '', source: 'Hello there.' };

test('validates posts', () => {
  const result = validatePost(good, 'hi');
  assert.equal(result.ok, true);
  assert.deepEqual(result.data.blocks, [{ type: 'paragraph', text: 'Hello there.' }]);
  assert.equal(result.data.lead, null);

  assert.equal(validatePost(good, 'Bad Slug').ok, false);
  assert.equal(validatePost({ ...good, title: ' ' }, 'hi').ok, false);
  assert.equal(validatePost({ ...good, date: '2026-02-30' }, 'hi').ok, false);
  assert.equal(validatePost({ ...good, source: '' }, 'hi').ok, false);
  assert.equal(validatePost({ ...good, leadImage: 'javascript:alert(1)' }, 'hi').ok, false);
  assert.equal(validatePost({ ...good, leadImage: 'https://example.com/a.png' }, 'hi').data.lead.src, 'https://example.com/a.png');
});

function fakeEnv() {
  const store = new Map();
  return {
    store,
    BLOG: {
      get: async (key, type) => (store.has(key) ? (type === 'json' ? JSON.parse(store.get(key)) : store.get(key)) : null),
      put: async (key, value) => void store.set(key, value),
    },
  };
}

const site = 'https://jasontang.dev';
const signedIn = { verify: async () => 'me@example.com' };
const signedOut = { verify: async () => null };
const call = (env, method, path, body, options = signedIn, headers = { Origin: site }) => blog(
  new Request(site + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body && JSON.stringify(body) }),
  env,
  options,
);

test('anyone can read, only a signed in admin can write', async () => {
  const env = fakeEnv();

  assert.deepEqual(await (await call(env, 'GET', '/api/blog')).json(), { posts: [] });
  assert.equal((await call(env, 'GET', '/api/admin/me', null, signedOut)).status, 401);
  assert.equal((await call(env, 'PUT', '/api/admin/blog/hi', good, signedOut)).status, 401);
  assert.equal(env.store.size, 0);

  assert.deepEqual(await (await call(env, 'GET', '/api/admin/me')).json(), { email: 'me@example.com' });
  const login = await call(env, 'GET', '/api/admin/login');
  assert.equal(login.status, 302);
  assert.equal(login.headers.get('Location'), `${site}/#app=blog`);
});

test('writes must come from the site itself', async () => {
  const env = fakeEnv();
  assert.equal((await call(env, 'PUT', '/api/admin/blog/hi', good, signedIn, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await call(env, 'PUT', '/api/admin/blog/hi', good, signedIn, {})).status, 403);
  assert.equal(env.store.size, 0);
});

test('create, rename and delete posts', async () => {
  const env = fakeEnv();

  assert.equal((await call(env, 'PUT', '/api/admin/blog/hi', good)).status, 200);
  assert.equal((await call(env, 'PUT', '/api/admin/blog/older', { ...good, title: 'Older', date: '2025-01-01' })).status, 200);
  let { posts } = await (await call(env, 'GET', '/api/blog')).json();
  assert.deepEqual(posts.map(p => p.slug), ['hi', 'older']);

  // a new post can't take an existing slug
  assert.equal((await call(env, 'PUT', '/api/admin/blog/older', good)).status, 409);

  // editing with a new slug replaces the old copy
  assert.equal((await call(env, 'PUT', '/api/admin/blog/hello', { ...good, previousSlug: 'hi' })).status, 200);
  ({ posts } = await (await call(env, 'GET', '/api/blog')).json());
  assert.deepEqual(posts.map(p => p.slug), ['hello', 'older']);

  assert.equal((await call(env, 'DELETE', '/api/admin/blog/older')).status, 200);
  ({ posts } = await (await call(env, 'GET', '/api/blog')).json());
  assert.deepEqual(posts.map(p => p.slug), ['hello']);
});

// ---- cloudflare access tokens ----

const b64url = data => Buffer.from(data).toString('base64url');
const team = 'me.cloudflareaccess.com';
const env = { ACCESS_TEAM_DOMAIN: team, ACCESS_AUD: 'aud123', ADMIN_EMAIL: 'Me@example.com' };
const now = Date.parse('2026-09-26T12:00:00Z');

const pair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1' };
const keys = async () => [jwk];

async function token(claims, header = { alg: 'RS256', kid: 'k1' }) {
  const payload = { iss: `https://${team}`, aud: ['aud123'], email: 'me@example.com', exp: now / 1000 + 60, ...claims };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(unsigned));
  return `${unsigned}.${b64url(new Uint8Array(signature))}`;
}

const check = (jwt, overrides = env, header = 'Cf-Access-Jwt-Assertion') => verifyAccess(
  new Request(site, { headers: jwt ? { [header]: jwt } : {} }),
  overrides,
  { keys, now },
);

test('accepts a valid access token for the admin email', async () => {
  assert.equal(await check(await token({})), 'me@example.com');
  assert.equal(await check(`CF_Authorization=${await token({})}`, env, 'Cookie'), 'me@example.com');
});

test('rejects anything else', async () => {
  assert.equal(await check(null), null);
  assert.equal(await check('garbage'), null);
  assert.equal(await check(await token({ email: 'someone@else.com' })), null);
  assert.equal(await check(await token({ aud: ['other'] })), null);
  assert.equal(await check(await token({ iss: 'https://evil.cloudflareaccess.com' })), null);
  assert.equal(await check(await token({ exp: now / 1000 - 1 })), null);
  assert.equal(await check(await token({}, { alg: 'none', kid: 'k1' })), null);

  // tampered payload
  const [head, , signature] = (await token({})).split('.');
  const forged = b64url(JSON.stringify({ iss: `https://${team}`, aud: ['aud123'], email: 'me@example.com', exp: now / 1000 + 9999 }));
  assert.equal(await check(`${head}.${forged}.${signature}`), null);

  // fails closed when access isn't configured
  assert.equal(await check(await token({}), { ...env, ACCESS_AUD: '' }), null);
});
