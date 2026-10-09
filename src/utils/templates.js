import { PageDB } from './db.js';
import { TemplateDB } from './templateDb.js';

export const TemplateKind = { PAGE: 'page', ELEMENT: 'element' };
export const TemplateScope = { GLOBAL: 'global', SPELLBOOK: 'spellbook' };

// Reads must never break the pickers, so a failing store just yields [].
async function safeRead(promise) {
    try {
        return await promise;
    } catch (error) {
        console.error('Template storage read failed:', error);
        return [];
    }
}

// All templates of one kind from both stores. `scope` is added on read
// and is never persisted (where a record lives is its scope).
export async function listTemplates(kind) {
    const [globals, locals] = await Promise.all([
        safeRead(TemplateDB.getAll()),
        safeRead(PageDB.getTemplates()),
    ]);
    return [
        ...globals.map((t) => ({ ...t, scope: TemplateScope.GLOBAL })),
        ...locals.map((t) => ({ ...t, scope: TemplateScope.SPELLBOOK })),
    ]
        .filter((t) => t.kind === kind)
        .sort((a, b) => a.name.localeCompare(b.name));
}

export async function findTemplate(kind, scope, name) {
    const wanted = name.trim().toLowerCase();
    const all = await listTemplates(kind);
    return (
        all.find(
            (t) => t.scope === scope && t.name.trim().toLowerCase() === wanted,
        ) ?? null
    );
}

export async function saveTemplate(template, scope) {
    const { scope: _ignored, ...record } = template;
    if (scope === TemplateScope.GLOBAL) {
        await TemplateDB.put(record);
    } else {
        await PageDB.putTemplate(record);
    }
}

export async function deleteTemplate(template) {
    if (template.scope === TemplateScope.GLOBAL) {
        await TemplateDB.delete(template.id);
    } else {
        await PageDB.deleteTemplate(template.id);
    }
}

export async function renameTemplate(template, newName) {
    const { scope, ...record } = template;
    await saveTemplate({ ...record, name: newName }, scope);
}