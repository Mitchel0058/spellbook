<script>
    import { appState, AppMode } from "../../context/appState.svelte.js";
    import { getPageOptionsModal } from "../../context/pageOptionsModal.svelte.js";

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
        skew: 0,
        rotation: 0,
        direction: "vertical",
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

<div
    class="text"
    class:no-scroll={isLayoutMode}
    class:horizontal={textOptions.direction === "horizontal"}
    class:has-transform={textOptions.rotation !== 0 || textOptions.skew !== 0}
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
                style="color: {textOptions.color}; text-align: {textOptions.alignment};"
            ></textarea>
        {:else}
            <p
                class="display-text"
                style="color: {textOptions.color}; text-align: {textOptions.alignment};"
            >
                {content}
            </p>
        {/if}
    </div>
</div>

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
