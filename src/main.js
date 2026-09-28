import { createApp } from 'vue';
import App from './App.vue';
import { installTooltips } from './tooltips.js';
import './theme.css';

// the games load their code when they're opened. a tab still holding the page from
// before the last deploy (a phone brings one back from its cache) asks for files that
// are gone now, so the game never shows up. reloading gets the current page, and the
// #app= in the url opens the game again. once a minute at most, so a file that's
// really missing doesn't reload forever
addEventListener('vite:preloadError', event => {
  let last = 0;
  try { last = Number(sessionStorage.getItem('reloaded-for-update')) || 0; } catch {}
  if (Date.now() - last < 60000) return;
  try { sessionStorage.setItem('reloaded-for-update', String(Date.now())); } catch {}
  event.preventDefault();
  location.reload();
});

createApp(App).mount('#app');
installTooltips();
