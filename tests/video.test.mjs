import test from 'node:test';
import assert from 'node:assert/strict';
import { partial } from '../worker/video.mjs';

const file = Uint8Array.from({ length: 1000 }, (_, i) => i % 256);
const asset = () => new Response(file, { headers: { 'Content-Type': 'video/mp4', 'Content-Length': '1000' } });
const get = range => new Request('https://jasontang.dev/a.mp4', { headers: range ? { Range: range } : {} });

test('without a range, sends the whole file and says ranges work', async () => {
  const response = await partial(get(), asset());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Accept-Ranges'), 'bytes');
  assert.equal((await response.arrayBuffer()).byteLength, 1000);
});

test('answers byte ranges with 206 and the right slice', async () => {
  for (const [range, start, end] of [['bytes=0-1', 0, 1], ['bytes=100-199', 100, 199], ['bytes=900-', 900, 999], ['bytes=-10', 990, 999], ['bytes=990-5000', 990, 999]]) {
    const response = await partial(get(range), asset());
    assert.equal(response.status, 206, range);
    assert.equal(response.headers.get('Content-Range'), `bytes ${start}-${end}/1000`);
    assert.equal(response.headers.get('Content-Length'), String(end - start + 1));
    assert.equal(response.headers.get('Content-Type'), 'video/mp4');
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), file.slice(start, end + 1));
  }
});

test('ranges past the end or that make no sense get 416', async () => {
  for (const range of ['bytes=1000-', 'bytes=500-100', 'bytes=0-1,5-6', 'items=0-1']) {
    const response = await partial(get(range), asset());
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get('Content-Range'), 'bytes */1000');
  }
});

test('missing files pass straight through', async () => {
  const response = await partial(get('bytes=0-1'), new Response('nope', { status: 404 }));
  assert.equal(response.status, 404);
});
