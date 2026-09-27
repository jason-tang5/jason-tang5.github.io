<script setup>
// clippy, drawn on a 20x36 pixel grid: the wire is one path drawn three times (a dark
// outline, the steel, then a highlight down its left side), with big eyes and brows
// on top and a little shadow under him. used by reversi and the swipe hint on phones.
// shadow: false leaves the shadow off, for when he's peeking out from behind something.
// mood swaps his brows and eyes: neutral, happy, smug, surprised, sad, angry, thinking
import { computed } from 'vue';
const props = defineProps({ shadow: { type: Boolean, default: true }, mood: { type: String, default: 'neutral' } });

const clippy = {
  wire: 'M9 14V26L10 27H11L12 26V11L10 9H6L4 11V28L6 30H13L15 28V16',
  shine: 'M8 15h1v10H8zM3 12h1v16H3zM11 12h1v13h-1zM14 17h1v11h-1zM6 8h4v1H6z',
  shadow: 'M4 34h13v1H4zM6 35h9v1H6z',
  brows: 'M3 2h2v1H3zM5 1h3v1H5zM11 1h3v1h-3zM14 2h2v1h-2z',
  eyeOutline: 'M4 3h4v1H4zM3 4h1v5H3zM8 4h1v5H8zM4 9h4v1H4zM11 3h4v1h-4zM10 4h1v5h-1zM15 4h1v5h-1zM11 9h4v1h-4z',
  eyeWhite: 'M4 4h4v5H4zM11 4h4v5h-4z',
  eyeShade: 'M4 8h4v1H4zM11 8h4v1h-4z',
  pupils: 'M5 5h2v2H5zM12 5h2v2h-2z',
};

// what each mood changes. lids are drawn over the top of the eyes
const moods = {
  neutral: {},
  // smiling ^ ^ eyes, brows up
  happy: { pupils: 'M5 5h2v1H5zM4 6h1v2H4zM7 6h1v2H7zM12 5h2v1h-2zM11 6h1v2h-1zM14 6h1v2h-1z', eyeShade: '', brows: 'M3 1h2v1H3zM5 0h3v1H5zM11 0h3v1h-3zM14 1h2v1h-2z' },
  // half closed lids, flat brows, looking off to the side
  smug: { lids: 'M4 4h4v2H4zM11 4h4v2h-4z', lidLine: 'M4 6h4v1H4zM11 6h4v1h-4z', brows: 'M3 2h5v1H3zM11 2h5v1h-5z', pupils: 'M6 7h2v1H6zM13 7h2v1h-2z' },
  // brows shot up, tiny pupils
  surprised: { brows: 'M3 1h2v1H3zM5 0h3v1H5zM11 0h3v1h-3zM14 1h2v1h-2z', pupils: 'M5 5h2v2H5zM12 5h2v2h-2z'.replace(/h2v2/g, 'h1v1').replace('M5 5', 'M6 6').replace('M12 5', 'M13 6') },
  // worried brows, looking down
  sad: { brows: 'M3 2h3v1H3zM6 1h2v1H6zM11 1h2v1h-2zM13 2h3v1h-3z', pupils: 'M5 7h2v2H5zM12 7h2v2h-2z' },
  // brows pulled down into a V
  angry: { brows: 'M3 1h2v1H3zM5 2h2v1H5zM7 3h2v1H7zM10 3h2v1h-2zM12 2h2v1h-2zM14 1h2v1h-2z', pupils: 'M5 6h2v2H5zM12 6h2v2h-2z' },
  // one brow up, eyes rolled up to the corner
  thinking: { brows: 'M3 1h2v1H3zM5 0h3v1H5zM11 2h5v1h-5z', pupils: 'M4 4h2v2H4zM11 4h2v2h-2z' },
};
const face = computed(() => ({ ...clippy, ...(moods[props.mood] || {}) }));
</script>

<template>
  <svg viewBox="0 0 20 36" shape-rendering="crispEdges" aria-hidden="true" :data-mood="mood">
    <path v-if="shadow" :d="clippy.shadow" fill="#0000004d"/>
    <path :d="clippy.wire" transform="translate(0 2)" fill="none" stroke="#2b2d36" stroke-width="4" stroke-linejoin="miter"/>
    <path :d="clippy.wire" transform="translate(0 2)" fill="none" stroke="#9ba1ab" stroke-width="2" stroke-linejoin="miter"/>
    <path :d="clippy.shine" transform="translate(0 2)" fill="#e9edf2"/>
    <path :d="face.eyeOutline" fill="#111"/>
    <path :d="face.eyeWhite" fill="#fff"/>
    <path v-if="face.eyeShade" :d="face.eyeShade" fill="#c9ccd6"/>
    <path :d="face.pupils" fill="#111"/>
    <path v-if="face.lids" :d="face.lids" fill="#c9ccd6"/>
    <path v-if="face.lidLine" :d="face.lidLine" fill="#111"/>
    <path :d="face.brows" fill="#111"/>
  </svg>
</template>
