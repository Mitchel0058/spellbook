<script>
    import { appState, AppMode } from "../../context/appState.svelte.js";
    import { getPageOptionsModal } from "../../context/pageOptionsModal.svelte.js";
    import { pageData } from "../../context/pageData.svelte.js";
    import { requestPageNavigation } from "../../context/pageNav.svelte.js";
    import BorderFrame from "../BorderFrame.svelte";

    let {
        links: initialLinks = [],
        rowHeightUnits: initialRowHeightUnits,
        textOptions: initialTextOptions = {},
        onChange = () => {},
        onDelete = () => {},
    } = $props();

    const pageOptionsModal = getPageOptionsModal();

    let links = $state(initialLinks.map((l) => ({ ...l })));
    let rowHeightUnits = $state(initialRowHeightUnits);

    let isEditing = $derived(appState.mode === AppMode.EDITING);
    let isLayoutMode = $derived(appState.mode === AppMode.LAYOUT);
    let isViewing = $derived(appState.mode === AppMode.VIEWING);

    let textOptions = $state({
        color: "#000000",
        bold: false,
        italic: false,
        alignment: "left",
        verticalAlignment: "baseline",
        fadeLength: 20,
        fontSize: 1,
        skew: 0,
        rotation: 0,
        mirrorX: false,
        mirrorY: false,
        direction: "horizontal",
        showPageNumber: true,
        border: false,
        borderColor: "#000000",
        showPatterns: true,
        showCorners: true,
        inside: true,
        insideColor: "#8f563b",
        insideColor2: "#a67048",
        insideFillColor: "#bb8854",
        fill: true,
        outerOverlay: true,
        outerOverlayColor: "#fbf236",
        outerOverlayOpacity: 0.25,
        ...initialTextOptions,
    });

    // -- page lookups (dynamic: pages can be added/removed/reordered) --

    function pageIndexFor(pageId) {
        return pageData.pages.findIndex((p) => p.id === pageId);
    }

    function labelForPage(idx) {
        const page = pageData.pages[idx];
        return page?.settings?.name || `Page ${idx + 1}`;
    }

    function defaultTextFor(pageId) {
        const idx = pageIndexFor(pageId);
        return idx === -1 ? "Missing page" : labelForPage(idx);
    }

    function pageNumberLabel(link) {
        const idx = pageIndexFor(link.pageId);
        return idx === -1 ? "(missing)" : `#${idx + 1}`;
    }

    // Rebuilds `links` from a fresh set of selected page ids, preserving
    // custom text for pages that stay selected and defaulting new ones to
    // the page's name (or "Page N" if unnamed).
    function syncLinksWithPageIds(pageIds) {
        const existingByPageId = new Map(links.map((l) => [l.pageId, l]));
        links = pageIds.map((pageId) => {
            const existing = existingByPageId.get(pageId);
            if (existing) return existing;
            return { pageId, text: defaultTextFor(pageId) };
        });
    }

    function reportChange() {
        onChange({
            links: links.map((l) => ({ ...l })),
            rowHeightUnits,
            textOptions: { ...textOptions },
        });
    }

    function updateRowText(link, value) {
        link.text = value;
        reportChange();
    }

    // -- options modal --

    let modalValues = $state({});

    function buildOptionsSchema() {
        const pageChoices = pageData.pages.map((p, idx) => ({
            value: p.id,
            label: p.settings?.name || `Page ${idx + 1}`,
        }));

        return [
            {
                key: "linkedPageIds",
                label: "Linked Pages",
                type: "page-select",
                choices: pageChoices,
            },
            {
                key: "rowHeightUnits",
                label: "Row Height (units)",
                type: "number",
                min: 1,
                max: 200,
                step: 1,
                default: 9,
            },
            {
                key: "direction",
                label: "Text Direction",
                type: "select",
                choices: [
                    { value: "vertical", label: "Vertical" },
                    { value: "horizontal", label: "Horizontal" },
                ],
            },
            {
                key: "fontSize",
                label: "Font Size",
                type: "range",
                min: 0.3,
                max: 3,
                step: 0.1,
                default: 1,
            },
            { key: "color", label: "Text Color", type: "color" },
            { key: "bold", label: "Bold", type: "checkbox" },
            { key: "italic", label: "Italic", type: "checkbox" },
            {
                key: "alignment",
                label: "Alignment",
                type: "select",
                choices: [
                    { value: "left", label: "Left" },
                    { value: "center", label: "Center" },
                    { value: "right", label: "Right" },
                    { value: "justify", label: "Justify" },
                ],
            },
            {
                key: "verticalAlignment",
                label: "Vertical Alignment",
                type: "select",
                choices: [
                    { value: "baseline", label: "Baseline" },
                    { value: "center", label: "Center" },
                    { value: "end", label: "End" },
                ],
            },
            {
                key: "fadeLength",
                label: "Text Fade",
                type: "range",
                min: 0,
                max: 100,
                step: 1,
                default: 20,
            },
            {
                key: "showPageNumber",
                label: "Show Page number",
                type: "checkbox",
            },
            {
                key: "skew",
                label: "Skew",
                type: "range",
                min: -45,
                max: 45,
                step: 1,
                default: 0,
            },
            {
                key: "rotation",
                label: "Rotation",
                type: "range",
                min: -180,
                max: 180,
                step: 1,
                default: 0,
            },
            { key: "mirrorX", label: "Mirror Horizontally", type: "checkbox" },
            { key: "mirrorY", label: "Mirror Vertically", type: "checkbox" },
            { key: "border", label: "Show Border", type: "checkbox" },
            {
                key: "borderColor",
                label: "Border Color",
                type: "color",
                showIf: { key: "border", value: true },
            },
            {
                key: "showPatterns",
                label: "Show Patterns",
                type: "checkbox",
                showIf: { key: "border", value: true },
            },
            {
                key: "showCorners",
                label: "Show Corners",
                type: "checkbox",
                showIf: { key: "border", value: true },
            },
            {
                key: "inside",
                label: "Show Inside Border",
                type: "checkbox",
                showIf: { key: "border", value: true },
            },
            {
                key: "insideColor",
                label: "Inside Border Color",
                type: "color",
                showIf: { key: "border", value: true },
            },
            {
                key: "insideColor2",
                label: "Inside Border Color 2",
                type: "color",
                showIf: { key: "border", value: true },
            },
            {
                key: "fill",
                label: "Fill Border",
                type: "checkbox",
                showIf: { key: "border", value: true },
            },
            {
                key: "insideFillColor",
                label: "Inside Fill Color",
                type: "color",
                showIf: { key: "border", value: true },
            },
            {
                key: "outerOverlay",
                label: "Show Outer Overlay",
                type: "checkbox",
                showIf: { key: "border", value: true },
            },
            {
                key: "outerOverlayColor",
                label: "Outer Overlay Color",
                type: "color",
                showIf: { key: "border", value: true },
            },
            {
                key: "outerOverlayOpacity",
                label: "Outer Overlay Opacity",
                type: "range",
                min: 0,
                max: 1,
                step: 0.01,
                default: 0.25,
                showIf: { key: "border", value: true },
            },
            {
                key: "delete",
                label: "Delete Element",
                type: "delete-button",
                onDelete: () => onDelete(),
            },
        ];
    }

    let pressTimer = null;
    let longPressTriggered = false;
    const LONG_PRESS_MS = 1000;

    function handlePointerDown() {
        if (!isEditing) return;
        longPressTriggered = false;
        pressTimer = setTimeout(() => {
            longPressTriggered = true;
            modalValues = {
                ...textOptions,
                rowHeightUnits,
                linkedPageIds: links.map((l) => l.pageId),
            };
            pageOptionsModal.open({
                title: "Page Link Options",
                schema: buildOptionsSchema(),
                values: modalValues,
                onChange: () => {
                    const {
                        rowHeightUnits: newRowHeightUnits,
                        linkedPageIds,
                        ...restTextOptions
                    } = modalValues;
                    textOptions = restTextOptions;
                    rowHeightUnits = newRowHeightUnits;
                    syncLinksWithPageIds(linkedPageIds ?? []);
                    reportChange();
                },
            });
        }, LONG_PRESS_MS);
    }

    function handlePointerUp() {
        clearTimeout(pressTimer);
    }

    function handleContainerClick(event) {
        if (longPressTriggered) {
            event.preventDefault();
            longPressTriggered = false;
        }
    }

    function handleRowClick(event, link) {
        if (longPressTriggered) {
            event.preventDefault();
            longPressTriggered = false;
            return;
        }
        if (!isViewing) return;
        const idx = pageIndexFor(link.pageId);
        if (idx === -1) return;
        requestPageNavigation(idx + 1);
    }

    $effect(() => {
        if (!isEditing) {
            pageOptionsModal.close();
        }
    });
</script>

{#snippet row(link)}
    <div
        class="row"
        class:horizontal={textOptions.direction === "horizontal"}
        class:has-transform={textOptions.rotation !== 0 ||
            textOptions.skew !== 0 ||
            textOptions.mirrorX ||
            textOptions.mirrorY}
        class:scroll-fade-x={textOptions.rotation === 0 &&
            textOptions.skew === 0 &&
            !textOptions.mirrorX &&
            !textOptions.mirrorY &&
            textOptions.direction === "horizontal"}
        class:scroll-fade-y={textOptions.rotation === 0 &&
            textOptions.skew === 0 &&
            !textOptions.mirrorX &&
            !textOptions.mirrorY &&
            textOptions.direction !== "horizontal"}
        style="height: calc(var(--unit-width-px) * {rowHeightUnits});
                font-size: calc(var(--reactive-font-size) * {textOptions.fontSize});
                --fade-length: {textOptions.fadeLength}%;"
        onclick={(event) => handleRowClick(event, link)}
        role="presentation"
    >
        <div
            class="text-transform-wrapper"
            style="transform: rotate({textOptions.rotation}deg) skew({textOptions.skew}deg) scaleX({textOptions.mirrorX
                ? -1
                : 1}) scaleY({textOptions.mirrorY
                ? -1
                : 1}); transform-origin: center;"
        >
            {#if isEditing}
                <textarea
                    class="editable"
                    value={link.text}
                    oninput={(e) => updateRowText(link, e.target.value)}
                    style="
                        color: {textOptions.color};
                        text-align: {textOptions.alignment};
                        align-items: {textOptions.verticalAlignment === 'end'
                        ? 'flex-end'
                        : textOptions.verticalAlignment};
                        align-content: {textOptions.verticalAlignment};
                        font-weight: {textOptions.bold ? 'bold' : 'normal'};
                        font-style: {textOptions.italic ? 'italic' : 'normal'};
                    "
                ></textarea>
            {:else}
                <p
                    class="display-text"
                    style="
                        color: {textOptions.color};
                        text-align: {textOptions.alignment};
                        align-content: {textOptions.verticalAlignment};
                        font-weight: {textOptions.bold ? 'bold' : 'normal'};
                        font-style: {textOptions.italic ? 'italic' : 'normal'};
                    "
                >
                    <span class="link-text">{link.text}</span>
                    {#if textOptions.showPageNumber}
                        <span class="page-number">
                            {pageNumberLabel(link)}</span
                        >
                    {/if}
                </p>
            {/if}
        </div>
    </div>
{/snippet}

{#snippet pageLinkContent()}
    <div
        class="pagelink"
        onpointerdown={handlePointerDown}
        onpointerup={handlePointerUp}
        onpointerleave={handlePointerUp}
        onclick={handleContainerClick}
        role="presentation"
    >
        <div class="rows" class:no-scroll={isLayoutMode}>
            {#each links as link (link.pageId)}
                {@render row(link)}
            {:else}
                <div class="placeholder">
                    {#if isEditing}
                        Hold to select pages
                    {/if}
                </div>
            {/each}
        </div>
    </div>
{/snippet}

{#if textOptions.border}
    <BorderFrame
        color={textOptions.borderColor}
        showPatterns={textOptions.showPatterns}
        showCorners={textOptions.showCorners}
        inside={textOptions.inside}
        insideColor1={textOptions.insideColor}
        insideColor2={textOptions.insideColor2}
        fill={textOptions.fill}
        insideFillColor={textOptions.insideFillColor}
        outerOverlay={textOptions.outerOverlay}
        outerOverlayColor={textOptions.outerOverlayColor}
        outerOverlayOpacity={textOptions.outerOverlayOpacity}
    >
        {#snippet children()}
            {@render pageLinkContent()}
        {/snippet}
    </BorderFrame>
{:else}
    {@render pageLinkContent()}
{/if}

<style>
    .pagelink {
        pointer-events: auto;
        user-select: auto;
        position: relative;
        width: 100%;
        height: 100%;
    }

    .rows {
        width: 100%;
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .rows::-webkit-scrollbar,
    .rows::-webkit-scrollbar-button {
        display: none;
    }

    .rows.no-scroll {
        overflow: hidden;
        pointer-events: none;
        touch-action: none;
    }

    .row {
        position: relative;
        flex: 0 0 auto;
        width: 100%;
        box-sizing: border-box;
        color: black;
        cursor: default;
        overflow: hidden;
        overflow-wrap: break-word;
    }

    .row.horizontal {
        overflow-x: auto;
        overflow-wrap: normal;
        white-space: nowrap;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .row.horizontal::-webkit-scrollbar,
    .row.horizontal::-webkit-scrollbar-button {
        display: none;
    }

    .row.horizontal .display-text,
    .row.horizontal .editable {
        white-space: pre;
    }

    .text-transform-wrapper {
        width: 100%;
        height: 100%;
    }

    .row.has-transform {
        overflow: visible;
    }

    .display-text,
    .editable {
        cursor: pointer;
        margin: 0;
        white-space: pre-wrap;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        user-select: text;
    }

    .display-text {
        display: flex;
    }

    .link-text {
        flex: 0 0 auto;
    }

    .page-number {
        position: sticky;
        right: 0;
        flex: 0 0 auto;
        margin-left: auto;
        background: inherit;
    }

    .editable {
        font-size: inherit !important;
        padding: 0;
        border: none;
        background: #0001;
        resize: none;
        font-family: inherit;
        color: inherit;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .placeholder {
        width: 100%;
        padding: calc(var(--unit-width-px) * 4);
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.05);
        border: 1px dashed #888;
        box-sizing: border-box;
        font-size: 0.75rem;
        color: #666;
        text-align: center;
    }
</style>
