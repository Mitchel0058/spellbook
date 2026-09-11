// Decoupling layer so nested elements (e.g. PageLink) can trigger page
// navigation without holding a reference to App.svelte. App.svelte
// registers its real implementation on mount.

let navigateImpl = null;

export function registerPageNavigator(fn) {
    navigateImpl = fn;
    return () => {
        if (navigateImpl === fn) navigateImpl = null;
    };
}

export function requestPageNavigation(targetSlot, options = {}) {
    if (!navigateImpl) {
        console.warn("pageNav: no navigator registered yet");
        return;
    }
    navigateImpl(targetSlot, options);
}