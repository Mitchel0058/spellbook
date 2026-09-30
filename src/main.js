import { mount } from 'svelte';
import App from './App.svelte';
import { initializePwaInstall } from './lib/pwaInstall.js';

initializePwaInstall();

const app = mount(App, {
  target: document.getElementById('app'),
});

export default app;