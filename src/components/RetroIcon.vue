<script setup>
// hand drawn 32x32 pixel icons for the desktop, menus and taskbar.
// "small" shrinks it for the taskbar and title bars. anything unknown falls back to a document.
defineProps({ name: { type: String, default: 'document' }, small: Boolean });
</script>
<template>
  <svg :class="['retro-icon', { small }]" viewBox="0 0 32 32" aria-hidden="true" shape-rendering="crispEdges">
    <g stroke="#111" stroke-width="1" stroke-linejoin="miter">
      <!-- three bars stepping up side by side, sharing their thick outlines, on a base -->
      <g v-if="name === 'chart'" stroke="none">
        <path fill="#111" d="M4 14h9v12H4zM11 8h9v18h-9zM18 2h9v24h-9zM2 26h28v2H2z"/>
        <path fill="#c8c8c8" d="M2 28h28v2H2z"/>
        <path fill="#1f6fc4" d="M6 16h5v10H6z"/>
        <path fill="#f7c928" d="M13 10h5v16h-5z"/>
        <path fill="#e0261b" d="M20 4h5v22h-5z"/>
      </g>
      <!-- the linkedin badge: a blue square with a white "in" -->
      <g v-else-if="name === 'linkedin'" stroke="none">
        <path fill="#111" d="M5 3h22v1H5zM4 4h1v1H4zM27 4h1v1h-1zM3 5h1v22H3zM28 5h1v22h-1zM4 27h1v1H4zM27 27h1v1h-1zM5 28h22v1H5z"/>
        <path fill="#0a66c2" d="M5 4h22v24H5zM4 5h24v22H4z"/>
        <path fill="#3b8ad8" d="M5 5h21v1H5zM5 6h1v20H5z"/>
        <path fill="#fff" d="M8 7h3v3H8zM8 12h3v13H8zM13 12h3v13h-3zM16 12h5v1h-5zM16 13h6v1h-6zM19 14h3v11h-3z"/>
      </g>
      <!-- the github cat, cut out of a dark circle -->
      <g v-else-if="name === 'github'" stroke="none">
        <path fill="#24292f" d="M14 1h4v1H14zM10 2h12v1H10zM8 3h16v1H8zM7 4h18v1H7zM6 5h20v1H6zM5 6h4v1H5zM10 6h12v1H10zM23 6h4v1H23zM4 7h5v1H4zM11 7h10v1H11zM23 7h5v1H23zM3 8h6v1H3zM12 8h8v1H12zM23 8h6v1H23zM3 9h6v1H3zM23 9h6v1H23zM2 10h6v1H2zM24 10h6v1H24zM2 11h6v1H2zM24 11h6v1H24zM2 12h6v1H2zM24 12h6v1H24zM2 13h6v1H2zM24 13h6v1H24zM1 14h7v1H1zM24 14h7v1H24zM1 15h7v1H1zM24 15h7v1H24zM1 16h7v1H1zM24 16h7v1H24zM1 17h8v1H1zM23 17h8v1H23zM2 18h8v1H2zM22 18h8v1H22zM2 19h10v1H2zM20 19h10v1H20zM2 20h4v1H2zM7 20h6v1H7zM19 20h11v1H19zM2 21h4v1H2zM8 21h5v1H8zM19 21h11v1H19zM3 22h4v1H3zM10 22h3v1H10zM19 22h10v1H19zM3 23h5v1H3zM19 23h10v1H19zM4 24h6v1H4zM19 24h9v1H19zM5 25h7v1H5zM20 25h7v1H20zM6 26h6v1H6zM20 26h6v1H20zM7 27h5v1H7zM20 27h5v1H20zM8 28h4v1H8zM20 28h4v1H20zM10 29h2v1H10zM20 29h2v1H20z"/>
        <path fill="#fff" d="M9 6h1v1H9zM22 6h1v1H22zM9 7h2v1H9zM21 7h2v1H21zM9 8h3v1H9zM20 8h3v1H20zM9 9h14v1H9zM8 10h16v1H8zM8 11h16v1H8zM8 12h16v1H8zM8 13h16v1H8zM8 14h16v1H8zM8 15h16v1H8zM8 16h16v1H8zM9 17h14v1H9zM10 18h12v1H10zM12 19h8v1H12zM6 20h1v1H6zM13 20h6v1H13zM6 21h2v1H6zM13 21h6v1H13zM7 22h3v1H7zM13 22h6v1H13zM8 23h11v1H8zM10 24h9v1H10zM12 25h8v1H12zM12 26h8v1H12zM12 27h8v1H12zM12 28h8v1H12zM12 29h8v1H12zM14 30h4v1H14z"/>
      </g>
      <!-- a plain disc: outline, a two colour sheen and the hub -->
      <g v-else-if="name === 'music'" stroke="none">
        <path fill="#111" d="M12 2h8v1H12zM10 3h2v1H10zM20 3h2v1H20zM8 4h2v1H8zM22 4h2v1H22zM7 5h1v1H7zM24 5h1v1H24zM6 6h1v1H6zM25 6h1v1H25zM5 7h1v1H5zM26 7h1v1H26zM4 8h1v1H4zM27 8h1v1H27zM4 9h1v1H4zM27 9h1v1H27zM3 10h1v1H3zM28 10h1v1H28zM3 11h1v1H3zM28 11h1v1H28zM2 12h1v1H2zM29 12h1v1H29zM2 13h1v1H2zM29 13h1v1H29zM2 14h1v1H2zM29 14h1v1H29zM2 15h1v1H2zM29 15h1v1H29zM2 16h1v1H2zM29 16h1v1H29zM2 17h1v1H2zM29 17h1v1H29zM2 18h1v1H2zM29 18h1v1H29zM2 19h1v1H2zM29 19h1v1H29zM3 20h1v1H3zM28 20h1v1H28zM3 21h1v1H3zM28 21h1v1H28zM4 22h1v1H4zM27 22h1v1H27zM4 23h1v1H4zM27 23h1v1H27zM5 24h1v1H5zM26 24h1v1H26zM6 25h1v1H6zM25 25h1v1H25zM7 26h1v1H7zM24 26h1v1H24zM8 27h2v1H8zM22 27h2v1H22zM10 28h2v1H10zM20 28h2v1H20zM12 29h8v1H12z"/>
        <path fill="#d4d4d8" d="M12 3h8v1H12zM10 4h10v1H10zM8 5h12v1H8zM7 6h12v1H7zM6 7h13v1H6zM5 8h14v1H5zM5 9h13v1H5zM4 10h14v1H4zM4 11h10v1H4zM26 11h2v1H26zM3 12h9v1H3zM24 12h5v1H24zM3 13h9v1H3zM21 13h8v1H21zM3 14h8v1H3zM21 14h8v1H21zM3 15h8v1H3zM21 15h8v1H21zM3 16h8v1H3zM21 16h8v1H21zM3 17h8v1H3zM21 17h8v1H21zM3 18h8v1H3zM20 18h9v1H20zM3 19h5v1H3zM20 19h9v1H20zM4 20h2v1H4zM18 20h10v1H18zM14 21h14v1H14zM14 22h13v1H14zM13 23h14v1H13zM13 24h13v1H13zM13 25h12v1H13zM12 26h12v1H12zM12 27h10v1H12zM12 28h8v1H12z"/>
        <path fill="#8fe3ea" d="M24 6h1v1H24zM23 7h3v1H23zM22 8h5v1H22zM21 9h6v1H21zM21 10h7v1H21zM20 11h6v1H20zM20 12h4v1H20zM20 13h1v1H20zM11 18h1v1H11zM8 19h4v1H8zM6 20h6v1H6zM4 21h7v1H4zM5 22h6v1H5zM5 23h5v1H5zM6 24h3v1H6zM7 25h1v1H7z"/>
        <path fill="#f4b4dc" d="M20 4h2v1H20zM20 5h4v1H20zM19 6h5v1H19zM19 7h4v1H19zM19 8h3v1H19zM18 9h3v1H18zM18 10h3v1H18zM18 11h2v1H18zM12 20h2v1H12zM11 21h3v1H11zM11 22h3v1H11zM10 23h3v1H10zM9 24h4v1H9zM8 25h5v1H8zM8 26h4v1H8zM10 27h2v1H10z"/>
        <path fill="#777" d="M14 11h4v1H14zM12 12h2v1H12zM18 12h2v1H18zM12 13h1v1H12zM19 13h1v1H19zM11 14h1v1H11zM20 14h1v1H20zM11 15h1v1H11zM20 15h1v1H20zM11 16h1v1H11zM20 16h1v1H20zM11 17h1v1H11zM20 17h1v1H20zM12 18h1v1H12zM19 18h1v1H19zM12 19h2v1H12zM18 19h2v1H18zM14 20h4v1H14z"/>
        <path fill="#f4f4f4" d="M14 12h4v1H14zM13 13h6v1H13zM12 14h3v1H12zM17 14h3v1H17zM12 15h2v1H12zM18 15h2v1H18zM12 16h2v1H12zM18 16h2v1H18zM12 17h3v1H12zM17 17h3v1H17zM13 18h6v1H13zM14 19h4v1H14z"/>
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
