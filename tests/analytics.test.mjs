import test from 'node:test';
import assert from 'node:assert/strict';
import { analytics, validateEvent, summarize, publicSummary, queries } from '../worker/analytics.mjs';
const event = { visit: 'abcd123456', name: 'snake-score', value: 12 };
const request = (path, options) => new Request(`https://jasontang.dev${path}`, options);
test('validates event schema and rejects malformed or personal data', () => {
  assert.deepEqual(validateEvent(event).doubles, [12]);
  for (const patch of [{ name: 'unknown' }, { visit: 'email@example.com' }, { detail: '<script>' }, { value: '12' }, { value: -1 }, { value: Infinity }, { value: 1000001 }, { device: 'tablet' }, { referrer: 'host/path?email=x' }]) assert.equal(validateEvent({ ...event, ...patch }), null);
});
test('records same-origin events and handles invalid payloads and missing storage', async () => {
  const points = [];
  const env = { EVENTS: { writeDataPoint: p => points.push(p) } };
  const post = (body, origin = 'https://jasontang.dev') => request('/api/event', { method: 'POST', headers: { Origin: origin }, body });
  assert.equal((await analytics(post(JSON.stringify(event)), env)).status, 204);
  assert.equal(points.length, 1);
  assert.equal((await analytics(post(JSON.stringify(event), 'https://elsewhere.test'), env)).status, 403);
  assert.equal((await analytics(post('x'), env)).status, 400);
  assert.equal((await analytics(post('x'.repeat(1001)), env)).status, 413);
  assert.equal((await analytics(post(JSON.stringify(event)), {})).status, 503);
  assert.equal((await analytics(request('/api/event'), env)).status, 405);
});
const rows = [
  { name: 'visit', count: '3', total: '0', device: 'phone', referrer: '' },
  { name: 'visit', count: '2', total: '0', device: 'desktop', referrer: 'example.com' },
  { name: 'snake-score', count: 9, total: 60, maximum: 14 },
  { name: 'snake-score', count: 3, total: 10, maximum: 7 },
  { name: 'breakout-complete', count: 4, total: 0 },
  { name: 'breakout-win', count: 2, total: 101 },
  { name: 'minesweeper-win', count: 3, total: 0 },
  { name: 'mail-error', count: 2, detail: 'email', total: 0 },
];
test('summary separates game completions from per-visit funnel and uses maximum score', () => {
  const result = summarize(rows, [{ day: '2026-09-26 00:00:00', visits: '5' }]);
  assert.equal(result.visitors, 5);
  assert.equal(result.snakeHighScore, 14);
  assert.equal(result.breakoutWins, 4);
  assert.equal(result.minesweeperWins, 3);
  assert.equal(result.breakout.averageWinSeconds, 51);
  assert.equal(result.funnel[3].count, 2);
  assert.equal(result.referrers[0].label, 'direct');
  assert.equal(result.daily[0].day, '2026-09-26');
  assert.deepEqual(Object.keys(publicSummary(result)), ['visitors', 'snakeHighScore', 'minesweeperWins', 'breakoutWins', 'daily']);
  assert.equal(summarize([]).snakeHighScore, 0);
});
test('summary routes protect private data, reject invalid periods and methods', async () => {
  const env = { CLOUDFLARE_ACCOUNT_ID: 'test', ANALYTICS_TOKEN: 'secret' };
  let calls = 0;
  const options = { verify: async () => false, fetcher: async (_url, init) => {
    calls++;
    assert.equal(init.headers.Authorization, 'Bearer secret');
    return Response.json({ data: init.body.includes('GROUP BY day') ? [] : rows });
  } };
  assert.equal((await analytics(request('/api/admin/analytics'), env, options)).status, 401);
  assert.equal(calls, 0);
  const result = await (await analytics(request('/api/analytics'), env, options)).json();
  assert.equal(result.visitors, 5);
  assert.equal(result.mail, undefined);
  assert.equal(result.referrers, undefined);
  assert.equal(result.funnel, undefined);
  assert.equal((await analytics(request('/api/analytics?days=0'), env, options)).status, 400);
  assert.equal((await analytics(request('/api/analytics', { method: 'POST' }), env, options)).status, 405);
  assert.equal((await analytics(request('/api/analytics'), {}, options)).status, 503);
  const privateResult = await (await analytics(request('/api/admin/analytics'), env, { ...options, verify: async () => true })).json();
  assert.equal(privateResult.mail.errors[0].count, 2);
  assert.throws(() => queries('30 OR 1=1'), RangeError);
  assert.match(queries(30).events, /MAX\(double1\)/);
});
