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
        drawing: null,
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
        // Drawings are never copied from a template, same as page settings.
        settings: { showOnOverview: false, name: '' },
        drawing: null,
    };
}

class PageDataStore {
    pages = $state([]);
    loading = $state(true);
    saveTimer = null;

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
        this.notifyLocalSaved();
        return afterIndex + 1;
    }

    async deletePage(pageIndex) {
        const [removed] = this.pages.splice(pageIndex, 1);
        if (removed) {
            await PageDB.deletePage(removed.id);
            this.notifyLocalSaved();
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
            zIndex: 50,
            props: { ...defaultProps },
        };
        page.elements.push(element);
        this.scheduleSave();
        return element;
    }

    deleteElement(pageIndex, elementId) {
        const page = this.getPageOrThrow(pageIndex);
        page.elements = page.elements.filter((el) => el.id !== elementId);
        this.scheduleSave();
    }

    async movePage(fromIndex, toIndex) {
        if (
            fromIndex === toIndex ||
            fromIndex < 0 || fromIndex >= this.pages.length ||
            toIndex < 0 || toIndex >= this.pages.length
        ) {
            return;
        }
        const [moved] = this.pages.splice(fromIndex, 1);
        this.pages.splice(toIndex, 0, moved);
        await PageDB.saveOrder(this.pages.map((p) => p.id));
        this.notifyLocalSaved();
    }

    async movePageForward(pageIndex) {
        await this.movePage(pageIndex, pageIndex + 1);
    }

    async movePageBackward(pageIndex) {
        await this.movePage(pageIndex, pageIndex - 1);
    }

    async swapPages(indexA, indexB) {
        if (
            indexA === indexB ||
            indexA < 0 || indexA >= this.pages.length ||
            indexB < 0 || indexB >= this.pages.length
        ) {
            return;
        }
        [this.pages[indexA], this.pages[indexB]] =
            [this.pages[indexB], this.pages[indexA]];
        await PageDB.saveOrder(this.pages.map((p) => p.id));
        this.notifyLocalSaved();
    }

    updateElement(pageIndex, elementId, changes) {
        const page = this.getPageOrThrow(pageIndex);
        const el = page.elements.find((e) => e.id === elementId);
        if (el) {
            Object.assign(el, changes);
            this.scheduleSave();
        }
    }

    updatePageDrawing(pageIndex, dataUrl) {
        const page = this.getPageOrThrow(pageIndex);
        page.drawing = dataUrl;
        this.scheduleSave();
    }

    updatePageSettings(pageIndex, changes) {
        const page = this.getPageOrThrow(pageIndex);
        Object.assign(page.settings, changes);
        this.scheduleSave();
    }

    scheduleSave() {
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(async () => {
            this.saveTimer = null;
            try {
                await this.saveAll();
            } catch (error) {
                console.error("Autosave failed:", error);
            }
        }, 300);
    }

    async savePage(page) {
        await PageDB.savePage($state.snapshot(page));
    }

    async saveAll() {
        await Promise.all(this.pages.map((page) => this.savePage(page)));
        this.notifyLocalSaved();
    }

    notifyLocalSaved() {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('spellbook-local-saved', {
                    detail: { dbName: PageDB.activeDBName },
                }),
            );
        }
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