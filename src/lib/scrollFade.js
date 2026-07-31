// Global scroll-fade system. Any element with the class `scroll-fade-x`
// and/or `scroll-fade-y` automatically gets its edges faded based on
// current scroll position, and un-fades as it nears that edge. Works with
// elements added to the DOM at any time (e.g. new pages) via a
// MutationObserver — no per-component wiring required beyond the class.

const HORIZONTAL_CLASS = 'scroll-fade-x';
const VERTICAL_CLASS = 'scroll-fade-y';

// Tracks elements we've already wired up, so re-scans don't double-attach.
const wired = new WeakSet();
const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
        updateElement(entry.target);
    }
});

function getFadeLengthPx(el, axis) {
    const styles = getComputedStyle(el);
    const fadeLengthRaw = styles.getPropertyValue('--fade-length').trim() || '20%';
    const percent = parseFloat(fadeLengthRaw) || 0;
    const size = axis === 'x' ? el.clientWidth : el.clientHeight;
    return (percent / 100) * size;
}

function updateHorizontal(el) {
    const fadeLengthPx = getFadeLengthPx(el, 'x');
    const maxScroll = el.scrollWidth - el.clientWidth;

    if (maxScroll <= 0 || fadeLengthPx <= 0) {
        el.style.setProperty('--fade-left', '0%');
        el.style.setProperty('--fade-right', '0%');
        return;
    }

    const scrollLeft = el.scrollLeft;
    const remainingRight = maxScroll - scrollLeft;

    const leftPx = Math.min(fadeLengthPx, scrollLeft);
    const rightPx = Math.min(fadeLengthPx, remainingRight);

    el.style.setProperty('--fade-left', `${(leftPx / el.clientWidth) * 100}%`);
    el.style.setProperty('--fade-right', `${(rightPx / el.clientWidth) * 100}%`);
}

function updateVertical(el) {
    const fadeLengthPx = getFadeLengthPx(el, 'y');
    const maxScroll = el.scrollHeight - el.clientHeight;

    if (maxScroll <= 0 || fadeLengthPx <= 0) {
        el.style.setProperty('--fade-top', '0%');
        el.style.setProperty('--fade-bottom', '0%');
        return;
    }

    const scrollTop = el.scrollTop;
    const remainingBottom = maxScroll - scrollTop;

    const topPx = Math.min(fadeLengthPx, scrollTop);
    const bottomPx = Math.min(fadeLengthPx, remainingBottom);

    el.style.setProperty('--fade-top', `${(topPx / el.clientHeight) * 100}%`);
    el.style.setProperty('--fade-bottom', `${(bottomPx / el.clientHeight) * 100}%`);
}

function updateElement(el) {
    if (el.classList.contains(HORIZONTAL_CLASS)) updateHorizontal(el);
    if (el.classList.contains(VERTICAL_CLASS)) updateVertical(el);
}

function wireElement(el) {
    if (wired.has(el)) return;
    wired.add(el);

    el.addEventListener('scroll', () => updateElement(el), { passive: true });
    resizeObserver.observe(el);
    updateElement(el);
}

function scanAndWire(root) {
    if (!(root instanceof Element)) return;

    if (root.classList?.contains(HORIZONTAL_CLASS) || root.classList?.contains(VERTICAL_CLASS)) {
        wireElement(root);
    }

    const matches = root.querySelectorAll?.(
        `.${HORIZONTAL_CLASS}, .${VERTICAL_CLASS}`,
    );
    matches?.forEach(wireElement);
}

let initialized = false;

export function initScrollFade() {
    if (initialized) return;
    initialized = true;

    // Initial sweep of whatever's already in the DOM.
    scanAndWire(document.body);

    // Catch elements added later (new pages, dynamically rendered content).
    const mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    scanAndWire(node);
                }
            });
        }
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });
}