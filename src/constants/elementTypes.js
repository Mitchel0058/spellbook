// src/constants/elementTypes.js
import Text from '../components/elements/Text.svelte';
import Image from '../components/elements/Image.svelte';

export const ElementType = {
    TEXT: 'text',
    IMAGE: 'image',
};

const TEXT_DEFAULT_PROPS = { text: 'New text block' };
const IMAGE_DEFAULT_PROPS = { imageFile: null, alt: 'Uploaded image' };

export const elementRegistry = {
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