let textElements = [];
let boxElements = [];
let jsonData = {};
let currentPage = 1; // Example page number

const defaultValues = {
    Name: "Name",
    Incantation: "Incantation",
    Speed: "Speed",
    Range: "Range",
    DamageType: "Damage Type",
    Description: "Description"
};

function toggleFont() {
    document.body.classList.toggle('no-custom-font');
    resizeText();
}

function resizeText() {
    if (!textElements || !boxElements) {
        // Ensure elements are defined
        initializeTextAndBoxElements();
        return;
    }
    textElements.forEach((element) => {
        element.style.fontSize = ''; // Reset font size
        adjustFontSizeForOverflow(element); // Reapply resizing
    });
    boxElements.forEach((element) => {
        element.style.fontSize = ''; // Reset font size
        adjustFontSizeForOverflow(element); // Reapply resizing
    });
}

function adjustFontSizeForOverflow(element) {
    // Reduce font size until no horizontal or vertical overflow
    while (
        (element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight) &&
        parseFloat(getComputedStyle(element).fontSize) > 10
    ) {
        const currentFontSize = parseFloat(getComputedStyle(element).fontSize);
        element.style.fontSize = (currentFontSize - 1) + "px";
    }
}

let isEditingEnabled = false;

// Populate fields from JSON
function loadContent() {
    if (!jsonData) return; // Ensure jsonData is defined
    Object.keys(jsonData).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            element.textContent = jsonData[key];
            element.setAttribute('data-hint', jsonData[key]); // Set hint text
        }
    });
    resizeText();
}

// Toggle editing mode
function toggleEditing() {
    isEditingEnabled = !isEditingEnabled;
    const elements = document.querySelectorAll('.text-overlay-line, .text-overlay-box');
    elements.forEach(element => {
        if (isEditingEnabled) {
            element.setAttribute('contenteditable', 'true');
            element.addEventListener('input', handleInputEvent); // Add input event listener
        } else {
            element.removeAttribute('contenteditable');
            element.removeEventListener('input', handleInputEvent); // Remove input event listener
            if (!jsonData) jsonData = {}; // Ensure jsonData is defined
            const textContent = element.textContent || element.getAttribute('data-hint'); // Default to hint text if undefined
            jsonData[element.id] = textContent; // Save edited text to jsonData
            saveContentToIndexedDB(); // Save changes when editing is disabled
        }
    });

    const button = document.querySelectorAll('button')[1];
    button.innerText = isEditingEnabled ? 'Confirm' : 'Enable Editing';
    resizeText();
}

function handleInputEvent(event) {
    adjustFontSizeForOverflow(event.target); // Resize text while editing
}

// Save content to IndexedDB
function saveContentToIndexedDB() {
    openDatabase().then(db => {
        const transaction = db.transaction(['spellbook'], 'readwrite');
        const store = transaction.objectStore('spellbook');
        store.put({ page: currentPage, data: jsonData });
    }).catch(error => {
        console.error('Error saving to IndexedDB:', error);
    });
}

// Export JSON content
function exportContent() {
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'spellbook.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Open IndexedDB
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('spellbookDB', 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore('spellbook', { keyPath: 'page' });
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Load content for a specific page
function loadContentForPage(page, isSecondPage = false) {
    openDatabase().then(db => {
        const transaction = db.transaction(['spellbook'], 'readonly');
        const store = transaction.objectStore('spellbook');
        const getRequest = store.get(page);

        getRequest.onsuccess = () => {
            const data = getRequest.result ? getRequest.result.data : defaultValues;
            Object.keys(data).forEach(key => {
                const elementId = isSecondPage ? `${key}2` : key;
                const element = document.getElementById(elementId);
                if (element) {
                    element.textContent = data[key];
                    element.setAttribute('data-hint', data[key]); // Set hint text
                }
            });
            resizeText();
        };

        getRequest.onerror = (event) => {
            console.error('Error loading from IndexedDB:', event.target.error);
        };
    }).catch(error => {
        console.error('Error opening IndexedDB:', error);
    });
}

// Switch to the previous page
function previousPage() {
    if (window.innerWidth > window.innerHeight) {
        if (currentPage > 2) {
            currentPage -= 2;
        } else {
            currentPage = 1;
        }
    } else {
        if (currentPage > 1) {
            currentPage--;
        }
    }
    updateURL();
    switchPageAnimation(false);
    updatePageVisibility();
}

// Switch to the next page
function nextPage() {
    if (window.innerWidth > window.innerHeight) {
        currentPage += 2;
    } else {
        currentPage++;
    }
    updateURL();
    switchPageAnimation(true);
    updatePageVisibility();
}

// Update the URL with the current page number
function updateURL() {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('page', currentPage);
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);
}

// Update the visibility of the pages based on the aspect ratio
function updatePageVisibility() {
    const firstPage = document.querySelector('.svg-overlay.first-page');
    const secondPage = document.querySelector('.svg-overlay.second-page');

    if (window.innerWidth > window.innerHeight) {
        // Show both pages side by side
        firstPage.style.display = 'block';
        secondPage.style.display = 'block';
        loadContentForPage(currentPage);
        loadContentForPage(currentPage + 1, true);
    } else {
        // Show only the current page
        firstPage.style.display = 'block';
        secondPage.style.display = 'none';
        loadContentForPage(currentPage);
    }
}

// Switch page animation
function switchPageAnimation(isNext) {
    const firstPage = document.querySelector('.svg-overlay.first-page');
    const secondPage = document.querySelector('.svg-overlay.second-page');

    if (window.innerWidth > window.innerHeight) {
        // Two pages side by side
        firstPage.classList.remove('slide-in', 'slide-out');
        secondPage.classList.remove('slide-in', 'slide-out');

        if (isNext) {
            firstPage.classList.add('slide-out');
            secondPage.classList.add('slide-in');
        } else {
            firstPage.classList.add('slide-in');
            secondPage.classList.add('slide-out');
        }
    } else {
        // One page at a time
        const currentPageElement = currentPage % 2 === 1 ? firstPage : secondPage;
        const nextPageElement = currentPage % 2 === 1 ? secondPage : firstPage;

        currentPageElement.classList.remove('slide-in', 'slide-out');
        nextPageElement.classList.remove('slide-in', 'slide-out');

        if (isNext) {
            currentPageElement.classList.add('slide-out');
            nextPageElement.classList.add('slide-in');
        } else {
            currentPageElement.classList.add('slide-in');
            nextPageElement.classList.add('slide-out');
        }
    }
}

window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentPage = parseInt(urlParams.get('page')) || 1; // Default to page 1 if not specified

    initializeTextAndBoxElements(); // Select all box elements

    updatePageVisibility(); // Initial check

    // Adjust on resize
    window.addEventListener('resize', () => {
        resizeText();
        updatePageVisibility();
    });
}

function initializeTextAndBoxElements() {
    textElements = document.querySelectorAll('.text-overlay-line'); // Select all line elements
    boxElements = document.querySelectorAll('.text-overlay-box');
}