const CACHE_NAME = 'spellbook-cache-v0.1.8';
const BASE_PATH = '/spellbook';

const ASSETS_TO_CACHE = [
    `${BASE_PATH}/`,
    `${BASE_PATH}/index.html`,
    `${BASE_PATH}/pages.html`,
    `${BASE_PATH}/settings.html`,
    `${BASE_PATH}/favicon.ico`,
    `${BASE_PATH}/manifest.json`,
    `${BASE_PATH}/css/spellbook.css`,
    `${BASE_PATH}/css/interface.css`,
    `${BASE_PATH}/css/text-overlays.css`,
    `${BASE_PATH}/js/pages.js`,
    `${BASE_PATH}/app.js`,
    `${BASE_PATH}/assets/fonts/MagicSchoolOne.ttf`,
    `${BASE_PATH}/assets/imgs/fireball.webp`,
    `${BASE_PATH}/assets/imgs/spellbook_cover_case.svg`,
    `${BASE_PATH}/assets/imgs/spellbook_cover_flip_ani_reverse.webp`,
    `${BASE_PATH}/assets/imgs/spellbook_cover_flip_ani_single_reverse.webp`,
    `${BASE_PATH}/assets/imgs/spellbook_cover_flip_ani_single.webp`,
    `${BASE_PATH}/assets/imgs/spellbook_cover_flip_ani.webp`,
    `${BASE_PATH}/assets/imgs/spellbook_cover_right_page.svg`,
    `${BASE_PATH}/assets/imgs/spellbook_cover.svg`,
    `${BASE_PATH}/assets/imgs/spellbook_title.svg`,
    `${BASE_PATH}/assets/sounds/pageturn.mp3`
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

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
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Add GitHub Pages base path handling
    const url = new URL(event.request.url);
    const requestPath = url.pathname;

    // Handle requests with base path
    if (requestPath.startsWith(BASE_PATH)) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
    } else {
        // Handle requests without base path
        const pathWithBase = `${BASE_PATH}${requestPath}`;
        event.respondWith(
            caches.match(new Request(pathWithBase)).then((response) => {
                return response || fetch(event.request);
            })
        );
    }
});