<script>
    import "./css/home.css";
    import Page from "./components/Page.svelte";
    import { PageType } from "./constants/pageType.js";
    import PageLayout from "./components/PageLayout.svelte";
    import {
        createSettingsContext,
        settingsOptions,
    } from "./context/settings.svelte.js";
    import Settings from "./components/Settings.svelte";
    import Overview from "./components/Overview.svelte";
    import SquareButton from "./components/SquareButton.svelte";
    import { appState, AppMode } from "./context/appState.svelte.js";
    import { ButtonType } from "./constants/buttonType.js";
    import { pageData } from "./context/pageData.svelte.js";
    import { initScrollFade } from "./lib/scrollFade.js";
    import { tick } from "svelte";
    import PageFlip from "./components/PageFlip.svelte";
    import {
        flipState,
        flipAngleForHinge,
        heldSlot,
        pushHold,
        releaseHold,
        nextFlipId,
        scheduleFlipFailsafe,
    } from "./context/flipState.svelte.js";
    import { preloadPageImages } from "./lib/preloadImage.js";

    const settings = createSettingsContext();

    function getPageFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const page = parseInt(params.get("page"), 10);
        return Number.isNaN(page) ? 0 : page;
    }
    let pageNumber = $state(getPageFromUrl());

    let isDoublePage = $state(window.innerWidth > window.innerHeight);
    let page = $derived(pageData.getPage(pageNumber) ?? { elements: [] });
    let maxPage = $derived(pageData.pages.length);
    let leftPageComponent = $state(null);
    let rightPageComponent = $state(null);
    let preloadSlot = $state(null);

    let leftSlot = $derived(heldSlot("left", pageNumber));
    let rightSlot = $derived(heldSlot("right", pageNumber + 1));

    // Bumped synchronously the instant a flip is requested, so rapid clicks
    // always compute the correct next target even while earlier flips' image
    // preloads are still in flight. `pageNumber` (the reactive value that
    // actually drives rendering) only updates once each flip's own preload
    // resolves, exactly as before — this counter never drives rendering itself.
    let logicalPageNumber = pageNumber;
    $effect(() => {
        if (flipState.flips.length === 0) {
            logicalPageNumber = pageNumber;
        }
    });

    function pageForSlotOrNull(slot) {
        return slot != null && slotKind(slot) === "page"
            ? pageData.getPage(slot - 1)
            : null;
    }

    // Resolves a slot number to what should render there:
    // 0 -> overview, 1..maxPage -> real page (index slot-1), maxPage+1 -> settings
    function slotKind(slot) {
        if (slot === 0) return "overview";
        if (slot >= 1 && slot <= maxPage) return "page";
        return "settings";
    }

    function slotPageType(slot) {
        if (slotKind(slot) !== "page") return null;
        const p = pageData.getPage(slot - 1);
        return p?.settings?.pageType ?? null; // adjust to however pageType is actually stored per-page
    }

    function imagePathForSlot(slot, rightPage) {
        const kind = slotKind(slot);
        if (kind !== "page") return null; // overview/settings don't use the flip's img preload path
        const type = slotPageType(slot);
        const imageName = pageImages[type] || pageImages["cover"];
        return `assets/img/${imageName}`;
    }

    async function warmUpOffscreen(slot) {
        if (slotKind(slot) !== "page") return;
        preloadSlot = slot;
        await tick();
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => requestAnimationFrame(r));
        preloadSlot = null;
        await tick();
    }

    let leftPageLayout = $state(null);
    let rightPageLayout = $state(null);

    $effect(() => {
        pageData.loadAllPages();
        // console.log("maxPage", maxPage);
        // console.log("pageNumber", pageNumber);
    });
    $effect(() => {
        initScrollFade();
    });

    $effect(() => {
        const handleResize = () => {
            isDoublePage = window.innerWidth > window.innerHeight;
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    });

    $effect(() => {
        const params = new URLSearchParams(window.location.search);
        params.set("page", pageNumber);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({ pageNumber }, "", newUrl);
    });

    $effect(() => {
        const handlePopState = () => {
            pageNumber = getPageFromUrl();
        };
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    });

    function nextPage() {
        if (settings.values[settingsOptions.ANIMATION]) {
            startFlip("next");
            return;
        }
        if (isDoublePage) {
            pageNumber = Math.min(pageNumber + 2, maxPage);
        } else {
            pageNumber = Math.min(pageNumber + 1, maxPage + 1);
        }
    }

    function previousPage() {
        if (settings.values[settingsOptions.ANIMATION]) {
            startFlip("previous");
            return;
        }
        const decrement = isDoublePage ? 2 : 1;
        pageNumber = Math.max(pageNumber - decrement, 0);
    }

    function startFlip(direction) {
        if (isDoublePage) {
            startDoubleFlip(direction);
        } else {
            startSingleFlip(direction);
        }
    }

    async function startDoubleFlip(direction) {
        const oldLogical = logicalPageNumber;
        const newLogical =
            direction === "next"
                ? Math.min(oldLogical + 2, maxPage)
                : Math.max(oldLogical - 2, 0);
        if (newLogical === oldLogical) return;
        logicalPageNumber = newLogical;

        if (!leftPageComponent || !rightPageComponent) {
            pageNumber = newLogical;
            return;
        }

        const sourceEl =
            direction === "next"
                ? rightPageComponent.getElement()
                : leftPageComponent.getElement();
        const rect = sourceEl.getBoundingClientRect();

        const hinge = direction === "next" ? "left" : "right";
        const holdSide = direction === "next" ? "left" : "right";
        const oldHeldSlot = holdSide === "left" ? leftSlot : rightSlot;

        let startSlot, startRightPage, endSlot, endRightPage;
        if (direction === "next") {
            startSlot = rightSlot;
            startRightPage = true;
            endSlot = newLogical; // new left slot
            endRightPage = false;
        } else {
            startSlot = leftSlot;
            startRightPage = false;
            endSlot = newLogical + 1; // new right slot
            endRightPage = true;
        }

        await Promise.all([
            preloadPageImages(pageForSlotOrNull(startSlot)),
            preloadPageImages(pageForSlotOrNull(endSlot)),
        ]);

        const flip = $state({
            id: nextFlipId(),
            hinge,
            rect: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
            },
            startRotation: 0,
            endRotation: flipAngleForHinge(hinge),
            startSlot,
            startBlank: false,
            startRightPage,
            endSlot,
            endBlank: false,
            endRightPage,
            animating: false,
        });
        flip.onComplete = () => {
            releaseHold(holdSide, flip.id);
            flipState.flips = flipState.flips.filter((f) => f.id !== flip.id);
        };

        pushHold(holdSide, flip.id, oldHeldSlot);
        pageNumber = newLogical;
        flipState.flips = [...flipState.flips, flip];
        scheduleFlipFailsafe(flip);

        await tick();
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => requestAnimationFrame(r));
        flip.animating = true;
    }

    async function startSingleFlip(direction) {
        const oldLogical = logicalPageNumber;
        const newLogical =
            direction === "next"
                ? Math.min(oldLogical + 1, maxPage + 1)
                : Math.max(oldLogical - 1, 0);
        if (newLogical === oldLogical) return;
        logicalPageNumber = newLogical;

        if (!leftPageComponent) {
            pageNumber = newLogical;
            return;
        }

        const rect = leftPageComponent.getElement().getBoundingClientRect();
        const hinge = "right"; // single-page mode always hinges on the right edge
        const flipAngle = flipAngleForHinge(hinge);

        let startRotation,
            endRotation,
            startSlot,
            startBlank,
            endSlot,
            endBlank;
        if (direction === "next") {
            // Reverse playback: flipAngle -> 0, settling flat to reveal the new page.
            startRotation = flipAngle;
            endRotation = 0;
            startSlot = null;
            startBlank = true;
            endSlot = newLogical;
            endBlank = false;
        } else {
            // Forward playback: 0 -> flipAngle, lifting the current page away.
            startRotation = 0;
            endRotation = flipAngle;
            startSlot = leftSlot;
            startBlank = false;
            endSlot = null;
            endBlank = true;
        }

        await Promise.all([
            preloadPageImages(pageForSlotOrNull(startSlot)),
            preloadPageImages(pageForSlotOrNull(endSlot)),
        ]);

        const flip = $state({
            id: nextFlipId(),
            hinge,
            rect: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
            },
            startRotation,
            endRotation,
            startSlot,
            startBlank,
            startRightPage: false,
            endSlot,
            endBlank,
            endRightPage: false,
            animating: false,
        });

        if (direction === "next") {
            // Deferred: the flip's start face (blank) covers the real page
            // until the flip visually completes, so pageNumber only updates then.
            flip.onComplete = () => {
                pageNumber = newLogical;
                flipState.flips = flipState.flips.filter(
                    (f) => f.id !== flip.id,
                );
            };
        } else {
            // Instant: real page swaps right away; the flip's start face (the
            // outgoing page) covers it on top until the panel rotates away.
            pageNumber = newLogical;
            flip.onComplete = () => {
                flipState.flips = flipState.flips.filter(
                    (f) => f.id !== flip.id,
                );
            };
        }

        flipState.flips = [...flipState.flips, flip];
        scheduleFlipFailsafe(flip);

        await tick();
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => requestAnimationFrame(r));
        flip.animating = true;
    }

    function toggleLayoutMode() {
        appState.mode =
            appState.mode !== AppMode.LAYOUT ? AppMode.LAYOUT : AppMode.VIEWING;
    }
    function toggleEditMode() {
        appState.mode =
            appState.mode !== AppMode.EDITING
                ? AppMode.EDITING
                : AppMode.VIEWING;
    }

    async function callDeletePage(pageNumber) {
        await pageData.deletePage(pageNumber);
        pageNumber = Math.max(pageNumber - 1, 0);
    }
</script>

{#if pageData.loading}
    <h1 style="background-color: #000">
        Loading animation not yet implemented
    </h1>
{:else if slotKind(leftSlot) === "settings"}
    <Settings />
    {#if leftSlot > 0 && appState.mode == AppMode.VIEWING}
        <button
            class="interact previous-page"
            onclick={previousPage}
            title="Previous Page"
        ></button>
    {/if}
{:else}
    <Page pageType={PageType.BLANK} bind:this={leftPageComponent}>
        {#if leftSlot > 0 && appState.mode == AppMode.VIEWING}
            <button
                class="interact previous-page"
                onclick={previousPage}
                title="Previous Page"
            ></button>
        {/if}

        {#if slotKind(leftSlot) === "overview"}
            <Overview onSelectPage={(slot) => (pageNumber = slot)} />
        {:else}
            <div
                style="position: absolute; top: calc(var(--unit-height) * 167); left: calc(var(--unit-width) * 118); font-size: var(--reactive-font-size)"
            >
                {leftSlot}
            </div>
            <PageLayout
                bind:this={leftPageLayout}
                pageNumber={leftSlot - 1}
                onPageAdded={(newIndex) => (pageNumber = newIndex + 1)}
                onPageDeleted={callDeletePage}
            />
            <SquareButton
                buttonType={ButtonType.REORDER}
                onClick={toggleLayoutMode}
                xPosition={116}
                yPosition={20}
            />
            <SquareButton
                buttonType={ButtonType.EDIT}
                onClick={toggleEditMode}
                xPosition={116}
                yPosition={30}
            />
            <SquareButton
                buttonType={ButtonType.MENU}
                onClick={() => leftPageLayout?.openAddElementPicker()}
                xPosition={72}
                yPosition={0}
            />
            <SquareButton
                buttonType={ButtonType.ADD}
                onClick={() => leftPageLayout?.openAddPagePicker()}
                xPosition={82}
                yPosition={0}
            />
        {/if}

        <div class="text-overlay" id="title">
            {settings.values[settingsOptions.CURRENT_SPELLBOOK_DB]}
        </div>
        {#if !isDoublePage && appState.mode == AppMode.VIEWING}
            <button
                class="interact next-page"
                onclick={nextPage}
                title="Next Page"
            ></button>
        {/if}
    </Page>
{/if}

{#if isDoublePage}
    {#if slotKind(rightSlot) === "settings"}
        <Settings />
        {#if appState.mode == AppMode.VIEWING}
            <button
                class="interact next-page"
                onclick={nextPage}
                title="Next Page"
            ></button>
        {/if}
    {:else}
        <Page
            pageType={PageType.BLANK_RIGHT}
            pageNumber={rightSlot}
            rightPage="true"
            bind:this={rightPageComponent}
        >
            {#if slotKind(rightSlot) === "overview"}
                <Overview onSelectPage={(slot) => (pageNumber = slot)} />
            {:else}
                <div
                    style="position: absolute; top: calc(var(--unit-height) * 167); left: calc(var(--unit-width) * 118); font-size: var(--reactive-font-size)"
                >
                    {rightSlot}
                </div>
                <PageLayout
                    bind:this={rightPageLayout}
                    pageNumber={rightSlot - 1}
                    onPageAdded={(newIndex) => (pageNumber = newIndex)}
                    onPageDeleted={callDeletePage}
                    rightPage={true}
                />
                <SquareButton
                    buttonType={ButtonType.REORDER}
                    onClick={toggleLayoutMode}
                    xPosition={116}
                    yPosition={20}
                    rightPage={true}
                />
                <SquareButton
                    buttonType={ButtonType.EDIT}
                    onClick={toggleEditMode}
                    xPosition={116}
                    yPosition={30}
                    rightPage={true}
                />
                <SquareButton
                    buttonType={ButtonType.MENU}
                    onClick={() => rightPageLayout?.openAddElementPicker()}
                    xPosition={72}
                    yPosition={0}
                    rightPage={true}
                />
                <SquareButton
                    buttonType={ButtonType.ADD}
                    onClick={() => rightPageLayout?.openAddPagePicker()}
                    xPosition={82}
                    yPosition={0}
                    rightPage={true}
                />
            {/if}
            {#if isDoublePage && appState.mode == AppMode.VIEWING}
                <button
                    class="interact next-page"
                    onclick={nextPage}
                    title="Next Page"
                ></button>
            {/if}
        </Page>
    {/if}
{/if}

{#if preloadSlot != null}
    <div
        style="position: fixed; top: 0; left: 0; opacity: 0; pointer-events: none; z-index: -1;"
        aria-hidden="true"
    >
        <Page pageType={PageType.BLANK}>
            <PageLayout pageNumber={preloadSlot - 1} />
        </Page>
    </div>
{/if}

<PageFlip />
