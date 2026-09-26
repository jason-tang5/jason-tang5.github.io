import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, inline, slugify } from '../src/blog-markup.mjs';
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
    { type: 'heading', level: 2, text: 'A heading' },
    { type: 'image', src: '/assets/photos/dog-12.webp', alt: 'A dog', caption: 'good dog' },
    { type: 'code', language: 'js', code: 'const x = "<script>";\n' },
    { type: 'paragraph', text: 'After.' },
  ]);
});

test('code blocks close however the fence is typed', () => {
  const code = (language = 'js') => [
    { type: 'code', language, code: 'let a = 1' },
    { type: 'paragraph', text: 'after' },
  ];
  assert.deepEqual(parse('```js\nlet a = 1\n```\nafter'), code());
  assert.deepEqual(parse('```js\nlet a = 1```\nafter'), code());
  assert.deepEqual(parse('```js\nlet a = 1\n```  after'), code());
  assert.deepEqual(parse('```let a = 1```\nafter'), code(''));
  assert.deepEqual(parse('```js\nlet a = 1'), [{ type: 'code', language: 'js', code: 'let a = 1' }]);
});

test('# ## and ### make big, medium and small headings, #hashtag stays text', () => {
  assert.deepEqual(parse('# Big\n## Mid\n### Small\n##Tight').map(b => b.level), [1, 2, 3, 2]);
  assert.deepEqual(parse('#hashtag')[0].type, 'paragraph');
  assert.deepEqual(parse('#### four')[0].type, 'paragraph');
});

test('discord style bold, italic, underline, strike and code', () => {
  const styled = text => inline(text).map(({ text: t, ...style }) => [Object.keys(style).sort().join('+'), t]);
  assert.deepEqual(styled('plain'), [['', 'plain']]);
  assert.deepEqual(styled('**b** *i* _i_ __u__ ~~s~~ `c`'), [
    ['bold', 'b'], ['', ' '], ['italic', 'i'], ['', ' '], ['italic', 'i'], ['', ' '],
    ['underline', 'u'], ['', ' '], ['strike', 's'], ['', ' '], ['code', 'c'],
  ]);
  assert.deepEqual(styled('***both***'), [['bold+italic', 'both']]);
  assert.deepEqual(styled('___both___'), [['italic+underline', 'both']]);
  assert.deepEqual(styled('*a **b** c*'), [['italic', 'a '], ['bold+italic', 'b'], ['italic', ' c']]);
  // code is literal, and these all stay plain text
  assert.deepEqual(styled('`**x**`'), [['code', '**x**']]);
  assert.deepEqual(styled('snake_case_name'), [['', 'snake_case_name']]);
  assert.deepEqual(styled('2 * 3 * 4'), [['', '2 * 3 * 4']]);
  assert.deepEqual(styled('**unclosed'), [['', '**unclosed']]);
  assert.deepEqual(styled('\\*not italic\\*'), [['', '*not italic*']]);
});

test('| rows | make tables, with an optional header and alignment', () => {
  const [before, table, after] = parse([
    'Before.',
    '| Field | Purpose | Size |',
    '|:------|:-------:|-----:|',
    '| `name` | Visitor\'s name | 20 |',
    '| website | a \\| pipe',
    'After.',
  ].join('\n'));

  assert.deepEqual(before, { type: 'paragraph', text: 'Before.' });
  assert.deepEqual(table, {
    type: 'table',
    header: ['Field', 'Purpose', 'Size'],
    align: ['left', 'center', 'right'],
    // short rows are filled out, \| is a plain pipe
    rows: [['`name`', 'Visitor\'s name', '20'], ['website', 'a | pipe', '']],
  });
  assert.deepEqual(after, { type: 'paragraph', text: 'After.' });

  // no divider line means no header
  assert.deepEqual(parse('| a | b |\n| c | d |')[0], {
    type: 'table', header: null, align: ['left', 'left'], rows: [['a', 'b'], ['c', 'd']],
  });
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
  assert.equal(result.data.subtitle, '');
  assert.equal(validatePost({ ...good, subtitle: '  walking through\nthe lifecycle ' }, 'hi').data.subtitle, 'walking through the lifecycle');
  assert.equal(validatePost({ ...good, subtitle: 'x'.repeat(201) }, 'hi').ok, false);
  assert.equal(validatePost({ ...good, leadImage: 'https://example.com/a.png' }, 'hi').data.lead.src, 'https://example.com/a.png');
});

function fakeEnv() {
  const store = new Map();
  const meta = new Map();
  return {
    store,
    BLOG: {
      get: async (key, type) => (store.has(key) ? (type === 'json' ? JSON.parse(store.get(key)) : store.get(key)) : null),
      put: async (key, value, options) => {
        store.set(key, value);
        meta.set(key, options?.metadata);
      },
      getWithMetadata: async key => ({ value: store.get(key) ?? null, metadata: meta.get(key) ?? null }),
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

test('pasted images upload and come back', async () => {
  const env = fakeEnv();
  const upload = (body, type = 'image/png', options = signedIn, headers = { Origin: site }) => blog(
    new Request(`${site}/api/admin/images`, { method: 'POST', headers: { 'Content-Type': type, ...headers }, body }),
    env,
    options,
  );
  const png = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);

  assert.equal((await upload(png, 'image/png', signedOut)).status, 401);
  assert.equal((await upload(png, 'image/png', signedIn, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await upload(png, 'image/svg+xml')).status, 415);
  assert.equal((await upload(new Uint8Array(0))).status, 400);
  assert.equal((await upload(new Uint8Array(10 * 1024 * 1024 + 1))).status, 413);
  assert.equal(env.store.size, 0);

  const response = await upload(png);
  assert.equal(response.status, 201);
  const { src } = await response.json();
  assert.match(src, /^\/api\/blog\/images\/[a-f0-9]{64}\.png$/);

  // the same image again reuses the same address
  assert.equal((await (await upload(png)).json()).src, src);
  assert.equal(env.store.size, 1);

  const image = await call(env, 'GET', src, null, signedOut, {});
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('Content-Type'), 'image/png');
  assert.equal(image.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.deepEqual(new Uint8Array(await image.arrayBuffer()), png);
  assert.equal((await call(env, 'GET', `/api/blog/images/${'0'.repeat(64)}.png`, null, signedOut, {})).status, 404);

  // and the parser accepts it as an image line
  assert.deepEqual(parse(`![Pasted image](${src})`)[0].type, 'image');
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
