<script>
    import { appState, AppMode } from "../../context/appState.svelte.js";
    import { getPageOptionsModal } from "../../context/pageOptionsModal.svelte.js";
    import BorderFrame from "../BorderFrame.svelte";
    import SymbolIcon from "../SymbolIcon.svelte";
    import { SYMBOLS } from "../../lib/symbols.js";

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
        symbol: "none",
        symbolPosition: "front",
        symbolAlign: "center",
        symbolColor: "#000000",
        ...initialTextOptions,
    });

    const optionsSchema = [
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
        {
            key: "mirrorX",
            label: "Mirror Horizontally",
            type: "checkbox",
        },
        {
            key: "mirrorY",
            label: "Mirror Vertically",
            type: "checkbox",
        },
        {
            key: "symbol",
            label: "Symbol",
            type: "symbol-select",
            choices: [
                { value: "none", label: "None" },
                ...Object.values(SYMBOLS).map((s) => ({
                    value: s.id,
                    label: s.label,
                    width: s.width,
                    height: s.height,
                    cells: s.cells,
                })),
            ],
        },
        {
            key: "symbolPosition",
            label: "Symbol Position",
            type: "select",
            choices: [
                { value: "front", label: "Before Text (Left)" },
                { value: "behind", label: "After Text (Right)" },
            ],
            showIf: { key: "symbol", values: Object.keys(SYMBOLS) },
        },
        {
            key: "symbolAlign",
            label: "Symbol Alignment",
            type: "select",
            choices: [
                { value: "top", label: "Top" },
                { value: "center", label: "Center" },
                { value: "bottom", label: "Bottom" },
            ],
            showIf: { key: "symbol", values: Object.keys(SYMBOLS) },
        },
        {
            key: "symbolColor",
            label: "Symbol Color",
            type: "color",
            showIf: { key: "symbol", values: Object.keys(SYMBOLS) },
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
        style="font-size: calc(var(--reactive-font-size) * {textOptions.fontSize});
                --fade-length: {textOptions.fadeLength}%;"
        onpointerdown={handlePointerDown}
        onpointerup={handlePointerUp}
        onpointerleave={handlePointerUp}
        onclick={handleClick}
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
                    value={content}
                    oninput={(e) => {
                        content = e.target.value;
                        onChange({
                            text: content,
                            textOptions: { ...textOptions },
                        });
                    }}
                    style="
                        color: {textOptions.color};
                        text-align: {textOptions.alignment};
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
                    {content}
                </p>
            {/if}
        </div>
    </div>
{/snippet}

{#snippet contentWithSymbol()}
    <div class="text-symbol-wrapper">
        {#if textOptions.symbol && textOptions.symbol !== "none" && textOptions.symbolPosition === "front"}
            <div
                class="symbol-layer symbol-position-front symbol-align-{textOptions.symbolAlign}"
            >
                <SymbolIcon
                    symbol={SYMBOLS[textOptions.symbol]}
                    color={textOptions.symbolColor}
                />
            </div>
        {/if}

        {@render textContent()}

        {#if textOptions.symbol && textOptions.symbol !== "none" && textOptions.symbolPosition === "behind"}
            <div
                class="symbol-layer symbol-position-behind symbol-align-{textOptions.symbolAlign}"
            >
                <SymbolIcon
                    symbol={SYMBOLS[textOptions.symbol]}
                    color={textOptions.symbolColor}
                />
            </div>
        {/if}
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
            {@render contentWithSymbol()}
        {/snippet}
    </BorderFrame>
{:else}
    {@render contentWithSymbol()}
{/if}

<style>
    .text {
        pointer-events: auto;
        user-select: auto;
        position: relative;
        width: 100%;
        height: 100%;
        color: black;

        overflow: auto;
        overflow-x: hidden;
        overflow-wrap: break-word;

        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .text.no-scroll {
        pointer-events: none;
        touch-action: none;
        overflow: hidden;
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

    .text-symbol-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
    }

    .symbol-layer {
        position: absolute;
        pointer-events: none;
    }

    .symbol-layer.symbol-position-front {
        right: calc(100% + var(--unit-width-px));
    }

    .symbol-layer.symbol-position-behind {
        left: calc(100% + var(--unit-width-px));
    }

    .symbol-layer.symbol-align-top {
        top: 0;
    }

    .symbol-layer.symbol-align-center {
        top: 50%;
        transform: translateY(-50%);
    }

    .symbol-layer.symbol-align-bottom {
        bottom: 0;
    }
</style>
