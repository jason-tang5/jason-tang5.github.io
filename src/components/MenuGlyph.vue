<script setup>
// the little pixel glyphs down the left of a window menu, like windows 95's:
// restore, minimize, maximize, close and a check mark, drawn on a 9x9 grid
defineProps({ name: String });
const paths = {
  restore: 'M2 0h7v5H8V2H3V1H2zM0 3h7v6H0zM1 5v3h5V5z',
  minimize: 'M1 6h6v2H1z',
  maximize: 'M0 0h9v9H0zM1 2v6h7V2z',
  close: 'M0 1h2v1h1v1h1v1h1V3h1V2h1V1h2v1H8v1H7v1H6v1h1v1h1v1h1v1H7V7H6V6H5V5H4v1H3v1H2v1H0V7h1V6h1V5h1V4H2V3H1V2H0z',
  check: 'M7 1h1v1h1v1H8v1H7v1H6v1H5v1H4v1H3V7H2V6H1V5h1V4h1v1h1v1h1V5h1V4h1V3h1V2H7z',
};
</script>

<template>
  <svg class="menu-glyph" viewBox="0 0 9 9" aria-hidden="true" shape-rendering="crispEdges">
    <path v-if="paths[name]" :d="paths[name]" fill="currentColor" fill-rule="evenodd"/>
  </svg>
</template>
