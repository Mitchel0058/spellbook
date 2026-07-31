// src/constants/elementTypes.js
import Title from '../components/elements/Title.svelte';
import Text from '../components/elements/Text.svelte';
import Image from '../components/elements/Image.svelte';

export const ElementType = {
    TITLE: 'title',
    TEXT: 'text',
    IMAGE: 'image',
};

const TITLE_DEFAULT_PROPS = { text: 'New Title' };
const TEXT_DEFAULT_PROPS = { text: 'New text block' };
const IMAGE_DEFAULT_PROPS = { imageFile: null, alt: 'Uploaded image' };

export const elementRegistry = {
    [ElementType.TITLE]: {
        label: 'Title',
        component: Title,
        defaultProps: TITLE_DEFAULT_PROPS,
        defaultSize: { widthUnits: 60, heightUnits: 15 },
        // TODO: unsure whether to keep it like this
        // Used when creating a page from a template: keep the element's own
        // "settings" (titleOptions), reset actual content back to default.
        templateProps: (savedProps) => ({
            ...TITLE_DEFAULT_PROPS,
            titleOptions: savedProps.titleOptions ?? {},
        }),
    },
    [ElementType.TEXT]: {
        label: 'Text',
        component: Text,
        defaultProps: TEXT_DEFAULT_PROPS,
        defaultSize: { widthUnits: 50, heightUnits: 40 },
        templateProps: (savedProps) => ({
            ...TEXT_DEFAULT_PROPS,
            textOptions: savedProps.textOptions ?? {},
        }),
    },
    [ElementType.IMAGE]: {
        label: 'Image',
        component: Image,
        defaultProps: IMAGE_DEFAULT_PROPS,
        defaultSize: { widthUnits: 40, heightUnits: 40 },
        templateProps: (savedProps) => ({
            ...IMAGE_DEFAULT_PROPS,
            imageOptions: savedProps.imageOptions ?? {},
        }),
    },
};