<script>
    import { appState, AppMode } from "../../context/appState.svelte.js";
    import { getPageOptionsModal } from "../../context/pageOptionsModal.svelte.js";
    import BorderFrame from "../BorderFrame.svelte";

    let {
        text = "",
        textOptions: initialTextOptions = {},
        onChange = () => {},
        onDelete = () => {},
    } = $props();

    const pageOptionsModal = getPageOptionsModal();

    let content = $state(text);
    let isEditing = $derived(appState.mode === AppMode.EDITING);
    let isLayoutMode = $derived(appState.mode === AppMode.LAYOUT);

    let textOptions = $state({
        color: "#000000",
        alignment: "left",
        verticalAlignment: "baseline",
        skew: 0,
        rotation: 0,
        direction: "vertical",
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

    const optionsSchema = [
        {
            key: "color",
            label: "Text Color",
            type: "color",
        },
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
            key: "direction",
            label: "Text Direction",
            type: "select",
            choices: [
                { value: "vertical", label: "Vertical" },
                { value: "horizontal", label: "Horizontal" },
            ],
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
                title: "Text Options",
                schema: optionsSchema,
                values: textOptions,
                onChange: () => {
                    onChange({
                        text: content,
                        textOptions: { ...textOptions },
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

{#snippet textContent()}
    <div
        class="text"
        class:no-scroll={isLayoutMode}
        class:horizontal={textOptions.direction === "horizontal"}
        class:has-transform={textOptions.rotation !== 0 ||
            textOptions.skew !== 0}
        class:scroll-fade-x={textOptions.rotation === 0 &&
            textOptions.skew === 0 &&
            textOptions.direction === "horizontal"}
        class:scroll-fade-y={textOptions.rotation === 0 &&
            textOptions.skew === 0 &&
            textOptions.direction !== "horizontal"}
        onpointerdown={handlePointerDown}
        onpointerup={handlePointerUp}
        onpointerleave={handlePointerUp}
        onclick={handleClick}
        role="presentation"
    >
        <div
            class="text-transform-wrapper"
            style="transform: rotate({textOptions.rotation}deg) skew({textOptions.skew}deg);"
        >
            {#if isEditing}
                <textarea
                    class="editable"
                    value={content}
                    oninput={(e) => {
                        content = e.target.value;
                        onChange({
                            text: content,
                            textOptions: { ...textOptions },
                        });
                    }}
                    style="color: {textOptions.color}; text-align: {textOptions.alignment}; align-content: {textOptions.verticalAlignment};"
                ></textarea>
            {:else}
                <p
                    class="display-text"
                    style="color: {textOptions.color}; text-align: {textOptions.alignment}; align-content: {textOptions.verticalAlignment};"
                >
                    {content}
                </p>
            {/if}
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
            {@render textContent()}
        {/snippet}
    </BorderFrame>
{:else}
    {@render textContent()}
{/if}

<style>
    .text {
        pointer-events: auto;
        user-select: auto;
        position: relative;
        width: 100%;
        height: 100%;
        font-size: var(--reactive-font-size);
        color: black;

        overflow: auto;
        overflow-x: hidden;
        overflow-wrap: break-word;

        -ms-overflow-style: none;
        scrollbar-width: none;

        /* -webkit-mask-image: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0),
            rgba(0, 0, 0, 0.2) calc(var(--unit-height) * 3),
            rgba(0, 0, 0, 1) calc(var(--unit-height) * 10),
            rgba(0, 0, 0, 1) 90%,
            rgba(0, 0, 0, 0)
        );
        mask-image: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0),
            rgba(0, 0, 0, 0.2) calc(var(--unit-height) * 3),
            rgba(0, 0, 0, 1) calc(var(--unit-height) * 10),
            rgba(0, 0, 0, 1) 90%,
            rgba(0, 0, 0, 0)
        ); */
    }

    .text::-webkit-scrollbar,
    .text::-webkit-scrollbar-button {
        display: none;
    }

    .text.horizontal {
        overflow-x: auto;
        overflow-y: hidden;
        overflow-wrap: normal;
        white-space: nowrap;
    }

    .text.horizontal .display-text,
    .text.horizontal .editable {
        white-space: pre;
    }

    .text-transform-wrapper {
        width: 100%;
        height: 100%;
    }

    .text.has-transform {
        overflow: visible;
    }

    /* .text::after {
        content: "";
        display: block;
        height: 25%;
    } */

    .display-text,
    .editable {
        margin: 0;
        white-space: pre-wrap;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        user-select: text;
    }

    .editable {
        font-size: var(--reactive-font-size) !important;
        padding: 0;
        border: none;
        background: #0001;
        resize: none;
        font-family: inherit;
        color: inherit;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
