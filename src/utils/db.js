import { openDB } from 'idb';
import { settingsOptions, DEFAULT_SETTINGS } from '../constants/settingsOptions';
import { spellOptions, DEFAULT_SPELL_OPTIONS } from '../constants/spellOptions';

import spellTemplate from '../templates/spell.template.json';

// Maps each spell.template.json element id to the legacy spell field it
// should be populated from during the v1 -> v2 migration. Only content is
// taken from the old spell; every other property (position, size, zIndex,
// and each element's own textOptions/titleOptions/imageOptions) always
// comes from whatever the template currently defines.
const SPELL_TEMPLATE_ELEMENT_MAP = {
    image: spellOptions.ICONURL,
    description: spellOptions.DESC,
    title: spellOptions.NAME,
    'text-1': spellOptions.INCANT,
    'text-2': spellOptions.SPEED,
    'text-3': spellOptions.RANGE,
    'text-4': spellOptions.TYPE,
    'text-5': spellOptions.LVL,
};

/**
 * Database utility class for managing IndexedDB databases
 */
class DBUtil {
    /**
     * Initialize a database with the given name and schema
     * @param {string} dbName - The name of the database
     * @param {number} version - The version of the database
     * @param {Function} upgradeCallback - Callback to run during version upgrades
     * @returns {Promise<IDBDatabase>} - The database instance
     */
    static async initDB(dbName, version, upgradeCallback) {
        return openDB(dbName, version, {
            async upgrade(db, oldVersion, newVersion, transaction) {
                if (upgradeCallback) {
                    await upgradeCallback(db, oldVersion, newVersion, transaction);
                }
            },
        });
    }
}

/**
 * Settings database manager
 */
export class SettingsDB {
    static DB_NAME = 'Spellbook_Settings';
    static STORE_NAME = 'settings';
    static VERSION = 2;

    static db = null;

    /**
     * Initialize the Settings database
     * @returns {Promise<IDBDatabase>}
     */
    static async init() {
        if (this.db) return this.db;

        this.db = await DBUtil.initDB(this.DB_NAME, this.VERSION, (db) => {
            // Create the settings store if it doesn't exist
            if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                db.createObjectStore(this.STORE_NAME, { keyPath: 'key' });
            }
        });

        // Initialize with default settings if needed
        await this.initializeDefaultSettings();

        return this.db;
    }

    /**
     * Initialize the database with default settings if they don't exist
     * @returns {Promise<void>}
     */
    static async initializeDefaultSettings() {
        const allSettings = await this.getAll();

        for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
            if (allSettings[key] === undefined) {
                await this.set(key, defaultValue);
            }
        }
    }

    /**
     * Validates if a setting key is allowed
     * @param {string} key - The setting key to validate
     * @returns {boolean} - Whether the key is valid
     * @throws {Error} - If the key is invalid
     */
    static validateSettingKey(key) {
        const validKeys = Object.values(settingsOptions);
        if (!validKeys.includes(key)) {
            throw new Error(`Invalid setting key: ${key}. Valid keys are: ${validKeys.join(', ')}`);
        }
        return true;
    }

    /**
     * Get a setting by key
     * @param {string} key - The setting key
     * @returns {Promise<any>} - The setting value or default value if not found
     */
    static async get(key) {
        this.validateSettingKey(key);
        await this.init();
        const result = await this.db.get(this.STORE_NAME, key);

        if (!result) {
            return DEFAULT_SETTINGS[key] !== undefined ? DEFAULT_SETTINGS[key] : null;
        }

        return result.value;
    }

    /**
     * Set a setting value
     * @param {string} key - The setting key
     * @param {any} value - The setting value
     * @returns {Promise<void>}
     */
    static async set(key, value) {
        this.validateSettingKey(key);
        await this.init();
        return this.db.put(this.STORE_NAME, { key, value });
    }

    /**
     * Delete a setting
     * @param {string} key - The setting key
     * @returns {Promise<void>}
     */
    static async delete(key) {
        this.validateSettingKey(key);
        await this.init();
        return this.db.delete(this.STORE_NAME, key);
    }

    /**
     * Get all settings
     * @returns {Promise<Object>} - Object containing all settings as key-value pairs
     */
    static async getAll() {
        await this.init();

        // Only get allowed settings
        const settingsObject = {};
        const validKeys = Object.values(settingsOptions);

        // Initialize all settings with defaults first
        for (const key of validKeys) {
            settingsObject[key] = DEFAULT_SETTINGS[key];
        }

        // Override with actual values from database
        const allSettings = await this.db.getAll(this.STORE_NAME);
        for (const setting of allSettings) {
            if (validKeys.includes(setting.key)) {
                settingsObject[setting.key] = setting.value;
            }
        }

        return settingsObject;
    }

    /**
     * Reset all settings to default values
     * @returns {Promise<void>}
     */
    static async resetToDefaults() {
        await this.init();

        // Only clear valid settings
        const validKeys = Object.values(settingsOptions);
        for (const key of validKeys) {
            await this.delete(key).catch(() => { });
        }

        // Re-add default settings
        for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
            await this.set(key, value);
        }
    }

    /**
     * Clear all settings
     * @returns {Promise<void>}
     */
    static async clear() {
        await this.init();

        // Only clear valid settings instead of clearing the entire store
        const validKeys = Object.values(settingsOptions);
        for (const key of validKeys) {
            await this.delete(key).catch(() => { });
        }
    }
}

/**
 * Page database manager — replaces SpellbookDB's spells/notes stores.
 * Keeps page identity (id) separate from display order.
 */
export class PageDB {
    static PAGES_STORE = 'pages';
    static ORDER_STORE = 'pageOrder';
    static SETTINGS_STORE = 'spellbookSettings';
    static VERSION = 2;

    static activeDB = null;
    static activeDBName = null;

    static async init(dbName = null) {
        if (!dbName) {
            dbName = await SettingsDB.get(settingsOptions.CURRENT_SPELLBOOK_DB);
        }

        if (this.activeDB && this.activeDBName === dbName) {
            return this.activeDB;
        }

        if (this.activeDB) {
            this.activeDB.close();
            this.activeDB = null;
            this.activeDBName = null;
        }

        this.activeDB = await DBUtil.initDB(
            dbName,
            this.VERSION,
            async (db, oldVersion, newVersion, transaction) => {
                // Old spells/notes stores are deprecated and no longer created.
                // Existing DBs upgrading from version 1 keep their old stores
                // on disk (harmless, just unused) until a migration is written.

                if (!db.objectStoreNames.contains(this.PAGES_STORE)) {
                    db.createObjectStore(this.PAGES_STORE, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(this.ORDER_STORE)) {
                    db.createObjectStore(this.ORDER_STORE, { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains(this.SETTINGS_STORE)) {
                    db.createObjectStore(this.SETTINGS_STORE, { keyPath: 'key' });
                }

                await this._migrateSpellsToPages(db, oldVersion, transaction);

                // Once migration has been tested and confirmed correct,
                // uncomment these to remove the legacy stores entirely:
                // if (db.objectStoreNames.contains('spells')) {
                //     db.deleteObjectStore('spells');
                // }
                // if (db.objectStoreNames.contains('notes')) {
                //     db.deleteObjectStore('notes');
                // }
            },
        );

        this.activeDBName = dbName;
        return this.activeDB;
    }

    // Same multi-spellbook plumbing as before, unchanged in spirit —
    // still per-named-database, still tracked in SettingsDB's spellbook list.
    static async switchSpellbook(dbName) {
        await SettingsDB.set(settingsOptions.CURRENT_SPELLBOOK_DB, dbName);
        await this.init(dbName);
    }

    static async getCurrentSpellbookName() {
        return SettingsDB.get(settingsOptions.CURRENT_SPELLBOOK_DB);
    }

    static async listAllSpellbooks() {
        const spellbookList = await SettingsDB.get('spellbookList');
        return spellbookList || [await this.getCurrentSpellbookName()];
    }

    static async generateUniqueSpellbookName(baseName) {
        const spellbookList = await this.listAllSpellbooks();
        let newName = baseName;
        let counter = 1;

        while (spellbookList.includes(newName)) {
            newName = `${baseName} (${counter})`;
            counter++;
        }

        return newName;
    }

    static async createNewSpellbook(dbName) {
        const spellbookList = await this.listAllSpellbooks();
        if (!spellbookList.includes(dbName)) {
            spellbookList.push(dbName);
            await SettingsDB.set('spellbookList', spellbookList);
        }
        await this.switchSpellbook(dbName);
    }

    static async deleteSpellbook(dbName) {
        const currentName = await this.getCurrentSpellbookName();
        if (dbName === currentName) {
            throw new Error('Cannot delete the currently active spellbook');
        }
        const spellbookList = await this.listAllSpellbooks();
        const updatedList = spellbookList.filter((name) => name !== dbName);
        await SettingsDB.set('spellbookList', updatedList);
        await window.indexedDB.deleteDatabase(dbName);
    }

    /* ORDER */

    // Returns the ordered array of page ids, e.g. ['a1b2', 'c3d4', ...].
    // Empty array if nothing saved yet.
    static async getOrder() {
        const db = await this.init();
        const record = await db.get(this.ORDER_STORE, 'order');
        return record?.ids ?? [];
    }

    // Persists a full reordering of existing pages. Does NOT touch page
    // records or page count — callers must ensure `ids` is a permutation
    // of the current order array (same ids, same length).
    static async saveOrder(ids) {
        const db = await this.init();
        await db.put(this.ORDER_STORE, { key: 'order', ids });
    }

    /* PAGES */

    static async getPageById(id) {
        const db = await this.init();
        return db.get(this.PAGES_STORE, id);
    }

    static async getAllPages() {
        const db = await this.init();
        return db.getAll(this.PAGES_STORE);
    }

    // Loads every page in display order, skipping any id in the order
    // array whose page record is missing (defensive against corruption).
    static async loadAllPagesInOrder() {
        const [orderIds, allPages] = await Promise.all([
            this.getOrder(),
            this.getAllPages(),
        ]);

        const pageMap = new Map(allPages.map((p) => [p.id, p]));

        return orderIds
            .map((id) => pageMap.get(id))
            .filter((page) => page !== undefined);
    }

    // If the DB is completely empty, creates one blank page and persists it
    // immediately as both a page record AND an order entry. This is the only
    // way a "first page" should ever come into existence — loadAllPagesInOrder
    // callers should call this when they get back an empty array, rather than
    // fabricating a page in memory themselves.
    static async ensureAtLeastOnePage(makePageFn) {
        const existing = await this.loadAllPagesInOrder();
        if (existing.length > 0) {
            return existing;
        }

        const newPage = makePageFn();
        await this._insertPageAtIndex(0, newPage);
        return [newPage];
    }

    // Saves a single page's data (elements/settings). Does NOT touch order —
    // use insertPageAfter/deletePage for anything that changes page count.
    static async savePage(page) {
        const db = await this.init();
        await db.put(this.PAGES_STORE, page);
    }

    static async getSpellbookSnapshot() {
        const [pages, font] = await Promise.all([
            this.loadAllPagesInOrder(),
            this.getFont(),
        ]);
        return { pages, font, name: this.activeDBName };
    }

    static async getSyncState() {
        const db = await this.init();
        return (await db.get(this.SETTINGS_STORE, 'cloudSync'))?.value ?? {
            enabled: false,
            provider: 'dropbox',
        };
    }

    static async saveSyncState(value) {
        const db = await this.init();
        await db.put(this.SETTINGS_STORE, { key: 'cloudSync', value });
    }

    static async replaceSpellbookContents({ pages, font }) {
        const db = await this.init();
        const tx = db.transaction(
            [this.PAGES_STORE, this.ORDER_STORE, this.SETTINGS_STORE],
            'readwrite',
        );
        const pagesStore = tx.objectStore(this.PAGES_STORE);
        const orderStore = tx.objectStore(this.ORDER_STORE);
        const settingsStore = tx.objectStore(this.SETTINGS_STORE);

        await Promise.all([
            pagesStore.clear(),
            orderStore.clear(),
            font
                ? settingsStore.put({ key: 'font', data: font.data, name: font.name })
                : settingsStore.delete('font'),
        ]);
        for (const page of pages) {
            await pagesStore.put(page);
        }
        await orderStore.put({ key: 'order', ids: pages.map((page) => page.id) });
        await tx.done;
    }

    // Shared internal primitive: writes the page record AND splices its id
    // into the order array, atomically, in one transaction. Both
    // insertPageAfter and ensureAtLeastOnePage go through this — nothing else
    // should call tx.objectStore(ORDER_STORE) directly.
    static async _insertPageAtIndex(index, newPage) {
        const db = await this.init();
        const tx = db.transaction([this.PAGES_STORE, this.ORDER_STORE], 'readwrite');

        const orderRecord = (await tx.objectStore(this.ORDER_STORE).get('order')) ?? {
            key: 'order',
            ids: [],
        };
        orderRecord.ids.splice(index, 0, newPage.id);

        await Promise.all([
            tx.objectStore(this.PAGES_STORE).put(newPage),
            tx.objectStore(this.ORDER_STORE).put(orderRecord),
        ]);

        await tx.done;
    }

    // Atomically: creates a new blank page record AND inserts its id into
    // the order array at afterIndex + 1. Both writes succeed or both fail.
    static async insertPageAfter(afterIndex, newPage) {
        await this._insertPageAtIndex(afterIndex + 1, newPage);
    }

    // Atomically: deletes the page record AND removes its id from the order array.
    static async deletePage(id) {
        const db = await this.init();
        const tx = db.transaction([this.PAGES_STORE, this.ORDER_STORE], 'readwrite');

        const orderRecord = await tx.objectStore(this.ORDER_STORE).get('order');
        if (orderRecord) {
            orderRecord.ids = orderRecord.ids.filter((existingId) => existingId !== id);
            await tx.objectStore(this.ORDER_STORE).put(orderRecord);
        }

        await tx.objectStore(this.PAGES_STORE).delete(id);
        await tx.done;
    }

    static async deleteSpellbook(dbName) {
        const currentName = await this.getCurrentSpellbookName();
        if (dbName === currentName) {
            throw new Error('Cannot delete the currently active spellbook');
        }
        const spellbookList = await this.listAllSpellbooks();
        const updatedList = spellbookList.filter((name) => name !== dbName);
        await SettingsDB.set(settingsOptions.SPELLBOOK_LIST, updatedList);
        await window.indexedDB.deleteDatabase(dbName);
    }

    static async renameSpellbook(oldName, newName) {
        const syncState = await this.getSyncState();
        const data = await this.getSpellbookSnapshot();

        await this.createNewSpellbook(newName);
        await this.replaceSpellbookContents(data);
        await this.saveSyncState(syncState);
        await this.deleteSpellbook(oldName);

        const spellbookList = await this.listAllSpellbooks();
        const updatedList = spellbookList.map((name) =>
            name === oldName ? newName : name,
        );
        await SettingsDB.set(settingsOptions.SPELLBOOK_LIST, updatedList);

        await this.switchSpellbook(newName);
    }

    /* LEGACY MIGRATION (v1 spells -> v2 pages) */

    // Builds a page object from a legacy spell record, using
    // spell.template.json as the layout/settings source and only pulling
    // actual content (text / imageFile) from the old spell fields.
    static _buildPageFromSpell(spell) {
        const templateElements = spellTemplate.pages?.[0]?.elements ?? [];

        const elements = templateElements.map((templateEl) => {
            const spellKey = SPELL_TEMPLATE_ELEMENT_MAP[templateEl.id];
            const props = { ...templateEl.props };

            if (spellKey) {
                if (templateEl.type === 'image') {
                    const iconValue = spell[spellKey];
                    props.imageFile = iconValue instanceof Blob ? iconValue : null;
                } else {
                    const rawValue = spell[spellKey];
                    props.text =
                        rawValue !== undefined && rawValue !== null
                            ? String(rawValue)
                            : '';
                }
            }

            return {
                id: crypto.randomUUID(),
                type: templateEl.type,
                top: templateEl.top,
                left: templateEl.left,
                widthUnits: templateEl.widthUnits,
                heightUnits: templateEl.heightUnits,
                zIndex: templateEl.zIndex,
                props,
            };
        });

        return {
            id: crypto.randomUUID(),
            elements,
            settings: { showOnOverview: false, name: spell[spellOptions.NAME] || '' },
        };
    }

    // Runs once when upgrading a database from v1 (spells/notes stores) to
    // v2 (pages/pageOrder stores). Reads every legacy spell, converts each
    // into a page via _buildPageFromSpell, and writes them into the new
    // stores in the old pages' original order. The old 'spells' store is
    // deliberately left untouched on disk for now (see commented-out
    // deleteObjectStore calls in init's upgrade callback) until this has
    // been tested.
    static async _migrateSpellsToPages(db, oldVersion, transaction) {
        if (oldVersion >= 2 || !db.objectStoreNames.contains('spells')) {
            return;
        }

        const spells = await transaction.objectStore('spells').getAll();
        if (!spells.length) return;

        spells.sort(
            (a, b) => (a[spellOptions.PAGE] ?? 0) - (b[spellOptions.PAGE] ?? 0),
        );

        const pagesStore = transaction.objectStore(this.PAGES_STORE);
        const orderStore = transaction.objectStore(this.ORDER_STORE);

        const orderRecord = (await orderStore.get('order')) ?? {
            key: 'order',
            ids: [],
        };

        for (const spell of spells) {
            const page = this._buildPageFromSpell(spell);
            await pagesStore.put(page);
            orderRecord.ids.push(page.id);
        }

        await orderStore.put(orderRecord);
    }

    /* IMPORT/EXPORT */

    // Recursively walks a plain JS value (arrays/objects) looking for
    // Blob/File instances and replaces them with a serializable marker.
    // Used only for export — elements can freely store Blob/File in their
    // props (e.g. Image's imageFile) without PageDB needing to know about
    // specific element types.
    static async _serializeBlobs(value) {
        if (value instanceof Blob) {
            return {
                __blob: true,
                data: await this.fileToBase64(value),
                type: value.type,
                name: value.name || null,
            };
        }
        if (Array.isArray(value)) {
            return Promise.all(value.map((item) => this._serializeBlobs(item)));
        }
        if (value && typeof value === 'object') {
            const entries = await Promise.all(
                Object.entries(value).map(async ([key, val]) => [
                    key,
                    await this._serializeBlobs(val),
                ]),
            );
            return Object.fromEntries(entries);
        }
        return value;
    }

    // Reverse of _serializeBlobs: walks a plain JS value looking for the
    // { __blob: true, ... } marker and reconstructs a File from its base64 data.
    static async _deserializeBlobs(value) {
        if (value instanceof Blob) {
            return value;
        }
        if (value && typeof value === 'object' && value.__blob) {
            const res = await fetch(value.data);
            const blob = await res.blob();
            return new File([blob], value.name || 'file', {
                type: value.type || blob.type,
            });
        }
        if (Array.isArray(value)) {
            return Promise.all(value.map((item) => this._deserializeBlobs(item)));
        }
        if (value && typeof value === 'object') {
            const entries = await Promise.all(
                Object.entries(value).map(async ([key, val]) => [
                    key,
                    await this._deserializeBlobs(val),
                ]),
            );
            return Object.fromEntries(entries);
        }
        return value;
    }

    // New format only, per your instruction.
    static async exportSpellbookData() {
        const fontData = await this.getFont();
        const pages = await this.loadAllPagesInOrder();

        if (fontData && fontData.data instanceof Blob) {
            fontData.data = await this.fileToBase64(fontData.data);
        }

        return {
            pages: await this._serializeBlobs(pages),
            name: this.activeDBName,
            exportDate: new Date().toISOString(),
            font: fontData,
        };
    }

    // Accepts both new-format ({ pages: [...] }) and old-format
    // ({ spells: [...], notes: [...] }) exports.
    static async importSpellbookData(data) {
        if (data.font) {
            await this.saveFont(data.font);
        }

        if (data.pages && Array.isArray(data.pages)) {
            await this._importNewFormat(data.pages);
        } else if (data.spells || data.notes) {
            await this._importLegacyFormat(data);
        }
    }

    static async _importNewFormat(pages) {
        const deserializedPages = await this._deserializeBlobs(pages);
        const db = await this.init();
        const tx = db.transaction([this.PAGES_STORE, this.ORDER_STORE], 'readwrite');

        for (const page of deserializedPages) {
            await tx.objectStore(this.PAGES_STORE).put(page);
        }
        await tx.objectStore(this.ORDER_STORE).put({
            key: 'order',
            ids: deserializedPages.map((p) => p.id),
        });

        await tx.done;
    }

    // Legacy spells/notes imports are converted into single-element pages,
    // ordered by their old page number, so old exports remain importable
    // without you having to write a separate migration path right now.
    static async _importLegacyFormat(data) {
        const legacyPages = [];

        if (Array.isArray(data.spells)) {
            for (const spell of data.spells) {
                const importedSpell = { ...spell };
                const icon = importedSpell[spellOptions.ICONURL];
                if (icon && typeof icon === 'object' && icon.data) {
                    const response = await fetch(icon.data);
                    const blob = await response.blob();
                    importedSpell[spellOptions.ICONURL] = new File(
                        [blob],
                        icon.name || 'image',
                        { type: icon.type || blob.type },
                    );
                }

                legacyPages.push({
                    sourcePage: spell[spellOptions.PAGE] ?? 0,
                    page: this._buildPageFromSpell(importedSpell),
                });
            }
        }

        if (Array.isArray(data.notes)) {
            for (const note of data.notes) {
                legacyPages.push({
                    sourcePage: note.page ?? 0,
                    page: {
                        id: crypto.randomUUID(),
                        elements: [
                            {
                                id: crypto.randomUUID(),
                                type: 'legacy-note',
                                props: note,
                            },
                        ],
                        settings: { showOnOverview: false, name: '' },
                    },
                });
            }
        }

        legacyPages.sort((a, b) => a.sourcePage - b.sourcePage);
        await this._importNewFormat(legacyPages.map((entry) => entry.page));
    }

    /* FONT (unchanged from SpellbookDB) */

    static async saveFont(fontData) {
        const db = await this.init();
        await db.put(this.SETTINGS_STORE, {
            key: 'font',
            data: fontData.data,
            name: fontData.name,
        });
    }

    static async getFont() {
        const db = await this.init();
        if (!db.objectStoreNames.contains(this.SETTINGS_STORE)) {
            return null;
        }
        return db.get(this.SETTINGS_STORE, 'font');
    }

    static async removeFont() {
        const db = await this.init();
        await db.delete(this.SETTINGS_STORE, 'font');
    }

    static async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    }
}