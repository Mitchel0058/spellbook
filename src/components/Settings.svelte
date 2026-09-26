<script>
    import { getSettingsContext } from "../context/settings.svelte.js";
    import { settingsOptions } from "../constants/settingsOptions";
    import { PageDB } from "../utils/db";

    const settings = getSettingsContext();

    let newSpellbookName = $state("");
    let spellbookName = $state(
        settings.values[settingsOptions.CURRENT_SPELLBOOK_DB],
    );
    let fontAddition = $state(
        settings.values[settingsOptions.FONTADDITION] || 0,
    );
    let importData = $state(null);
    let importFile = $state(null);
    let currentFont = $state(null);

    // Keep local editable fields in sync whenever settings change elsewhere
    $effect(() => {
        spellbookName = settings.values[settingsOptions.CURRENT_SPELLBOOK_DB];
        fontAddition = settings.values[settingsOptions.FONTADDITION] || 0;
    });

    // Double page detection
    // $effect(() => {
    //     const handleResize = () => {
    //         isDoublePage = window.innerWidth > window.innerHeight;
    //     };
    //     window.addEventListener("resize", handleResize);
    //     return () => window.removeEventListener("resize", handleResize);
    // });

    // Load current font once on mount
    $effect(() => {
        (async () => {
            currentFont = await PageDB.getFont();
        })();
    });

    async function refreshData() {
        const list = await PageDB.listAllSpellbooks();
        await settings.set(settingsOptions.SPELLBOOK_LIST, list);
        const currentBook = await PageDB.getCurrentSpellbookName();
        await settings.set(settingsOptions.CURRENT_SPELLBOOK_DB, currentBook);
    }

    async function handleExportSpellbook() {
        try {
            const data = await PageDB.exportSpellbookData();
            const blob = new Blob([JSON.stringify(data)], {
                type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${settings.values[settingsOptions.CURRENT_SPELLBOOK_DB]}.json.spellbook`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed:", error);
        }
    }

    async function handleImportSpellbookSelect(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;
            importFile = file;

            const reader = new FileReader();
            reader.onload = (e) => {
                importData = JSON.parse(e.target.result);
            };
            reader.readAsText(file);
        } catch (error) {
            console.error("Import failed:", error);
            importData = null;
            importFile = null;
        }
    }

    async function handleImportConfirm() {
        try {
            if (!importData) return;

            const uniqueName = await PageDB.generateUniqueSpellbookName(
                importData.name || "Imported Spellbook",
            );

            await PageDB.createNewSpellbook(uniqueName);
            await PageDB.importSpellbookData(importData);

            importData = null;
            importFile = null;
            await refreshData();
            await settings.loadCustomFont();
            window.location.href =
                window.location.origin + window.location.pathname;
        } catch (error) {
            console.error("Import failed:", error);
        }
    }

    function handleImportCancel() {
        importData = null;
        importFile = null;
    }

    async function handleSpellbookNameChange() {
        try {
            const currentName =
                settings.values[settingsOptions.CURRENT_SPELLBOOK_DB];
            if (currentName !== spellbookName) {
                await PageDB.renameSpellbook(currentName, spellbookName);
                await refreshData();
                await settings.loadCustomFont();
            }
        } catch (error) {
            console.error("Failed to change spellbook name:", error);
        }
    }

    async function handleFontUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const fontData = {
                    data: e.target.result,
                    name: file.name,
                };
                await PageDB.saveFont(fontData);
                currentFont = fontData;
                await settings.loadCustomFont();
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Failed to upload font:", error);
        }
    }

    async function handleRemoveFont() {
        try {
            await PageDB.removeFont();
            currentFont = null;
            await settings.loadCustomFont();
        } catch (error) {
            console.error("Failed to remove font:", error);
        }
    }

    async function handleCreateNewSpellbook() {
        if (!newSpellbookName) return;
        try {
            await PageDB.createNewSpellbook(newSpellbookName);
            await settings.set(
                settingsOptions.CURRENT_SPELLBOOK_DB,
                newSpellbookName,
            );
            newSpellbookName = "";
            await refreshData();
        } catch (error) {
            console.error("Failed to create new spellbook:", error);
        }
    }

    async function handleFontAdditionChange(value) {
        const newValue = parseInt(value) || 0;
        fontAddition = newValue;
        await settings.set(settingsOptions.FONTADDITION, newValue);
        await settings.loadCustomFont();
    }

    async function handleAnimationToggle(checked) {
        await settings.set(settingsOptions.ANIMATION, checked);
    }

    async function handlePageFitToggle(checked) {
        await settings.set(settingsOptions.PAGEFIT, checked);
    }

    async function handleDeleteSpellbook(name) {
        if (
            window.confirm(
                `Are you sure you want to delete the spellbook "${name}"?`,
            )
        ) {
            try {
                await PageDB.deleteSpellbook(name);
                await refreshData();
            } catch (error) {
                console.error("Failed to delete spellbook:", error);
            }
        }
    }
</script>

<div class="text-overlay">Settings</div>
<div class="container right-page-offset scroll-fade-y">
    <div class="container-line">
        <label class="file-input-label" for="spellbookName">
            Name:
            <br />
            <input
                type="text"
                bind:value={spellbookName}
                id="spellbookName"
                class="input"
            />
        </label>
        <button class="settings-button" onclick={handleSpellbookNameChange}
            >Change</button
        >
    </div>

    <div class="container-line">
        <label class="file-input-label">
            Spellbook Font
            <input
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                onchange={handleFontUpload}
                class="file-input"
            />
        </label>
        <button class="settings-button" onclick={handleRemoveFont}>X</button>
    </div>

    <div>
        Change Spellbook
        <div>
            <div>
                Current: <i
                    >{settings.values[settingsOptions.CURRENT_SPELLBOOK_DB]}</i
                >
            </div>
            {#each (settings.values[settingsOptions.SPELLBOOK_LIST] || []).filter((name) => name !== settings.values[settingsOptions.CURRENT_SPELLBOOK_DB]) as name (name)}
                <div class="spellbook-item">
                    <button
                        class="spellbook-button"
                        onclick={async () => {
                            await PageDB.switchSpellbook(name);
                            await refreshData();
                            await settings.loadCustomFont();
                            // reload page without param
                            window.location.href =
                                window.location.origin +
                                window.location.pathname;
                        }}
                    >
                        {name}
                    </button>
                    <button
                        class="settings-button"
                        onclick={() => handleDeleteSpellbook(name)}
                    >
                        Delete
                    </button>
                </div>
            {/each}
        </div>
    </div>

    <div class="container-line">
        <label for="newSpellbookName">
            Create new spellbook
            <input
                type="text"
                id="newSpellbookName"
                bind:value={newSpellbookName}
                class="input"
            />
        </label>
        <button class="settings-button" onclick={handleCreateNewSpellbook}
            >Add</button
        >
    </div>

    <div>
        <label for="exportSpellbook">Export Spellbook</label>
        <br />
        <button
            id="exportSpellbook"
            class="settings-button"
            onclick={handleExportSpellbook}>Export</button
        >
    </div>

    <div>
        <label for="importSpellbook">Import Spellbook</label>
        <input
            type="file"
            accept=".spellbook,.json"
            id="importSpellbook"
            onchange={handleImportSpellbookSelect}
            class="file-input"
        />
        {#if importData}
            <div>
                <p>Import "{importData.name || "Unnamed Spellbook"}"?</p>
                <button onclick={handleImportConfirm}>Confirm Import</button>
                <button onclick={handleImportCancel}>Cancel</button>
            </div>
        {/if}
    </div>

    <div>
        General Settings
        <hr class="hr-break" />
    </div>

    <label>
        Global Fontsize:
        <input
            type="number"
            value={fontAddition}
            oninput={(e) => handleFontAdditionChange(e.target.value)}
            class="input"
        />
    </label>

    <label>
        Animations:
        <input
            type="checkbox"
            checked={settings.values[settingsOptions.ANIMATION]}
            onchange={(e) => handleAnimationToggle(e.target.checked)}
        />
    </label>

    <label>
        Page Fit:
        <input
            type="checkbox"
            checked={settings.values[settingsOptions.PAGEFIT]}
            onchange={(e) => handlePageFitToggle(e.target.checked)}
        />
    </label>

    <div class="container-after"></div>
</div>

<style>
    .text-overlay {
        position: absolute;
        font-size: var(--reactive-font-size);
        margin: 0;
        overflow-x: auto;
        left: calc(var(--unit-width-px) * 20);
        top: calc(var(--unit-height-px) * 8);
        font-size: calc(var(--reactive-font-size) * 2);
        white-space: nowrap;

        -ms-overflow-style: none;
        scrollbar-width: none;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    .container {
        position: absolute;
        box-sizing: border-box;
        width: calc(var(--unit-width-px) * 108);
        height: calc(var(--unit-height-px) * 140);
        left: calc(var(--unit-width-px) * 12);
        top: calc(var(--unit-height-px) * 26);
        font-size: var(--reactive-font-size);

        display: flex;
        flex-direction: column;
        gap: calc(var(--unit-height-px) * 5);
        overflow-y: auto;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .container > * {
        max-width: 100%;
        box-sizing: border-box;
        overflow-wrap: break-word;
        overflow-wrap: anywhere;
        justify-content: space-between;
    }

    .container-line {
        display: flex;
        gap: calc(var(--unit-width-px) * 2);
        justify-content: space-between;
        align-items: center;
    }

    .container-line > label {
        flex: 1 1 0;
        min-width: 0;
    }

    .input {
        box-sizing: border-box;
        border: none;
        background: #0001;
        font-size: var(--reactive-font-size);
        max-width: 100%;
    }

    .file-input-label {
        min-width: 0;
    }

    .file-input {
        display: block;
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
    }

    .file-input::file-selector-button {
        border: none;
        background: #0001;
        font-size: var(--reactive-font-size);
        border: calc(var(--unit-width-px) * 0.25) solid;
    }

    .settings-button {
        cursor: pointer;
        background: transparent;
        border: none !important;
        box-sizing: border-box;
        background-color: #0001;
        margin: 0;
        font: inherit;
        min-width: 0;
        flex-shrink: 0;
        white-space: normal;
    }

    .spellbook-item {
        display: flex;
        gap: calc(var(--unit-width-px) * 2);
        justify-content: space-between;
        margin-bottom: calc(var(--unit-height-px) * 1);
    }

    .spellbook-button {
        min-width: 0;
        cursor: pointer;
        background: transparent;
        border: none !important;
        margin-left: calc(var(--unit-width-px) * 2);
        padding: 0;
        font: inherit;
        font-style: italic;
        overflow-wrap: anywhere;
        /* text-decoration: underline; */
    }

    .hr-break {
        margin: 0;
        border-color: rgb(24, 24, 24);
        color: rgb(24, 24, 24);
        border: calc(var(--unit-width-px) * 0.25) solid;
    }
</style>
