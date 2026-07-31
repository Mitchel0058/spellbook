<script>
    import { appState, AppMode } from "../../context/appState.svelte.js";
    import { getPageOptionsModal } from "../../context/pageOptionsModal.svelte.js";

    let {
        imageFile: initialImageFile = null,
        alt = "Uploaded image",
        imageOptions: initialImageOptions = {},
        onChange = () => {},
        onDelete = () => {},
    } = $props();

    const pageOptionsModal = getPageOptionsModal();

    let imageFile = $state(initialImageFile);
    let imageSrc = $state(null);
    let isEditing = $derived(appState.mode === AppMode.EDITING);

    let imageOptions = $state({
        fit: "fill",
        borderRadius: 0,
        ...initialImageOptions,
    });

    // Regenerates the object URL whenever imageFile changes, and revokes
    // it automatically before the next run / on destroy.
    $effect(() => {
        if (!imageFile) {
            imageSrc = null;
            return;
        }
        const url = URL.createObjectURL(imageFile);
        imageSrc = url;
        return () => URL.revokeObjectURL(url);
    });

    const optionsSchema = [
        {
            key: "fit",
            label: "Image Fit",
            type: "select",
            choices: [
                { value: "fill", label: "Fill" },
                { value: "contain", label: "Contain" },
                { value: "cover", label: "Cover" },
                { value: "none", label: "None" },
            ],
        },
        {
            key: "borderRadius",
            label: "Border Radius",
            type: "number",
            min: 0,
            max: 100,
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
    const LONG_PRESS_MS = 500;

    function handlePointerDown() {
        if (!isEditing) return;
        longPressTriggered = false;
        pressTimer = setTimeout(() => {
            longPressTriggered = true;
            pageOptionsModal.open({
                title: "Image Options",
                schema: optionsSchema,
                values: imageOptions,
                onChange: () => {
                    onChange({
                        imageFile,
                        alt,
                        imageOptions: { ...imageOptions },
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

    function handleFileChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        imageFile = file;
        onChange({ imageFile, alt, imageOptions: { ...imageOptions } });
    }
</script>

<label
    class="editable-image"
    class:editable={isEditing}
    onpointerdown={handlePointerDown}
    onpointerup={handlePointerUp}
    onpointerleave={handlePointerUp}
    onclick={handleClick}
    style="border-radius: {imageOptions.borderRadius}%;"
>
    {#if imageSrc}
        <img
            src={imageSrc}
            {alt}
            draggable="false"
            style="object-fit: {imageOptions.fit};"
        />
    {:else}
        <div class="placeholder">
            {#if isEditing}
                Click to upload image, hold for options
            {/if}
        </div>
    {/if}

    {#if isEditing}
        <input
            type="file"
            accept="image/*"
            onchange={handleFileChange}
            style="position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden;"
        />
    {/if}
</label>

<style>
    .editable-image {
        pointer-events: auto;
        width: 100%;
        height: 100%;
        position: relative;
        display: block;
        box-sizing: border-box;
        border: 0;
        overflow: hidden;
    }

    .editable-image.editable {
        cursor: pointer;
        outline: var(--dark-red) 2px solid;
    }

    .editable-image img {
        width: 100%;
        height: 100%;
        pointer-events: none;
        display: block;
    }

    .placeholder {
        width: 100%;
        height: 100%;
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
