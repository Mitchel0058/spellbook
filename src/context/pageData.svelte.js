import { PageDB } from '../utils/db.js';
import { pageTemplates } from '../constants/pageTemplates.js';

function makeId() {
    return crypto.randomUUID();
}

// Must match the layout bounds defined in DraggableBox.svelte
const LAYOUT_MIN_TOP = 5;
const LAYOUT_MIN_LEFT = 10;
const LAYOUT_MAX_TOP = 180;
const LAYOUT_MAX_LEFT = 138;

function makeBlankPage() {
    return {
        id: makeId(),
        elements: [],
        settings: { showOnOverview: false, name: '' },
    };
}

// Builds a fresh page from a template key. Page settings (name,
// showOnOverview, overviewImage) are always reset to defaults — only
// element layout + each element's own "settings" (via templateProps)
// carry over. Falls back to a blank page for unknown/blank templates.
async function buildPageFromTemplate(templateKey) {
    const { elementRegistry } = await import('../constants/elementTypes.js');

    const template = pageTemplates[templateKey];
    const templateData = template ? await template.load() : null;

    if (!templateData) {
        return makeBlankPage();
    }

    // Accept either a bare page object or a full export ({ pages: [...] }).
    const sourcePage = Array.isArray(templateData.pages)
        ? templateData.pages[0]
        : templateData;

    if (!sourcePage) {
        console.error("No matching source page: ", templateKey);
        return makeBlankPage();
    }

    const elements = (sourcePage.elements ?? []).map((el) => {
        const def = elementRegistry[el.type];
        const props = def?.templateProps
            ? def.templateProps(el.props ?? {})
            : { ...(def?.defaultProps ?? {}) };

        return {
            id: makeId(),
            type: el.type,
            top: el.top,
            left: el.left,
            widthUnits: el.widthUnits,
            heightUnits: el.heightUnits,
            zIndex: el.zIndex,
            props,
        };
    });

    return {
        id: makeId(),
        elements,
        settings: { showOnOverview: false, name: '' },
    };
}

class PageDataStore {
    pages = $state([]);
    loading = $state(true);

    getPage(pageIndex) {
        return this.pages[pageIndex];
    }

    // No longer creates pages. Only ever reads. If pageIndex is out of
    // bounds, that's a bug elsewhere (navigation should already be clamped
    // to pages.length in App.svelte) — surfaced loudly rather than silently
    // fabricating an unpersisted page.
    getPageOrThrow(pageIndex) {
        const page = this.pages[pageIndex];
        if (!page) {
            throw new Error(
                `pageData: no page at index ${pageIndex} (pages.length = ${this.pages.length}). Navigation should be clamped before reaching here.`,
            );
        }
        return page;
    }

    async insertPageAfter(afterIndex, templateKey = 'blank') {
        const newPage = await buildPageFromTemplate(templateKey);
        await PageDB.insertPageAfter(afterIndex, newPage);
        this.pages.splice(afterIndex + 1, 0, newPage);
        return afterIndex + 1;
    }

    async deletePage(pageIndex) {
        const [removed] = this.pages.splice(pageIndex, 1);
        if (removed) {
            await PageDB.deletePage(removed.id);
        }
    }

    addElement(pageIndex, { type, defaultProps, defaultSize }) {
        const page = this.getPageOrThrow(pageIndex);
        const element = {
            id: makeId(),
            type,
            top: (LAYOUT_MIN_TOP + LAYOUT_MAX_TOP) / 2 - defaultSize.heightUnits / 2,
            left: (LAYOUT_MIN_LEFT + LAYOUT_MAX_LEFT) / 2 - defaultSize.widthUnits / 2,
            widthUnits: defaultSize.widthUnits,
            heightUnits: defaultSize.heightUnits,
            zIndex: page.elements.length,
            props: { ...defaultProps },
        };
        page.elements.push(element);
        return element;
    }

    deleteElement(pageIndex, elementId) {
        const page = this.getPageOrThrow(pageIndex);
        page.elements = page.elements.filter((el) => el.id !== elementId);
    }

    updateElement(pageIndex, elementId, changes) {
        const page = this.getPageOrThrow(pageIndex);
        const el = page.elements.find((e) => e.id === elementId);
        if (el) Object.assign(el, changes);
    }

    updatePageSettings(pageIndex, changes) {
        const page = this.getPageOrThrow(pageIndex);
        Object.assign(page.settings, changes);
        this.savePage(page);
    }

    async savePage(page) {
        await PageDB.savePage($state.snapshot(page));
    }

    async saveAll() {
        await Promise.all(this.pages.map((page) => this.savePage(page)));
    }

    async loadAllPages() {
        this.loading = true;
        this.pages = await PageDB.ensureAtLeastOnePage(makeBlankPage);
        this.loading = false;
    }

    getAllPagesSummary() {
        return this.pages.map((data, index) => ({
            pageNumber: index,
            elementCount: data.elements.length,
            showOnOverview: data.settings.showOnOverview,
            name: data.settings.name,
        }));
    }
}

export const pageData = new PageDataStore();