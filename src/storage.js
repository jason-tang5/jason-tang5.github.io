// tiny localstorage wrapper. storage can throw in private mode or when it's
// blocked, and the site should still work without it, so every call is guarded.
import { ref } from 'vue';
const prefix = 'jt-desktop:';
export const storageRevision = ref(0);
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === null || event.key.startsWith(prefix)) storageRevision.value++;
});

export function read(key, fallback = '') {
  try {
    return localStorage.getItem(prefix + key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(prefix + key, value);
    storageRevision.value++;
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(prefix + key);
    storageRevision.value++;
  } catch {
    // nothing to do, storage is optional
  }
}
