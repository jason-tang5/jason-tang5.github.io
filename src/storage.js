// tiny localstorage wrapper. storage can throw in private mode or when it's
// blocked, and the site should still work without it, so every call is guarded.
const prefix = 'jt-desktop:';

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
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(prefix + key);
  } catch {
    // nothing to do, storage is optional
  }
}
