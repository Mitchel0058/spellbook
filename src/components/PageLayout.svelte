<script>
    import { pageData } from "../context/pageData.svelte.js";
    import { elementRegistry } from "../constants/elementTypes.js";
    import { getPageOptionsModal } from "../context/pageOptionsModal.svelte.js";
    import DraggableBox from "./DraggableBox.svelte";
    import SquareButton from "./SquareButton.svelte";
    import { ButtonType } from "../constants/buttonType.js";
    import { pageTemplates } from "../constants/pageTemplates.js";

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

<SquareButton
    buttonType={ButtonType.CHECKEDBOX}
    onClick={handleSave}
    xPosition={116}
    yPosition={40}
    {rightPage}
/>
<SquareButton
    buttonType={ButtonType.SETTINGS}
    onClick={openPageSettingsPicker}
    xPosition={116}
    yPosition={50}
    {rightPage}
/>
<SquareButton
    buttonType={ButtonType.SETTINGS}
    onClick={openElementPickerModal}
    xPosition={116}
    yPosition={60}
    {rightPage}
/>

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
