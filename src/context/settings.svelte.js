import { setContext, getContext } from 'svelte';
import { SettingsDB, PageDB } from '../utils/db.js';
import { settingsOptions, DEFAULT_SETTINGS } from '../constants/settingsOptions';

const SETTINGS_CONTEXT_KEY = Symbol('settings');

class SettingsStore {
    values = $state({ ...DEFAULT_SETTINGS });
    bookFontAddition = $state(0);
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
            if (key === settingsOptions.FONTADDITION) {
                this.applyFontSizeAdditions();
            }
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

            this.bookFontAddition = (await PageDB.getFontSizeAddition()) ?? 0;
            this.applyFontSizeAdditions();
        } catch (error) {
            console.error('Error loading font:', error);
        }
    }

    async setBookFontAddition(value) {
        await PageDB.setFontSizeAddition(value);
        this.bookFontAddition = value;
        this.applyFontSizeAdditions();
        window.dispatchEvent(
            new CustomEvent('spellbook-local-saved', {
                detail: { dbName: PageDB.activeDBName },
            }),
        );
    }

    applyFontSizeAdditions() {
        const globalFontSize = (this.values[settingsOptions.FONTADDITION] || 0) / 10;
        const bookFontSize = this.bookFontAddition / 10;
        document.documentElement.style.setProperty(
            '--font-size-addition',
            `${globalFontSize}rem`,
        );
        document.documentElement.style.setProperty(
            '--book-font-size-addition',
            `${bookFontSize}rem`,
        );
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