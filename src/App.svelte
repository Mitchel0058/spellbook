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
    import { appState, AppMode } from "./context/appState.svelte.js";
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
        DURATION_MS,
    } from "./context/flipState.svelte.js";
    import { preloadPageImages } from "./lib/preloadImage.js";
    import { registerPageNavigator } from "./context/pageNav.svelte.js";
    import { cloudSync } from "./context/cloudSync.svelte.js";

    const settings = createSettingsContext();

    function getPageFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const page = parseInt(params.get("page"), 10);
        return Number.isNaN(page) ? 0 : page;
    }

    // In double-page mode, spreads are fixed as [even, even+1] — the even
    // slot is always left, the odd slot after it always right (0|1 is the
    // overview's own first spread and already satisfies this). This holds
    // no matter how pageNumber got set — URL, resize into double mode, or
    // a direct jump — so a page never swaps sides on its own. Only
    // inserting/deleting pages, which renumbers everything after the
    // change point, is allowed to shift it.
    function snapToPairedLeftSlot(slot) {
        return slot % 2 === 0 ? slot : slot - 1;
    }

    let isDoublePage = $state(window.innerWidth > window.innerHeight);
    let pageNumber = $state(
        isDoublePage
            ? snapToPairedLeftSlot(getPageFromUrl())
            : getPageFromUrl(),
    );
    let page = $derived(pageData.getPage(pageNumber) ?? { elements: [] });
    let maxPage = $derived(pageData.pages.length);
    let lastDoublePageNumber = $derived(maxPage + (maxPage % 2));
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
    // Set by navigateToSlot when double-page +/- 2 stepping can't land exactly on the requested target.
    // Corrected here, once every in-flight flip has cleared
    // reusing the same signal this effect already used to resync logicalPageNumber,
    // so the correction never races an in-progress flip's own pageNumber assignment.
    let pendingNavTarget = null;
    $effect(() => {
        if (flipState.flips.length === 0) {
            if (pendingNavTarget !== null) {
                pageNumber = pendingNavTarget;
                logicalPageNumber = pendingNavTarget;
                pendingNavTarget = null;
            } else {
                logicalPageNumber = pageNumber;
            }
        }
    });

    function pageForSlotOrNull(slot) {
        return slot != null && slotKind(slot) === "page"
            ? pageData.getPage(slot - 1)
            : null;
    }

    // Resolves a slot number to what should render there. In double-page mode,
    // an extra blank slot keeps settings on the right when the page count is odd.
    function slotKind(slot) {
        if (slot === 0) return "overview";
        if (slot >= 1 && slot <= maxPage) return "page";
        if (isDoublePage && maxPage % 2 === 1 && slot === maxPage + 1) {
            return "blank";
        }
        const settingsSlot = maxPage + 1 + (isDoublePage ? maxPage % 2 : 0);
        return slot === settingsSlot ? "settings" : "blank";
    }

    function setPageNumberDirect(targetSlot) {
        const upperBound = isDoublePage ? lastDoublePageNumber : maxPage + 1;
        const clampedSlot = Math.max(0, Math.min(targetSlot, upperBound));
        pageNumber = isDoublePage
            ? snapToPairedLeftSlot(clampedSlot)
            : clampedSlot;
        logicalPageNumber = pageNumber;
        pendingNavTarget = null;
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
        if (pageData.loading) return;
        const maxSlot = isDoublePage ? lastDoublePageNumber : maxPage + 1;
        const clampedSlot = Math.max(0, Math.min(pageNumber, maxSlot));
        const targetSlot = isDoublePage
            ? snapToPairedLeftSlot(clampedSlot)
            : clampedSlot;
        if (targetSlot !== pageNumber) {
            pageNumber = targetSlot;
            logicalPageNumber = targetSlot;
        }
    });
    $effect(() => {
        if (!settings.loading && !pageData.loading) {
            cloudSync.initialize().then(() => cloudSync.syncOnOpen());
        }
    });
    $effect(() => {
        const handleLocalSave = (event) =>
            cloudSync.notifyLocalChange(event.detail?.dbName);
        const handleCloudPull = async () => {
            await pageData.loadAllPages();
            await settings.loadCustomFont();
        };

        window.addEventListener("spellbook-local-saved", handleLocalSave);
        window.addEventListener("spellbook-cloud-pulled", handleCloudPull);
        return () => {
            window.removeEventListener("spellbook-local-saved", handleLocalSave);
            window.removeEventListener("spellbook-cloud-pulled", handleCloudPull);
        };
    });
    $effect(() => {
        initScrollFade();
    });

    $effect(() => {
        return registerPageNavigator(navigateToSlot);
    });

    $effect(() => {
        const handleResize = () => {
            const nowDouble = window.innerWidth > window.innerHeight;
            isDoublePage = nowDouble;
            if (nowDouble) {
                pageNumber = snapToPairedLeftSlot(pageNumber);
                logicalPageNumber = pageNumber;
                pendingNavTarget = null;
            }
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
            const target = getPageFromUrl();
            pageNumber = isDoublePage ? snapToPairedLeftSlot(target) : target;
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
            pageNumber = Math.min(pageNumber + 2, lastDoublePageNumber);
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

    // Lets other components (PageLink) jump straight to a slot. Fires
    // startFlip() repeatedly, spaced so the whole hop takes ~totalMs.
    // Flips are allowed to overlap (flipState.flips is an array built for
    // exactly this), and the final exact landing is handled by the
    // pendingNavTarget effect above rather than forced here, since forcing
    // it immediately would race the last flip's own onComplete.
    const RAPID_NAV_TOTAL_MS = 200;

    async function navigateToSlot(
        targetSlot,
        { totalMs = RAPID_NAV_TOTAL_MS } = {},
    ) {
        const upperBound = isDoublePage ? lastDoublePageNumber : maxPage + 1;
        let clampedTarget = Math.max(0, Math.min(targetSlot, upperBound));
        if (isDoublePage) {
            clampedTarget = snapToPairedLeftSlot(clampedTarget);
        }

        if (
            !settings.values[settingsOptions.ANIMATION] ||
            clampedTarget === logicalPageNumber
        ) {
            pendingNavTarget = null;
            pageNumber = clampedTarget;
            logicalPageNumber = clampedTarget;
            return;
        }

        const stepSize = isDoublePage ? 2 : 1;
        const direction =
            clampedTarget > logicalPageNumber ? "next" : "previous";
        const stepsNeeded = Math.max(
            1,
            Math.ceil(Math.abs(clampedTarget - logicalPageNumber) / stepSize),
        );
        const perStepDelay = Math.max(DURATION_MS / 4, totalMs / stepsNeeded);

        pendingNavTarget = clampedTarget;

        while (
            direction === "next"
                ? logicalPageNumber < clampedTarget
                : logicalPageNumber > clampedTarget
        ) {
            startFlip(direction); // not awaited — flips animate concurrently
            await new Promise((r) => setTimeout(r, perStepDelay));
        }
    }

    async function startDoubleFlip(direction) {
        const oldLogical = logicalPageNumber;
        const newLogical =
            direction === "next"
                ? Math.min(oldLogical + 2, lastDoublePageNumber)
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
                pageNumber = isDoublePage
                    ? snapToPairedLeftSlot(newLogical)
                    : newLogical;
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

    // Used by PageLayout's onPageMoved: newIndex is the page's new 0-based
    // array index after a move/swap. The page's display slot is always
    // newIndex + 1, regardless of whether the move originated from the left
    // or right page component. In double-page mode this snaps to the even
    // left-slot of the spread containing that page — never an odd/single
    // slot — using the same pairing rule as resize/URL navigation.
    function navigateToMovedPage(newIndex) {
        const targetSlot = newIndex + 1;
        setPageNumberDirect(targetSlot);
    }

    async function callDeletePage(pageIndex) {
        await pageData.deletePage(pageIndex);
        const targetIndex = Math.min(pageIndex, maxPage - 1);
        const targetSlot = targetIndex >= 0 ? targetIndex + 1 : 0;
        setPageNumberDirect(targetSlot);
    }
</script>

{#if pageData.loading}
    <h1 style="background-color: #000">
        Loading animation not yet implemented
    </h1>
{:else if slotKind(leftSlot) === "settings"}
    <Page
        pageType={PageType.TITLE_RIGHT}
        rightPage="true"
        bind:this={leftPageComponent}
    >
        {#if !isDoublePage && appState.mode == AppMode.VIEWING}
            <button
                class="interact previous-page"
                onclick={previousPage}
                title="Previous Page"
                rightPage={true}
            ></button>
        {/if}
        <Settings />
    </Page>
{:else if slotKind(leftSlot) === "blank"}
    <Page pageType={PageType.BLANK} bind:this={leftPageComponent}>
        {#if leftSlot > 0 && appState.mode == AppMode.VIEWING}
            <button
                class="interact previous-page"
                onclick={previousPage}
                title="Previous Page"
            ></button>
        {/if}
    </Page>
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
            <Overview onSelectPage={navigateToSlot} />
        {:else}
            <PageLayout
                bind:this={leftPageLayout}
                pageNumber={leftSlot - 1}
                onPageAdded={navigateToMovedPage}
                onPageDeleted={callDeletePage}
                onPageMoved={navigateToMovedPage}
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
        <Page
            pageType={PageType.TITLE_RIGHT}
            rightPage="true"
            bind:this={rightPageComponent}
        >
            <Settings />
        </Page>
    {:else if slotKind(rightSlot) === "blank"}
        <Page
            pageType={PageType.BLANK_RIGHT}
            rightPage="true"
            bind:this={rightPageComponent}
        />
    {:else}
        <Page
            pageType={PageType.BLANK_RIGHT}
            pageNumber={rightSlot}
            rightPage="true"
            bind:this={rightPageComponent}
        >
            {#if slotKind(rightSlot) === "overview"}
                <Overview onSelectPage={navigateToSlot} />
            {:else}
                <PageLayout
                    bind:this={rightPageLayout}
                    pageNumber={rightSlot - 1}
                    onPageAdded={navigateToMovedPage}
                    onPageDeleted={callDeletePage}
                    onPageMoved={navigateToMovedPage}
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

<PageFlip {isDoublePage} />
