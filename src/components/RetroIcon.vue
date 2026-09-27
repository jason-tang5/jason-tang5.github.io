<script setup>
// hand drawn 32x32 pixel icons for the desktop, menus and taskbar.
// "small" shrinks it for the taskbar and title bars. anything unknown falls back to a document.
defineProps({ name: { type: String, default: 'document' }, small: Boolean });
</script>
<template>
  <svg :class="['retro-icon', { small }]" viewBox="0 0 32 32" aria-hidden="true" shape-rendering="crispEdges">
    <g stroke="#111" stroke-width="1" stroke-linejoin="miter">
      <g v-if="name === 'chart'">
        <path fill="#fffbe8" d="M2 2h28v28H2z"/>
        <path fill="#008080" d="M6 19h4v7H6z"/>
        <path fill="#d79936" d="M14 13h4v13h-4z"/>
        <path fill="#000080" d="M22 6h4v20h-4z"/>
      </g>
      <g v-else-if="name === 'music'">
        <image href="../../assets/cd-player.png" width="32" height="32"/>
      </g>
      <g v-else-if="name === 'pictures'">
        <path fill="#ddd" d="M2 4h28v24H2z"/>
        <path fill="#fff" d="M4 6h24v20H4z"/>
        <path fill="#87bcdb" d="M6 8h20v16H6z"/>
        <path fill="#ffe079" d="M19 10h4v4h-4z"/>
        <path fill="#387964" d="m6 23 7-10 6 8 4-5 3 7z"/>
      </g>
      <g v-else-if="name === 'computer'">
        <path fill="#888" d="M3 2h25v22H3zM11 24h10v3H11zM5 27h23v4H5z"/>
        <path fill="#ddd" d="M2 1h25v22H2z"/>
        <path fill="#fff" d="M5 4h19v15H5z"/>
        <path fill="#008080" d="M7 6h15v11H7z"/>
        <path stroke="#7fffff" d="M9 8h6M9 9h3"/>
        <path fill="#eee" d="M3 26h25v4H3z"/>
        <path stroke="#555" d="M6 28h13M23 28h2"/>
      </g>
      <g v-else-if="name === 'folder' || name === 'case'">
        <path :fill="name === 'case' ? '#936d35' : '#c69b27'" d="M2 8h11l3 3h14v18H2z"/>
        <path fill="#fff3a3" d="M3 6h10l3 3h13v17H3z"/>
        <path :fill="name === 'case' ? '#b98645' : '#f3d568'" d="M1 13h30l-4 16H4z"/>
        <path stroke="#fff5b8" d="M4 15h23"/>
        <path v-if="name === 'case'" fill="#d5c7ac" d="M13 16h5v5h-5z"/>
      </g>
      <g v-else-if="name === 'person'">
        <path fill="#999" d="M4 3h24v27H4z"/>
        <path fill="#fff" d="M2 1h24v27H2z"/>
        <path fill="#ddd" stroke="none" d="M4 3h20v22H4z"/>
        <path fill="#000080" d="M6 18h4v-3h9v3h4v7H6z"/>
        <path fill="#e5bb8f" d="M10 7h9v8h-9z"/>
        <path fill="#492c1a" d="M9 7V5h11v6h-2V8h-6v2H9z"/>
        <path stroke="#111" d="M12 11h1m3 0h1"/>
      </g>
      <g v-else-if="name === 'mail'">
        <path fill="#999" d="M2 10h29v19H2z"/>
        <path fill="#fff7db" d="M1 8h28v19H1z"/>
        <path fill="none" d="m1 8 14 11L29 8M1 27l10-11m18 11L19 16"/>
        <path stroke="#fff" d="M3 10h22"/>
        <path fill="#c33" d="M23 3h7v6h-7z"/>
      </g>
      <g v-else-if="name === 'chip'">
        <path stroke="#ddd" stroke-width="3" d="M2 8h28M2 15h28M2 22h28M9 1v30M16 1v30M23 1v30"/>
        <path fill="#316b43" d="M5 4h23v24H5z"/>
        <path fill="#222" d="M9 8h15v16H9z"/>
        <path stroke="#ccc" d="M12 12h9M12 15h6M12 18h4"/>
      </g>
      <g v-else-if="name === 'game'">
        <path fill="#222" d="M2 2h28v28H2z"/>
        <path stroke="none" fill="#d05c48" d="M5 6h6v3H5zm8 0h6v3h-6zm8 0h6v3h-6z"/>
        <path stroke="none" fill="#e1c34a" d="M5 11h6v3H5zm8 0h6v3h-6zm8 0h6v3h-6z"/>
        <path fill="#fff" d="M19 19h3v3h-3z"/>
        <path fill="#5de5ee" d="M9 25h12v2H9z"/>
      </g>
      <g v-else-if="name === 'snake'">
        <path fill="#173825" d="M2 2h28v28H2z"/>
        <path fill="none" stroke="#8cdf84" stroke-width="4" d="M8 23h14v-7H10V9h10"/>
        <path fill="#b2f29d" d="M19 6h7v6h-7z"/>
        <path stroke="none" fill="#111" d="M23 7h2v2h-2z"/>
        <path fill="#ef9e68" d="M6 5h4v4H6z"/>
      </g>
      <g v-else-if="name === 'mine'">
        <path fill="#808080" d="M3 3h27v27H3z"/>
        <path fill="#c0c0c0" d="M2 2h27v27H2z"/>
        <path stroke="#fff" d="M3 3h25M3 3v25"/>
        <path stroke="#111" stroke-width="2" d="M16 6v20M6 16h20M9 9l14 14M23 9 9 23"/>
        <path fill="#111" d="M10 10h12v12H10z"/>
        <path fill="#fff" stroke="none" d="M13 13h3v3h-3z"/>
      </g>
      <g v-else-if="name === 'settings'">
        <path fill="#ddd" d="M2 4h27v24H2z"/>
        <path fill="#000080" d="M3 5h25v4H3z"/>
        <path stroke="#666" d="M8 12v12m7-12v12m7-12v12"/>
        <path fill="#c0c0c0" d="M5 15h6v4H5zm7 5h6v4h-6zm7-8h6v4h-6z"/>
      </g>
      <g v-else-if="name === 'sound' || name === 'mute'">
        <path fill="#c0c0c0" d="M4 11h6V9h3V6h3V4h2v24h-2v-2h-3v-3h-3v-2H4z"/>
        <path fill="#fff" stroke="none" d="M5 12h4v1H5z"/>
        <path v-if="name === 'sound'" fill="none" stroke-width="2" d="M21 11h2v3h2v4h-2v3h-2M26 7h2v4h2v10h-2v4h-2"/>
        <path v-else fill="none" stroke="#c00" stroke-width="3" d="M21 11l9 10M30 11l-9 10"/>
      </g>
      <g v-else-if="name === 'sticky'">
        <path fill="#6b5a00" stroke="none" d="M6 6h24v18l-6 6H6z"/>
        <path fill="#ffe66e" d="M3 3h24v18l-6 6H3z"/>
        <path fill="#e6b800" d="M3 3h24v5H3z"/>
        <path fill="#c9a000" d="M21 21h6l-6 6z"/>
        <path fill="none" stroke="#8a7400" d="M7 13h15M7 17h15M7 21h10"/>
      </g>
      <g v-else-if="name === 'sun'">
        <path fill="#ffd21f" d="M15 2h2v4h-2zM15 26h2v4h-2zM2 15h4v2H2zM26 15h4v2h-4zM5 5h3v3H5zM24 5h3v3h-3zM5 24h3v3H5zM24 24h3v3h-3z"/>
        <path fill="#ffd21f" d="M12 9h8v1h2v2h1v8h-1v2h-2v1h-8v-1h-2v-2H9v-8h1v-2h2z"/>
        <path fill="#fff6b0" stroke="none" d="M12 11h3v2h-3z"/>
      </g>
      <g v-else-if="name === 'moon'">
        <path fill="#f3e9a6" d="M13 4h7v2h-4v2h-2v3h-1v10h1v3h2v2h4v2h-7v-2h-3v-2H8v-3H7V11h1V8h2V6h3z"/>
        <path fill="#fff" stroke="none" d="M23 8h2v2h-2zM21 16h2v2h-2zM26 21h2v2h-2z"/>
      </g>
      <g v-else-if="name === 'start'">
        <path fill="#d44528" d="M3 3h11v11H3z"/>
        <path fill="#559b2e" d="M17 3h11v11H17z"/>
        <path fill="#2666b1" d="M3 17h11v11H3z"/>
        <path fill="#e6bf36" d="M17 17h11v11H17z"/>
      </g>
      <g v-else>
        <path fill="#999" d="M8 3h15l6 6v22H8z"/>
        <path fill="#fff" d="M5 1h15l6 6v22H5z"/>
        <path fill="#ddd" d="M20 1v6h6"/>
        <path :stroke="name === 'notepad' ? '#589ab8' : '#888'" d="M9 12h13M9 16h13M9 20h13M9 24h8"/>
        <path v-if="name === 'notepad'" stroke="#000080" stroke-width="2" d="M4 4h4M4 8h4M4 12h4M4 16h4M4 20h4M4 24h4"/>
      </g>
    </g>
  </svg>
</template>
