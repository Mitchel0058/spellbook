export const settingsOptions = {
    RECENTPAGE: 'recentPage',
    FONTADDITION: 'fontAddition',
    PAGEFIT: 'pageFit',
    ANIMATION: 'animation',
    CURRENT_SPELLBOOK_DB: 'currentSpellbookDb',
    SPELLBOOK_LIST: 'spellbookList',
    CUSTOM_FONT: 'customFont',
    CUSTOM_FONT_NAME: 'customFontName'
}

/**
 * Default values for settings
 */
export const DEFAULT_SETTINGS = {
    [settingsOptions.RECENTPAGE]: 1,
    [settingsOptions.FONTADDITION]: 0,
    [settingsOptions.PAGEFIT]: false,
    [settingsOptions.ANIMATION]: true,
    [settingsOptions.CURRENT_SPELLBOOK_DB]: 'Spellbook',
    [settingsOptions.SPELLBOOK_LIST]: ['Spellbook'],
    [settingsOptions.CUSTOM_FONT]: null,
    [settingsOptions.CUSTOM_FONT_NAME]: null
};