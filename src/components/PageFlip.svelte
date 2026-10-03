<script>
    import {
        flipState,
        DURATION_MS,
        finishFlip,
    } from "../context/flipState.svelte.js";
    import { pageData } from "../context/pageData.svelte.js";
    import { PageType } from "../constants/pageType.js";
    import Page from "./Page.svelte";
    import PageLayout from "./PageLayout.svelte";
    import Overview from "./Overview.svelte";
    import Settings from "./Settings.svelte";

    let { isDoublePage } = $props();

    const PERSPECTIVE_PX = 1600;

    let maxPage = $derived(pageData.pages.length);

    function slotKind(slot) {
        if (slot === 0) return "overview";
        if (slot >= 1 && slot <= maxPage) return "page";
        if (isDoublePage && maxPage % 2 === 1 && slot === maxPage + 1) {
            return "blank";
        }
        const settingsSlot = maxPage + 1 + (isDoublePage ? maxPage % 2 : 0);
        return slot === settingsSlot ? "settings" : "blank";
    }

    function rotationFor(flip) {
        return flip.animating ? flip.endRotation : flip.startRotation;
    }
    function transformOriginFor(flip) {
        return flip.hinge === "left" ? "0% 50%" : "100% 50%";
    }

    // Lower id = older flip. Before the midpoint the oldest panel should sit
    // on top (its outgoing content is still what's "settled"); after the
    // midpoint the newest panel should take over. Base offset just keeps
    // both comfortably above ordinary page content.
    const Z_BASE = 1000;
    function earlyZIndex(flip) {
        return Z_BASE - flip.id; // smaller id -> higher z
    }
    function lateZIndex(flip) {
        return Z_BASE + flip.id; // larger id -> higher z
    }

    // Whichever of start/end sits at rotation 0 is geometrically visible as
    // .front; whichever sits at the flip angle is visible as .back (which
    // carries its own baked-in 180deg). This must be computed per flip,
    // since reverse-playback flips (single-page next) start at the angle.
    function frontContentFor(flip) {
        return flip.startRotation === 0
            ? {
                  slot: flip.startSlot,
                  blank: flip.startBlank,
                  rightPage: flip.startRightPage,
              }
            : {
                  slot: flip.endSlot,
                  blank: flip.endBlank,
                  rightPage: flip.endRightPage,
              };
    }
    function backContentFor(flip) {
        return flip.startRotation === 0
            ? {
                  slot: flip.endSlot,
                  blank: flip.endBlank,
                  rightPage: flip.endRightPage,
              }
            : {
                  slot: flip.startSlot,
                  blank: flip.startBlank,
                  rightPage: flip.startRightPage,
              };
    }

    function handleTransitionEnd(flip, e) {
        if (e.target !== e.currentTarget) return;
        if (e.propertyName !== "transform") return;
        finishFlip(flip);
    }
</script>

{#each flipState.flips as flip (flip.id)}
    <div
        class="flip-panel"
        style:top="{flip.rect.top}px"
        style:left="{flip.rect.left}px"
        style:width="{flip.rect.width}px"
        style:height="{flip.rect.height}px"
        style:transform-origin={transformOriginFor(flip)}
        style:transform="perspective({PERSPECTIVE_PX}px) rotateY({rotationFor(
            flip,
        )}deg)"
        style:z-index={flip.animating ? lateZIndex(flip) : earlyZIndex(flip)}
        style:transition-duration="{DURATION_MS}ms, 0ms"
        style:transition-delay="0ms, {DURATION_MS / 2}ms"
        ontransitionend={(e) => handleTransitionEnd(flip, e)}
    >
        {#snippet face(content)}
            {#if content.blank || content.slot == null}
                <Page
                    pageType={content.rightPage
                        ? PageType.BLANK_RIGHT
                        : PageType.BLANK}
                    rightPage={content.rightPage}
                    showBackground={false}
                />
            {:else if slotKind(content.slot) === "page"}
                <Page
                    pageType={content.rightPage
                        ? PageType.BLANK_RIGHT
                        : PageType.BLANK}
                    rightPage={content.rightPage}
                    showBackground={false}
                >
                    <PageLayout
                        pageNumber={content.slot - 1}
                        rightPage={content.rightPage}
                    />
                </Page>
            {:else if slotKind(content.slot) === "overview"}
                <Page
                    pageType={content.rightPage
                        ? PageType.BLANK_RIGHT
                        : PageType.BLANK}
                    rightPage={content.rightPage}
                    showBackground={false}
                >
                    <Overview onSelectPage={() => {}} />
                </Page>
            {:else if slotKind(content.slot) === "blank"}
                <Page
                    pageType={content.rightPage
                        ? PageType.BLANK_RIGHT
                        : PageType.BLANK}
                    rightPage={content.rightPage}
                    showBackground={false}
                />
            {:else}
                <Page
                    pageType={PageType.TITLE_RIGHT}
                    rightPage={true}
                    showBackground={true}
                >
                    <Settings />
                </Page>
            {/if}
        {/snippet}

        <div class="face front">
            {@render face(frontContentFor(flip))}
        </div>
        <div class="face back">
            {@render face(backContentFor(flip))}
        </div>
    </div>
{/each}

<style>
    .flip-panel {
        position: fixed;
        transform-style: preserve-3d;
        transition-property: transform, z-index;
        transition-timing-function: cubic-bezier(0.45, 0, 0.55, 1), step-end;
        pointer-events: none;
    }
    .face {
        position: absolute;
        inset: 0;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        overflow: hidden;
    }
    .face.back {
        transform: rotateY(180deg);
    }
</style>
