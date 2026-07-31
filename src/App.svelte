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

    // Resolves a slot number to what should render there:
    // 0 -> overview, 1..maxPage -> real page (index slot-1), maxPage+1 -> settings
    function slotKind(slot) {
        if (slot === 0) return "overview";
        if (slot >= 1 && slot <= maxPage) return "page";
        return "settings";
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
        if (isDoublePage) {
            pageNumber = Math.min(pageNumber + 2, maxPage);
        } else {
            pageNumber = Math.min(pageNumber + 1, maxPage + 1);
        }
    }

    function previousPage() {
        const decrement = isDoublePage ? 2 : 1;
        pageNumber = Math.max(pageNumber - decrement, 0);
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
{:else if slotKind(pageNumber) === "settings"}
    <Settings />
    {#if pageNumber > 0 && appState.mode == AppMode.VIEWING}
        <button
            class="interact previous-page"
            onclick={previousPage}
            title="Previous Page"
        ></button>
    {/if}
{:else}
    <Page pageType={PageType.BLANK}>
        {#if pageNumber > 0 && appState.mode == AppMode.VIEWING}
            <button
                class="interact previous-page"
                onclick={previousPage}
                title="Previous Page"
            ></button>
        {/if}

        {#if slotKind(pageNumber) === "overview"}
            <Overview onSelectPage={(slot) => (pageNumber = slot)} />
        {:else}
            <div
                style="position: absolute; top: calc(var(--unit-height) * 167); left: calc(var(--unit-width) * 118); font-size: var(--reactive-font-size)"
            >
                {pageNumber}
            </div>
            <PageLayout
                bind:this={leftPageLayout}
                pageNumber={pageNumber - 1}
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
    {#if slotKind(pageNumber + 1) === "settings"}
        <Settings />
        {#if appState.mode == AppMode.VIEWING}
            <button
                class="interact next-page"
                onclick={nextPage}
                title="Next Page"
            ></button>
        {/if}
    {:else}
        <Page pageType={PageType.BLANK_RIGHT} pageNumber={pageNumber + 1} rightPage=true>
            {#if slotKind(pageNumber + 1) === "overview"}
                <Overview onSelectPage={(slot) => (pageNumber = slot)} />
            {:else}
                <div
                    style="position: absolute; top: calc(var(--unit-height) * 167); left: calc(var(--unit-width) * 118); font-size: var(--reactive-font-size)"
                >
                    {pageNumber + 1}
                </div>
                <PageLayout
                    bind:this={rightPageLayout}
                    {pageNumber}
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
