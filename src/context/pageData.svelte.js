import { PageDB } from '../utils/db.js';
import { pageTemplates } from '../constants/pageTemplates.js';
import { TemplateKind } from '../utils/templates.js';

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

    const groupIdMap = new Map();
    const remapGroupId = (gid) => {
        if (!gid) return null;
        if (!groupIdMap.has(gid)) groupIdMap.set(gid, makeId());
        return groupIdMap.get(gid);
    };

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
            groupId: remapGroupId(el.groupId),
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

// ---------- Saved (user) templates ----------

function createGroupRemapper() {
    const map = new Map();
    return (gid) => {
        if (!gid) return null;
        if (!map.has(gid)) map.set(gid, makeId());
        return map.get(gid);
    };
}

// Plain, storable copy of one element. With keepData off, props are reduced
// to settings only, using the same rules as the built-in templates.
function templateElementFrom(el, keepData, elementRegistry) {
    const snap = $state.snapshot(el);
    const def = elementRegistry[snap.type];

    let props;
    if (keepData) {
        props = snap.props ?? {};
    } else if (def?.templateProps) {
        props = def.templateProps(snap.props ?? {});
    } else {
        props = { ...(def?.defaultProps ?? {}) };
    }

    return {
        type: snap.type,
        top: snap.top,
        left: snap.left,
        widthUnits: snap.widthUnits,
        heightUnits: snap.heightUnits,
        zIndex: snap.zIndex,
        groupId: snap.groupId ?? null,
        props,
    };
}

// Page-ready elements (fresh ids and group ids) from stored template
// elements. Unknown element types are skipped silently.
function elementsFromTemplate(templateElements, elementRegistry, shift = { top: 0, left: 0 }) {
    const remapGroupId = createGroupRemapper();
    return templateElements
        .filter((el) => elementRegistry[el.type])
        .map((el) => ({
            id: makeId(),
            type: el.type,
            top: el.top + shift.top,
            left: el.left + shift.left,
            widthUnits: el.widthUnits,
            heightUnits: el.heightUnits,
            zIndex: el.zIndex,
            groupId: remapGroupId(el.groupId),
            props: structuredClone(el.props ?? {}),
        }));
}

async function buildPageFromSavedTemplate(template) {
    const { elementRegistry } = await import('../constants/elementTypes.js');
    return {
        id: makeId(),
        elements: elementsFromTemplate(template.elements ?? [], elementRegistry),
        settings: template.settings
            ? structuredClone(template.settings)
            : { showOnOverview: false, name: '' },
        drawing: template.drawing ?? null,
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
            groupId: null,
            props: { ...defaultProps },
        };
        page.elements.push(element);
        this.scheduleSave();
        return element;
    }

    deleteElement(pageIndex, elementId) {
        const page = this.getPageOrThrow(pageIndex);
        page.elements = page.elements.filter((el) => el.id !== elementId);
        this.normalizeGroups(page);
        this.scheduleSave();
    }

    // Dissolves any group with fewer than 2 members.
    normalizeGroups(page) {
        const counts = new Map();
        for (const el of page.elements) {
            if (el.groupId) {
                counts.set(el.groupId, (counts.get(el.groupId) ?? 0) + 1);
            }
        }
        for (const el of page.elements) {
            if (el.groupId && counts.get(el.groupId) < 2) {
                el.groupId = null;
            }
        }
    }

    // Makes anchor + otherIds one group. Members of the anchor's group that
    // aren't listed are removed; elements from other groups are moved over.
    setGroupMembers(pageIndex, anchorId, otherIds) {
        const page = this.getPageOrThrow(pageIndex);
        const anchor = page.elements.find((e) => e.id === anchorId);
        if (!anchor) return;
        if (!anchor.groupId && otherIds.length === 0) return;

        const desired = new Set([anchorId, ...otherIds]);
        const gid = anchor.groupId ?? makeId();
        let changed = false;

        for (const el of page.elements) {
            if (desired.has(el.id)) {
                if (el.groupId !== gid) {
                    el.groupId = gid;
                    changed = true;
                }
            } else if (el.groupId === gid) {
                el.groupId = null;
                changed = true;
            }
        }

        if (changed) {
            this.normalizeGroups(page);
            this.scheduleSave();
        }
    }

    removeFromGroup(pageIndex, elementId) {
        const page = this.getPageOrThrow(pageIndex);
        const el = page.elements.find((e) => e.id === elementId);
        if (!el || !el.groupId) return;
        el.groupId = null;
        this.normalizeGroups(page);
        this.scheduleSave();
    }

    ungroup(pageIndex, elementId) {
        const page = this.getPageOrThrow(pageIndex);
        const el = page.elements.find((e) => e.id === elementId);
        if (!el || !el.groupId) return;
        const gid = el.groupId;
        for (const member of page.elements) {
            if (member.groupId === gid) member.groupId = null;
        }
        this.scheduleSave();
    }

    // d = { l, t, r, b }: how far each edge moved, in units.
    // Move: l = r = dx, t = b = dy. Resize right edge: only r. Etc.
    applyGroupDelta(pageIndex, groupId, d) {
        const page = this.getPageOrThrow(pageIndex);
        for (const el of page.elements) {
            if (el.groupId === groupId) {
                el.left += d.l;
                el.top += d.t;
                el.widthUnits += d.r - d.l;
                el.heightUnits += d.b - d.t;
            }
        }
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

    async insertPageFromTemplate(afterIndex, template) {
        const newPage = await buildPageFromSavedTemplate(template);
        await PageDB.insertPageAfter(afterIndex, newPage);
        this.pages.splice(afterIndex + 1, 0, newPage);
        this.notifyLocalSaved();
        return afterIndex + 1;
    }

    // Builds the storable record for a page template. Saves nothing itself.
    async buildPageTemplate(
        pageIndex,
        { name, keepData, keepPageSettings, includeDrawing },
    ) {
        const { elementRegistry } = await import('../constants/elementTypes.js');
        const page = this.getPageOrThrow(pageIndex);
        return {
            id: makeId(),
            kind: TemplateKind.PAGE,
            name,
            keepData,
            createdAt: Date.now(),
            elements: page.elements.map((el) =>
                templateElementFrom(el, keepData, elementRegistry),
            ),
            settings: keepPageSettings ? $state.snapshot(page.settings) : null,
            drawing: includeDrawing ? ($state.snapshot(page.drawing) ?? null) : null,
        };
    }

    // If the element is grouped, the whole group becomes the template.
    async buildElementTemplate(pageIndex, elementId, { name, keepData, keepPosition }) {
        const { elementRegistry } = await import('../constants/elementTypes.js');
        const page = this.getPageOrThrow(pageIndex);
        const anchor = page.elements.find((e) => e.id === elementId);
        if (!anchor) return null;

        const members = anchor.groupId
            ? page.elements.filter((e) => e.groupId === anchor.groupId)
            : [anchor];

        return {
            id: makeId(),
            kind: TemplateKind.ELEMENT,
            name,
            keepData,
            keepPosition,
            createdAt: Date.now(),
            elements: members.map((el) =>
                templateElementFrom(el, keepData, elementRegistry),
            ),
        };
    }

    async insertElementTemplate(pageIndex, template) {
        const { elementRegistry } = await import('../constants/elementTypes.js');
        const page = this.getPageOrThrow(pageIndex);
        const source = (template.elements ?? []).filter(
            (el) => elementRegistry[el.type],
        );
        if (source.length === 0) return [];

        // Without "keep position", the group's bounding box goes to the
        // page centre and the members keep their relative layout.
        let shift = { top: 0, left: 0 };
        if (!template.keepPosition) {
            const top = Math.min(...source.map((el) => el.top));
            const left = Math.min(...source.map((el) => el.left));
            const bottom = Math.max(...source.map((el) => el.top + el.heightUnits));
            const right = Math.max(...source.map((el) => el.left + el.widthUnits));
            const height = bottom - top;
            const width = right - left;

            const targetTop = Math.max(
                LAYOUT_MIN_TOP,
                Math.min(
                    LAYOUT_MAX_TOP - height,
                    Math.round((LAYOUT_MIN_TOP + LAYOUT_MAX_TOP - height) / 2),
                ),
            );
            const targetLeft = Math.max(
                LAYOUT_MIN_LEFT,
                Math.min(
                    LAYOUT_MAX_LEFT - width,
                    Math.round((LAYOUT_MIN_LEFT + LAYOUT_MAX_LEFT - width) / 2),
                ),
            );
            shift = { top: targetTop - top, left: targetLeft - left };
        }

        const created = elementsFromTemplate(source, elementRegistry, shift);
        page.elements.push(...created);
        this.scheduleSave();
        return created;
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