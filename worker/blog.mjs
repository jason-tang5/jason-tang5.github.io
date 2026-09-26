// blog posts written from the site. they live as one json list in workers kv
// (the BLOG binding in wrangler.jsonc). anyone can read them, only i can write:
//
//   GET    /api/blog               every post, newest first
//   GET    /api/blog/images/:name  an image pasted into a post
//   GET    /api/admin/login        access makes me sign in first, then this sends me back to the blog
//   GET    /api/admin/me           200 with my email if i'm signed in
//   PUT    /api/admin/blog/:slug   create or replace a post
//   DELETE /api/admin/blog/:slug   delete a post
//   POST   /api/admin/images       upload an image (the raw bytes), returns its src
//
// kept separate from the worker so it can be tested in plain node.
import { parse, safeSrc } from '../src/blog-markup.mjs';
import { verifyAccess } from './access.mjs';

export const limits = { title: 200, source: 50000, src: 500, image: 10 * 1024 * 1024 };

// no svg, it can carry scripts
const imageTypes = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };

const key = 'posts';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const clean = text => String(text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
const validSlug = slug => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 80;

function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return new Date(`${date}T00:00:00Z`).toISOString().startsWith(date);
}

export function validatePost(body, slug) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request.' };

  const title = clean(body.title);
  const date = clean(body.date);
  const leadImage = clean(body.leadImage);
  const source = String(body.source ?? '').replace(/\r\n?/g, '\n').trim();

  if (!validSlug(slug)) return { ok: false, error: 'The slug can only use lowercase letters, numbers and dashes.' };
  if (!title) return { ok: false, error: 'Give the post a title.' };
  if (title.length > limits.title) return { ok: false, error: 'That title is a bit long.' };
  if (!validDate(date)) return { ok: false, error: 'The date should look like 2026-09-26.' };
  if (leadImage && (!safeSrc(leadImage) || leadImage.length > limits.src)) return { ok: false, error: 'The lead image needs an https:// or site-relative address.' };
  if (!source) return { ok: false, error: 'The post is empty.' };
  if (source.length > limits.source) return { ok: false, error: `Posts can be up to ${limits.source} characters.` };

  return {
    ok: true,
    data: {
      slug,
      title,
      date,
      leadImage,
      lead: leadImage ? { type: 'image', src: leadImage, alt: title } : null,
      blocks: parse(source),
      source,
    },
  };
}

const newestFirst = (a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title);

async function load(env) {
  return (await env.BLOG.get(key, 'json')) || [];
}

async function save(env, posts) {
  await env.BLOG.put(key, JSON.stringify(posts.sort(newestFirst)));
}

export async function blog(request, env, { verify = verifyAccess } = {}) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === '/api/blog') {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
    return json({ posts: await load(env) });
  }

  const image = pathname.match(/^\/api\/blog\/images\/([a-f0-9]{64}\.[a-z]+)$/);
  if (image) {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
    const { value, metadata } = await env.BLOG.getWithMetadata(`image:${image[1]}`, 'arrayBuffer');
    if (!value) return json({ error: 'Not found.' }, 404);
    // named after a hash of the bytes, so it never changes
    return new Response(value, {
      headers: {
        'Content-Type': metadata.type,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  // everything below is admin only
  const email = await verify(request, env);
  if (!email) return json({ error: 'Sign in first.' }, 401);

  if (pathname === '/api/admin/login') return Response.redirect(new URL('/#app=blog', url).href, 302);
  if (pathname === '/api/admin/me') return json({ email });

  // access cookies go along with any request, so make sure writes come from the site itself
  const origin = request.headers.get('Origin');
  if (origin !== url.origin) return json({ error: 'Forbidden.' }, 403);

  if (pathname === '/api/admin/images') return upload(request, env);

  const match = pathname.match(/^\/api\/admin\/blog\/([^/]+)$/);
  if (!match) return json({ error: 'Not found.' }, 404);
  const slug = decodeURIComponent(match[1]);

  if (request.method === 'DELETE') {
    const posts = await load(env);
    await save(env, posts.filter(post => post.slug !== slug));
    return json({ ok: true });
  }

  if (request.method !== 'PUT') return json({ error: 'Method not allowed.' }, 405);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  const result = validatePost(body, slug);
  if (!result.ok) return json({ error: result.error }, 400);

  // renaming a post changes its slug, so drop the old copy too
  // (a brand new post has no previous slug, so it can't clobber an existing one)
  const previous = String(body.previousSlug ?? '');
  const all = await load(env);
  if (slug !== previous && all.some(post => post.slug === slug)) return json({ error: 'Another post already uses that slug.' }, 409);

  const posts = all.filter(post => post.slug !== slug && post.slug !== previous);
  posts.push(result.data);
  await save(env, posts);

  return json({ post: result.data });
}

async function upload(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim();
  const extension = imageTypes[type];
  if (!extension) return json({ error: 'Images can be png, jpeg, gif or webp.' }, 415);

  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) return json({ error: 'That image is empty.' }, 400);
  if (bytes.byteLength > limits.image) return json({ error: 'Images can be up to 10 MB.' }, 413);

  // the same image pasted twice is stored once
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const name = `${hash}.${extension}`;
  await env.BLOG.put(`image:${name}`, bytes, { metadata: { type } });

  return json({ src: `/api/blog/images/${name}` }, 201);
}
