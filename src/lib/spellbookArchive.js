import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const ARCHIVE_FORMAT = 'spellbook-archive';
const ARCHIVE_VERSION = 1;
const MANIFEST_PATH = 'manifest.json';
const encoder = new TextEncoder();

function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

async function sha256(bytes) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, '0'),
    ).join('');
}

function extensionForType(type) {
    const subtype = type?.split('/')[1]?.split('+')[0]?.split(';')[0];
    return subtype && /^[a-z0-9]+$/i.test(subtype) ? subtype.toLowerCase() : 'bin';
}

function decodeDataUrl(value) {
    const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(value);
    if (!match) return null;

    const [, type, base64, body] = match;
    const bytes = base64
        ? Uint8Array.from(atob(body), (character) => character.charCodeAt(0))
        : new TextEncoder().encode(decodeURIComponent(body));

    return { type, bytes };
}

function encodeDataUrl(bytes, type) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return `data:${type || 'application/octet-stream'};base64,${btoa(binary)}`;
}

async function serializeAssets(value, files) {
    const dataUrl = typeof value === 'string' ? decodeDataUrl(value) : null;
    if (value instanceof Blob || dataUrl) {
        const bytes = dataUrl?.bytes ?? new Uint8Array(await value.arrayBuffer());
        const type = dataUrl?.type || value.type || 'application/octet-stream';
        const hash = await sha256(bytes);
        const path = `assets/${hash}.${extensionForType(type)}`;
        files[path] = [bytes, { level: 0 }];

        return {
            __asset: path,
            type,
            name: value instanceof File ? value.name : null,
            dataUrl: Boolean(dataUrl),
        };
    }

    if (Array.isArray(value)) {
        return Promise.all(value.map((item) => serializeAssets(item, files)));
    }
    if (value && typeof value === 'object') {
        const entries = await Promise.all(
            Object.entries(value).map(async ([key, item]) => [
                key,
                await serializeAssets(item, files),
            ]),
        );
        return Object.fromEntries(entries);
    }
    return value;
}

async function deserializeAssets(value, files) {
    if (value && typeof value === 'object' && value.__asset) {
        const bytes = files[value.__asset];
        if (!bytes) throw new Error(`Archive asset is missing: ${value.__asset}`);
        if (value.dataUrl) return encodeDataUrl(bytes, value.type);
        return new File([bytes], value.name || 'asset', { type: value.type });
    }

    if (Array.isArray(value)) {
        return Promise.all(value.map((item) => deserializeAssets(item, files)));
    }
    if (value && typeof value === 'object') {
        const entries = await Promise.all(
            Object.entries(value).map(async ([key, item]) => [
                key,
                await deserializeAssets(item, files),
            ]),
        );
        return Object.fromEntries(entries);
    }
    return value;
}

export async function createSpellbookArchive({
    pages,
    font,
    fontAddition = 0,
    name,
}) {
    const files = {};
    const serializedPages = await serializeAssets(pages, files);
    const serializedFont = await serializeAssets(font, files);
    const content = { pages: serializedPages, font: serializedFont, fontAddition };
    const contentHash = await sha256(new TextEncoder().encode(stableStringify(content)));
    const manifest = {
        format: ARCHIVE_FORMAT,
        version: ARCHIVE_VERSION,
        name,
        exportDate: new Date().toISOString(),
        contentHash,
        ...content,
    };

    files[MANIFEST_PATH] = [
        strToU8(JSON.stringify(manifest)),
        { level: 6 },
    ];

    const bytes = zipSync(files, { level: 6 });
    return {
        blob: new Blob([bytes], { type: 'application/vnd.spellbook+zip' }),
        contentHash,
    };
}

export async function readSpellbookArchive(file) {
    const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const manifestBytes = archive[MANIFEST_PATH];
    if (!manifestBytes) throw new Error('This file has no spellbook manifest.');

    const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
    if (manifest.format !== ARCHIVE_FORMAT || manifest.version !== ARCHIVE_VERSION) {
        throw new Error('This spellbook archive version is not supported.');
    }

    const [pages, font] = await Promise.all([
        deserializeAssets(manifest.pages, archive),
        deserializeAssets(manifest.font, archive),
    ]);

    return {
        format: ARCHIVE_FORMAT,
        name: manifest.name,
        exportDate: manifest.exportDate,
        contentHash: manifest.contentHash,
        pages,
        font,
        fontAddition: manifest.fontAddition ?? 0,
    };
}

export function isSpellbookArchiveHeader(bytes) {
    return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}