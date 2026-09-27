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
      <g v-else-if="name === 'music'" stroke="none">
        <path fill="#111" d="M12 2h8v1H12zM10 3h2v1H10zM20 3h2v1H20zM8 4h2v1H8zM22 4h2v1H22zM7 5h1v1H7zM24 5h1v1H24zM6 6h1v1H6zM25 6h1v1H25zM5 7h1v1H5zM26 7h1v1H26zM4 8h1v1H4zM27 8h1v1H27zM4 9h1v1H4zM27 9h1v1H27zM3 10h1v1H3zM28 10h1v1H28zM3 11h1v1H3zM28 11h1v1H28zM2 12h1v1H2zM29 12h1v1H29zM2 13h1v1H2zM15 13h2v1H15zM29 13h1v1H29zM2 14h1v1H2zM14 14h1v1H14zM17 14h1v1H17zM29 14h1v1H29zM2 15h1v1H2zM13 15h1v1H13zM18 15h1v1H18zM29 15h1v1H29zM2 16h1v1H2zM13 16h1v1H13zM18 16h1v1H18zM29 16h1v1H29zM2 17h1v1H2zM14 17h1v1H14zM17 17h1v1H17zM29 17h1v1H29zM2 18h1v1H2zM15 18h2v1H15zM29 18h1v1H29zM2 19h1v1H2zM29 19h1v1H29zM3 20h1v1H3zM28 20h1v1H28zM3 21h1v1H3zM28 21h1v1H28zM4 22h1v1H4zM27 22h1v1H27zM4 23h1v1H4zM27 23h1v1H27zM5 24h1v1H5zM26 24h1v1H26zM6 25h1v1H6zM25 25h1v1H25zM7 26h1v1H7zM24 26h1v1H24zM8 27h2v1H8zM22 27h2v1H22zM10 28h2v1H10zM20 28h2v1H20zM12 29h8v1H12z"/>
        <path fill="#b4b4b4" d="M12 3h1v1H12zM15 3h1v1H15zM17 3h2v1H17zM10 4h1v1H10zM12 4h2v1H12zM15 4h1v1H15zM17 4h1v1H17zM20 4h1v1H20zM10 5h1v1H10zM19 5h2v1H19zM7 6h2v1H7zM6 7h1v1H6zM8 7h1v1H8zM6 8h2v1H6zM4 10h2v1H4zM26 11h2v1H26zM3 12h2v1H3zM26 12h1v1H26zM4 13h1v1H4zM28 13h1v1H28zM27 14h2v1H27zM3 15h2v1H3zM27 16h2v1H27zM3 17h2v1H3zM3 18h1v1H3zM27 18h1v1H27zM5 19h1v1H5zM27 19h2v1H27zM4 20h2v1H4zM26 21h2v1H26zM24 23h2v1H24zM23 24h1v1H23zM25 24h1v1H25zM23 25h2v1H23zM11 26h2v1H11zM21 26h1v1H21zM11 27h1v1H11zM14 27h1v1H14zM16 27h1v1H16zM18 27h2v1H18zM21 27h1v1H21zM13 28h2v1H13zM16 28h1v1H16zM19 28h1v1H19z"/>
        <path fill="#c2c2c2" d="M13 3h2v1H13zM16 3h1v1H16zM19 3h1v1H19zM11 4h1v1H11zM14 4h1v1H14zM16 4h1v1H16zM18 4h2v1H18zM21 4h1v1H21zM8 5h2v1H8zM11 5h8v1H11zM21 5h1v1H21zM9 6h12v1H9zM7 7h1v1H7zM9 7h12v1H9zM5 8h1v1H5zM8 8h1v1H8zM11 8h9v1H11zM5 9h3v1H5zM10 9h10v1H10zM6 10h8v1H6zM18 10h1v1H18zM26 10h2v1H26zM4 11h8v1H4zM24 11h2v1H24zM5 12h6v1H5zM22 12h4v1H22zM27 12h2v1H27zM3 13h1v1H3zM5 13h6v1H5zM21 13h7v1H21zM3 14h7v1H3zM22 14h5v1H22zM5 15h5v1H5zM22 15h7v1H22z"/>
        <path fill="#5de5ee" d="M22 5h2v1H22zM21 6h3v1H21zM21 7h2v1H21zM20 8h2v1H20zM20 9h1v1H20zM19 10h2v1H19zM11 21h2v1H11zM11 22h1v1H11zM10 23h2v1H10zM9 24h2v1H9zM8 25h3v1H8zM8 26h2v1H8z"/>
        <path fill="#ffe66e" d="M24 6h1v1H24zM23 7h3v1H23zM22 8h3v1H22zM21 9h3v1H21zM21 10h2v1H21zM20 11h1v1H20zM11 20h1v1H11zM9 21h2v1H9zM8 22h3v1H8zM7 23h3v1H7zM6 24h3v1H6zM7 25h1v1H7z"/>
        <path fill="#fff" d="M9 8h2v1H9zM8 9h2v1H8z"/>
        <path fill="#ff8fd0" d="M25 8h2v1H25zM24 9h3v1H24zM23 10h3v1H23zM21 11h3v1H21zM21 12h1v1H21zM10 19h1v1H10zM8 20h3v1H8zM6 21h3v1H6zM5 22h3v1H5zM5 23h2v1H5z"/>
        <path fill="#8a8a8a" d="M14 10h4v1H14zM12 11h2v1H12zM18 11h2v1H18zM11 12h1v1H11zM20 12h1v1H20zM11 13h1v1H11zM20 13h1v1H20zM10 14h1v1H10zM21 14h1v1H21zM10 15h1v1H10zM21 15h1v1H21zM10 16h1v1H10zM21 16h1v1H21zM10 17h1v1H10zM21 17h1v1H21zM11 18h1v1H11zM20 18h1v1H20zM11 19h1v1H11zM20 19h1v1H20zM12 20h2v1H12zM18 20h2v1H18zM14 21h4v1H14z"/>
        <path fill="#e8e8e8" d="M14 11h4v1H14zM12 12h8v1H12zM12 13h3v1H12zM17 13h3v1H17zM11 14h3v1H11zM18 14h3v1H18zM11 15h2v1H11zM19 15h2v1H19zM11 16h2v1H11zM19 16h2v1H19zM11 17h3v1H11zM18 17h3v1H18zM12 18h3v1H12zM17 18h3v1H17zM12 19h8v1H12zM14 20h4v1H14z"/>
        <path fill="#cfcfcf" d="M3 16h7v1H3zM22 16h5v1H22zM5 17h5v1H5zM22 17h7v1H22zM4 18h7v1H4zM21 18h6v1H21zM28 18h1v1H28zM3 19h2v1H3zM6 19h4v1H6zM21 19h6v1H21zM6 20h2v1H6zM20 20h8v1H20zM4 21h2v1H4zM13 21h1v1H13zM18 21h8v1H18zM12 22h15v1H12zM12 23h12v1H12zM26 23h1v1H26zM11 24h12v1H11zM24 24h1v1H24zM11 25h12v1H11zM10 26h1v1H10zM13 26h8v1H13zM22 26h2v1H22zM10 27h1v1H10zM12 27h2v1H12zM15 27h1v1H15zM17 27h1v1H17zM20 27h1v1H20zM12 28h1v1H12zM15 28h1v1H15zM17 28h2v1H17z"/>
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
      <g v-else-if="name === 'notebook'">
        <path fill="#999" d="M6 5h18v26H6z"/>
        <path fill="#fff" d="M3 3h18v26H3z"/>
        <path stroke="#589ab8" d="M6 9h12M6 13h12M6 17h7M6 21h9M6 25h12"/>
        <path stroke="#c44" d="M8 3v26"/>
        <path fill="none" stroke="#111" d="M25 3l3 3-13 13-4 1 1-4z"/>
        <path fill="#e88aa0" stroke="none" d="M25 4h3v3h-3zM24 5h3v3h-3z"/>
        <path fill="#b8b8b8" stroke="none" d="M23 6h3v3h-3z"/>
        <path fill="#f2c230" stroke="none" d="M22 7h3v3h-3zM21 8h3v3h-3zM20 9h3v3h-3zM19 10h3v3h-3zM18 11h3v3h-3zM17 12h3v3h-3zM16 13h3v3h-3z"/>
        <path fill="#e8c99a" stroke="none" d="M15 14h2v2h-2z"/>
        <path fill="#333" stroke="none" d="M14 15h2v2h-2z"/>
      </g>
      <g v-else-if="name === 'games'">
        <path fill="#c69b27" d="M2 8h11l3 3h14v5H2z"/>
        <path fill="#fff3a3" d="M3 6h10l3 3h13v6H3z"/>
        <path fill="#f3d568" d="M1 13h30l-4 16H4z"/>
        <path stroke="#fff5b8" d="M4 15h23"/>
        <path fill="#5b2fa0" stroke="none" d="M12 18h1v1H12zM18 18h1v1H18zM13 19h1v1H13zM17 19h1v1H17zM12 20h7v1H12zM11 21h2v1H11zM14 21h3v1H14zM18 21h2v1H18zM10 22h11v1H10zM10 23h1v1H10zM12 23h7v1H12zM20 23h1v1H20zM10 24h1v1H10zM12 24h1v1H12zM18 24h1v1H18zM20 24h1v1H20zM13 25h2v1H13zM16 25h2v1H16z"/>
      </g>
      <g v-else-if="name === 'folder' || name === 'case'">
        <path :fill="name === 'case' ? '#936d35' : '#c69b27'" d="M2 8h11l3 3h14v5H2z"/>
        <path fill="#fff3a3" d="M3 6h10l3 3h13v6H3z"/>
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
      <!-- a flat envelope. mail has the red "new message" flag, contact doesn't -->
      <g v-else-if="name === 'mail' || name === 'contact'">
        <path fill="#fff7db" d="M2 8h27v19H2z"/>
        <path fill="none" d="M2 8l13.5 11L29 8"/>
        <path v-if="name === 'mail'" fill="#c33" d="M23 3h7v6h-7z"/>
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
        <path stroke="#888" d="M9 12h13M9 16h13M9 20h13M9 24h8"/>
      </g>
    </g>
  </svg>
</template>
