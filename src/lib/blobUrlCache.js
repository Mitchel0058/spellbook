// Module-level cache: the same Blob/File always resolves to the same
// object URL. This is what actually prevents the flicker — every mount of
// Image.svelte (the real page, the flip panel's temporary copy, and the
// preload warm-up) was previously calling URL.createObjectURL() fresh, so
// each got a distinct URL string. Decoding one URL doesn't warm another,
// even for identical bytes, so the "preload" work was being thrown away
// and the flip-panel -> real-page handoff was always a fresh decode.
//
// Deliberately NOT ref-counted / auto-revoked on component unmount: the
// same blob is reused across the flip panel's temporary mount and the real
// page's permanent mount, often within the same reactive flush, so tying
// revocation to any single component's lifecycle risks revoking a URL
// another consumer still needs mid-swap. Call releaseObjectUrl() explicitly
// when a blob is genuinely gone for good (e.g. the image was deleted).

const cache = new Map(); // Blob -> url string

export function getObjectUrl(blob) {
    if (!blob) return null;
    let url = cache.get(blob);
    if (!url) {
        url = URL.createObjectURL(blob);
        cache.set(blob, url);
    }
    return url;
}

export function releaseObjectUrl(blob) {
    if (!blob) return;
    const url = cache.get(blob);
    if (!url) return;
    URL.revokeObjectURL(url);
    cache.delete(blob);
}