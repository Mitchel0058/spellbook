import { openDB } from 'idb';
import { settingsOptions, DEFAULT_SETTINGS } from '../constants/settingsOptions';
import { spellOptions, DEFAULT_SPELL_OPTIONS } from '../constants/spellOptions';
import { noteOptions, DEFAULT_NOTE_OPTIONS } from '../constants/noteOptions';

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
            upgrade(db, oldVersion, newVersion, transaction) {
                if (upgradeCallback) {
                    upgradeCallback(db, oldVersion, newVersion, transaction);
                }
            },
        });
    }
}

/**
 * Settings database manager
 */
export class SettingsDB {
    static DB_NAME = 'Settings';
    static STORE_NAME = 'settings';
    static VERSION = 1;

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
 * Spellbook database manager for both spells and notes
 */
export class SpellbookDB {
    static SPELLS_STORE = 'spells';
    static NOTES_STORE = 'notes';
    static VERSION = 1;

    static activeDB = null;
    static activeDBName = null;

    /**
     * Initialize the Spellbook database with the given name
     * @param {string} dbName - The name of the spellbook database
     * @returns {Promise<IDBDatabase>}
     */
    static async init(dbName = null) {
        // If no dbName is provided, get the current spellbook name from settings
        if (!dbName) {
            dbName = await SettingsDB.get(settingsOptions.CURRENT_SPELLBOOK_DB);
        }

        // If we already have this DB open, return it
        if (this.activeDB && this.activeDBName === dbName) {
            return this.activeDB;
        }

        // Close any previously opened database
        if (this.activeDB) {
            this.activeDB.close();
            this.activeDB = null;
            this.activeDBName = null;
        }

        // Open the database with the given name
        this.activeDB = await DBUtil.initDB(dbName, this.VERSION, (db) => {
            // Create the spells store if it doesn't exist
            if (!db.objectStoreNames.contains(this.SPELLS_STORE)) {
                const spellsStore = db.createObjectStore(this.SPELLS_STORE, { keyPath: spellOptions.PAGE });
                spellsStore.createIndex('pageIndex', spellOptions.PAGE, { unique: true });
            }

            // Create the notes store if it doesn't exist
            if (!db.objectStoreNames.contains(this.NOTES_STORE)) {
                const notesStore = db.createObjectStore(this.NOTES_STORE, { keyPath: noteOptions.PAGE });
                notesStore.createIndex('pageIndex', noteOptions.PAGE, { unique: true });
                notesStore.createIndex('dateIndex', noteOptions.DATE, { unique: false });
            }
        });

        this.activeDBName = dbName;
        return this.activeDB;
    }

    /**
     * Switch to a different spellbook database
     * @param {string} dbName - The name of the spellbook to switch to
     * @returns {Promise<void>}
     */
    static async switchSpellbook(dbName) {
        // Update the current spellbook in settings
        await SettingsDB.set(settingsOptions.CURRENT_SPELLBOOK_DB, dbName);

        // Close and reopen with the new name
        await this.init(dbName);
    }

    /**
     * Get the name of the current active spellbook
     * @returns {Promise<string>} - The name of the current spellbook
     */
    static async getCurrentSpellbookName() {
        return SettingsDB.get(settingsOptions.CURRENT_SPELLBOOK_DB);
    }

    /**
     * List all available spellbook databases
     * @returns {Promise<string[]>} - Array of spellbook names
     */
    static async listAllSpellbooks() {
        // This is an approximation as IndexedDB doesn't directly support listing databases
        // We'll maintain a list in settings
        const spellbookList = await SettingsDB.get('spellbookList');
        return spellbookList || [await this.getCurrentSpellbookName()];
    }

    /**
     * Create a new spellbook database
     * @param {string} dbName - The name for the new spellbook
     * @returns {Promise<void>}
     */
    static async createNewSpellbook(dbName) {
        // Add to the list of spellbooks
        const spellbookList = await this.listAllSpellbooks();
        if (!spellbookList.includes(dbName)) {
            spellbookList.push(dbName);
            await SettingsDB.set('spellbookList', spellbookList);
        }

        // Switch to the new spellbook
        await this.switchSpellbook(dbName);
    }

    /**
     * Delete a spellbook database
     * @param {string} dbName - The name of the spellbook to delete
     * @returns {Promise<void>}
     */
    static async deleteSpellbook(dbName) {
        // Cannot delete the current spellbook
        const currentName = await this.getCurrentSpellbookName();
        if (dbName === currentName) {
            throw new Error('Cannot delete the currently active spellbook');
        }

        // Remove from the list
        const spellbookList = await this.listAllSpellbooks();
        const updatedList = spellbookList.filter(name => name !== dbName);
        await SettingsDB.set('spellbookList', updatedList);

        // Delete the database
        await window.indexedDB.deleteDatabase(dbName);
    }

    /* SPELL METHODS */

    /**
     * Validates if spell properties are valid
     * @param {Object} spell - The spell object to validate
     * @returns {boolean} - Whether the spell is valid
     * @throws {Error} - If the spell has invalid properties
     */
    static validateSpell(spell) {
        const validKeys = Object.values(spellOptions);

        // Check that all required properties exist
        for (const key of validKeys) {
            if (spell[key] === undefined) {
                throw new Error(`Missing required spell property: ${key}`);
            }
        }

        // Check for invalid properties
        for (const key in spell) {
            if (!validKeys.includes(key)) {
                throw new Error(`Invalid spell property: ${key}`);
            }
        }

        return true;
    }

    /**
     * Create a new spell with default values
     * @param {number} page - The page number for the spell
     * @returns {Object} - A new spell object with default values
     */
    static createEmptySpell(page) {
        return {
            ...DEFAULT_SPELL_OPTIONS,
            [spellOptions.PAGE]: page
        };
    }

    /**
     * Get a spell by page number
     * @param {number} page - The page number
     * @returns {Promise<Object>} - The spell or null if not found
     */
    static async getSpellByPage(page) {
        const db = await this.init();
        const spell = await db.get(this.SPELLS_STORE, page);

        if (!spell) return null;

        // Process icon URL if it's a Blob/File
        if (spell[spellOptions.ICONURL] instanceof Blob) {
            // Create an object URL for the blob
            spell._iconObjectUrl = URL.createObjectURL(spell[spellOptions.ICONURL]);
        }

        return spell;
    }

    /**
     * Save a spell
     * @param {Object} spell - The spell object to save
     * @returns {Promise<number>} - The page number of the saved spell
     */
    static async saveSpell(spell) {
        const db = await this.init();

        // Create a copy of the spell without the _iconObjectUrl property
        const spellToSave = { ...spell };

        // Remove the _iconObjectUrl property before validation and saving
        if ('_iconObjectUrl' in spellToSave) {
            delete spellToSave._iconObjectUrl;
        }

        this.validateSpell(spellToSave);
        await db.put(this.SPELLS_STORE, spellToSave);
        return spellToSave[spellOptions.PAGE];
    }

    /**
     * Delete a spell by page number
     * @param {number} page - The page number of the spell to delete
     * @returns {Promise<void>}
     */
    static async deleteSpellByPage(page) {
        const db = await this.init();
        return db.delete(this.SPELLS_STORE, page);
    }

    /**
     * Get all spells
     * @returns {Promise<Array<Object>>} - Array of all spells
     */
    static async getAllSpells() {
        const db = await this.init();
        const spells = await db.getAll(this.SPELLS_STORE);

        // Process any blob image data to create object URLs
        return spells.map(spell => {
            if (spell[spellOptions.ICONURL] instanceof Blob) {
                // Create an object URL for the blob
                spell._iconObjectUrl = URL.createObjectURL(spell[spellOptions.ICONURL]);
            }
            return spell;
        });
    }

    /**
     * Get all spells sorted by page number
     * @returns {Promise<Array<Object>>} - Array of all spells sorted by page
     */
    static async getAllSpellsSortedByPage() {
        const spells = await this.getAllSpells();
        return spells.sort((a, b) => a[spellOptions.PAGE] - b[spellOptions.PAGE]);
    }

    /**
     * Get the highest spell page number currently in use
     * @returns {Promise<number>} - The highest page number or 0 if no spells exist
     */
    static async getHighestSpellPageNumber() {
        const spells = await this.getAllSpells();
        if (spells.length === 0) return 0;

        return Math.max(...spells.map(spell => spell[spellOptions.PAGE]));
    }

    /**
     * Swap the pages of two spells
     * @param {number} pageA - The page number of the first spell
     * @param {number} pageB - The page number of the second spell
     * @returns {Promise<boolean>} - Whether the swap was successful
     */
    static async swapSpellPages(pageA, pageB) {
        try {
            const spellA = await this.getSpellByPage(pageA);
            const spellB = await this.getSpellByPage(pageB);
            
            if (!spellA || !spellB) {
                return false;
            }
            
            // Swap the page numbers
            const tempPage = spellA[spellOptions.PAGE];
            spellA[spellOptions.PAGE] = spellB[spellOptions.PAGE];
            spellB[spellOptions.PAGE] = tempPage;
            
            // Save both spells with their new page numbers
            await this.saveSpell(spellA);
            await this.saveSpell(spellB);
            
            return true;
        } catch (error) {
            console.error('Error swapping spell pages:', error);
            return false;
        }
    }

    /* NOTE METHODS */

    /**
     * Validates if note properties are valid
     * @param {Object} note - The note object to validate
     * @returns {boolean} - Whether the note is valid
     * @throws {Error} - If the note has invalid properties
     */
    static validateNote(note) {
        const validKeys = Object.values(noteOptions);

        // Check that all required properties exist
        for (const key of validKeys) {
            if (note[key] === undefined) {
                throw new Error(`Missing required note property: ${key}`);
            }
        }

        // Check for invalid properties
        for (const key in note) {
            if (!validKeys.includes(key)) {
                throw new Error(`Invalid note property: ${key}`);
            }
        }

        return true;
    }

    /**
     * Create a new note with default values
     * @param {number} page - The page number for the note
     * @returns {Object} - A new note object with default values
     */
    static createEmptyNote(page) {
        return {
            ...DEFAULT_NOTE_OPTIONS,
            [noteOptions.PAGE]: page,
            [noteOptions.DATE]: new Date().toISOString()
        };
    }

    /**
     * Get a note by page number
     * @param {number} page - The page number
     * @returns {Promise<Object>} - The note or null if not found
     */
    static async getNoteByPage(page) {
        const db = await this.init();
        const note = await db.get(this.NOTES_STORE, page);
        return note || null;
    }

    /**
     * Save a note
     * @param {Object} note - The note object to save
     * @returns {Promise<number>} - The page number of the saved note
     */
    static async saveNote(note) {
        const db = await this.init();
        // Ensure date is always current when saving
        note[noteOptions.DATE] = new Date().toISOString();
        this.validateNote(note);
        await db.put(this.NOTES_STORE, note);
        return note[noteOptions.PAGE];
    }

    /**
     * Delete a note by page number
     * @param {number} page - The page number of the note to delete
     * @returns {Promise<void>}
     */
    static async deleteNoteByPage(page) {
        const db = await this.init();
        return db.delete(this.NOTES_STORE, page);
    }

    /**
     * Get all notes
     * @returns {Promise<Array<Object>>} - Array of all notes
     */
    static async getAllNotes() {
        const db = await this.init();
        return db.getAll(this.NOTES_STORE);
    }

    /**
     * Get all notes sorted by page number
     * @returns {Promise<Array<Object>>} - Array of all notes sorted by page
     */
    static async getAllNotesSortedByPage() {
        const notes = await this.getAllNotes();
        return notes.sort((a, b) => a[noteOptions.PAGE] - b[noteOptions.PAGE]);
    }

    /**
     * Get all notes sorted by date (most recent first)
     * @returns {Promise<Array<Object>>} - Array of all notes sorted by date
     */
    static async getAllNotesSortedByDate() {
        const notes = await this.getAllNotes();
        return notes.sort((a, b) => new Date(b[noteOptions.DATE]) - new Date(a[noteOptions.DATE]));
    }

    /**
     * Get the highest note page number currently in use
     * @returns {Promise<number>} - The highest page number or 0 if no notes exist
     */
    static async getHighestNotePageNumber() {
        const notes = await this.getAllNotes();
        if (notes.length === 0) return 0;

        return Math.max(...notes.map(note => note[noteOptions.PAGE]));
    }

    /* IMPORT/EXPORT METHODS */

    /**
     * Clear all content from the current spellbook
     * @returns {Promise<void>}
     */
    static async clearAllContent() {
        const db = await this.init();
        await db.clear(this.SPELLS_STORE);
        await db.clear(this.NOTES_STORE);
    }

    /**
     * Import spellbook data (both spells and notes)
     * @param {Object} data - Object containing arrays of spells and notes
     * @returns {Promise<void>}
     */
    static async importSpellbookData(data) {
        const db = await this.init();

        // Start a transaction for both stores
        const tx = db.transaction([this.SPELLS_STORE, this.NOTES_STORE], 'readwrite');

        // Import spells
        if (data.spells && Array.isArray(data.spells)) {
            for (const spell of data.spells) {
                try {
                    this.validateSpell(spell);
                    await tx.objectStore(this.SPELLS_STORE).put(spell);
                } catch (error) {
                    console.error(`Error importing spell:`, error);
                }
            }
        }

        // Import notes
        if (data.notes && Array.isArray(data.notes)) {
            for (const note of data.notes) {
                try {
                    this.validateNote(note);
                    await tx.objectStore(this.NOTES_STORE).put(note);
                } catch (error) {
                    console.error(`Error importing note:`, error);
                }
            }
        }

        // Complete the transaction
        await tx.done;
    }

    /**
     * Export all data from the current spellbook
     * @returns {Promise<Object>} - Object containing all spells and notes
     */
    static async exportSpellbookData() {
        return {
            spells: await this.getAllSpells(),
            notes: await this.getAllNotes(),
            name: this.activeDBName,
            exportDate: new Date().toISOString()
        };
    }

    /**
     * Convert a File object to base64 string
     * @param {File} file - The file to convert
     * @returns {Promise<string>} - Base64 string representation of the file
     */
    static async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    /**
     * Save an image to a spell
     * @param {number} page - The page number of the spell
     * @param {File} imageFile - The image file to save
     * @returns {Promise<string>} - Object URL to reference the stored blob
     */
    static async saveSpellImage(page, imageFile) {
        try {
            // Get current spell or create a new one
            let spell = await this.getSpellByPage(page);

            if (!spell) {
                // Create new spell if it doesn't exist
                spell = this.createEmptySpell(page);
            }

            // Store the raw blob/file in IndexedDB
            spell[spellOptions.ICONURL] = imageFile;

            // Remove any existing _iconObjectUrl before saving
            if ('_iconObjectUrl' in spell) {
                delete spell._iconObjectUrl;
            }

            // Save the updated spell
            await this.saveSpell(spell);

            // Create and return an object URL for immediate display
            return URL.createObjectURL(imageFile);
        } catch (error) {
            console.error('Error saving spell image:', error);
            throw error;
        }
    }
}
