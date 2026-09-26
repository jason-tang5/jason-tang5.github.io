import { ref, watch } from 'vue';
import { read, save } from './storage.js';

const saved = Number(read('image-ascii-columns', '90'));
// One detail setting for all photos. The renderer derives columns from size.
export const imageDetail = ref(Number.isFinite(saved) ? Math.min(220, Math.max(40, saved)) : 90);
watch(imageDetail, value => save('image-ascii-columns', value));
