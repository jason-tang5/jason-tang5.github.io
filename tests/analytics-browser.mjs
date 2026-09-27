import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';
const server = await createServer({ server: { port: 5188 } });
await server.listen();
const browser = await chromium.launch();
try {
  await mkdir('tmp/analytics', { recursive: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const sample = { visitors: 1234, snakeHighScore: 42, minesweeperWins: 19, breakoutWins: 31, daily: [{ day: new Date().toISOString().slice(0, 10), visits: 35 }],
    windows: [{ label: 'about', count: 9 }], blogPosts: [], funnel: [{ label: 'Visited the site', count: 1234 }], devices: [{ label: 'desktop', count: 800 }, { label: 'phone', count: 434 }],
    referrers: [{ label: 'direct', count: 1234 }], breakout: { losses: 3, averageWinSeconds: 40 }, mail: { errors: [], sent: 6, failed: 0 } };
  await page.route('**/api/analytics?*', route => route.fulfill({ json: sample }));
  await page.route('**/api/stats', route => route.fulfill({ json: { visitors: 5678, online: 2, minesweeperWins: 7, breakoutWins: 8, snakeHighScore: 99, clippyWins: 3, clippyLosses: 1, leaderboard: [{ rank: 1, player: 'Player ABC123', score: 99 }] } }));
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('http://localhost:5188/#app=analytics');
    await page.getByRole('tab', { name: 'Scoreboard' }).click();
    await expect(page.locator('.score-card')).toHaveCount(8);
    await expect(page.getByText('5,678', { exact: true })).toBeVisible();
    await expect(page.getByText('Your Snake best', { exact: true })).toBeVisible();
    await expect(page.getByText('3-1', { exact: true })).toBeVisible();
    await expect(page.getByText('Clippy wins 75%', { exact: true })).toBeVisible();
    await expect(page.locator('.pixel-pie')).toHaveCount(2);
    await expect(page.getByText('1,234', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '7 days' }).click();
    await expect(page.locator('.analytics-column')).toHaveCount(7);
    await page.getByRole('tab', { name: 'Behind the scenes' }).click();
    await expect(page.locator('.score-card')).toHaveCount(4);
    await expect(page.getByText('Messages sent', { exact: true })).toBeVisible();
    await expect(page.locator('.pixel-pie')).toHaveCount(1);
    const overflow = await page.locator('.analytics-page').evaluate(e => e.scrollWidth > e.clientWidth);
    if (overflow) throw new Error(`Overflow at ${width}`);
    await page.screenshot({ path: `tmp/analytics/${width}.png` });
  }
  await page.route('**/api/analytics?*', route => route.fulfill({ status: 503, json: { error: 'unavailable' } }));
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByText('Site history is unavailable', { exact: false })).toBeVisible();
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Analytics browser checks passed: desktop, 390px, 320px, period change, behind the scenes, service error.');
} finally { await browser.close(); await server.close(); }
