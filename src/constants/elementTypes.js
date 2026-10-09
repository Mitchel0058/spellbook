import Text from '../components/elements/Text.svelte';
import Image from '../components/elements/Image.svelte';
import PageLink from '../components/elements/PageLink.svelte';

export const ElementType = {
    TEXT: 'text',
    IMAGE: 'image',
    PAGE_LINK: 'pageLink',
};

const TEXT_DEFAULT_PROPS = { text: 'New text block' };
const IMAGE_DEFAULT_PROPS = { imageFile: null, alt: 'Uploaded image' };
const PAGE_LINK_DEFAULT_PROPS = { links: [], rowHeightUnits: 9 };

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
    [ElementType.PAGE_LINK]: {
        label: 'Page Link',
        component: PageLink,
        defaultProps: PAGE_LINK_DEFAULT_PROPS,
        defaultSize: { widthUnits: 40, heightUnits: 60 },
        templateProps: (savedProps) => ({
            ...PAGE_LINK_DEFAULT_PROPS,
            links: savedProps.links ?? [],
            rowHeightUnits: savedProps.rowHeightUnits,
            textOptions: savedProps.textOptions ?? {},
        }),
    },
};