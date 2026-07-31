import { setContext, getContext } from 'svelte';
import { SettingsDB, PageDB } from '../utils/db.js';
import { settingsOptions, DEFAULT_SETTINGS } from '../constants/settingsOptions';

const SETTINGS_CONTEXT_KEY = Symbol('settings');

class SettingsStore {
    values = $state({ ...DEFAULT_SETTINGS });
    loading = $state(true);
    error = $state(null);

    async load() {
        try {
            this.loading = true;
            this.values = await SettingsDB.getAll();
            await this.loadCustomFont();
        } catch (err) {
            console.error('Error loading settings:', err);
            this.error = err.message;
        } finally {
            this.loading = false;
        }
    }

    async set(key, value) {
        try {
            await SettingsDB.set(key, value);
            this.values = { ...this.values, [key]: value };
            return true;
        } catch (err) {
            console.error('Error updating setting:', err);
            this.error = err.message;
            return false;
        }
    }

    async resetToDefaults() {
        await SettingsDB.resetToDefaults();
        await this.load();
    }

    async loadCustomFont() {
        try {
            // Load font family
            const fontData = await PageDB.getFont();
            if (fontData && fontData.data) {
                const fontFace = new FontFace('SpellbookFont', `url(${fontData.data})`);
                await fontFace.load();
                document.fonts.add(fontFace);
                document.body.style.fontFamily = 'SpellbookFont, MagicSchool, sans-serif';
            } else {
                document.body.style.fontFamily = 'MagicSchool, sans-serif';
            }

            // Update font size
            // TODO: change how font size works
            const fontAddition = this.values[settingsOptions.FONTADDITION] || 0;
            const fontSize = 1 + (fontAddition / 10);
            document.documentElement.style.setProperty('--reactive-font-size', `calc(${fontSize}vh + 1rem)`);
        } catch (error) {
            console.error('Error loading font:', error);
        }
    }
}

export function createSettingsContext() {
    const store = new SettingsStore();
    store.load();
    setContext(SETTINGS_CONTEXT_KEY, store);
    return store;
}

export function getSettingsContext() {
    const store = getContext(SETTINGS_CONTEXT_KEY);
    if (!store) {
        throw new Error('Settings context not found — did you call createSettingsContext() in a parent component?');
    }
    return store;
}

export { settingsOptions };