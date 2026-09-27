import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({ server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  await page.goto(`${server.resolvedUrls.local[0]}#app=2048`);
  await page.locator('.t48-stage').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await mkdir('tmp/qa', { recursive: true });
  let ratio;
  for (const [width, height] of [[540, 800], [1000, 650], [1300, 850], [400, 600], [800, 500], [540, 800], [1550, 1020]]) {
    await page.locator('[data-window="2048"]').evaluate((el, [w, h]) => {
      Object.assign(el.style, { width: `${w}px`, height: `${h}px`, left: '10px', top: '10px' });
    }, [width, height]);
    await expect(async () => {
      const geometry = await page.evaluate(() => {
        const el = selector => document.querySelector(selector);
        const box = selector => el(selector).getBoundingClientRect();
        const content = box('.t48-content'), stage = box('.t48-stage');
        const board = box('.t48-board'), monitor = box('.t48-monitor');
        const stand = box('.t48-stand');
        const cover = box('.t48-acrylic'), switches = box('.t48-switches');
        const socket = box('.t48-vga');
        const plug = box('.t48-plug'), path = el('.t48-cable path');
        const matrix = path.getScreenCTM();
        const start = path.getPointAtLength(0).matrixTransform(matrix);
        const end = path.getPointAtLength(path.getTotalLength()).matrixTransform(matrix);
        const points = Array.from({ length: 101 }, (_, i) => path.getPointAtLength(path.getTotalLength() * i / 100).matrixTransform(matrix));
        const housingStyle = selector => {
          const node = el(selector), style = getComputedStyle(node);
          const shadow = style.boxShadow.match(/(-?[\d.]+)px/);
          return { edge: shadow ? parseFloat(shadow[1]) * node.getBoundingClientRect().width / node.offsetWidth : 0, square: style.borderRadius === '0px' };
        };
        const monitorStyle = housingStyle('.t48-monitor'), boardStyle = housingStyle('.t48-board');
        return {
          matchingEdges: monitorStyle.edge > 0 && Math.abs(monitorStyle.edge - boardStyle.edge) < .1 && monitorStyle.square && boardStyle.square,
          wireClear: points.every(p => !(p.x > board.left && p.x < board.right && p.y > switches.top && p.y < board.bottom)),
          standOverlap: points.some(p => p.x >= stand.left && p.x <= stand.right && p.y >= stand.top && p.y <= stand.bottom),
          stacked: !el('.t48-stage').classList.contains('wide'),
          wireOnTop: +getComputedStyle(el('.t48-cable')).zIndex > +getComputedStyle(el('.t48-stand')).zIndex,
          fills: stage.width / content.width > .98 || stage.height / content.height > .98,
          pixelWire: !/[CSQA]/i.test(path.getAttribute('d')),
          fits: stage.left >= content.left - 1 && stage.right <= content.right + 1 && stage.top >= content.top - 1 && stage.bottom <= content.bottom + 1,
          ratio: board.width / monitor.width,
          coverFits: cover.left > board.left && cover.right < board.right && cover.top > board.top && cover.bottom < switches.top,
          cableAttached: Math.abs(start.x - (plug.left + plug.width / 2)) < 1 && Math.abs(start.y - socket.top) < 1 && start.y < plug.top && end.x > monitor.left && end.x < monitor.right && end.y < monitor.bottom && end.y > monitor.bottom - 20,
        };
      });
      assert.ok(geometry.matchingEdges, 'Monitor and board must have matching pixel bevels');
      assert.ok(geometry.fits, `Scene overflows at ${width}x${height}`);
      assert.ok(geometry.coverFits, `Acrylic overlaps controls at ${width}x${height}`);
      assert.ok(geometry.cableAttached, `Cable detached at ${width}x${height}`);
      assert.ok(geometry.wireClear, 'Cable crosses the board controls');
      assert.ok(geometry.wireOnTop, 'Cable must render above the stand');
      if (geometry.stacked) assert.ok(geometry.standOverlap, 'Stacked cable should overlap the stand');
      assert.ok(geometry.fills, 'Scene leaves unnecessary outer padding');
      assert.ok(geometry.pixelWire, 'Wire should use pixel steps');
      ratio ??= geometry.ratio;
      assert.ok(Math.abs(geometry.ratio - ratio) < 0.001, 'Board/monitor proportions changed');
    }).toPass({ timeout: 5000 });
    await page.locator('[data-window="2048"]').screenshot({ path: `tmp/qa/2048-${width}-${height}.png` });
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await page.locator('[data-window="2048"]').screenshot({ path: 'tmp/qa/2048-dark.png' });
  console.log('2048 resize, wire routing, and fill checks passed (seven window sizes).');
} finally {
  await browser.close();
  await server.close();
}
