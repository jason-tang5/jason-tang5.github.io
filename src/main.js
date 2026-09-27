import { createApp } from 'vue';
import App from './App.vue';
import { installTooltips } from './tooltips.js';
import './theme.css';
createApp(App).mount('#app');
installTooltips();
