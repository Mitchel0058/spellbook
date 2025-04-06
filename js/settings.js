/**
 * Settings object containing application configurations.
 * @property {number} recent_page - The most recently accessed page.
 * @property {number} font_addition - Additional font size adjustment.
 * @property {boolean} page_fit - Whether the page should fit the viewport.
 * @property {boolean} animation - Whether animations are enabled.
 * @property {string|null} local_font - Custom local font data.
 * @property {string|null} Current_Spellbook_db - Current spellbook database.
 */
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

/**
 * Proxy wrapper for the settings object to handle changes and trigger updates.
 */
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

/**
 * Debounces a function to limit the rate at which it can fire.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The debounce delay in milliseconds.
 * @returns {Function} A debounced version of the input function.
 */
function settingsDebounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Handles settings changes and saves them to the database after a delay.
 */
handleSettingsEvent = settingsDebounce((event) => {
    saveSettingsToDB();
}, 750);


let settingsDB = null;

/**
 * Opens the IndexedDB database for storing settings.
 * Initializes the database if it doesn't already exist.
 */
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

/**
 * Saves the current settings to the IndexedDB database.
 */
function saveSettingsToDB() {
    if (!settingsDB) {
        return;
    }

    const request = settingsDB.transaction(['settings'], 'readwrite').objectStore('settings').put({ id: 1, ...settingsProxy });

    request.onsuccess = (event) => {
        // console.log('Settings saved successfully', settingsProxy);
    };
}

/**
 * Updates the font size adjustment setting.
 * @param {number} addition - The additional font size value.
 */
function updateFontAddition(addition) {
    settingsProxy.font_addition = parseFloat(addition);
}

/**
 * Applies all settings to the application.
 */
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

/**
 * Adjusts the dimensions of elements with the class 'page-img' based on the `page_fit` setting.
 * If `page_fit` is enabled, the elements are resized to fit the width of the viewport while maintaining aspect ratio.
 * If `page_fit` is disabled, the elements' dimensions are reset to their default styles.
 */
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

/**
 * Adjusts the root element's font size dynamically based on a default font size
 * and an additional value from the settings proxy. The new font size is applied
 * as a CSS variable (--reactive-font-size) in viewport height (vh) units.
 */
function applyFontSize() {
    const root = document.documentElement;
    const newFontSize = window.defaultFontSize + settingsProxy.font_addition / 10;
    root.style.setProperty('--reactive-font-size', `${newFontSize}vh`);
}

/**
 * Applies a custom local font to the document by dynamically creating a 
 * @font-face rule and setting it as the font family for the body element.
 * 
 * The font data is retrieved from `settingsProxy.local_font` and used to 
 * create a Blob, which is then converted into a URL for use in the 
 * @font-face rule. The font is loaded asynchronously before being applied.
 * 
 * @throws {Error} If `settingsProxy.local_font` is not defined or invalid.
 */
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

/**
 * Initializes the settings page by populating form elements with values
 * from the `settingsProxy` object. This function sets the values of
 * input fields and checkboxes to reflect the current application settings.
 */
function initializeSettingsPage() {
    document.getElementById('font_addition').value = settingsProxy.font_addition;
    document.getElementById('page_fit').checked = settingsProxy.page_fit;
    document.getElementById('animation').checked = settingsProxy.animation;
    // document.getElementById('local_font').value = settingsProxy.local_font || '';
}

/**
 * Updates the page fit setting in the settings proxy.
 *
 * @param {boolean} checked - A boolean value indicating whether the page fit option is enabled or not.
 */
function updatePageFit(checked) {
    settingsProxy.page_fit = checked;
}

/**
 * Updates the animation setting in the settings proxy.
 *
 * @param {boolean} checked - A boolean value indicating whether the animation setting is enabled (true) or disabled (false).
 */
function updateAnimation(checked) {
    settingsProxy.animation = checked;
}

/**
 * Updates the local font by reading a font file, creating a custom font-face,
 * and applying it to the document body. The font is also stored in the 
 * `settingsProxy.local_font` property.
 *
 * @param {File} font - The font file selected by the user. Must be a valid font file
 *                      with an extension of 'ttf', 'otf', 'woff', or 'woff2'.
 * @throws {Error} Will alert the user if no font file is provided.
 */
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

/**
 * Removes the locally set font from the application settings and resets the font family of the document body.
 * 
 * This function clears the `local_font` property in the `settingsProxy` object, effectively removing any custom
 * font settings. It also resets the `fontFamily` style of the document's body to its default value.
 */
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
 * Imports a JSON file containing spell page data into an IndexedDB database.
 * 
 * This function reads a JSON file, parses its content, and stores the data
 * into the "pages" object store of the "spellPageDB" database. If the database
 * or object store does not exist, they will be created. Existing data in the
 * database will be overwritten.
 * 
 * @param {File} pageJSON - The JSON file containing an array of spell page objects to import.
 * @throws Will alert the user if the file is invalid, the JSON format is incorrect, or if an error occurs during the import process.
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
            
            // Clear existing data in the database before importing new data
            const clearTransaction = pageDB.transaction(['pages'], 'readwrite');
            const clearObjectStore = clearTransaction.objectStore('pages');
            clearObjectStore.clear().onsuccess = () => {
                // console.log("Existing data cleared from the database.");
            };
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