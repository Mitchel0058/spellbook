import { PageDB } from '../utils/db.js';
import { createSpellbookArchive, readSpellbookArchive } from '../lib/spellbookArchive.js';
import {
    CloudAuthRequiredError,
    connectCloudProvider,
    downloadCloudFile,
    findCloudFile,
    initializeCloudAuth,
    uploadCloudFile,
} from '../lib/cloudProviders.js';

function cloudFileName(spellbookName) {
    const safeName = spellbookName
        .normalize('NFKC')
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100);
    return `${safeName || 'Spellbook'}.spellbook`;
}

class CloudSyncController {
    status = $state('idle');
    message = $state('');
    isSyncing = $state(false);
    pendingSync = false;
    debounceTimer = null;
    openedBook = null;

    async initialize() {
        try {
            const completedSignIn = await initializeCloudAuth();
            if (completedSignIn) {
                await this.syncCurrentBook();
            }
        } catch (error) {
            this.setError(error);
        }
    }

    async connect(provider) {
        await connectCloudProvider(provider);
        this.status = 'connected';
        this.message = `Connected to ${provider}.`;
    }

    async syncOnOpen() {
        const name = PageDB.activeDBName;
        if (!name || this.openedBook === name) return;
        this.openedBook = name;
        const config = await PageDB.getSyncState();
        if (config.enabled) await this.syncCurrentBook();
    }

    notifyLocalChange(dbName) {
        if (dbName && dbName !== PageDB.activeDBName) return;
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(async () => {
            const config = await PageDB.getSyncState();
            if (config.enabled) await this.syncCurrentBook();
        }, 900);
    }

    async syncCurrentBook({ force = false } = {}) {
        if (this.isSyncing) {
            this.pendingSync = true;
            return;
        }

        const config = await PageDB.getSyncState();
        if (!config.enabled && !force) {
            this.status = 'idle';
            this.message = 'Sync is off for this spellbook.';
            return;
        }

        this.isSyncing = true;
        this.status = 'syncing';
        this.message = 'Checking cloud version…';

        try {
            const provider = config.provider;
            const name = cloudFileName(PageDB.activeDBName || 'Spellbook');
            const snapshot = await PageDB.getSpellbookSnapshot();
            const localArchive = await createSpellbookArchive(snapshot);
            const localHash = localArchive.contentHash;
            const state = config;

            let remoteFile = await findCloudFile(
                provider,
                state.remoteFileId,
                state.cloudFileName || name,
            );

            if (!remoteFile) {
                remoteFile = await this.uploadLocal(
                    provider,
                    null,
                    name,
                    localArchive,
                    state,
                );
                return;
            }

            let remoteHash = remoteFile.contentHash;
            let remoteData = null;
            if (!remoteHash && state.remoteRevision === remoteFile.revision) {
                remoteHash = state.baselineRemoteHash;
            }
            if (!remoteHash) {
                remoteData = await readSpellbookArchive(
                    await downloadCloudFile(provider, remoteFile),
                );
                remoteHash = remoteData.contentHash;
            }

            if (localHash === remoteHash) {
                await this.saveBaseline(state, remoteFile, name, localHash, remoteHash);
                this.status = 'synced';
                this.message = 'This spellbook is up to date.';
                return;
            }

            if (state.baselineLocalHash && localHash === state.baselineLocalHash) {
                remoteData ??= await readSpellbookArchive(
                    await downloadCloudFile(provider, remoteFile),
                );
                await this.pullRemote(state, remoteFile, name, remoteData);
                return;
            }

            if (state.baselineRemoteHash && remoteHash === state.baselineRemoteHash) {
                await this.uploadLocal(provider, remoteFile, name, localArchive, state);
                return;
            }

            const keepRemote = window.confirm(
                `This spellbook changed both on this device and in ${provider}.\n\n` +
                    'Choose OK to keep the cloud version on this device. Choose Cancel to keep this device version and replace the cloud copy.',
            );
            if (keepRemote) {
                remoteData ??= await readSpellbookArchive(
                    await downloadCloudFile(provider, remoteFile),
                );
                await this.pullRemote(state, remoteFile, name, remoteData);
            } else {
                await this.uploadLocal(provider, remoteFile, name, localArchive, state);
            }
        } catch (error) {
            this.setError(error);
        } finally {
            this.isSyncing = false;
            if (this.pendingSync) {
                this.pendingSync = false;
                this.notifyLocalChange(PageDB.activeDBName);
            }
        }
    }

    async uploadLocal(provider, remoteFile, name, archive, state) {
        const updatedFile = await uploadCloudFile(
            provider,
            remoteFile,
            name,
            archive.blob,
            archive.contentHash,
        );
        await this.saveBaseline(
            state,
            updatedFile,
            remoteFile?.name || name,
            archive.contentHash,
            archive.contentHash,
        );
        this.status = 'synced';
        this.message = 'Spellbook backed up to the cloud.';
        return updatedFile;
    }

    async pullRemote(state, remoteFile, name, remoteData) {
        await PageDB.replaceSpellbookContents(remoteData);
        await this.saveBaseline(
            state,
            remoteFile,
            remoteFile.name || name,
            remoteData.contentHash,
            remoteData.contentHash,
        );
        window.dispatchEvent(new CustomEvent('spellbook-cloud-pulled'));
        this.status = 'synced';
        this.message = 'Cloud version restored on this device.';
    }

    async saveBaseline(state, remoteFile, name, localHash, remoteHash) {
        await PageDB.saveSyncState({
            ...state,
            remoteFileId: remoteFile.id,
            cloudFileName: name,
            remoteRevision: remoteFile.revision,
            baselineLocalHash: localHash,
            baselineRemoteHash: remoteHash,
        });
    }

    setError(error) {
        this.status = error instanceof CloudAuthRequiredError ? 'reauthorize' : 'error';
        this.message = error?.message || 'Cloud sync failed.';
        console.error('Cloud sync failed:', error);
    }
}

export const cloudSync = new CloudSyncController();