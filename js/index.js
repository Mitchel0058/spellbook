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
let isReorderMode = false;
let draggedButton = null;
let pagesData = [];
let draggedIndex = null;


function openPageDB() {
    const request = indexedDB.open("spellPageDB", 1);
    request.onerror = (event) => {
        console.error(`Database error: ${event.target.error?.message}`);
    };
    request.onsuccess = (event) => {
        pageDB = event.target.result;
        // console.log('Database opened successfully', pageDB);
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
        // console.log('Pages retrieved successfully', pages);
        document.fonts.ready.then(() => {
            displayPageNames(pages);
        });
    };

    request.onerror = (event) => {
        console.error(`Error retrieving pages: ${event.target.error?.message}`);
    };
}


function displayPageNames(pages) {
    pagesData = pages;
    pagesData.forEach((page, index) => {
        page.page = index + 1;
    });

    const overviewContainer = document.getElementById('overview-container');
    overviewContainer.innerHTML = '';

    pagesData.forEach((page, index) => {
        const button = document.createElement('button');
        button.style.font = 'inherit';
        button.className = 'overview-block';
        button.draggable = isReorderMode;
        button.dataset.index = index;

        if (isReorderMode) {
            document.getElementById('overview-container').classList.toggle('reorder-container', isReorderMode);

            button.classList.toggle('reorder-mode', isReorderMode);
            button.addEventListener('dragstart', (e) => {
                draggedIndex = parseInt(e.currentTarget.dataset.index);
                e.dataTransfer.effectAllowed = 'move';
                e.currentTarget.classList.add('dragging');
            });

            button.addEventListener('dragend', (e) => {
                e.currentTarget.classList.remove('dragging');
                draggedIndex = null;
            });

            button.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            button.addEventListener('drop', (e) => {
                e.preventDefault();
                const targetIndex = parseInt(e.currentTarget.dataset.index);
                if (draggedIndex !== null && draggedIndex !== targetIndex) {
                    const movedItem = pagesData[draggedIndex];
                    pagesData.splice(draggedIndex, 1);
                    pagesData.splice(targetIndex, 0, movedItem);
                    displayPageNames(pagesData);
                }
            });
        } else {
            document.getElementById('overview-container').classList.toggle('reorder-container', isReorderMode);
            button.classList.toggle('reorder-mode', isReorderMode);
            button.setAttribute('onclick', `goToPage(${page.page})`);
        }

        const img = document.createElement('img');
        img.className = 'overview-icon';
        img.src = (page.icon && page.icon.url) ? page.icon.url : 'assets/imgs/mini-fireball.svg';
        img.onerror = function () {
            this.src = 'assets/imgs/mini-fireball.svg';
        };
        img.alt = 'Overview icon';
        img.style.objectFit = (page.icon && page.icon.objectFit) ? page.icon.objectFit : '';

        const textDiv = document.createElement('div');
        textDiv.className = 'overview-text';
        textDiv.textContent = `${page.page}) ${page.name}` || '';

        button.appendChild(img);
        button.appendChild(textDiv);
        overviewContainer.appendChild(button);
    });

    if (settings.local_font) {
        applyLocalFont();
    }
}


function toggleReorderMode() {
    isReorderMode = !isReorderMode;
    const btn = document.getElementById('toggle-reorder-btn');
    displayPageNames(pagesData);

    if (!isReorderMode) {
        saveToIndexedDB(pagesData);
    }
}

function saveToIndexedDB(pages) {
    if (!pageDB) {
        console.error('Database not initialized.');
        return;
    }

    const transaction = pageDB.transaction(['pages'], 'readwrite');
    const objectStore = transaction.objectStore('pages');

    pages.forEach((page, index) => {
        // Update the page number to reflect new order 
        page.page = index + 1;
        objectStore.put(page);
    });

    transaction.oncomplete = () => {
        // console.log('All pages saved successfully');
    };

    transaction.onerror = (event) => {
        console.error('Error saving reordered pages:', event.target.error);
    };
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