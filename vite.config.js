import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    base: '/spellbook/',
    plugins: [
        preact(),
        VitePWA({
            registerType: 'autoUpdate',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,webm,ttf,mp3}']
            },
            manifest: {
                name: 'Spellbook',
                short_name: 'Spellbook',
                description: 'A D&D inspired spellbook',
                theme_color: '#200404',
                start_url: '/spellbook/',
                scope: '/spellbook/',
                display: 'standalone'
            }
        })
    ],
    build: {
        outDir: 'dist'
    }
})

// import { defineConfig } from 'vite'
// import preact from '@preact/preset-vite'
// import { VitePWA } from 'vite-plugin-pwa'

// export default defineConfig({
//     plugins: [
//         preact(),
//         VitePWA({
//             registerType: 'autoUpdate',
//             includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
//             manifest: {
//                 name: 'Spellbook',
//                 short_name: 'Spellbook',
//                 description: 'A D&D inspired spellbook',
//                 theme_color: '#200404',
//                 background_color: '#200404',
//                 icons: [
//                     {
//                         src: 'pwa-192x192.png',
//                         sizes: '192x192',
//                         type: 'image/png'
//                     },
//                     {
//                         src: 'pwa-512x512.png',
//                         sizes: '512x512',
//                         type: 'image/png',
//                         purpose: 'any maskable'
//                     }
//                 ]
//             },
//             workbox: {
//                 globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
//                 runtimeCaching: [
//                     {
//                         urlPattern: /^https:\/\/api\.example\.com\/.*/i,
//                         handler: 'NetworkFirst',
//                         options: {
//                             cacheName: 'api-cache',
//                             expiration: {
//                                 maxEntries: 100,
//                                 maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
//                             }
//                         }
//                     }
//                 ]
//             },
//             devOptions: {
//                 enabled: true
//             }
//         })
//     ],
// })
