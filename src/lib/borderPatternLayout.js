// borderPatternLayout.js
// Pattern widths in SVG-native units (matches the viewBox width of each pattern svg)
const SIZES = { large: 22, medium: 12, small: 6 };
const GAP = 1; // one unit gap between consecutive patterns
const CORNER_MARGIN = 2; // fixed reserved units at each end, clears space for corner svg

function repeatingSequence(count) {
    // "large, medium, small, medium, repeat" for the 4+ case
    const cycle = ["large", "medium", "small", "medium"];
    const seq = [];
    for (let i = 0; i < count; i++) seq.push(cycle[i % cycle.length]);
    return seq;
}

function totalWidth(seq) {
    if (seq.length === 0) return 0;
    const sum = seq.reduce((acc, p) => acc + SIZES[p], 0);
    return sum + (seq.length - 1) * GAP;
}

// Collect every valid candidate "shape" (in your stated priority order), then
// pick whichever fits within `available` with the LEAST leftover space.
// Ties are broken by priority order (earlier candidate in the list wins).
function chooseSequence(available) {
    const candidates = [];

    // 4+ : extend the repeating sequence as far as it fits
    let seq4 = [];
    let next = repeatingSequence(seq4.length + 1);
    while (totalWidth(next) <= available) {
        seq4 = next;
        next = repeatingSequence(seq4.length + 1);
    }
    if (seq4.length >= 4) candidates.push(seq4);

    // 3 patterns: always all three together
    candidates.push(["large", "medium", "small"]);

    // 2 patterns, in priority order
    candidates.push(["large", "medium"]);
    candidates.push(["large", "small"]);
    candidates.push(["medium", "small"]);

    // 1 pattern, in priority order
    candidates.push(["large"]);
    candidates.push(["medium"]);
    candidates.push(["small"]);

    const fitting = candidates.filter((c) => totalWidth(c) <= available);
    if (fitting.length === 0) return [];

    let best = fitting[0];
    let bestLeftover = available - totalWidth(best);
    for (const cand of fitting.slice(1)) {
        const leftover = available - totalWidth(cand);
        if (leftover < bestLeftover) {
            best = cand;
            bestLeftover = leftover;
        }
    }
    return best;
}

/**
 * Compute pattern placement for one side of the border.
 * @param {number} availableUnits - total length of the side, in SVG units
 * @returns {{ items: Array<{pattern: string, offset: number, size: number}>, startMargin: number, endMargin: number }}
 */
export function layoutSide(availableUnits) {
    const fittable = Math.max(0, availableUnits - CORNER_MARGIN * 2);

    const seq = chooseSequence(fittable);
    const used = totalWidth(seq);
    const extraLeftover = Math.max(0, fittable - used);

    const extraStart = Math.floor(extraLeftover / 2);
    const extraEnd = extraLeftover - extraStart;

    const startMargin = CORNER_MARGIN + extraStart;
    const endMargin = CORNER_MARGIN + extraEnd;

    const items = [];
    let cursor = startMargin;
    seq.forEach((pattern) => {
        items.push({ pattern, offset: cursor, size: SIZES[pattern] });
        cursor += SIZES[pattern] + GAP;
    });

    return { items, startMargin, endMargin };
}

export const PATTERN_SIZES = SIZES;
export const PATTERN_UNIT_HEIGHT = { large: 6, medium: 4, small: 3 };