let urlParams = new URLSearchParams(window.location.search);
let currentPage = parseInt(urlParams.get('page')) || 1;
// TODO: maybe add an event listener in case the user for example turns the phone sideways
let isDoublePage = window.innerWidth > window.innerHeight;
let pageDB;
let editing = false;
let pageData = {
    page: currentPage,
    name: '',
    incant: '',
    speed: '',
    range: '',
    type: '',
    desc: '',
    lvl: '',
    icon: {
        url: '',
        objectFit: ''
    }
};

function populatePageData(prefix) {
    if (prefix != 'p1' && prefix != 'p2') {
        console.error('Invalid prefix provided', prefix);
        return;
    }
    return pageData = {
        page: prefix === 'p1' ? currentPage : currentPage + 1,
        name: document.getElementById(`${prefix}-name`).innerText,
        incant: document.getElementById(`${prefix}-incant`).innerText,
        speed: document.getElementById(`${prefix}-speed`).innerText,
        range: document.getElementById(`${prefix}-range`).innerText,
        type: document.getElementById(`${prefix}-type`).innerText,
        desc: document.getElementById(`${prefix}-desc`).innerText,
        lvl: document.getElementById(`${prefix}-lvl`).innerText,
        icon: {
            url: document.getElementById(`${prefix}-icon`).src,
            objectFit: document.getElementById(`${prefix}-icon`).style.objectFit || ''
        }
    };
}

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

    const pageData1 = populatePageData('p1');
    const request1 = objectStore.put(pageData1);

    request1.onsuccess = (event) => {
        console.log('Page 1 saved successfully', pageData1);
    };

    if (isDoublePage) {
        const pageData2 = populatePageData('p2');
        const request2 = objectStore.put(pageData2);

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
    document.getElementById(`${prefix}-lvl`).innerText = page.lvl || 0;
    document.getElementById(`${prefix}-icon`).src = page.icon?.url || '';
    document.getElementById(`${prefix}-icon`).style.objectFit = page.icon?.objectFit || '';
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
    document.querySelectorAll('.toggle-edit').forEach(element => {
        element.classList.toggle('uneditable', !editing);
    })
}

function setIconFit(prefix, fit) {
    if (prefix != 'p1' && prefix != 'p2') {
        console.error('Invalid prefix provided', prefix);
        return;
    }
    const icon = document.getElementById(`${prefix}-icon`);
    icon.style.objectFit = fit;
    handleInputEvent();
}

//////////////// ICON
function setImage(prefix) {
    if (prefix != 'p1' && prefix != 'p2') {
        console.error('Invalid prefix provided', prefix);
        return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                document.getElementById(`${prefix}-icon`).src = img.src;
                // console.log('File selected:', file);
                savePageToDB();
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}


//////////////// SPELL LVL
function lvlUp(prefix) {
    if (prefix != 'p1' && prefix != 'p2') {
        console.error('Invalid prefix provided', prefix);
        return;
    };
    const lvlElement = document.getElementById(`${prefix}-lvl`);
    lvlElement.innerText = parseInt(lvlElement.innerText) + 1;
    handleInputEvent();
}

function lvlDown(prefix) {
    if (prefix != 'p1' && prefix != 'p2') {
        console.error('Invalid prefix provided', prefix);
        return;
    };
    const lvlElement = document.getElementById(`${prefix}-lvl`);
    lvlElement.innerText = Math.max(0, parseInt(lvlElement.innerText) - 1);
    handleInputEvent();
}

////// Audio
function playPageTurn() {
    const pageTurnMp3 = new Audio('pageturn.mp3');

    // Random playback speed between 0.9 and 1.1
    const playbackRate = 0.9 + Math.random() * 0.2;
    pageTurnMp3.playbackRate = playbackRate;

    // Use Web Audio API for pitch shifting
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(pageTurnMp3);
    const pitchShift = audioContext.createBiquadFilter();
    pitchShift.type = 'peaking';
    pitchShift.frequency.value = 1000;
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