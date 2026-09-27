// Run with node tests/taskbar-scroll.mjs.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  });
  await page.goto(server.resolvedUrls.local[0]);
  await page.locator('.taskbar-tab').waitFor();
  for (const height of [844, 660, 844]) {
    await page.setViewportSize({ width: 390, height });
    // Focusing an offscreen taskbar button used to scroll #app upward by 48px.
    await page.evaluate(() => document.querySelector('.start-button').focus());
    for (let toggle = 0; toggle < 3; toggle++) {
      const state = await page.evaluate(() => ({
        top: document.querySelector('.desktop-shell').getBoundingClientRect().top,
        scroll: document.querySelector('#app').scrollTop,
        height: document.querySelector('.desktop-shell').clientHeight,
      }));
      assert.deepEqual(state, { top: 0, scroll: 0, height });
      if (toggle < 2) {
        await page.getByRole('button', { name: /^(Show|Hide) the taskbar$/ }).click();
      }
    }
  }
  console.log('Mobile taskbar keeps the desktop anchored through focus, toggles and resizing.');
} finally {
  await browser?.close();
  await server.close();
}
