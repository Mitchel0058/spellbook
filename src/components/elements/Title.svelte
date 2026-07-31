<script>
    import { appState, AppMode } from "../../context/appState.svelte.js";
    import { getPageOptionsModal } from "../../context/pageOptionsModal.svelte.js";

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

<div
    class="title"
    class:no-scroll={isLayoutMode}
    class:has-transform={titleOptions.rotation !== 0 || titleOptions.skew !== 0}
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
