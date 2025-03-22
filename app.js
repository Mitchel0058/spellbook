let urlParams = new URLSearchParams(window.location.search);
let currentPage = parseInt(urlParams.get('page')) || 1;
let isDoublePage = window.innerWidth > window.innerHeight;
let pageDB;
let editing = false;

function openDB() {
    const request = indexedDB.open("spellPageDB", 1);
    request.onerror = (event) => {
        console.error(`Database error: ${event.target.error?.message}`);
    };
    request.onsuccess = (event) => {
        pageDB = event.target.result;
        console.log('Database opened successfully');
        loadPageFromDB();
    };
    request.onupgradeneeded = (event) => {
        pageDB = event.target.result;
        console.log('Database upgrade needed');
        if (!pageDB.objectStoreNames.contains('pages')) {
            pageDB.createObjectStore('pages', { keyPath: 'page' });
            window.location.reload();
        }
    };
}

function loadPageFromDB() {
    const transaction = pageDB.transaction(['pages'], 'readonly');
    const objectStore = transaction.objectStore('pages');
    const request = objectStore.get(currentPage);
    document.getElementById(`p1-page`).innerHTML = currentPage || '';
    document.getElementById(`p2-page`).innerHTML = currentPage + 1 || '';

    request.onsuccess = (event) => {
        const page = event.target.result || {};
        // console.log('Page loaded successfully', currentPage, page);
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
        name: document.getElementById('p1-name').innerText,
        incant: document.getElementById('p1-incant').innerText,
        speed: document.getElementById('p1-speed').innerText,
        range: document.getElementById('p1-range').innerText,
        type: document.getElementById('p1-type').innerText,
        desc: document.getElementById('p1-desc').innerText
    };

    const request1 = objectStore.put(data1);

    request1.onsuccess = (event) => {
        // console.log('Page 1 saved successfully', data1);
    };

    if (isDoublePage) {
        const data2 = {
            page: currentPage + 1,
            name: document.getElementById('p2-name').innerText,
            incant: document.getElementById('p2-incant').innerText,
            speed: document.getElementById('p2-speed').innerText,
            range: document.getElementById('p2-range').innerText,
            type: document.getElementById('p2-type').innerText,
            desc: document.getElementById('p2-desc').innerText
        };

        const request2 = objectStore.put(data2);

        request2.onsuccess = (event) => {
            // console.log('Page 2 saved successfully', data2);
        };
    }
}

function fillPageData(page, prefix) {
    // console.log('Filling page data', page, prefix);
    document.getElementById(`${prefix}-name`).innerText = page.name || '';
    document.getElementById(`${prefix}-incant`).innerText = page.incant || '';
    document.getElementById(`${prefix}-speed`).innerText = page.speed || '';
    document.getElementById(`${prefix}-range`).innerText = page.range || '';
    document.getElementById(`${prefix}-type`).innerText = page.type || '';
    document.getElementById(`${prefix}-desc`).innerText = page.desc || '';
}


// Page Switching
function nextPage() {
    playPageTurn();

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
    if (currentPage === 1) return;
    playPageTurn();

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


function toggleFont() {
    document.body.classList.toggle('no-custom-font');
}

// Debounce function to delay the execution of a function
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Updated handleInputEvent function with debounce
handleInputEvent = debounce((event) => {
    // console.log('Input event', event.target);
    savePageToDB();
}, 750);

function toggleEditing() {
    editing = !editing;
    const elements = document.querySelectorAll('.text-overlay, .text-overlay-desc');
    elements.forEach(element => {
        if (editing) {
            element.classList.toggle('editing', true);
            element.setAttribute('contenteditable', 'true');
            element.addEventListener('input', handleInputEvent);
        } else {
            element.classList.toggle('editing', false);
            element.removeAttribute('contenteditable');
            element.removeEventListener('input', handleInputEvent);
        }
    });
}

////// Audio
function playPageTurn() {
    const pageTurnMp3 = new Audio('pageturn.mp3');

    // Random playback speed between 0.9 and 1.1
    const playbackRate = 0.9 + Math.random() * 0.1;
    pageTurnMp3.playbackRate = playbackRate;

    // Use Web Audio API for pitch shifting
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(pageTurnMp3);
    const pitchShift = audioContext.createBiquadFilter();
    pitchShift.type = 'peaking';
    pitchShift.frequency.value = 1000; // Adjust this value if needed
    pitchShift.gain.value = (Math.random() * 0.4 - 0.2) * 10; // Random pitch shift between 0.9 and 1.1

    source.connect(pitchShift);
    pitchShift.connect(audioContext.destination);

    pageTurnMp3.play();
}


window.addEventListener('load', () => {
    openDB();
});



// /////////////////////////////
function clearDB() {
    const transaction = pageDB.transaction(['pages'], 'readwrite');
    const objectStore = transaction.objectStore('pages');
    const clearRequest = objectStore.clear();
    if (!confirm('Are you sure you want to clear the database? This will delete all data. This action cannot be undone.')) {
        return;
    }

    clearRequest.onsuccess = () => {
        console.log('Database cleared successfully');
    };

    clearRequest.onerror = (event) => {
        console.error(`Clear database error: ${event.target.error?.message}`);
    };
}