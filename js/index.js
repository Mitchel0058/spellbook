let opening = true;
let pageDB;
let pageData = {
    page: 1,
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

function openPageDB() {
    const request = indexedDB.open("spellPageDB", 1);
    request.onerror = (event) => {
        console.error(`Database error: ${event.target.error?.message}`);
    };
    request.onsuccess = (event) => {
        pageDB = event.target.result;
        console.log('Database opened successfully', pageDB);
        getAllPages();
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

function getAllPages() {
    if (!pageDB) {
        console.error('Database has not been opened yet');
        return;
    }
    const transaction = pageDB.transaction(['pages'], 'readonly');
    const objectStore = transaction.objectStore('pages');
    const request = objectStore.getAll();

    request.onsuccess = (event) => {
        const pages = event.target.result;
        console.log('Pages retrieved successfully', pages);
        document.fonts.ready.then(() => {
            displayPageNames(pages); 
        });
    };

    request.onerror = (event) => {
        console.error(`Error retrieving pages: ${event.target.error?.message}`);
    };
}

function displayPageNames(pages) {
    const overviewContainer = document.getElementById('overview-container');
    overviewContainer.innerHTML = ''; // Clear existing content

    pages.forEach(page => {
        // Create button element
        const button = document.createElement('button');
        button.style.font = 'inherit';
        button.className = 'overview-block';
        button.setAttribute('onclick', `goToPage(${page.page})`);

        // Create img element
        const img = document.createElement('img');
        img.className = 'overview-icon';
        img.src = page.icon?.url || 'assets/imgs/mini-fireball.svg';
        img.onerror = function () {
            this.src = 'assets/imgs/mini-fireball.svg';
        };
        img.alt = 'Overview icon';
        img.style.objectFit = page.icon?.objectFit || '';

        // Create div element for text
        const textDiv = document.createElement('div');
        textDiv.className = 'overview-text';
        textDiv.textContent = `${page.page}) ${page.name}` || '';

        // Append img and textDiv to button
        button.appendChild(img);
        button.appendChild(textDiv);

        // Append button to overviewContainer
        overviewContainer.appendChild(button);
    });
    applyLocalFont();
}

function goToPage(pageNumber) {
    window.location.href = `pages.html?page=${pageNumber}`;
}

document.addEventListener("DOMContentLoaded", function () {
    // TODO: Animation instead of timeout
    setTimeout(() => {
        document.querySelector('.page-0').style.display = 'none';
        document.querySelector('.page-1').classList.toggle('hide');
        document.querySelector('.page-2').classList.toggle('hide');
    }, 1000);

    openPageDB();
});