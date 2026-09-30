let deferredPrompt = null;
let isInstalled = false;
let initialized = false;
const subscribers = new Set();

function publishState() {
    const state = { canInstall: Boolean(deferredPrompt), isInstalled };
    for (const subscriber of subscribers) subscriber(state);
}

export function initializePwaInstall() {
    if (initialized) return;
    initialized = true;

    const displayMode = window.matchMedia(
        "(display-mode: fullscreen), (display-mode: standalone)",
    );
    isInstalled = displayMode.matches || navigator.standalone === true;

    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        deferredPrompt = event;
        publishState();
    });
    window.addEventListener("appinstalled", () => {
        isInstalled = true;
        deferredPrompt = null;
        publishState();
    });
}

export function subscribePwaInstall(subscriber) {
    subscribers.add(subscriber);
    subscriber({ canInstall: Boolean(deferredPrompt), isInstalled });
    return () => subscribers.delete(subscriber);
}

export async function promptPwaInstall() {
    if (!deferredPrompt) return null;

    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    publishState();
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    return outcome;
}