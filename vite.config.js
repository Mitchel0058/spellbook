import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { svelte } from '@sveltejs/vite-plugin-svelte';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
    base: '/spellbook/',
    plugins: [
        basicSsl(),
        svelte(),
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
                background_color: '#200404',
                start_url: '/spellbook/',
                scope: '/spellbook/',
                display: 'standalone',
                icons: [
                    { src: 'assets/img/cover_192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'assets/img/cover_512.png', sizes: '512x512', type: 'image/png' },
                    { src: 'assets/img/cover_192.webp', sizes: '192x192', type: 'image/webp' },
                    { src: 'assets/img/cover_512.webp', sizes: '512x512', type: 'image/webp' }
                ]
            }
        })
    ],
    build: {
        outDir: 'dist'
    },
    server: {
        // dev server fallback
        historyApiFallback: true
    },
    preview: {
        // preview server fallback
        historyApiFallback: true
    }
})