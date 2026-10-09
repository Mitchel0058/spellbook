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
        releaseHolds,
        nextFlipId,
        addFlip,
        findFlip,
        removeFlip,
        clearFlips,
        DURATION_MS,
    } from "./context/flipState.svelte.js";
    import { preloadPageImages } from "./lib/preloadImage.js";
    import { registerPageNavigator } from "./context/pageNav.svelte.js";
    import { cloudSync } from "./context/cloudSync.svelte.js";

    const settings = createSettingsContext();

    // ------------------------- Tunables -------------------------
    // Clicking
    const START_DELAY_FRAMES = 0; // 0 = a flip starts the instant you click.
    //                               If you see the wrong page flash, try 2
    //                               (panel is painted before the page changes).
    const LAND_GRACE_MS = 500; // fallback if an animation never reports finish
    const SETTLE_FRAMES = 3; // frames to let the static page paint before
    //                          removing landed panels
    // Jumping to a page (PageLink, overview, home/settings corners)
    const NAV_MAX_MS = 3000; // hard ceiling for a whole jump
    const NAV_FLIP_MS = 450; // duration of each leaf during a jump
    const NAV_SPACING_MS = 80; // delay between leaves during a jump
    const NAV_MAX_LEAVES = 14; // longer jumps skip pages instead of flipping all

    // ------------------------- Page state -------------------------
    function getPageFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const page = parseInt(params.get("page"), 10);
        return Number.isNaN(page) ? 0 : page;
    }

    // In double-page mode, spreads are fixed as [even, even+1].
    function snapToPairedLeftSlot(slot) {
        return slot % 2 === 0 ? slot : slot - 1;
    }

    let isDoublePage = $state(window.innerWidth > window.innerHeight);

    // pageNumber = what the static page layer shows (left slot in double mode).
    let pageNumber = $state(
        isDoublePage
            ? snapToPairedLeftSlot(getPageFromUrl())
            : getPageFromUrl(),
    );
    let maxPage = $derived(pageData.pages.length);
    let lastDoublePageNumber = $derived(maxPage + (maxPage % 2));
    let leftPageComponent = $state(null);
    let rightPageComponent = $state(null);

    // While a burst of flips is running, one side of the static layer keeps
    // showing the page the burst started from (the "hold"), so it never has
    // to re-render underneath the landing panels.
    let leftSlot = $derived(heldSlot("left", pageNumber));
    let rightSlot = $derived(heldSlot("right", pageNumber + 1));

    // logicalPageNumber = where the book will be once every requested flip has
    // finished. Updated synchronously on every request, so rapid clicks always
    // compute the right next target. Plain variable on purpose.
    let logicalPageNumber = pageNumber;
    let lastDirection = null;
    let navToken = 0;

    function upperBound() {
        return isDoublePage ? lastDoublePageNumber : maxPage + 1;
    }

    function normalizeSlot(slot) {
        const clamped = Math.max(0, Math.min(slot, upperBound()));
        return isDoublePage ? snapToPairedLeftSlot(clamped) : clamped;
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

    function pageForSlotOrNull(slot) {
        return slot != null && slotKind(slot) === "page"
            ? pageData.getPage(slot - 1)
            : null;
    }

    // ------------------------- Small helpers -------------------------
    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // rAF with a timeout fallback so a hidden tab can never stall the flow.
    function nextFrame() {
        return new Promise((resolve) => {
            let done = false;
            const finish = () => {
                if (!done) {
                    done = true;
                    resolve();
                }
            };
            requestAnimationFrame(finish);
            setTimeout(finish, 64);
        });
    }

    async function settle(frames = SETTLE_FRAMES) {
        await tick();
        for (let i = 0; i < frames; i++) await nextFrame();
    }

    // ------------------------- Instant navigation -------------------------
    // Drops every in-flight panel and shows `slot` immediately.
    function setSlotInstantly(slot) {
        const target = normalizeSlot(slot);
        clearFlips();
        pageNumber = target;
        logicalPageNumber = target;
        lastDirection = null;
    }

    // Instant jump that also cancels any running multi-page navigation.
    function jumpTo(slot) {
        navToken++;
        setSlotInstantly(slot);
    }

    // Snap every in-flight flip to its final state.
    function settleFlips() {
        setSlotInstantly(logicalPageNumber);
    }

    // ------------------------- Flip lifecycle -------------------------
    //   request → panel is mounted at its start pose, and the side the leaf
    //             lands on is pinned (hold) so it doesn't change underneath
    //   arm     → the static layer commits the new page and the animation
    //             starts (immediately by default, see START_DELAY_FRAMES)
    //   land    → the animation finished (or the fallback timer fired)
    //   retire  → landed panels are removed a few frames after the static
    //             layer has had time to paint the final content beneath them

    // Images for the face that appears at the midpoint. Never awaited:
    // loading them must not delay a flip.
    function warmImages(slot) {
        try {
            Promise.resolve(preloadPageImages(pageForSlotOrNull(slot))).catch(
                () => {},
            );
        } catch (error) {
            // images are a nicety, never block on them
        }
    }

    function armFlip(id) {
        const flip = findFlip(id);
        if (!flip || flip.armed) return;
        if (flip.commitAt === "arm") {
            pageNumber = normalizeSlot(logicalPageNumber);
        }
        flip.armed = true; // FlipPanel starts its animation in this same flush
        setTimeout(() => landFlip(id), flip.duration + LAND_GRACE_MS);
    }

    async function armFlipAfterFrames(id) {
        for (let i = 0; i < START_DELAY_FRAMES; i++) await nextFrame();
        armFlip(id);
    }

    function landFlip(id) {
        const flip = findFlip(id);
        if (!flip || !flip.armed || flip.landed) return;
        flip.landed = true;

        if (flipState.flips.every((f) => f.landed)) {
            finishBurst();
            return;
        }

        // Earlier panels that landed on this side are now fully covered.
        const covered = flipState.flips
            .filter(
                (f) =>
                    f.landed && f.id < flip.id && f.landSide === flip.landSide,
            )
            .map((f) => f.id);
        if (covered.length > 0) retireLater(covered);
    }

    // Every flip has landed: commit the final page to the static layer (it
    // renders underneath the still-visible panels), then remove the panels.
    function finishBurst() {
        const ids = flipState.flips.map((f) => f.id);
        pageNumber = normalizeSlot(logicalPageNumber);
        releaseHolds();
        retireLater(ids);
    }

    async function retireLater(ids) {
        await settle();
        for (const id of ids) {
            const flip = findFlip(id);
            if (flip && flip.landed) removeFlip(id);
        }
    }

    // direction: "next" | "previous". toSlot: where the book should be after
    // this leaf. It may be several pages away (long jumps skip pages).
    function requestFlip(direction, toSlot, duration = DURATION_MS) {
        // Reversing direction while pages are in the air: land them instantly
        // and start the new flip from a clean state.
        if (
            lastDirection &&
            lastDirection !== direction &&
            flipState.flips.length > 0
        ) {
            settleFlips();
        }

        const oldLogical = logicalPageNumber;
        const newLogical = normalizeSlot(toSlot);
        if (newLogical === oldLogical) return false;

        const sourceComponent =
            isDoublePage && direction === "next"
                ? rightPageComponent
                : leftPageComponent;
        const sourceEl = sourceComponent?.getElement?.();
        if (!sourceEl) {
            setSlotInstantly(newLogical);
            return true;
        }
        const box = sourceEl.getBoundingClientRect();
        const rect = {
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
        };

        const id = nextFlipId();
        let flip;

        if (isDoublePage) {
            const forward = direction === "next";
            const hinge = forward ? "left" : "right";
            flip = {
                id,
                direction,
                hinge,
                rect,
                duration,
                fromAngle: 0,
                toAngle: flipAngleForHinge(hinge),
                startSlot: forward ? oldLogical + 1 : oldLogical,
                startBlank: false,
                startRightPage: forward,
                endSlot: forward ? newLogical : newLogical + 1,
                endBlank: false,
                endRightPage: !forward,
                // The side the leaf lands on keeps showing the old page
                // until the whole burst has landed.
                holdSide: forward ? "left" : "right",
                holdSlot: forward ? oldLogical : oldLogical + 1,
                landSide: forward ? "left" : "right",
                commitAt: "arm",
                armed: false,
                landed: false,
            };
        } else {
            const hinge = "right"; // single-page mode always hinges on the right edge
            const angle = flipAngleForHinge(hinge);
            const forward = direction === "next";
            flip = {
                id,
                direction,
                hinge,
                rect,
                duration,
                // next: reverse playback (angle -> 0), the new page settles on
                //       top of the old one. previous: the current page lifts
                //       away (0 -> angle) and reveals the previous page.
                fromAngle: forward ? angle : 0,
                toAngle: forward ? 0 : angle,
                startSlot: forward ? null : oldLogical,
                startBlank: forward,
                startRightPage: false,
                endSlot: forward ? newLogical : null,
                endBlank: !forward,
                endRightPage: false,
                holdSide: null,
                holdSlot: null,
                landSide: "single",
                commitAt: forward ? "end" : "arm",
                armed: false,
                landed: false,
            };
        }

        // Pinned synchronously so it never depends on arming order.
        if (flip.holdSide && flipState.holds[flip.holdSide] == null) {
            flipState.holds[flip.holdSide] = flip.holdSlot;
        }

        lastDirection = direction;
        logicalPageNumber = newLogical;
        addFlip(flip);
        warmImages(flip.endSlot);

        if (START_DELAY_FRAMES <= 0) armFlip(id);
        else armFlipAfterFrames(id);
        return true;
    }

    // ------------------------- Navigation -------------------------
    function nextPage() {
        navToken++;
        const target = logicalPageNumber + (isDoublePage ? 2 : 1);
        if (settings.values[settingsOptions.ANIMATION]) {
            requestFlip("next", target);
            return;
        }
        jumpTo(target);
    }

    function previousPage() {
        navToken++;
        const target = logicalPageNumber - (isDoublePage ? 2 : 1);
        if (settings.values[settingsOptions.ANIMATION]) {
            requestFlip("previous", target);
            return;
        }
        jumpTo(target);
    }

    // Lets other components (PageLink, Overview) jump to a slot. Long jumps
    // are capped at NAV_MAX_LEAVES leaves (each leaf skips several pages), so
    // the whole jump takes about (leaves - 1) * spacing + NAV_FLIP_MS, and a
    // deadline snaps to the target if anything stalls past NAV_MAX_MS.
    // A newer navigation or click cancels an older jump that is still stepping.
    async function navigateToSlot(targetSlot) {
        const target = normalizeSlot(targetSlot);

        if (!settings.values[settingsOptions.ANIMATION]) {
            jumpTo(target);
            return;
        }
        if (target === logicalPageNumber) {
            navToken++; // stop any older jump heading elsewhere
            return;
        }

        const token = ++navToken;
        const step = isDoublePage ? 2 : 1;
        const start = logicalPageNumber;
        const direction = target > start ? "next" : "previous";
        const steps = Math.ceil(Math.abs(target - start) / step);
        const stride = Math.ceil(steps / NAV_MAX_LEAVES); // pages per leaf
        const leaves = Math.ceil(steps / stride);
        // Spacing is shrunk if needed so the jump fits in NAV_MAX_MS
        // (500ms reserved for mounting and landing).
        const spacing = Math.min(
            NAV_SPACING_MS,
            Math.max(
                0,
                (NAV_MAX_MS - NAV_FLIP_MS - 500) / Math.max(1, leaves - 1),
            ),
        );

        // Safety net: never leave the user waiting longer than NAV_MAX_MS.
        setTimeout(() => {
            if (
                token === navToken &&
                (flipState.flips.length > 0 || pageNumber !== target)
            ) {
                jumpTo(target);
            }
        }, NAV_MAX_MS);

        for (let i = 1; i <= leaves; i++) {
            if (token !== navToken) return;
            const slot =
                direction === "next"
                    ? Math.min(start + i * stride * step, target)
                    : Math.max(start - i * stride * step, target);
            requestFlip(direction, slot, NAV_FLIP_MS);
            if (i < leaves) await sleep(spacing);
        }
    }

    // Used by PageLayout's onPageMoved: newIndex is the page's new 0-based
    // array index. Its display slot is newIndex + 1; in double-page mode this
    // snaps to the even left slot of the spread containing it.
    function navigateToMovedPage(newIndex) {
        jumpTo(newIndex + 1);
    }

    async function callDeletePage(pageIndex) {
        await pageData.deletePage(pageIndex);
        const targetIndex = Math.min(pageIndex, maxPage - 1);
        jumpTo(targetIndex >= 0 ? targetIndex + 1 : 0);
    }

    // ------------------------- Effects -------------------------
    $effect(() => {
        pageData.loadAllPages();
    });

    // Keep pageNumber valid when the page count or mode changes.
    $effect(() => {
        if (pageData.loading) return;
        const target = normalizeSlot(pageNumber);
        if (target !== pageNumber) {
            pageNumber = target;
            logicalPageNumber = target;
        }
    });

    // When nothing is flipping, the logical position is simply what is shown.
    $effect(() => {
        if (flipState.flips.length === 0) {
            logicalPageNumber = pageNumber;
            lastDirection = null;
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
            window.removeEventListener(
                "spellbook-local-saved",
                handleLocalSave,
            );
            window.removeEventListener(
                "spellbook-cloud-pulled",
                handleCloudPull,
            );
        };
    });

    $effect(() => {
        initScrollFade();
    });

    $effect(() => {
        return registerPageNavigator(navigateToSlot);
    });

    // Resizing changes panel geometry (and possibly the mode), so any panels
    // in the air are landed instantly.
    $effect(() => {
        const handleResize = () => {
            const nowDouble = window.innerWidth > window.innerHeight;
            const modeChanged = nowDouble !== isDoublePage;
            if (!modeChanged && flipState.flips.length === 0) return;
            navToken++;
            const slot =
                flipState.flips.length > 0 ? logicalPageNumber : pageNumber;
            isDoublePage = nowDouble;
            setSlotInstantly(slot);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    });

    // rAF and timers are throttled in background tabs, so never leave panels
    // half-way when the tab is hidden or shown again.
    $effect(() => {
        const handleVisibility = () => {
            if (flipState.flips.length > 0) {
                navToken++;
                settleFlips();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () =>
            document.removeEventListener("visibilitychange", handleVisibility);
    });

    // Update the URL once the book has settled (one history entry per burst
    // instead of one per flip), and never push a duplicate entry.
    $effect(() => {
        const current = pageNumber;
        if (flipState.flips.length > 0) return;
        const params = new URLSearchParams(window.location.search);
        const inUrl = params.get("page");
        if (inUrl === String(current)) return;
        params.set("page", current);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        try {
            if (inUrl === null) {
                window.history.replaceState(
                    { pageNumber: current },
                    "",
                    newUrl,
                );
            } else {
                window.history.pushState({ pageNumber: current }, "", newUrl);
            }
        } catch (error) {
            console.warn("[history] could not update URL", error);
        }
    });

    $effect(() => {
        const handlePopState = () => {
            jumpTo(getPageFromUrl());
        };
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    });
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
                class="interact home-page"
                onclick={() => navigateToSlot(0)}
                title="Home Page"
            >
            </button>
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
                class="interact home-page"
                onclick={() => navigateToSlot(0)}
                title="Home Page"
            >
            </button>
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
                class="interact home-page"
                onclick={() => navigateToSlot(0)}
                title="Home Page"
            >
            </button>
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
                class="interact settings-page"
                onclick={() => navigateToSlot(maxPage + 1)}
                title="Settings Page"
            >
            </button>
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
                    pageNumber={rightSlot - 1}
                    onPageAdded={navigateToMovedPage}
                    onPageDeleted={callDeletePage}
                    onPageMoved={navigateToMovedPage}
                    rightPage={true}
                />
            {/if}
            {#if isDoublePage && appState.mode == AppMode.VIEWING}
                <button
                    class="interact settings-page"
                    onclick={() => navigateToSlot(maxPage + 1)}
                    title="Settings Page"
                >
                </button>
                <button
                    class="interact next-page"
                    onclick={nextPage}
                    title="Next Page"
                ></button>
            {/if}
        </Page>
    {/if}
{/if}

<PageFlip {slotKind} onLanded={landFlip} />

<style>
    .next-page {
        width: calc(var(--unit-width) * 16);
        height: 100%;
        top: 0%;
        right: 0%;
        z-index: 1 !important;
    }

    .previous-page {
        width: calc(var(--unit-width) * 16);
        height: 100%;
        top: 0%;
        left: 0%;
        z-index: 1 !important;
    }
    .home-page {
        width: calc(var(--unit-width) * 16);
        height: calc(var(--unit-height) * 16);
        bottom: 0;
        left: 0;
        z-index: 2 !important;
    }
    .settings-page {
        width: calc(var(--unit-width) * 16);
        height: calc(var(--unit-height) * 16);
        bottom: 0;
        right: 0;
        z-index: 2 !important;
    }
</style>
