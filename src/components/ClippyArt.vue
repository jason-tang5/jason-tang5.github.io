<script setup>
// clippy, drawn on a 20x36 pixel grid: the wire is one path drawn three times (a dark
// outline, the steel, then a highlight down its left side), with big eyes and brows
// on top and a little shadow under him. used by reversi and the swipe hint on phones.
// shadow: false leaves the shadow off, for when he's peeking out from behind something
defineProps({ shadow: { type: Boolean, default: true } });

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
</script>

<template>
  <svg viewBox="0 0 20 36" shape-rendering="crispEdges" aria-hidden="true">
    <path v-if="shadow" :d="clippy.shadow" fill="#0000004d"/>
    <path :d="clippy.wire" transform="translate(0 2)" fill="none" stroke="#2b2d36" stroke-width="4" stroke-linejoin="miter"/>
    <path :d="clippy.wire" transform="translate(0 2)" fill="none" stroke="#9ba1ab" stroke-width="2" stroke-linejoin="miter"/>
    <path :d="clippy.shine" transform="translate(0 2)" fill="#e9edf2"/>
    <path :d="clippy.eyeOutline" fill="#111"/>
    <path :d="clippy.eyeWhite" fill="#fff"/>
    <path :d="clippy.eyeShade" fill="#c9ccd6"/>
    <path :d="clippy.pupils" fill="#111"/>
    <path :d="clippy.brows" fill="#111"/>
  </svg>
</template>
