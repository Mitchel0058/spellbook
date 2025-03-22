let urlParams = new URLSearchParams(window.location.search);
let currentPage = parseInt(urlParams.get('page')) || 1;
let isDoublePage = window.innerWidth > window.innerHeight;
let pageDB;

function openDB() {
    const request = indexedDB.open("spellPageDB", 1);
    request.onerror = (event) => {
        console.error(`Database error: ${event.target.error?.message}`);
    };
    request.onsuccess = (event) => {
        pageDB = event.target.result;
        console.log('Database opened successfully');
        loadPageFromDB();
        savePageToDB();
    };
    request.onupgradeneeded = (event) => {
        pageDB = event.target.result;
        console.log('Database upgrade needed');
        if (!pageDB.objectStoreNames.contains('pages')) {
            pageDB.createObjectStore('pages', { keyPath: 'page' });
        }
    };
}

function loadPageFromDB() {
    const transaction = pageDB.transaction(['pages'], 'readonly');
    const objectStore = transaction.objectStore('pages');
    const request = objectStore.get(currentPage);

    request.onsuccess = (event) => {
        const page = event.target.result || {};
        console.log('Page loaded successfully', currentPage, page);
        fillPageData(page, 'p1');

        if (isDoublePage) {
            const request2 = objectStore.get(currentPage + 1);
            request2.onsuccess = (event) => {
                const page2 = event.target.result || {};
                fillPageData(page2, 'p2');
            };
        }
    };
}

function savePageToDB() {
    if (!pageDB) {
        console.error('Database has not been opened yet');
        return;
    }
    const transaction = pageDB.transaction(['pages'], 'readwrite');
    const objectStore = transaction.objectStore('pages');

    const randomWords = [
        "Mystic of the Enigmatic Magic",
        "Arcane of the Ancient Arcana",
        "Ethereal of the Boundless Ether",
        "Celestial of the Infinite Stars",
        "Enchanted of the Eternal Enchantment",
        "Phantom of the Elusive Phantasm",
        "Spectral of the Haunting Specter",
        "Astral of the Cosmic Astral Plane",
        "Divine of the Sacred Divinity",
        "Fabled of the Legendary Fable"
    ];

    const data1 = {
        page: currentPage,
        name: randomWords[Math.floor(Math.random() * randomWords.length)],
        incant: randomWords[Math.floor(Math.random() * randomWords.length)],
        speed: randomWords[Math.floor(Math.random() * randomWords.length)],
        range: randomWords[Math.floor(Math.random() * randomWords.length)],
        type: randomWords[Math.floor(Math.random() * randomWords.length)],
        desc: randomWords[Math.floor(Math.random() * randomWords.length)]
    };
    // name: document.getElementById('p1-name').value,
    // incant: document.getElementById('p1-incant').value,
    // speed: document.getElementById('p1-speed').value,
    // range: document.getElementById('p1-range').value,
    // type: document.getElementById('p1-type').value,
    // desc: document.getElementById('p1-desc').value

    const request1 = objectStore.put(data1);

    request1.onsuccess = (event) => {
        console.log('Page 1 saved successfully', data1);
    };

    if (isDoublePage) {
        const data2 = {
            page: currentPage + 1,
            name: randomWords[Math.floor(Math.random() * randomWords.length)],
            incant: randomWords[Math.floor(Math.random() * randomWords.length)],
            speed: randomWords[Math.floor(Math.random() * randomWords.length)],
            range: randomWords[Math.floor(Math.random() * randomWords.length)],
            type: randomWords[Math.floor(Math.random() * randomWords.length)],
            desc: randomWords[Math.floor(Math.random() * randomWords.length)]
        };
        // name: document.getElementById('p2-name').value,
        // incant: document.getElementById('p2-incant').value,
        // speed: document.getElementById('p2-speed').value,
        // range: document.getElementById('p2-range').value,
        // type: document.getElementById('p2-type').value,
        // desc: document.getElementById('p2-desc').value

        const request2 = objectStore.put(data2);

        request2.onsuccess = (event) => {
            console.log('Page 2 saved successfully', data2);
        };
    }
}

function fillPageData(page, prefix) {
    console.log('Filling page data', page, prefix);
    document.getElementById(`${prefix}-name`).firstChild.nodeValue = page.name || '';
    document.getElementById(`${prefix}-incant`).firstChild.nodeValue = page.incant || '';
    document.getElementById(`${prefix}-speed`).firstChild.nodeValue = page.speed || '';
    document.getElementById(`${prefix}-range`).firstChild.nodeValue = page.range || '';
    document.getElementById(`${prefix}-type`).firstChild.nodeValue = page.type || '';
    document.getElementById(`${prefix}-desc`).firstChild.nodeValue = page.desc || '';
}


// Page Switching
function nextPage() {
    // TODO: Do animation
    if (window.innerWidth > window.innerHeight) {
        currentPage += 2;
        loadPageFromDB();
    } else {
        currentPage++;
        loadPageFromDB();
    }
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('page', currentPage);
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);
}

function previousPage() {
    // TODO: Do animation
    if (window.innerWidth > window.innerHeight) {
        currentPage = Math.max(1, currentPage - 2);
        loadPageFromDB();
    } else {
        currentPage = Math.max(1, currentPage - 1);
        loadPageFromDB();
    }
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('page', currentPage);
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);
}


function editPage(editable) {
    // TODO: TF DID I DO 
    if (editable !== true || null) {
        console.error('Invalid argument');
        return;
    }
}

function toggleFont() {
    document.body.classList.toggle('no-custom-font');
}

window.addEventListener('load', () => {
    openDB();
});