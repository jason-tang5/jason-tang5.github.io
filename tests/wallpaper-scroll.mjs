// Run with node tests/wallpaper-scroll.mjs.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ headless: true, ignoreDefaultArgs: ['--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.wallpaperDraws = { shapes: 0, frames: 0 };
    const bindings = new WeakMap();
    const bind = WebGL2RenderingContext.prototype.bindFramebuffer;
    WebGL2RenderingContext.prototype.bindFramebuffer = function (target, buffer) {
      bindings.set(this, buffer);
      return bind.call(this, target, buffer);
    };
    const draw = WebGL2RenderingContext.prototype.drawArrays;
    WebGL2RenderingContext.prototype.drawArrays = function (...args) {
      if (this.canvas.closest('.desktop-wallpaper')) window.wallpaperDraws[bindings.get(this) ? 'shapes' : 'frames']++;
      return draw.apply(this, args);
    };
  });
  await page.goto(server.resolvedUrls.local[0] + '#app=about');
  await page.waitForFunction(() => window.wallpaperDraws.frames > 10);
  const scroller = page.locator('.content-scroll').first();
  assert.equal(await scroller.evaluate(el => getComputedStyle(el, '::-webkit-scrollbar').width), '18px');
  for (const part of ['thumb', 'track', 'track-piece', 'button', 'corner']) {
    assert.match(await scroller.evaluate((el, part) => getComputedStyle(el, `::-webkit-scrollbar-${part}`).cursor, part), /pointer$/);
  }
  const box = await scroller.boundingBox();
  assert.ok(await scroller.evaluate(el => el.offsetWidth > el.clientWidth), 'native custom scrollbar is visible in this browser');
  const before = await page.evaluate(() => ({ ...window.wallpaperDraws, time: document.querySelector('.desktop-wallpaper video').currentTime }));
  const videoTimes = new Set([before.time]);
  await page.mouse.move(box.x + box.width - 9, box.y + 40);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(box.x + box.width - 9, box.y + 40 + i * 20);
    await page.waitForTimeout(20);
    videoTimes.add(await page.locator('.desktop-wallpaper video').evaluate(el => el.currentTime));
  }
  const during = await page.evaluate(() => ({ ...window.wallpaperDraws, paused: document.querySelector('.desktop-wallpaper video').paused, time: document.querySelector('.desktop-wallpaper video').currentTime }));
  await page.mouse.up();
  assert.ok(await scroller.evaluate(el => el.scrollTop > 0), 'manually dragging the thumb scrolls content');
  assert.equal(during.paused, false, 'wallpaper keeps playing throughout thumb drag');
  assert.ok(during.frames > before.frames, 'wallpaper keeps drawing throughout thumb drag');
  assert.ok(videoTimes.size > 1, 'video advances during the drag, including across loop boundaries');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelector('.desktop-wallpaper video')?.paused);
  console.log('Manual custom scrollbar drag works while the original wallpaper renderer keeps animating.');
} finally {
  await browser?.close();
  await server.close();
}
