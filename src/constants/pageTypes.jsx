/**
 * Enum for page types used throughout the application
 */
export const PageType = {
    COVER: 'cover',
    TITLE: 'title',
    SPELL: 'spell',
    SPELLRIGHT: 'spell-right',
    // TEXT: 'text',
    // ILLUSTRATION: 'illustration',
    // INDEX: 'index'
};

/**
 * Map of page types to their corresponding image paths
 */
export const pageImages = {
    [PageType.COVER]: 'spellbook_cover.svg',
    [PageType.TITLE]: 'spellbook_title.svg',
    [PageType.SPELL]: 'spellbook_spell.svg',
    [PageType.SPELLRIGHT]: 'spellbook_spell_right.svg',
    // [PageType.TEXT]: 'spellbook_text.svg',
    // [PageType.ILLUSTRATION]: 'spellbook_illustration.svg',
    // [PageType.INDEX]: 'spellbook_index.svg'
};