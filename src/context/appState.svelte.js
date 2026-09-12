export const AppMode = {
    VIEWING: 'viewing',
    EDITING: 'editing',
    LAYOUT: 'layout',
    DRAWING: 'drawing',
};

export const appState = $state({
    mode: AppMode.VIEWING,
});