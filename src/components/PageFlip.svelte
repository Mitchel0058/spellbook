<script>
    import { flipState } from "../context/flipState.svelte.js";
    import { pageData } from "../context/pageData.svelte.js";
    import { PageType } from "../constants/pageType.js";
    import Page from "./Page.svelte";
    import PageLayout from "./PageLayout.svelte";
    import Overview from "./Overview.svelte";
    import Settings from "./Settings.svelte";

    const DURATION_MS = 600;
    const PERSPECTIVE_PX = 1600;

    let maxPage = $derived(pageData.pages.length);

    // Mirrors slotKind() in home.svelte.
    function slotKind(slot) {
        if (slot === 0) return "overview";
        if (slot >= 1 && slot <= maxPage) return "page";
        return "settings";
    }

    let rotation = $derived(
        flipState.animating ? flipState.endRotation : flipState.startRotation,
    );
    let transformOrigin = $derived(
        flipState.hinge === "left" ? "0% 50%" : "100% 50%",
    );

    // .front is geometrically visible whenever the panel's own rotation is
    // ~0deg; .back (which carries its own baked-in 180deg) is visible
    // whenever the panel's rotation is ~180deg. Every flip has one endpoint
    // at 0 and the other at the hinge's flip angle — exactly one of
    // start/end always belongs in .front, the other in .back. This must be
    // computed, not assumed, because a reverse-playback flip (rotation runs
    // from the flip angle down to 0) puts its "start" content in .back.
    let frontContent = $derived(
        flipState.startRotation === 0
            ? {
                  slot: flipState.startSlot,
                  blank: flipState.startBlank,
                  rightPage: flipState.startRightPage,
              }
            : {
                  slot: flipState.endSlot,
                  blank: flipState.endBlank,
                  rightPage: flipState.endRightPage,
              },
    );
    let backContent = $derived(
        flipState.startRotation === 0
            ? {
                  slot: flipState.endSlot,
                  blank: flipState.endBlank,
                  rightPage: flipState.endRightPage,
              }
            : {
                  slot: flipState.startSlot,
                  blank: flipState.startBlank,
                  rightPage: flipState.startRightPage,
              },
    );

    function handleTransitionEnd(e) {
        if (e.target !== e.currentTarget) return;
        if (e.propertyName !== "transform") return;
        flipState.onComplete?.();
    }
</script>

{#if flipState.active && flipState.rect}
    <div
        class="flip-panel"
        style:top="{flipState.rect.top}px"
        style:left="{flipState.rect.left}px"
        style:width="{flipState.rect.width}px"
        style:height="{flipState.rect.height}px"
        style:transform-origin={transformOrigin}
        style:transform="perspective({PERSPECTIVE_PX}px) rotateY({rotation}deg)"
        style:transition-duration="{DURATION_MS}ms"
        ontransitionend={handleTransitionEnd}
    >
        <div class="face front">
            {#if frontContent.blank || frontContent.slot == null}
                <Page
                    pageType={frontContent.rightPage
                        ? PageType.BLANK_RIGHT
                        : PageType.BLANK}
                    rightPage={frontContent.rightPage}
                />
            {:else if slotKind(frontContent.slot) === "page"}
                <Page
                    pageType={frontContent.rightPage
                        ? PageType.BLANK_RIGHT
                        : PageType.BLANK}
                    rightPage={frontContent.rightPage}
                >
                    <PageLayout
                        pageNumber={frontContent.slot - 1}
                        rightPage={frontContent.rightPage}
                    />
                </Page>
            {:else if slotKind(frontContent.slot) === "overview"}
                <Page
                    pageType={frontContent.rightPage
                        ? PageType.BLANK_RIGHT
                        : PageType.BLANK}
                    rightPage={frontContent.rightPage}
                >
                    <Overview onSelectPage={() => {}} />
                </Page>
            {:else}
                <Settings />
            {/if}
        </div>
        <div class="face back">
            {#if backContent.blank || backContent.slot == null}
                <Page
                    pageType={backContent.rightPage
                        ? PageType.BLANK_RIGHT
                        : PageType.BLANK}
                    rightPage={backContent.rightPage}
                />
            {:else if slotKind(backContent.slot) === "page"}
                <Page
                    pageType={backContent.rightPage
                        ? PageType.BLANK_RIGHT
                        : PageType.BLANK}
                    rightPage={backContent.rightPage}
                >
                    <PageLayout
                        pageNumber={backContent.slot - 1}
                        rightPage={backContent.rightPage}
                    />
                </Page>
            {:else if slotKind(backContent.slot) === "overview"}
                <Page
                    pageType={backContent.rightPage
                        ? PageType.BLANK_RIGHT
                        : PageType.BLANK}
                    rightPage={backContent.rightPage}
                >
                    <Overview onSelectPage={() => {}} />
                </Page>
            {:else}
                <Settings />
            {/if}
        </div>
    </div>
{/if}

<style>
    .flip-panel {
        position: fixed;
        transform-style: preserve-3d;
        transition-property: transform;
        transition-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
        pointer-events: none;
        z-index: 1000;
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
