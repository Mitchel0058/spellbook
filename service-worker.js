const CACHE_NAME = 'spellbook-cache-v1';
const ASSETS_TO_CACHE = [
    './', // Cache the root
    './index.html', // Cache the main HTML file
    '/pages.html', // Cache the pages HTML file
    '/settings.html', // Cache the settings HTML file
    '/favicon.ico', // Cache the favicon
    './manifest.json', // Cache the manifest
    './css/spellbook.css', // Cache CSS files
    './css/interface.css',
    './css/text-overlays.css',
    './js/pages.js', // Cache JavaScript files
    './app.js',
    './assets/fonts/pixel.ttf', // Cache font files
    './assets/imgs/mini-fireball.svg', // Cache image files
    './assets/imgs/spellbook_cover_case.svg',
    './assets/imgs/spellbook_cover_flip_ani_reverse.webp',
    './assets/imgs/spellbook_cover_flip_ani_single_reverse.webp',
    './assets/imgs/spellbook_cover_flip_ani_single.webp',
    './assets/imgs/spellbook_cover_flip_ani.webp',
    './assets/imgs/spellbook_cover_right_page.svg',
    './assets/imgs/spellbook_cover.svg',
    './assets/sounds/pageturn.mp3' // Cache sound files
];

// Install event: Cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting(); // Activate the service worker immediately
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Take control of all clients immediately
});

// Fetch event: Serve cached assets or fetch from network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});