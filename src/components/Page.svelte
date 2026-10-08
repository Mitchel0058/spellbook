<script>
    import { appState, AppMode } from "../context/appState.svelte.js";
    import { PageType, pageImages } from "../constants/pageType.js";
    import OptionsModal from "./OptionsModal.svelte";
    import { createPageOptionsModal } from "../context/pageOptionsModal.svelte.js";

    let {
        pageType,
        children,
        rightPage = false,
        showBackground = true,
    } = $props();

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

    export function getElement() {
        return pageEl;
    }

    // Matches --unit-width: 0.7246376811594203% / --unit-height: 0.5263157894736842%
    const UNIT_WIDTH_RATIO = 0.007246376811594203;
    const UNIT_HEIGHT_RATIO = 0.005263157894736842;

    // Sets --unit-width-px/--unit-height-px synchronously, before any
    // descendant (e.g. BorderFrame) ever gets its first paint. Using
    // getBoundingClientRect() + setProperty() directly here, rather than
    // relying only on the ResizeObserver below or Svelte's own reactive
    // style write, avoids a race: both of those are asynchronous, so a
    // descendant reading these vars on mount could otherwise see the
    // unset/default value for a frame.
    function measurePage(node) {
        const { width, height } = node.getBoundingClientRect();
        unitWidthPx = width * UNIT_WIDTH_RATIO;
        unitHeightPx = height * UNIT_HEIGHT_RATIO;
        node.style.setProperty("--unit-width-px", `${unitWidthPx}px`);
        node.style.setProperty("--unit-height-px", `${unitHeightPx}px`);
    }

    // Measures this specific page's own box and exposes one "unit" as real
    // pixels, scoped as an inheritable CSS var on this page's root element.
    // Unlike --unit-width (a %), this stays correct for descendants no
    // matter how deeply nested or how their own containing block is sized,
    // since px custom properties inherit as-is rather than being
    // recomputed against each element's own containing block.
    // (Initial value is set synchronously by the measurePage action above;
    // this observer only needs to catch later resizes.)
    $effect(() => {
        if (!pageEl) return;
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            unitWidthPx = width * UNIT_WIDTH_RATIO;
            unitHeightPx = height * UNIT_HEIGHT_RATIO;
        });
        observer.observe(pageEl);
        return () => observer.disconnect();
    });
</script>

<!-- Foreground page -->
<!-- Shared positioning context for background + foreground -->
<div
    class="page-root"
    bind:this={pageEl}
    use:measurePage
    style="--unit-width-px: {unitWidthPx}px; --unit-height-px: {unitHeightPx}px;"
>
    {#if showBackground}
        <img
            class="background-img"
            src={getImagePath(pageType)}
            alt={`${pageType} page of DnD book`}
        />
    {/if}

    <!-- Foreground page -->
    <div class="svg-overlay">
        <img
            class="page-img"
            src={rightPage
                ? "assets/img/page_right.svg"
                : "assets/img/page_left.svg"}
            alt={`${pageType} page of DnD book`}
            draggable="false"
            oncontextmenu={(event) => event.preventDefault()}
        />
        <OptionsModal modal={pageOptionsModal} {rightPage} />
        {@render children?.()}
    </div>
</div>

<style>
    .page-root {
        position: relative;
        width: 100%;
        --reactive-font-size: calc(
            var(--unit-width-px) * 7 + var(--font-size-addition, 0rem) +
                var(--book-font-size-addition, 0rem)
        );
    }

    .svg-overlay {
        position: relative;
        z-index: 1;
        width: 100%;
        max-height: 100vh;
        max-height: 100svh;
    }

    .page-img {
        width: 100%;
        max-height: 100vh;
        /* TODO: option to not stretch to fill the page */
        height: 100vh;
        max-height: 100svh;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }

    .background-img {
        position: absolute;
        top: 0;
        left: 0;
        height: 100svh;
        width: 100%;
        z-index: 0;
        user-select: none;
    }
</style>
