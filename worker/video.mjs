// safari won't play a video unless the server answers range requests with 206
// partial content, and workers static assets always send the whole file with a
// 200. so .mp4 requests come through the worker (see run_worker_first in
// wrangler.jsonc), which fetches the asset and cuts out the requested bytes.
// kept separate from the worker so it can be tested in plain node.

export async function video(request, env) {
  // ask for the whole file, the slicing happens here
  const asset = await env.ASSETS.fetch(new Request(request.url, { method: request.method }));
  return partial(request, asset);
}

export async function partial(request, asset) {
  const headers = new Headers(asset.headers);
  headers.set('Accept-Ranges', 'bytes');

  const range = request.headers.get('Range');
  if (!asset.ok || !range || request.method !== 'GET') return new Response(asset.body, { status: asset.status, headers });

  const bytes = await asset.arrayBuffer();
  const size = bytes.byteLength;

  // only single ranges, which is all browsers ask for when playing video
  const match = range.match(/^bytes=(\d*)-(\d*)$/);
  let start;
  let end;
  if (match && match[1]) {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  } else if (match && match[2]) {
    // "bytes=-500" means the last 500 bytes
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  }

  if (start === undefined || start > end || start >= size) {
    headers.delete('Content-Length');
    headers.set('Content-Range', `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }

  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.delete('Content-Encoding');
  return new Response(bytes.slice(start, end + 1), { status: 206, headers });
}
