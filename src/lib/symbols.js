// Registry of selectable pixel-art symbols, defined the same way border
// patterns are (see borderPatternLayout.js): a fixed unit grid plus the list
// of filled 1x1 cells.
//
// --- Adding a new symbol -------------------------------------------------
// 1. Get your svg in the "1 rect per pixel" form. 
// 2. Run: node scripts/svg-to-cells.mjs path/to/icon.svg
// 3. Paste the printed { width, height, cells } into a new entry below.
// ---------------------------------------------------------------------------

export const SYMBOLS = {
    Symbol1: {
        id: "Symbol1",
        label: "Symbol 1",
        width: 4,
        height: 6,
        cells: [
            [0, 0], [1, 0], [0, 1], [2, 1], [0, 2], [0, 3], [2, 3], [3, 3], [0, 4], [0, 5],
        ],
    },
    Symbol2: {
        id: "Symbol2",
        label: "Symbol 2",
        width: 4,
        height: 4,
        cells: [
            [0, 0], [1, 0], [2, 1], [0, 2], [3, 2], [0, 3], [1, 3], [3, 3]
        ]
    },
    Symbol3: {
        id: "Symbol3",
        label: "Symbol 3",
        width: 4,
        height: 4,
        cells: [
            [0, 0], [1, 0], [2, 0], [3, 0], [2, 2], [0, 3], [1, 3], [3, 3]
        ]
    },
    Symbol4: {
        id: "Symbol4",
        label: "Symbol 4",
        width: 4,
        height: 4,
        cells: [
            [0, 0], [0, 2], [2, 2], [0, 3], [1, 3], [2, 3], [3, 3]
        ]
    },
    Symbol5: {
        id: "Symbol5",
        label: "Symbol 5",
        width: 4,
        height: 4,
        cells: [
            [0, 0], [1, 0], [3, 0], [2, 2], [1, 3]
        ]
    }
};

export function getSymbol(id) {
    return SYMBOLS[id] ?? null;
}