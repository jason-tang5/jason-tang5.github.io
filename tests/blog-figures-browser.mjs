// Run with node tests/blog-figures-browser.mjs. Uses local fixtures, never Cloudflare writes.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';

const post = JSON.parse(await readFile(new URL('./fixtures/contact-post.json', import.meta.url), 'utf8'));
const server = await createServer({ server: { host: '127.0.0.1', port: 5196, strictPort: true } });
await server.listen();
let browser;
try {
  browser = await chromium.launch();
  await mkdir('tmp/qa/blog-figures', { recursive: true });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  const writes = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => {
    const request = route.request();
    if (request.method() !== 'GET') writes.push(request.url());
    const body = request.url().endsWith('/api/blog') ? { posts: [] }
      : request.url().endsWith('/api/admin/me') ? { email: 'fixture@example.com' } : {};
    return route.fulfill({ json: body });
  });
  await page.route('**/figure-check', route => route.fulfill({
    contentType: 'text/html',
    body: '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script type="module">import "/src/theme.css"; import { mountContactFixture } from "/tests/blog-fixture.js"; await mountContactFixture();</script></body></html>',
  }));
  await page.goto('http://127.0.0.1:5196/figure-check');
  await page.getByRole('button', { name: post.title, exact: true }).click();
  await expect(page.locator('.cf-figure')).toHaveCount(6);

  for (const width of [360, 600, 900]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      for (const size of ['Small', 'Medium', 'Large']) {
        await page.getByRole('button', { name: `${size} text`, exact: true }).click();
        const overflow = await page.locator('.blog-reading').evaluate(el => el.scrollWidth - el.clientWidth);
        assert.ok(overflow <= 1, `${width}/${theme}/${size}: article overflows by ${overflow}px`);
        const clipped = await page.locator('.cf-figure').evaluateAll(figures => figures.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.className));
        assert.deepEqual(clipped, [], `${width}/${theme}/${size}: figure overflow`);
      }
      await page.getByRole('button', { name: 'Small text', exact: true }).click();
      if (width !== 600) {
        for (const figure of ['mail', 'journey', 'spam', 'delivery', 'headers', 'pipeline']) {
          await page.locator(`.cf-figure--${figure}`).screenshot({ path: `tmp/qa/blog-figures/${width}-${theme}-${figure}.png` });
        }
      }
    }
  }

  const journey = page.locator('.cf-figure--journey');
  for (let i = 0; i < 5; i++) await journey.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(journey.locator('.cf-detail')).toContainText('Deliver');
  await expect(journey.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await journey.getByRole('button', { name: 'Empty message', exact: true }).click();
  await journey.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(journey.locator('.cf-detail')).toContainText('no request is sent');
  await journey.getByRole('button', { name: 'Send fails', exact: true }).click();
  for (let i = 0; i < 4; i++) await journey.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(journey.locator('.cf-detail')).toContainText('502');
  await journey.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(journey.getByRole('button', { name: 'Back', exact: true })).toBeDisabled();

  const spam = page.locator('.cf-figure--spam');
  await spam.getByRole('button', { name: 'another site', exact: true }).click();
  await expect(spam.locator('.cf-verdict')).toContainText('403');
  await spam.getByRole('button', { name: 'no header', exact: true }).click();
  await spam.getByRole('button', { name: 'Filled in', exact: true }).click();
  await expect(spam.locator('.cf-verdict')).toContainText('quietly dropped');
  await spam.getByRole('button', { name: 'Empty', exact: true }).click();
  await spam.getByRole('slider').fill('1');
  await expect(spam.locator('.cf-verdict')).toContainText('400');
  await spam.getByRole('slider').fill('3');
  await expect(spam.locator('.cf-verdict')).toContainText('200');

  const headers = page.locator('.cf-figure--headers');
  await headers.getByRole('button', { name: 'Raw', exact: true }).click();
  await expect(headers.locator('pre')).toContainText('=?UTF-8?B?');
  await headers.getByRole('button', { name: 'Readable', exact: true }).click();
  await headers.getByLabel('Name', { exact: true }).fill('Zoë Kim');
  await expect(headers.locator('pre')).toContainText('Zoë Kim');
  await headers.getByRole('button', { name: 'The visitor', exact: true }).click();
  await expect(headers.locator('pre')).not.toContainText('Reply-To:');
  await headers.getByLabel('Email', { exact: true }).fill('bad-address');
  await expect(headers.locator('.cf-error')).toContainText('doesn’t look right');
  await headers.getByLabel('Email', { exact: true }).fill('zoe@example.com');
  await headers.getByRole('button', { name: 'My domain', exact: true }).click();
  await expect(headers.locator('pre')).toContainText('Reply-To:');

  const pipes = page.locator('.cf-pipes');
  await pipes.getByRole('button', { name: 'Vue', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(pipes.getByRole('button', { name: 'HTTP', exact: true })).toBeFocused();
  await expect(pipes.getByRole('button', { name: 'HTTP', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const delivery = page.locator('.cf-figure--delivery');
  await delivery.getByRole('button', { name: 'Gmail', exact: true }).click();
  await expect(delivery.locator('.cf-detail')).toContainText('Reply-To');
  assert.equal(await journey.locator('.cf-wire i').first().evaluate(el => getComputedStyle(el).animationName), 'none');

  // The authenticated editor preview uses the same mapping; an edited image falls back.
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.cf-figure')).toHaveCount(6);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.locator('#blog-lead').fill('/tests/fixtures/vaporwave.svg');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.cf-figure')).toHaveCount(5);
  await expect(page.locator('article > figure > img')).toHaveAttribute('src', '/tests/fixtures/vaporwave.svg');
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, []);
  console.log('Blog figures: layout, themes, text sizes, controls, keyboard, reduced motion, preview and fallback passed. No API writes.');
} finally {
  await browser?.close();
  await server.close();
}
