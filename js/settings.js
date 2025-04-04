let settings = {
    // TODO: update recent page when changing page, and save it to DB
    "recent_page": 1,
    "font_addition": 2,
    "page_fit": false,
    "animation": true,
    // TODO: make it possible to use a client font
    "local_font": null,
    // TODO: make it possible to use multiple spellbook
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
            applySettings();
            if (window.location.pathname.endsWith('settings.html')) {
                initializeSettingsPage(settings);
            }
        }
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

function updateFontAddition(addition) {
    settings.font_addition = parseFloat(addition);
    applySettings();
    saveSettingsToDB();
}

applySettings = () => {
    if (settings.page_fit) {
        document.querySelectorAll('.page-img').forEach((element) => {
            element.style.width = '100vw';
            element.style.height = 'auto';

        });
        const pageImg = document.querySelector('.page-img');
        console.log('Page img', pageImg);
        if (pageImg) {
            const rect = pageImg.getBoundingClientRect();
            console.log('Page rect', rect);
        } else {
            console.warn('No .page-img element found in the DOM');
        }
    }

    if (typeof settings.font_addition === 'number' && !isNaN(settings.font_addition)) {
        const root = document.documentElement;
        const newFontSize = window.defaultFontSize + settings.font_addition / 10;
        root.style.setProperty('--reactive-font-size', `${newFontSize}vh`);
        console.log('Font size updated', newFontSize);
    }
};


document.addEventListener('DOMContentLoaded', () => {
    window.defaultFontSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--reactive-font-size'));
});

function initializeSettingsPage(settings) {
    document.getElementById('font_addition').value = settings.font_addition;
    document.getElementById('page_fit').checked = settings.page_fit;
    document.getElementById('animation').checked = settings.animation;
    document.getElementById('local_font').value = settings.local_font || '';
    console.log('Settings page initialized with', settings);
}

openSettingsDB();
