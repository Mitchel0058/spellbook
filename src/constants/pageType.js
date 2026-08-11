/**
 * Enum for page types used throughout the application
 */
export const PageType = {
    COVER: 'cover',
    TITLE: 'title',
    TITLE_RIGHT: 'title-right',
    SPELL: 'spell',
    SPELL_RIGHT: 'spell-right',
    BLANK: 'blank',
    BLANK_RIGHT: 'blank-right'
};

/**
 * Map of page types to their corresponding image paths
 */
export const pageImages = {
    [PageType.COVER]: 'spellbook_cover.svg',
    [PageType.TITLE]: 'spellbook_left_title.svg',
    [PageType.TITLE_RIGHT]: 'spellbook_right_title.svg',
    [PageType.SPELL]: 'spellbook_left_spell.svg',
    [PageType.SPELL_RIGHT]: 'spellbook_right_spell.svg',
    [PageType.BLANK]: 'spellbook_left_blankV2.svg',
    [PageType.BLANK_RIGHT]: 'spellbook_right_blank.svg'
};