// Transient state for the page-flip animation. Not persisted, reset after each flip.

// The one valid rotation magnitude for a given hinge — there is no second
// sign that also looks correct for the same hinge; the other sign always
// swings the panel behind the book. "Reverse" flips (e.g. single-page
// previous) don't use a different angle — they play this same sweep
// backward in time (start at the angle, animate down to 0).
export function flipAngleForHinge(hinge) {
    return hinge === "left" ? -180 : 180;
}

export const flipState = $state({
    active: false,
    animating: false,
    hinge: "right", // "left" | "right" - which edge the panel's transform-origin sits on

    startRotation: 0,
    endRotation: 0,

    rect: null,

    // Content visible the instant the panel mounts, before any transition —
    // must exactly match whatever the real page underneath looks like at
    // that moment, or it'll flash.
    startSlot: null,
    startBlank: false,
    startRightPage: false,

    // Content revealed once the transition finishes.
    endSlot: null,
    endBlank: false,
    endRightPage: false,

    holdLeftSlot: null,
    holdRightSlot: null,
    pendingPageNumber: null,

    onComplete: null,
});

export function resetFlipState() {
    flipState.active = false;
    flipState.animating = false;
    flipState.rect = null;
    flipState.startSlot = null;
    flipState.startBlank = false;
    flipState.startRightPage = false;
    flipState.endSlot = null;
    flipState.endBlank = false;
    flipState.endRightPage = false;
    flipState.holdLeftSlot = null;
    flipState.holdRightSlot = null;
    flipState.pendingPageNumber = null;
}