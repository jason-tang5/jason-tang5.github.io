import { chromium } from 'playwright';
const b = await chromium.launch();
for (const vp of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
const p = await b.newPage({ viewport: vp, hasTouch: vp.width < 700, isMobile: vp.width < 700 });
await p.goto('http://localhost:5199/');
await p.waitForTimeout(1500);
if (vp.width > 700) await p.locator('.taskbar *').filter({ hasText: /^CD Player$/ }).last().click({ force: true });
else await p.evaluate(() => {}); 
await p.waitForTimeout(800);
const w = p.locator('.window[data-window="music"]');
if (!(await w.count())) { console.log('no music window at', vp.width); await p.screenshot({ path: process.env.TEMP + '/m0.png' }); continue; }
console.log(vp.width, JSON.stringify(await p.evaluate(() => { const c=document.querySelector('.window[data-window="music"] .cd-app'); return {app:c.clientHeight, scroll:c.scrollHeight}; })));
await w.screenshot({ path: process.env.TEMP + `/w${vp.width}.png` });
await p.click('.window[data-window="music"] .cd-slot, .window[data-window="music"] [class*=eject]', { force: true }).catch(()=>console.log('no eject'));
await p.waitForTimeout(900);
console.log('ejected', JSON.stringify(await p.evaluate(() => { const c=document.querySelector('.window[data-window="music"] .cd-app'); return {app:c.clientHeight, scroll:c.scrollHeight}; })));
await w.screenshot({ path: process.env.TEMP + `/e${vp.width}.png` });
}
await b.close();
