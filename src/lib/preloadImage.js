// Force-decodes every image blob used on a page's elements before it's
// displayed, so the browser's decode cache is warm by the time Image.svelte
// mints its own object URL and renders it — avoiding the blank-flash on
// first paint of a freshly created blob URL.

async function decodeBlob(blob) {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    try {
        if (typeof createImageBitmap === "function") {
            const bitmap = await createImageBitmap(blob);
            bitmap.close?.();
        } else {
            await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => resolve();
                img.src = url;
            });
        }
    } catch {
        // Non-image blob or decode failure — don't block the flip on it.
    } finally {
        URL.revokeObjectURL(url);
    }
}

// page: a pageData page object ({ elements, settings }) or null/undefined.
export async function preloadPageImages(page) {
    if (!page?.elements?.length) return;
    const blobs = page.elements
        .filter((el) => el.type === "image" && el.props?.imageFile instanceof Blob)
        .map((el) => el.props.imageFile);
    await Promise.all(blobs.map(decodeBlob));
}