<script>
    import { appState, AppMode } from "../../context/appState.svelte.js";
    import { getPageOptionsModal } from "../../context/pageOptionsModal.svelte.js";
    import BorderFrame from "../BorderFrame.svelte";

    let {
        text = "",
        titleOptions: initialTitleOptions = {},
        onChange = () => {},
        onDelete = () => {},
    } = $props();

    const pageOptionsModal = getPageOptionsModal();

    let content = $state(text);
    let isEditing = $derived(appState.mode === AppMode.EDITING);
    let isLayoutMode = $derived(appState.mode === AppMode.LAYOUT);

    let titleOptions = $state({
        color: "#000000",
        bold: false,
        italic: false,
        alignment: "left",
        skew: 0,
        rotation: 0,
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
        ...initialTitleOptions,
    });

    const optionsSchema = [
        {
            key: "color",
            label: "Text Color",
            type: "color",
        },
        {
            key: "bold",
            label: "Bold",
            type: "checkbox",
        },
        {
            key: "italic",
            label: "Italic",
            type: "checkbox",
        },
        {
            key: "alignment",
            label: "Alignment",
            type: "select",
            choices: [
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" },
            ],
        },
        {
            key: "skew",
            label: "Skew",
            type: "range",
            min: -45,
            max: 45,
            step: 1,
        },
        {
            key: "rotation",
            label: "Rotation",
            type: "range",
            min: -180,
            max: 180,
            step: 1,
        },
        {
            key: "border",
            label: "Show Border",
            type: "checkbox",
        },
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
            showIf: { key: "border", value: true },
        },
        {
            key: "delete",
            label: "Delete Element",
            type: "delete-button",
            onDelete: () => onDelete(),
        },
    ];

    let pressTimer = null;
    let longPressTriggered = false;
    const LONG_PRESS_MS = 1000;

    function handlePointerDown() {
        if (!isEditing) return;
        longPressTriggered = false;
        pressTimer = setTimeout(() => {
            longPressTriggered = true;
            pageOptionsModal.open({
                title: "Title Options",
                schema: optionsSchema,
                values: titleOptions,
                onChange: () => {
                    onChange({
                        text: content,
                        titleOptions: { ...titleOptions },
                    });
                },
            });
        }, LONG_PRESS_MS);
    }

    function handlePointerUp() {
        clearTimeout(pressTimer);
    }

    function handleClick(event) {
        if (longPressTriggered) {
            event.preventDefault();
            longPressTriggered = false;
        }
    }

    $effect(() => {
        if (!isEditing) {
            pageOptionsModal.close();
        }
    });
</script>

{#snippet titleContent()}
    <div
        class="title"
        class:no-scroll={isLayoutMode}
        class:has-transform={titleOptions.rotation !== 0 ||
            titleOptions.skew !== 0}
        onpointerdown={handlePointerDown}
        onpointerup={handlePointerUp}
        onpointerleave={handlePointerUp}
        onclick={handleClick}
        role="presentation"
    >
        <div
            class="title-transform-wrapper"
            class:scroll-fade-x={titleOptions.rotation === 0 ||
                titleOptions.skew === 0}
            style="transform: rotate({titleOptions.rotation}deg) skew({titleOptions.skew}deg);"
        >
            {#if isEditing}
                <input
                    type="text"
                    class="editable"
                    value={content}
                    oninput={(e) => {
                        content = e.target.value;
                        onChange({
                            text: content,
                            titleOptions: { ...titleOptions },
                        });
                    }}
                    style="
                    color: {titleOptions.color};
                    text-align: {titleOptions.alignment};
                    font-weight: {titleOptions.bold ? 'bold' : 'normal'};
                    font-style: {titleOptions.italic ? 'italic' : 'normal'};
                "
                />
            {:else}
                <p
                    class="display-title"
                    style="
                    color: {titleOptions.color};
                    text-align: {titleOptions.alignment};
                    font-weight: {titleOptions.bold ? 'bold' : 'normal'};
                    font-style: {titleOptions.italic ? 'italic' : 'normal'};
                "
                >
                    {content}
                </p>
            {/if}
        </div>
    </div>
{/snippet}

{#if titleOptions.border}
    <BorderFrame
        color={titleOptions.borderColor}
        showPatterns={titleOptions.showPatterns}
        showCorners={titleOptions.showCorners}
        inside={titleOptions.inside}
        insideColor1={titleOptions.insideColor}
        insideColor2={titleOptions.insideColor2}
        fill={titleOptions.fill}
        insideFillColor={titleOptions.insideFillColor}
        outerOverlay={titleOptions.outerOverlay}
        outerOverlayColor={titleOptions.outerOverlayColor}
        outerOverlayOpacity={titleOptions.outerOverlayOpacity}
    >
        {#snippet children()}
            {@render titleContent()}
        {/snippet}
    </BorderFrame>
{:else}
    {@render titleContent()}
{/if}

<style>
    .title {
        pointer-events: auto;
        user-select: auto;
        position: relative;
        width: 100%;
        height: 100%;
        font-size: calc(var(--reactive-font-size) * 1.5);

        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;

        -ms-overflow-style: none;
        scrollbar-width: none;
        align-content: center;
    }

    .title::after {
        content: "";
        width: 20%;
        padding-left: 3vh;
    }

    .title::-webkit-scrollbar {
        display: none;
    }

    .title.has-transform {
        overflow: visible;
    }

    .title-transform-wrapper {
        width: 100%;
        height: 100%;
        overflow: scroll;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .title-transform-wrapper::-webkit-scrollbar {
        display: none;
    }

    .display-title,
    .editable {
        align-content: center;
        margin: 0;
        white-space: nowrap;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        user-select: text;
    }

    .editable {
        font-size: calc(var(--reactive-font-size) * 1.5) !important;
        padding: 0;
        border: none;
        background: #0001;
        font-family: inherit;
        color: inherit;
    }
</style>
