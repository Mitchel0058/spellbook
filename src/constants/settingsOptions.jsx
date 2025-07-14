export const settingsOptions = {
    RECENTPAGE: 'recentPage',
    FONTADDITION: 'fontAddition',
    PAGEFIT: 'pageFit',
    ANIMATION: 'animation',
    // LOCALFONT: 'localFont',
    CURRENT_SPELLBOOK_DB: 'currentSpellbookDb'
}

/**
 * Default values for settings
 */
export const DEFAULT_SETTINGS = {
    [settingsOptions.RECENTPAGE]: 1,
    [settingsOptions.FONTADDITION]: 0,
    [settingsOptions.PAGEFIT]: false,
    [settingsOptions.ANIMATION]: true,
    // [settingsOptions.LOCALFONT]: null,
    [settingsOptions.CURRENT_SPELLBOOK_DB]: 'Spellbook',
};