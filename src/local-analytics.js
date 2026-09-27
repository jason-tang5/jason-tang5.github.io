const listeners = new Set();
export function localAnalytics(event) {
  for (const listener of listeners) listener(event);
}
export function onLocalAnalytics(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
