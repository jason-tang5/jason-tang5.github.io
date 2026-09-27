import { createOptimisticStats } from './optimistic-stats.mjs';
import { onLocalAnalytics } from './local-analytics.js';

// Keep snapshots across window closes and period switches, and observe changes
// even while the Analytics window is closed.
export const historySnapshots = new Map([7, 30, 90].map(days => [days, createOptimisticStats()]));
onLocalAnalytics(event => {
  for (const snapshot of historySnapshots.values()) snapshot.apply(event);
});
