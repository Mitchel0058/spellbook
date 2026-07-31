// Registry of page templates offered when adding a new page. Each entry's
// `load()` returns either:
//   - null (the "blank" template — behaves exactly as before)
//   - a single exported page object, OR a full export ({ pages: [...] })
//     — either is accepted, see buildPageFromTemplate in pageData.svelte.js
//
// Templates only ever contribute each element's layout (top/left/
// widthUnits/heightUnits/zIndex) and its own "settings" (e.g. textOptions/
// imageOptions, via elementRegistry's templateProps) — actual content
// (text/imageFile) is always reset, never carried over from the file.
//
// To add a new template: export a page via the app's Export feature, save
// the resulting page (or the whole export) as a .json file under
// src/templates/, import it below, and add one entry here.

import spellTemplate from '../templates/spell.template.json';

export const pageTemplates = {
    blank: {
        label: 'Blank',
        load: () => null,
    },
    spell: {
        label: 'Spell',
        load: () => spellTemplate,
    },
};