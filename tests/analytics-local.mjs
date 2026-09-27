import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import { summarize } from '../worker/analytics.mjs';

const server = await createServer({ server: { port: 0 } });
await server.listen();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const history = summarize([]);
  history.balloonsPopped = 7;
  const live = { online: 2, leaderboard: [], leaderboardWeek: [], leaderboardMonth: [], leaderboardQuarter: [] };
  let reads = 0;
  let hold = false;
  let held;
  await page.route('**/api/analytics?*', route => {
    reads++;
    if (hold) held = route;
    else return route.fulfill({ json: history });
  });
  await page.route('**/api/stats', route => route.fulfill({ json: live }));
  await page.goto(server.resolvedUrls.local[0] + '#app=analytics');
  const card = label => page.locator('.score-card').filter({ has: page.getByText(label, { exact: true }) }).locator('strong');
  await expect(card('Balloons popped')).toHaveText('7');
  await page.evaluate(async () => {
    const { track } = await import('/src/analytics.js');
    const { save } = await import('/src/storage.js');
    track('balloon-pop');
    save('balloons-popped', '1');
    track('snake-score', '', 42, { player: 'JASON', playerId: 'player1234' });
  });
  await expect(card('Balloons popped')).toHaveText('8');
  await expect(card('Balloons you popped')).toHaveText('1');
  await expect(card('Highest Snake score')).toHaveText('42');
  await expect(page.locator('.analytics-cart').getByText('JASON', { exact: true })).toBeVisible();
  await expect.poll(() => reads).toBeGreaterThan(1);
  await expect(card('Balloons popped')).toHaveText('8'); // stale background result
  history.balloonsPopped = 8;
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeEnabled();
  await expect(card('Balloons popped')).toHaveText('8'); // no double count
  hold = true;
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect.poll(() => !!held).toBe(true);
  await page.evaluate(async () => (await import('/src/analytics.js')).track('balloon-pop'));
  await expect(card('Balloons popped')).toHaveText('9');
  hold = false;
  await held.fulfill({ json: history });
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeEnabled();
  await expect(card('Balloons popped')).toHaveText('9'); // event during request survives
  const graph = await page.locator('.visitor-history').boundingBox();
  const panels = await page.locator('.history-row > section').evaluateAll(els => els.map(el => {
    const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width };
  }));
  expect(panels[0].y).toBe(panels[1].y);
  expect(panels[0].y).toBeGreaterThan(graph.y + graph.height - 1);
  expect(graph.width).toBeGreaterThan(panels[0].width + panels[1].width);
  await page.locator('.history-row').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'tmp/analytics-local-layout.png' });
  await page.route('**/api/analytics?*', route => route.fulfill({ status: 503, json: {} }));
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByText('Site history is unavailable', { exact: false })).toBeVisible();
  await expect(card('Balloons popped')).toHaveText('9');
  await page.evaluate(async () => (await import('/src/storage.js')).save('snake-best', '60'));
  await expect(card('Your Snake best')).toHaveText('60');
  expect(errors).toEqual([]);
  console.log('Analytics updates immediately, reconciles without double counting, preserves changes through stale/error responses, and uses the requested layout.');
} finally {
  await browser.close();
  await server.close();
}
