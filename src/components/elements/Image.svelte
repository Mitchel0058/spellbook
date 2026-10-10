<script>
    import { appState, AppMode } from "../../context/appState.svelte.js";
    import { getPageOptionsModal } from "../../context/pageOptionsModal.svelte.js";
    import { getObjectUrl } from "../../lib/blobUrlCache.js";
    import BorderFrame from "../BorderFrame.svelte";

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
    let fileInput;
    let imageBounds = $state(null);
    let boundsSize = $state({ width: 0, height: 0 });
    let uploadTimer = null;

    let imageOptions = $state({
        fit: "fill",
        borderRadius: 0,
        mirrorX: false,
        mirrorY: false,
        skew: 0,
        rotation: 0,
        fitRotation: false,
        borderStyle: "none",
        diamondPlacement: "inside",
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
        ...initialImageOptions,
    });

    if (initialImageOptions.border && !initialImageOptions.borderStyle) {
        imageOptions.borderStyle = "pattern";
    }

    // Looks up the shared, stable object URL for this file rather than
    // minting a new one — every mount of this component for the same file
    // (real page, flip-panel copy, etc.) then points at the identical URL,
    // so the browser's decode/paint work is actually shared instead of
    // repeated on every swap.
    $effect(() => {
        imageSrc = imageFile ? getObjectUrl(imageFile) : null;
    });

    $effect(() => {
        if (!imageBounds) return;
        const observer = new ResizeObserver(([entry]) => {
            boundsSize = {
                width: entry.contentRect.width,
                height: entry.contentRect.height,
            };
        });
        observer.observe(imageBounds);
        return () => observer.disconnect();
    });

    let rotationFitScale = $derived.by(() => {
        const { width, height } = boundsSize;
        if (!imageOptions.fitRotation || !width || !height) return 1;

        const rotation = (imageOptions.rotation * Math.PI) / 180;
        const skew = Math.tan((imageOptions.skew * Math.PI) / 180);
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const a = cos - sin * skew;
        const b = cos * skew - sin;
        const c = sin + cos * skew;
        const d = sin * skew + cos;
        const rotatedWidth = Math.abs(a) * width + Math.abs(b) * height;
        const rotatedHeight = Math.abs(c) * width + Math.abs(d) * height;

        return Math.min(1, width / rotatedWidth, height / rotatedHeight);
    });

    let imageTransform = $derived(
        `rotate(${imageOptions.rotation}deg) skew(${imageOptions.skew}deg) scaleX(${imageOptions.mirrorX ? -1 : 1}) scaleY(${imageOptions.mirrorY ? -1 : 1})`,
    );
    let labelTransform = $derived(
        imageOptions.fitRotation ? "none" : imageTransform,
    );
    let visualTransform = $derived(
        imageOptions.fitRotation
            ? `${imageTransform} scale(${rotationFitScale})`
            : "none",
    );

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
            key: "fitRotation",
            label: "Fit Rotated Image",
            type: "checkbox",
            showIf: { key: "rotation", notValue: 0 },
        },
        {
            key: "borderStyle",
            label: "Border Style",
            type: "select",
            choices: [
                { value: "none", label: "None" },
                { value: "pattern", label: "Square" },
                { value: "diamond", label: "Diamond" },
            ],
        },
        {
            key: "diamondPlacement",
            label: "Diamond Placement",
            type: "select",
            choices: [
                { value: "outside", label: "Outside (around element)" },
                { value: "inside", label: "Inside (within element)" },
            ],
            showIf: { key: "borderStyle", value: "diamond" },
        },
        {
            key: "borderColor",
            label: "Border Color",
            type: "color",
            showIf: {
                key: "borderStyle",
                values: ["pattern", "diamond"],
            },
        },
        {
            key: "showPatterns",
            label: "Show Patterns",
            type: "checkbox",
            showIf: { key: "borderStyle", value: "pattern" },
        },
        {
            key: "showCorners",
            label: "Show Corners",
            type: "checkbox",
            showIf: { key: "borderStyle", value: "pattern" },
        },
        {
            key: "inside",
            label: "Show Inside Border",
            type: "checkbox",
            showIf: {
                key: "borderStyle",
                values: ["pattern", "diamond"],
            },
        },
        {
            key: "insideColor",
            label: "Inside Border Color",
            type: "color",
            showIf: {
                all: [
                    {
                        key: "borderStyle",
                        values: ["pattern", "diamond"],
                    },
                    { key: "inside", value: true },
                ],
            },
        },
        {
            key: "insideColor2",
            label: "Inside Border Color 2",
            type: "color",
            showIf: {
                all: [
                    { key: "borderStyle", value: "pattern" },
                    { key: "inside", value: true },
                ],
            },
        },
        {
            key: "fill",
            label: "Fill Border",
            type: "checkbox",
            showIf: {
                key: "borderStyle",
                values: ["pattern", "diamond"],
            },
        },
        {
            key: "insideFillColor",
            label: "Inside Fill Color",
            type: "color",
            showIf: {
                all: [
                    {
                        key: "borderStyle",
                        values: ["pattern", "diamond"],
                    },
                    { key: "fill", value: true },
                ],
            },
        },
        {
            key: "outerOverlay",
            label: "Show Outer Overlay",
            type: "checkbox",
            showIf: { key: "borderStyle", value: "pattern" },
        },
        {
            key: "outerOverlayColor",
            label: "Outer Overlay Color",
            type: "color",
            showIf: {
                all: [
                    { key: "borderStyle", value: "pattern" },
                    { key: "outerOverlay", value: true },
                ],
            },
        },
        {
            key: "outerOverlayOpacity",
            label: "Outer Overlay Opacity",
            type: "range",
            min: 0,
            max: 1,
            step: 0.01,
            default: 0.25,
            showIf: {
                all: [
                    { key: "borderStyle", value: "pattern" },
                    { key: "outerOverlay", value: true },
                ],
            },
        },
        {
            key: "delete",
            label: "Delete Element",
            type: "delete-button",
            onDelete: () => onDelete(),
        },
    ];

    function handleClick(event) {
        if (!isEditing) return;
        event.preventDefault();
        clearTimeout(uploadTimer);
        uploadTimer = setTimeout(() => fileInput?.click(), 250);
    }

    function handleDoubleClick(event) {
        if (!isEditing) return;
        event.preventDefault();
        clearTimeout(uploadTimer);
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
    }

    function handleFileChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        imageFile = file;
        onChange({ imageFile, alt, imageOptions: { ...imageOptions } });
    }
</script>

{#snippet imageContent()}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <label
        bind:this={imageBounds}
        class="editable-image"
        class:editable={isEditing}
        onclick={handleClick}
        ondblclick={handleDoubleClick}
        style="border-radius: {imageOptions.borderRadius}%;
                transform: {labelTransform};
                transform-origin: center;"
    >
        <div
            class="image-visual"
            style="border-radius: {imageOptions.borderRadius}%;
                transform: {visualTransform};
                transform-origin: center;"
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
        </div>

        {#if isEditing}
            <input
                bind:this={fileInput}
                type="file"
                accept="image/*"
                onchange={handleFileChange}
                onclick={(event) => event.stopPropagation()}
                style="position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden;"
            />
        {/if}
    </label>
{/snippet}

{#if imageOptions.borderStyle !== "none"}
    <BorderFrame
        variant={imageOptions.borderStyle}
        diamondPlacement={imageOptions.diamondPlacement}
        color={imageOptions.borderColor}
        showPatterns={imageOptions.showPatterns}
        showCorners={imageOptions.showCorners}
        inside={imageOptions.inside}
        insideColor1={imageOptions.insideColor}
        insideColor2={imageOptions.insideColor2}
        fill={imageOptions.fill}
        insideFillColor={imageOptions.insideFillColor}
        outerOverlay={imageOptions.outerOverlay}
        outerOverlayColor={imageOptions.outerOverlayColor}
        outerOverlayOpacity={imageOptions.outerOverlayOpacity}
    >
        {#snippet children()}
            {@render imageContent()}
        {/snippet}
    </BorderFrame>
{:else}
    {@render imageContent()}
{/if}

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

    .image-visual {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
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
