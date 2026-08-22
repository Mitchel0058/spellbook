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
        resetFlipState,
        flipAngleForHinge,
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

    let leftSlot = $derived(flipState.holdLeftSlot ?? pageNumber);
    let rightSlot = $derived(flipState.holdRightSlot ?? pageNumber + 1);

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
        if (flipState.active) return;
        if (isDoublePage) {
            startDoubleFlip(direction);
        } else {
            startSingleFlip(direction);
        }
    }

    async function startDoubleFlip(direction) {
        const newPageNumber =
            direction === "next"
                ? Math.min(pageNumber + 2, maxPage)
                : Math.max(pageNumber - 2, 0);
        if (newPageNumber === pageNumber) return;

        if (!leftPageComponent || !rightPageComponent) {
            pageNumber = newPageNumber;
            return;
        }

        const oldLeftSlot = leftSlot;
        const oldRightSlot = rightSlot;

        const sourceEl =
            direction === "next"
                ? rightPageComponent.getElement()
                : leftPageComponent.getElement();
        const rect = sourceEl.getBoundingClientRect();

        const hinge = direction === "next" ? "left" : "right";
        const flipAngle = flipAngleForHinge(hinge);

        let startSlot, startRightPage, endSlot, endRightPage;
        if (direction === "next") {
            startSlot = oldRightSlot;
            startRightPage = true;
            endSlot = newPageNumber; // new left slot
            endRightPage = false;
        } else {
            startSlot = oldLeftSlot;
            startRightPage = false;
            endSlot = newPageNumber + 1; // new right slot
            endRightPage = true;
        }

        await Promise.all([
            preloadPageImages(
                slotKind(startSlot) === "page"
                    ? pageData.getPage(startSlot - 1)
                    : null,
            ),
            preloadPageImages(
                slotKind(endSlot) === "page"
                    ? pageData.getPage(endSlot - 1)
                    : null,
            ),
        ]);

        flipState.rect = {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
        };
        flipState.hinge = hinge;
        flipState.startRotation = 0;
        flipState.endRotation = flipAngle;
        flipState.startSlot = startSlot;
        flipState.startRightPage = startRightPage;
        flipState.startBlank = false;
        flipState.endSlot = endSlot;
        flipState.endRightPage = endRightPage;
        flipState.endBlank = false;
        if (direction === "next") {
            flipState.holdLeftSlot = oldLeftSlot;
        } else {
            flipState.holdRightSlot = oldRightSlot;
        }

        pageNumber = newPageNumber;
        flipState.active = true;
        flipState.animating = false;

        await tick();
        requestAnimationFrame(() => {
            flipState.animating = true;
        });
    }

    async function startSingleFlip(direction) {
        const newPageNumber =
            direction === "next"
                ? Math.min(pageNumber + 1, maxPage + 1)
                : Math.max(pageNumber - 1, 0);
        if (newPageNumber === pageNumber) return;

        if (!leftPageComponent) {
            pageNumber = newPageNumber;
            return;
        }

        const rect = leftPageComponent.getElement().getBoundingClientRect();

        const hinge = "right"; // single-page mode always hinges on the right edge
        const flipAngle = flipAngleForHinge(hinge);
        flipState.hinge = hinge;

        if (direction === "next") {
            await warmUpOffscreen(newPageNumber);

            // Reverse playback: flipAngle -> 0. Real page swap is deferred to
            // animation-end; the start content (new page) is shown on the
            // panel throughout, so it must not be applied to pageNumber yet
            // or the panel and the real page would show the same thing twice.
            await preloadPageImages(
                slotKind(newPageNumber) === "page"
                    ? pageData.getPage(newPageNumber - 1)
                    : null,
            );

            flipState.startRotation = flipAngle;
            flipState.endRotation = 0;
            flipState.startSlot = null;
            flipState.startBlank = true;
            flipState.startRightPage = false;
            flipState.endSlot = newPageNumber;
            flipState.endBlank = false;
            flipState.endRightPage = false;
            flipState.pendingPageNumber = newPageNumber;
        } else {
            // Forward playback: 0 -> flipAngle. Real page swaps instantly, so
            // the start content (current page) deliberately matches the
            // already-changed... wait: for previous, the *old* left page is
            // still what should show at start (nothing has advanced past it
            // yet) — the real pageNumber changes now, ahead of the panel,
            // and the panel's start face covers that until it rotates away.
            await preloadPageImages(
                slotKind(leftSlot) === "page"
                    ? pageData.getPage(leftSlot - 1)
                    : null,
            );

            flipState.startRotation = 0;
            flipState.endRotation = flipAngle;
            flipState.startSlot = leftSlot;
            flipState.startBlank = false;
            flipState.startRightPage = false;
            flipState.endSlot = null;
            flipState.endBlank = true;
            flipState.endRightPage = false;
            flipState.pendingPageNumber = null;

            pageNumber = newPageNumber;
        }

        flipState.rect = {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
        };
        flipState.active = true;
        flipState.animating = false;

        await tick();
        requestAnimationFrame(() => {
            flipState.animating = true;
        });
    }

    function handleFlipComplete() {
        if (flipState.pendingPageNumber != null) {
            pageNumber = flipState.pendingPageNumber;
        }
        resetFlipState();
    }
    flipState.onComplete = handleFlipComplete;

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
