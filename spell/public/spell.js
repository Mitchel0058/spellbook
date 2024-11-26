import jsonData from './spellbook.json';
let textElements;
let boxElements;

function toggleFont() {
    document.body.classList.toggle('no-custom-font');
    resizeText(textElements, boxElements);
}

function resizeText(textElements, boxElements) {
    textElements.forEach((element) => {
        element.style.fontSize = ''; // Reset font size
        adjustFontSizeForOverflow(element); // Reapply resizing
    });
    boxElements.forEach((element) => {
        element.style.fontSize = ''; // Reset font size
        adjustFontSizeForOverflow(element); // Reapply resizing
    });
};

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
    Object.keys(jsonData).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = jsonData[id];
        }
    });
}

// Toggle editing mode
function toggleEditing() {
    isEditingEnabled = !isEditingEnabled;
    const elements = document.querySelectorAll('.text-overlay-line, .text-overlay-box');
    elements.forEach(element => {
        if (isEditingEnabled) {
            element.setAttribute('contenteditable', 'true');
        } else {
            element.removeAttribute('contenteditable');
            saveContentToJSON(); // Save changes when editing is disabled
        }
    });

    const button = document.querySelectorAll('button')[1];
    button.innerText = isEditingEnabled ? 'Disable Editing' : 'Enable Editing';
}

// Save content to JSON
function saveContentToJSON() {
    Object.keys(jsonData).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            jsonData[id] = element.textContent.trim();
        }
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

window.onload = () => {
    loadContent();
    textElements = document.querySelectorAll('.text-overlay-line'); // Select all line elements
    textElements.forEach(adjustFontSizeForOverflow); // Apply initial resizing to each line

    boxElements = document.querySelectorAll('.text-overlay-box'); // Select all box elements
    boxElements.forEach(adjustFontSizeForOverflow); // Apply initial resizing to each box

    // Adjust on resize
    window.addEventListener('resize', () => {
        resizeText(textElements, boxElements);
    });

}