import { openDB } from 'idb';

/**
 * Global templates, shared by every spellbook. Kept in its own database so
 * nothing about the existing spellbook/settings databases changes.
 */
export class TemplateDB {
    static DB_NAME = 'Spellbook_Templates';
    static STORE_NAME = 'templates';
    static VERSION = 1;

    static dbPromise = null;

    static init() {
        if (!this.dbPromise) {
            const storeName = this.STORE_NAME;
            this.dbPromise = openDB(this.DB_NAME, this.VERSION, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, { keyPath: 'id' });
                    }
                },
            }).catch((error) => {
                this.dbPromise = null;
                throw error;
            });
        }
        return this.dbPromise;
    }

    static async getAll() {
        const db = await this.init();
        return db.getAll(this.STORE_NAME);
    }

    static async put(template) {
        const db = await this.init();
        await db.put(this.STORE_NAME, template);
    }

    static async delete(id) {
        const db = await this.init();
        await db.delete(this.STORE_NAME, id);
    }
}