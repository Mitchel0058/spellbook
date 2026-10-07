export const DURATION_MS = 600;
export const EASING = "cubic-bezier(0.45, 0, 0.55, 1)";
export const PERSPECTIVE_PX = 1600;

// flips: every panel currently on screen (animating, waiting, or landed and
//        waiting to be removed). Always in creation (id) order.
// holds: per-side slot the static page layer keeps showing for the duration
//        of a burst of flips. Double-page only. null = follow pageNumber.
export const flipState = $state({
    flips: [],
    holds: { left: null, right: null },
});

let idCounter = 1;
export function nextFlipId() {
    return idCounter++;
}

export function flipAngleForHinge(hinge) {
    return hinge === "left" ? -180 : 180;
}

export function findFlip(id) {
    return flipState.flips.find((f) => f.id === id);
}

export function addFlip(flip) {
    flipState.flips.push(flip);
}

export function removeFlip(id) {
    const index = flipState.flips.findIndex((f) => f.id === id);
    if (index !== -1) flipState.flips.splice(index, 1);
}

export function releaseHolds() {
    flipState.holds.left = null;
    flipState.holds.right = null;
}

export function clearFlips() {
    flipState.flips = [];
    releaseHolds();
}

export function heldSlot(side, fallback) {
    const held = flipState.holds[side];
    return held == null ? fallback : held;
}