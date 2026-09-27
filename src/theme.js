// light or dark, for the whole site. the taskbar's sun/moon button and desktop
// settings both flip it, and it sticks around between visits.
import { ref, watchEffect } from 'vue';
import { read, save } from './storage.js';
import { play } from './sound.js';

export const theme = ref(read('theme') === 'dark' ? 'dark' : 'light');

watchEffect(() => {
  document.documentElement.dataset.theme = theme.value;
  document.documentElement.style.colorScheme = theme.value;
});

export function setTheme(value) {
  if (value !== theme.value) play('theme', value === 'dark');
  theme.value = value;
  save('theme', value);
}
