let settings = {
    // TODO: update recent page when changing page, and save it to DB
    "recent_page": 1,
    "font_addition": 0,
    "page_fit": false,
    "animation": true,
    // TODO: make it possible to use a client font
    "local_font": null,
    // TODO: make it possible to use multiple spellbook
    "Current_Spellbook_db": null
};

const settingsProxy = new Proxy(settings, {
    set(target, property, value, save = true) {
        target[property] = value;

        if (save) {
            handleSettingsEvent();
            applySettings();
        }

        return true;
    }
});

// So the DB doesn't get spammed with updates
function settingsDebounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
handleSettingsEvent = settingsDebounce((event) => {
    saveSettingsToDB();
}, 750);


let settingsDB = null;

function openSettingsDB() {
    const request = indexedDB.open("Settings", 1);
    request.onerror = (event) => {
    };
    request.onsuccess = (event) => {
        settingsDB = event.target.result;
        const request = settingsDB.transaction(['settings'], 'readonly').objectStore('settings').get(1);
        request.onsuccess = (event) => {
            const loadedSettings = event.target.result;
            if (loadedSettings) {
                for (const key in loadedSettings) {
                    if (loadedSettings.hasOwnProperty(key)) {
                        Reflect.set(settingsProxy, key, loadedSettings[key], false); // Prevent saving during load
                    }
                }
            }
            applySettings();
            if (window.location.pathname.endsWith('settings.html')) {
                initializeSettingsPage(settingsProxy);
            }
        }
    };
    request.onupgradeneeded = (event) => {
        settingsDB = event.target.result;

        const db = event.target.result;
        if (!db.objectStoreNames.contains("settings")) {
            const objectStore = db.createObjectStore("settings", { keyPath: "id" });
            objectStore.transaction.oncomplete = () => {
                const settingsObjectStore = db.transaction("settings", "readwrite").objectStore("settings");
                settingsObjectStore.add({ id: 1, ...settingsProxy });
            };
        }
    };
}

function saveSettingsToDB() {
    if (!settingsDB) {
        return;
    }

    const request = settingsDB.transaction(['settings'], 'readwrite').objectStore('settings').put({ id: 1, ...settingsProxy });

    request.onsuccess = (event) => {
        // console.log('Settings saved successfully', settingsProxy);
    };
}

function updateFontAddition(addition) {
    settingsProxy.font_addition = parseFloat(addition);
}

applySettings = () => {
    // Page fit
    applyPageFit();

    // Font size
    if (typeof settingsProxy.font_addition === 'number' && !isNaN(settingsProxy.font_addition)) {
        applyFontSize();
    }

    if (settingsProxy.local_font) {
        applyLocalFont();
    }
};

function applyPageFit() {
    if (settingsProxy.page_fit) {
        document.querySelectorAll('.page-img').forEach((element) => {
            element.style.width = '100vw';
            element.style.height = 'auto';

        });
    } else {
        document.querySelectorAll('.page-img').forEach((element) => {
            element.style.width = '';
            element.style.height = '';
        });
    }
}

function applyFontSize() {
    const root = document.documentElement;
    const newFontSize = window.defaultFontSize + settingsProxy.font_addition / 10;
    root.style.setProperty('--reactive-font-size', `${newFontSize}vh`);
}

function applyLocalFont() {
    const fontName = "CustomLocalFont";
    const blob = new Blob([settingsProxy.local_font]);
    const fontUrl = URL.createObjectURL(blob);

    const style = document.createElement("style");
    style.textContent = `
            @font-face {
                font-family: '${fontName}';
                src: url('${fontUrl}') format('truetype');
            }
        `;
    document.head.appendChild(style);

    // Wait for font to load before applying
    document.fonts.load(`1em ${fontName}`).then(() => {
        document.body.style.fontFamily = `'${fontName}', sans-serif`;
    });
}

function initializeSettingsPage(settings) {
    document.getElementById('font_addition').value = settingsProxy.font_addition;
    document.getElementById('page_fit').checked = settingsProxy.page_fit;
    document.getElementById('animation').checked = settingsProxy.animation;
    // document.getElementById('local_font').value = settingsProxy.local_font || '';
}

function updatePageFit(checked) {
    settingsProxy.page_fit = checked;
}

function updateAnimation(checked) {
    settingsProxy.animation = checked;
}

function updateLocalFont(font) {
    settingsProxy.local_font = font;

    const file = font;
    if (!file) {
        alert("Please select a font file first.");
        return;
    }

    const fontName = "CustomLocalFont";
    const ext = file.name.split('.').pop().toLowerCase();

    let format = 'truetype';
    if (ext === 'otf') format = 'opentype';
    else if (ext === 'woff') format = 'woff';
    else if (ext === 'woff2') format = 'woff2';

    const reader = new FileReader();
    reader.onload = function (event) {
        settingsProxy.local_font = event.target.result;
        const blob = new Blob([event.target.result]);
        const fontUrl = URL.createObjectURL(blob);

        const style = document.createElement("style");
        style.textContent = `
            @font-face {
                font-family: '${fontName}';
                src: url('${fontUrl}') format('${format}');
            }
        `;
        document.head.appendChild(style);

        // Wait for font to load before applying
        document.fonts.load(`1em ${fontName}`).then(() => {
            document.body.style.fontFamily = `'${fontName}', sans-serif`;
        });
    };

    reader.readAsArrayBuffer(file);
}

function removeLocalFont() {
    settingsProxy.local_font = null;
    document.body.style.fontFamily = '';
}

/**
 * Exports all data from the "spellPages" object store in the IndexedDB database "spellPageDB"
 * as a downloadable JSON file. The file is named "spellPageDB.json".
 *
 * This function opens the IndexedDB database, retrieves all records from the "spellPages"
 * object store, converts the data to JSON format, and creates a downloadable file for the user.
 */
function exportSpellPageDB() {
    const request = indexedDB.open("spellPageDB", 1);

    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(["pages"], "readonly");
        const objectStore = transaction.objectStore("pages");
        const getAllRequest = objectStore.getAll();

        getAllRequest.onsuccess = (event) => {
            const allData = event.target.result;
            const jsonData = JSON.stringify(allData, null, 2);

            // Create a downloadable JSON file
            const blob = new Blob([jsonData], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "spellPageDB.json";
            a.click();
            URL.revokeObjectURL(url);
        };

        getAllRequest.onerror = (event) => {
            console.error("Failed to retrieve data from spellPageDB:", event.target.error);
        };
    };

    request.onerror = (event) => {
        console.error("Failed to open spellPageDB:", event.target.error);
    };
}

/**
 * Imports data from a JSON file into the "spellPages" object store in the IndexedDB database "spellPageDB".
 *
 * This function allows the user to upload a JSON file, parses its contents, and saves the data into the database.
 */
function importSpellPageDB(pageJSON) {
    let pageDB;
    const request = indexedDB.open("spellPageDB", 1);
    request.onerror = (event) => {
        console.error(`Database error: ${event.target.error?.message}`);
    };
    request.onsuccess = (event) => {
        pageDB = event.target.result;
    };
    request.onupgradeneeded = (event) => {
        pageDB = event.target.result;
        if (!pageDB.objectStoreNames.contains('pages')) {
            pageDB.createObjectStore('pages', { keyPath: 'page' });
            window.location.reload();
        }
    };

    const file = pageJSON
    if (!file) {
        alert("Please select a file to import.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const jsonData = JSON.parse(e.target.result);
            document.getElementById('fileInput').value = '';

            if (!Array.isArray(jsonData)) {
                alert("Invalid file format. The JSON file must contain an array of objects.");
                return;
            }
            if (!confirm("This will overwrite all existing data in the spellbook. Do you want to continue?")) {
                return
            }

            const transaction = pageDB.transaction(['pages'], 'readwrite');
            const objectStore = transaction.objectStore('pages');

            jsonData.forEach((record) => {
                objectStore.put(record);
            });

            transaction.oncomplete = () => {
                alert("Data imported successfully!");
            };

            transaction.onerror = (event) => {
                console.error("Error importing data:", event.target.error);
                alert("Failed to import data. Please check the console for details.");
            };
        } catch (error) {
            console.error("Error parsing JSON file:", error);
            alert("Invalid JSON file. Please check the file format.");
        }
    };

    reader.readAsText(file);
};


openSettingsDB();

document.addEventListener('DOMContentLoaded', () => {
    window.defaultFontSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--reactive-font-size'));
});