export const noteOptions = {
    PAGE: 'page',
    TITLE: 'title',
    TYPE: 'type',
    CONTENT: 'content',
    ICONURL: 'iconUrl',
    ICONOBJECTFIT: 'iconObjectFit',
    DATE: 'date',
}

/**
 * Default values for note options
 */
export const DEFAULT_NOTE_OPTIONS = {
    [noteOptions.PAGE]: 0,
    [noteOptions.TITLE]: '',
    [noteOptions.TYPE]: 'text',
    [noteOptions.CONTENT]: '',
    [noteOptions.ICONURL]: '',
    [noteOptions.ICONOBJECTFIT]: 'contain',
    [noteOptions.DATE]: new Date().toISOString(),
};
