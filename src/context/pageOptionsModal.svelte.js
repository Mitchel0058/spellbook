import { setContext, getContext } from 'svelte';

const PAGE_OPTIONS_MODAL_KEY = Symbol('pageOptionsModal');

export function createPageOptionsModal() {
    const modalState = $state({
        open: false,
        title: '',
        schema: [],
        values: null,
        onSave: null,
        onChange: null,
    });

    const controls = {
        state: modalState,
        open({ title, schema, values, onSave, onChange }) {
            modalState.title = title;
            modalState.schema = schema;
            modalState.values = values;
            modalState.onSave = onSave;
            modalState.onChange = onChange;
            modalState.open = true;
        },
        notifyChange() {
            modalState.onChange?.(modalState.values);
        },
        save() {
            modalState.onSave?.(modalState.values);
            modalState.open = false;
        },
        close() {
            modalState.open = false;
        },
    };

    setContext(PAGE_OPTIONS_MODAL_KEY, controls);
    return controls;
}

export function getPageOptionsModal() {
    const controls = getContext(PAGE_OPTIONS_MODAL_KEY);
    if (!controls) {
        throw new Error('No page options modal in context — this component must be rendered inside a Page.');
    }
    return controls;
}