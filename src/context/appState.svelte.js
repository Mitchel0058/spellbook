export const AppMode = {
    VIEWING: 'viewing',
    EDITING: 'editing',
    LAYOUT: 'layout',
};

export const appState = $state({
    mode: AppMode.VIEWING,
});