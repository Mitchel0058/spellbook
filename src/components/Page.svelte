<script>
    import { appState, AppMode } from "../context/appState.svelte.js";
    import { PageType, pageImages } from "../constants/pageType.js";
    import OptionsModal from "./OptionsModal.svelte";
    import { createPageOptionsModal } from "../context/pageOptionsModal.svelte.js";

    let { pageType, children, rightPage = false } = $props();

    const pageOptionsModal = createPageOptionsModal();

    $effect(() => {
        if (appState.mode !== AppMode.EDITING) {
            pageOptionsModal.close();
        }
    });

    function getImagePath(type) {
        const imageName = pageImages[type] || pageImages[PageType.COVER];
        return `assets/img/${imageName}`;
    }

    let pageEl = $state(null);
    let unitWidthPx = $state(0);
    let unitHeightPx = $state(0);

    // Measures this specific page's own box and exposes one "unit" as real
    // pixels, scoped as an inheritable CSS var on this page's root element.
    // Unlike --unit-width (a %), this stays correct for descendants no
    // matter how deeply nested or how their own containing block is sized,
    // since px custom properties inherit as-is rather than being
    // recomputed against each element's own containing block.
    $effect(() => {
        if (!pageEl) return;
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            // Matches --unit-width: 0.7246% / --unit-height: 0.5263%
            unitWidthPx = width * 0.007246;
            unitHeightPx = height * 0.005263;
        });
        observer.observe(pageEl);
        return () => observer.disconnect();
    });
</script>

<div
    class="svg-overlay"
    bind:this={pageEl}
    style="--unit-width-px: {unitWidthPx}px; --unit-height-px: {unitHeightPx}px;"
>
    <img
        class="page-img"
        src={getImagePath(pageType)}
        alt={`${pageType} page of DnD book`}
        draggable="false"
    />
    <OptionsModal modal={pageOptionsModal} {rightPage} />
    {@render children?.()}
</div>

<style>
    .svg-overlay {
        position: relative;
        width: 100%;
        max-height: 100vh;
        max-height: 100svh;
    }
</style>
