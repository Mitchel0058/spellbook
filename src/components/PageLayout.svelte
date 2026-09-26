<script>
    import { pageData } from "../context/pageData.svelte.js";
    import { elementRegistry } from "../constants/elementTypes.js";
    import { getPageOptionsModal } from "../context/pageOptionsModal.svelte.js";
    import DraggableBox from "./DraggableBox.svelte";
    import SquareButton from "./SquareButton.svelte";
    import { ButtonType } from "../constants/buttonType.js";
    import { pageTemplates } from "../constants/pageTemplates.js";
    import { appState, AppMode } from "../context/appState.svelte.js";
    import DrawingLayer from "./DrawingLayer.svelte";

    let {
        pageNumber,
        onPageAdded = () => {},
        onPageDeleted = () => {},
        rightPage = false,
    } = $props();

    const pageOptionsModal = getPageOptionsModal();

    // Pure read, safe for $derived
    let page = $derived(pageData.getPage(pageNumber) ?? { elements: [] });
    let focusedElementId = $state(null);
    $effect(() => {
        pageNumber;
        focusedElementId = null;
    });

    function toggleLayoutMode() {
        appState.mode =
            appState.mode !== AppMode.LAYOUT ? AppMode.LAYOUT : AppMode.EDITING;
    }
    function toggleEditMode() {
        appState.mode =
            appState.mode !== AppMode.EDITING
                ? AppMode.EDITING
                : AppMode.VIEWING;
    }

    function toggleDrawingMode() {
        appState.mode =
            appState.mode !== AppMode.DRAWING
                ? AppMode.DRAWING
                : AppMode.EDITING;
    }

    export function openAddElementPicker() {
        pageOptionsModal.open({
            title: "Add Element",
            schema: [
                {
                    key: "elementType",
                    label: "Choose Element Type",
                    type: "choice-group",
                    choices: Object.entries(elementRegistry).map(
                        ([type, def]) => ({
                            value: type,
                            label: def.label,
                            onClick: () => {
                                pageData.addElement(pageNumber, {
                                    type,
                                    defaultProps: def.defaultProps,
                                    defaultSize: def.defaultSize,
                                });
                                pageOptionsModal.close();
                            },
                        }),
                    ),
                },
            ],
            values: {},
        });
    }

    export function openAddPagePicker() {
        pageOptionsModal.open({
            title: "Add Page",
            schema: [
                {
                    key: "template",
                    label: "Choose Template",
                    type: "choice-group",
                    choices: Object.entries(pageTemplates).map(
                        ([key, def]) => ({
                            value: key,
                            label: def.label,
                            onClick: async () => {
                                const newIndex = await pageData.insertPageAfter(
                                    pageNumber,
                                    key,
                                );
                                onPageAdded(newIndex);
                                pageOptionsModal.close();
                            },
                        }),
                    ),
                },
            ],
            values: {},
        });
    }

    export function openElementPickerModal() {
        pageOptionsModal.open({
            title: "Select Element for Focus",
            schema: [
                {
                    key: "focusedElement",
                    label: "Choose Element",
                    type: "choice-group",
                    choices: page.elements.map((el) => ({
                        value: el.id,
                        label: elementRegistry[el.type]?.label ?? el.type,
                        highlighted: focusedElementId === el.id,
                        onClick: () => {
                            focusedElementId =
                                focusedElementId === el.id ? null : el.id;
                            openElementPickerModal();
                        },
                    })),
                },
            ],
            values: {},
        });
    }

    export function openPageSettingsPicker() {
        pageOptionsModal.open({
            title: "Page Settings",
            schema: [
                {
                    key: "showOnOverview",
                    label: "Show on Overview",
                    type: "checkbox",
                },
                {
                    key: "name",
                    label: "Name",
                    type: "text",
                },
                {
                    key: "overviewImage",
                    label: "Overview Image",
                    type: "image",
                },
                {
                    key: "deletePage",
                    label: "Delete Page",
                    type: "delete-button",
                    confirmMessage:
                        "Delete this entire page? This cannot be undone.",
                    onDelete: () => onPageDeleted(pageNumber),
                },
            ],
            values: {
                showOnOverview: page.settings.showOnOverview,
                name: page.settings.name,
                overviewImage: page.settings.overviewImage,
            },
            onChange: (values) => {
                pageData.updatePageSettings(pageNumber, values);
            },
        });
    }

    async function handleSave() {
        try {
            await pageData.saveAll();
            // show success feedback
        } catch (e) {
            console.error("Save failed:", e);
            // show error feedback
        }
    }
</script>

<button
    class="interact edit-button"
    onclick={toggleEditMode}
    title={appState.mode === AppMode.EDITING
        ? "Exit Edit Mode"
        : "Enter Edit Mode"}
    style={rightPage
        ? "left: calc(var(--unit-width-px) * 1);"
        : "right: calc(var(--unit-width-px) * 1);"}
>
</button>

{#if appState.mode !== AppMode.VIEWING}
    <button
        class="interact add-element-button"
        onclick={openAddElementPicker}
        title="Add Elements"
    >
        <img
            class="btn-image"
            src="assets/img/buttons/btn_Add_Element.svg"
            alt="Add Element"
        />
    </button>
    <button
        class="interact add-page-button"
        onclick={openAddPagePicker}
        title="Add Page"
    >
        <img
            class="btn-image"
            src="assets/img/buttons/btn_Add_Page.svg"
            alt="Add Page"
        />
    </button>
    <button
        class="interact layout-button"
        onclick={toggleLayoutMode}
        title="Toggle Layout Mode"
    >
        <img
            class="btn-image"
            src="assets/img/buttons/btn_Layout.svg"
            alt="Reorder Elements"
        />
    </button>
    <button
        class="interact settings-button"
        onclick={openPageSettingsPicker}
        title="Change Page Settings"
    >
        <img
            class="btn-image"
            src="assets/img/buttons/btn_Settings.svg"
            alt="Settings"
        />
    </button>
    <button
        class="interact focus-button"
        onclick={openElementPickerModal}
        title="Choose Element Focus"
    >
        <img
            class="btn-image"
            src="assets/img/buttons/btn_Focus.svg"
            alt="Focus Element"
        />
    </button>
    <button
        class="interact drawing-button"
        onclick={toggleDrawingMode}
        title="Toggle Drawing Mode"
    >
        <img
            class="btn-image"
            src="assets/img/buttons/btn_Drawmode.svg"
            alt="Draw"
        />
    </button>
{/if}

<div
    style="position: absolute; top: calc(var(--unit-height-px) * 174); {rightPage
        ? 'left: calc(var(--unit-width-px) * 120);'
        : 'left: calc(var(--unit-width-px) * 122);'} font-size: var(--reactive-font-size)"
>
    {pageNumber + 1}
</div>

{#each page.elements as element (element.id)}
    <DraggableBox
        top={element.top}
        left={element.left}
        widthUnits={element.widthUnits}
        heightUnits={element.heightUnits}
        zIndex={focusedElementId === element.id ? 200 : element.zIndex}
        isFocused={focusedElementId === element.id}
        elementType={element.type}
        elementProps={element.props}
        onDelete={() => pageData.deleteElement(pageNumber, element.id)}
        onChange={(changes) =>
            pageData.updateElement(pageNumber, element.id, changes)}
        onPropsChange={(props) =>
            pageData.updateElement(pageNumber, element.id, { props })}
        {rightPage}
    />
{/each}

<DrawingLayer
    {pageNumber}
    drawing={page.drawing}
    onDrawingChange={(dataUrl) =>
        pageData.updatePageDrawing(pageNumber, dataUrl)}
    {rightPage}
/>

<style>
    .edit-button {
        position: absolute;
        top: calc(var(--unit-height-px) * 7);
        width: calc(var(--unit-width-px) * 15);
        height: calc(var(--unit-height-px) * 15);
        border: none;
        cursor: pointer;
        z-index: 100;
    }

    .add-element-button,
    .add-page-button,
    .layout-button,
    .settings-button,
    .focus-button,
    .drawing-button {
        position: absolute;
        bottom: calc(var(--unit-height-px) * 3);
        border: none;
        cursor: pointer;
        /* background-color: #0aa1; */
    }

    .add-element-button {
        left: calc(var(--unit-width-px) * 22);
        width: calc(var(--unit-width-px) * 15);
        height: calc(var(--unit-height-px) * 16);
    }

    .add-page-button {
        left: calc(var(--unit-width-px) * 37);
        width: calc(var(--unit-width-px) * 15);
        height: calc(var(--unit-height-px) * 16);
    }

    .layout-button {
        left: calc(var(--unit-width-px) * 52);
        width: calc(var(--unit-width-px) * 15);
        height: calc(var(--unit-height-px) * 16);
    }

    .settings-button {
        left: calc(var(--unit-width-px) * 69);
        width: calc(var(--unit-width-px) * 16);
        height: calc(var(--unit-height-px) * 16);
    }

    .focus-button {
        left: calc(var(--unit-width-px) * 85);
        width: calc(var(--unit-width-px) * 15);
        height: calc(var(--unit-height-px) * 17);
    }

    .drawing-button {
        left: calc(var(--unit-width-px) * 100);
        width: calc(var(--unit-width-px) * 17);
        height: calc(var(--unit-height-px) * 17);
    }

    .btn-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
</style>
