export const DURATION_MS = 600;

export function flipAngleForHinge(hinge) {
    return hinge === "left" ? -180 : 180;
}

// flips: every currently-animating panel, rendered independently in PageFlip.
// holds: per-side pins ("left"/"right", double-page only) so the container
// NOT covered by a given panel keeps showing old content until that panel's
// own animation finishes. Multiple flips can pin the same side at once;
// whichever pinned it first stays authoritative until all of them clear.
export const flipState = $state({
    flips: [],
    holds: { left: [], right: [] },
});

let idCounter = 1;
export function nextFlipId() {
    return idCounter++;
}

export function heldSlot(side, rawSlot) {
    const list = flipState.holds[side];
    return list.length > 0 ? list[0].slot : rawSlot;
}

export function pushHold(side, flipId, slot) {
    flipState.holds[side] = [...flipState.holds[side], { flipId, slot }];
}

export function releaseHold(side, flipId) {
    flipState.holds[side] = flipState.holds[side].filter((h) => h.flipId !== flipId);
}

export function removeFlip(flipId) {
    flipState.flips = flipState.flips.filter((f) => f.id !== flipId);
}

// Safety net: if transitionend never fires (e.g. a browser paint race
// swallows the transition), the flip would sit in flipState.flips forever,
// holding a pinned side and freezing that slot. This forces the same
// completion path once the animation should long since have finished, and
// logs so we can tell how often it's actually happening.
export function finishFlip(flip) {
    if (flip.completed) return;
    flip.completed = true;
    flip.onComplete?.();
}

export function scheduleFlipFailsafe(flip, graceMs = 300) {
    setTimeout(() => {
        if (flip.completed) return;
        console.warn("[flip] failsafe triggered - transitionend never fired", {
            id: flip.id,
            hinge: flip.hinge,
            startSlot: flip.startSlot,
            endSlot: flip.endSlot,
        });
        finishFlip(flip);
    }, DURATION_MS + graceMs);
}