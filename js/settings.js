let settings = {
    "recent_page": 1,
    "page_fit": false,
    "animation": true,
    "local_font": null,
    "Current_Spellbook_db": null
};
let settingsDB = null;

function openSettingsDB() {
    const request = indexedDB.open("Settings", 1);
    request.onerror = (event) => {
        console.error(`Database error: ${event.target.error?.message}`);
    };
    request.onsuccess = (event) => {
        settingsDB = event.target.result;
        const request = settingsDB.transaction(['settings'], 'readonly').objectStore('settings').get(1);
        request.onsuccess = (event) => {
            settings = event.target.result;
            console.log('Settings loaded successfully', settings);
        }
        // TODO: delete
        saveSettingsToDB();
    };
    request.onupgradeneeded = (event) => {
        settingsDB = event.target.result;

        console.log('Database upgrade needed', settingsDB);
        const db = event.target.result;
        if (!db.objectStoreNames.contains("settings")) {
            const objectStore = db.createObjectStore("settings", { keyPath: "id" });
            objectStore.transaction.oncomplete = () => {
                const settingsObjectStore = db.transaction("settings", "readwrite").objectStore("settings");
                settingsObjectStore.add({ id: 1, ...settings });
            };
        }
    };
}

function saveSettingsToDB() {
    if (!settingsDB) {
        console.error('Database has not been opened yet');
        return;
    }

    const request = settingsDB.transaction(['settings'], 'readwrite').objectStore('settings').put({ id: 1, ...settings });

    request.onsuccess = (event) => {
        console.log('Settings saved successfully', settings);
    };
}

openSettingsDB();