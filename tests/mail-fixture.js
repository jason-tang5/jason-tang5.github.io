// mounts the mail window on its own so browser-check can test sending.
// on the real site it only opens after beating breakout, which takes too long in a test.
import { createApp } from 'vue';
import Mail from '../src/components/Mail.vue';

export function mountMail() {
  const host = document.createElement('div');
  host.id = 'mail-fixture';
  host.style = 'position:fixed;left:0;top:0;width:500px;height:450px;z-index:999999;background:#c0c0c0;display:flex';
  document.body.append(host);
  createApp(Mail).mount(host);
}
