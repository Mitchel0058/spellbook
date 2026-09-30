import { PublicClientApplication } from '@azure/msal-browser';

const providerConfig = {
    dropbox: {
        label: 'Dropbox',
        clientId: import.meta.env.VITE_DROPBOX_APP_KEY,
    },
    google: {
        label: 'Google Drive',
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    },
    onedrive: {
        label: 'OneDrive',
        clientId: import.meta.env.VITE_ONEDRIVE_CLIENT_ID,
    },
};

const tokenKey = (provider) => `spellbook-cloud-token:${provider}`;
const redirectUri = () => `${window.location.origin}${window.location.pathname}`;
let googleTokenClient;
let msalClientPromise;

export class CloudAuthRequiredError extends Error {
    constructor(provider) {
        super(`Reconnect to ${providerConfig[provider].label} to sync.`);
        this.name = 'CloudAuthRequiredError';
        this.code = 'CLOUD_AUTH_REQUIRED';
    }
}

function requireClientId(provider) {
    const config = providerConfig[provider];
    if (!config?.clientId) {
        throw new Error(`${config?.label ?? provider} is not configured yet.`);
    }
    return config.clientId;
}

function readToken(provider) {
    try {
        const token = JSON.parse(sessionStorage.getItem(tokenKey(provider)));
        return token?.expiresAt > Date.now() + 30000 ? token.accessToken : null;
    } catch {
        return null;
    }
}

function saveToken(provider, response) {
    const expiresIn = Number(response.expires_in ?? response.expiresIn ?? 3600);
    sessionStorage.setItem(
        tokenKey(provider),
        JSON.stringify({
            accessToken: response.access_token ?? response.accessToken,
            expiresAt: Date.now() + expiresIn * 1000,
        }),
    );
}

function randomVerifier() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...bytes))
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '');
}

function base64Url(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)))
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '');
}

async function connectDropbox() {
    const clientId = requireClientId('dropbox');
    const verifier = randomVerifier();
    const challenge = base64Url(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)),
    );
    const state = randomVerifier();
    sessionStorage.setItem(
        'spellbook-dropbox-oauth',
        JSON.stringify({ verifier, state }),
    );

    const query = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri(),
        response_type: 'code',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        token_access_type: 'online',
        state,
    });
    window.location.assign(`https://www.dropbox.com/oauth2/authorize?${query}`);
}

async function completeDropboxRedirect() {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    if (!code || !returnedState) return false;

    const savedValue = sessionStorage.getItem('spellbook-dropbox-oauth');
    if (!savedValue) return false;
    const saved = JSON.parse(savedValue);
    if (!saved || saved.state !== returnedState) {
        throw new Error('Dropbox sign-in could not be verified. Please reconnect.');
    }

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            client_id: requireClientId('dropbox'),
            redirect_uri: redirectUri(),
            code_verifier: saved.verifier,
        }),
    });
    if (!response.ok) throw new Error('Dropbox sign-in failed. Please try again.');

    saveToken('dropbox', await response.json());
    sessionStorage.removeItem('spellbook-dropbox-oauth');
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    return true;
}

function loadGoogleIdentity() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-google-identity]');
        if (existing) {
            existing.addEventListener('load', resolve, { once: true });
            existing.addEventListener('error', reject, { once: true });
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = 'true';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Could not load Google sign-in.'));
        document.head.appendChild(script);
    });
}

async function connectGoogle() {
    const clientId = requireClientId('google');
    await loadGoogleIdentity();
    return new Promise((resolve, reject) => {
        googleTokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.appdata',
            callback: (response) => {
                if (response.error) {
                    reject(new Error(response.error_description || response.error));
                    return;
                }
                saveToken('google', response);
                resolve();
            },
        });
        googleTokenClient.requestAccessToken();
    });
}

function getMsalClient() {
    if (!msalClientPromise) {
        const clientId = requireClientId('onedrive');
        msalClientPromise = new PublicClientApplication({
            auth: {
                clientId,
                authority: 'https://login.microsoftonline.com/common',
                redirectUri: redirectUri(),
            },
            cache: { cacheLocation: 'sessionStorage' },
        }).then(async (client) => {
            await client.initialize();
            await client.handleRedirectPromise();
            return client;
        });
    }
    return msalClientPromise;
}

export function getCloudProviders() {
    return Object.entries(providerConfig).map(([id, provider]) => ({
        id,
        label: provider.label,
        configured: Boolean(provider.clientId),
    }));
}

export async function initializeCloudAuth() {
    return completeDropboxRedirect();
}

export async function connectCloudProvider(provider) {
    if (provider === 'dropbox') return connectDropbox();
    if (provider === 'google') return connectGoogle();
    if (provider === 'onedrive') {
        requireClientId(provider);
        const client = await getMsalClient();
        const login = await client.loginPopup({
            scopes: ['Files.ReadWrite.AppFolder'],
        });
        if (login.account) client.setActiveAccount(login.account);
        return;
    }
    throw new Error('Unknown cloud storage provider.');
}

async function getAccessToken(provider) {
    const sessionToken = readToken(provider);
    if (sessionToken) return sessionToken;

    if (provider === 'onedrive') {
        requireClientId(provider);
        const client = await getMsalClient();
        const account = client.getActiveAccount() ?? client.getAllAccounts()[0];
        if (account) {
            try {
                const result = await client.acquireTokenSilent({
                    account,
                    scopes: ['Files.ReadWrite.AppFolder'],
                });
                return result.accessToken;
            } catch {
                throw new CloudAuthRequiredError(provider);
            }
        }
    }

    throw new CloudAuthRequiredError(provider);
}

async function authorizedFetch(provider, url, options = {}) {
    const token = await getAccessToken(provider);
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
        sessionStorage.removeItem(tokenKey(provider));
        throw new CloudAuthRequiredError(provider);
    }
    return response;
}

function dropboxError(response) {
    return response.text().then((text) => {
        if (response.status === 409 && text.includes('path/not_found')) return null;
        throw new Error(`Dropbox request failed (${response.status}).`);
    });
}

async function dropboxMetadata(fileId, name) {
    const response = await authorizedFetch(
        'dropbox',
        'https://api.dropboxapi.com/2/files/get_metadata',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: fileId || `/${name}` }),
        },
    );
    if (!response.ok) return dropboxError(response);
    const item = await response.json();
    return {
        id: item.id,
        name: item.name,
        path: item.path_display,
        revision: item.rev,
    };
}

function googleQuery(name) {
    return `name = '${name.replaceAll("'", "\\'")}' and trashed = false`;
}

async function googleMetadata(fileId, name) {
    const params = new URLSearchParams({
        fields: 'id,name,version,md5Checksum,appProperties',
    });
    const url = fileId
        ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params}`
        : `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(googleQuery(name))}&${params}`;
    const response = await authorizedFetch('google', url);
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Google Drive request failed (${response.status}).`);
    }
    const result = await response.json();
    const item = fileId ? result : result.files?.[0];
    return item
        ? {
              id: item.id,
              name: item.name,
              revision: item.version,
              contentHash: item.appProperties?.spellbookContentHash,
          }
        : null;
}

async function onedriveMetadata(fileId, name) {
    const url = fileId
        ? `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(fileId)}?$select=id,name,eTag,cTag`
        : 'https://graph.microsoft.com/v1.0/me/drive/special/approot/children?$select=id,name,eTag,cTag';
    const response = await authorizedFetch('onedrive', url);
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`OneDrive request failed (${response.status}).`);
    }
    const result = await response.json();
    const item = fileId ? result : result.value?.find((entry) => entry.name === name);
    return item
        ? { id: item.id, name: item.name, revision: item.cTag || item.eTag }
        : null;
}

export async function findCloudFile(provider, fileId, name) {
    if (provider === 'dropbox') return dropboxMetadata(fileId, name);
    if (provider === 'google') return googleMetadata(fileId, name);
    if (provider === 'onedrive') return onedriveMetadata(fileId, name);
    throw new Error('Unknown cloud storage provider.');
}

export async function downloadCloudFile(provider, file) {
    let response;
    if (provider === 'dropbox') {
        response = await authorizedFetch(
            provider,
            'https://content.dropboxapi.com/2/files/download',
            { headers: { 'Dropbox-API-Arg': JSON.stringify({ path: file.id }) } },
        );
    } else if (provider === 'google') {
        response = await authorizedFetch(
            provider,
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`,
        );
    } else {
        response = await authorizedFetch(
            provider,
            `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(file.id)}/content`,
        );
    }
    if (!response.ok) throw new Error(`Cloud download failed (${response.status}).`);
    return response.blob();
}

function googleMultipart(metadata, archive) {
    const boundary = `spellbook_${crypto.randomUUID().replaceAll('-', '')}`;
    const body = new Blob([
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
        `--${boundary}\r\nContent-Type: application/vnd.spellbook+zip\r\n\r\n`,
        archive,
        `\r\n--${boundary}--`,
    ]);
    return { boundary, body };
}

export async function uploadCloudFile(provider, file, name, archive, contentHash) {
    if (provider === 'dropbox') {
        const mode = file?.id
            ? { '.tag': 'update', update: file.revision }
            : { '.tag': 'add' };
        const response = await authorizedFetch(
            provider,
            'https://content.dropboxapi.com/2/files/upload',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Dropbox-API-Arg': JSON.stringify({
                        path: file?.path || `/${name}`,
                        mode,
                        autorename: false,
                        mute: true,
                    }),
                },
                body: archive,
            },
        );
        if (!response.ok) {
            if (response.status === 409) {
                throw new Error('Cloud file changed during upload. Sync again to resolve it.');
            }
            throw new Error(`Dropbox upload failed (${response.status}).`);
        }
        const item = await response.json();
        return {
            id: item.id,
            name: item.name,
            path: item.path_display,
            revision: item.rev,
        };
    }

    if (provider === 'google') {
        const metadata = {
            name,
            mimeType: 'application/vnd.spellbook+zip',
            appProperties: { spellbookContentHash: contentHash },
            ...(file?.id ? {} : { parents: ['appDataFolder'] }),
        };
        const { boundary, body } = googleMultipart(metadata, archive);
        const url = new URL(
            file?.id
                ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(file.id)}`
                : 'https://www.googleapis.com/upload/drive/v3/files',
        );
        url.searchParams.set('uploadType', 'multipart');
        url.searchParams.set('fields', 'id,name,version,appProperties');
        const response = await authorizedFetch(provider, url, {
            method: file?.id ? 'PATCH' : 'POST',
            headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
            body,
        });
        if (!response.ok) throw new Error(`Google Drive upload failed (${response.status}).`);
        const item = await response.json();
        return {
            id: item.id,
            name: item.name,
            revision: item.version,
            contentHash: item.appProperties?.spellbookContentHash,
        };
    }

    if (provider === 'onedrive') {
        const path = encodeURIComponent(name);
        const url = file?.id
            ? `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(file.id)}/content`
            : `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${path}:/content`;
        const response = await authorizedFetch(provider, url, {
            method: 'PUT',
            headers: file?.revision ? { 'If-Match': file.revision } : {},
            body: archive,
        });
        if (response.status === 412) {
            throw new Error('Cloud file changed during upload. Sync again to resolve it.');
        }
        if (!response.ok) throw new Error(`OneDrive upload failed (${response.status}).`);
        const item = await response.json();
        return { id: item.id, name: item.name, revision: item.cTag || item.eTag };
    }

    throw new Error('Unknown cloud storage provider.');
}

export function clearCloudSession(provider) {
    sessionStorage.removeItem(tokenKey(provider));
}