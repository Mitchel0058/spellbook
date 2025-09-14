import { useState, useEffect } from 'preact/hooks';
import '../css/settings.css';
import Page from './Page';
import { PageType } from '../constants/pageTypes';
import { useSettings } from '../context/SettingsContext';
import { settingsOptions } from '../constants/settingsOptions';
import { Link } from 'wouter';
import { SpellbookDB } from '../utils/db';

export default function Settings() {
    const [isDoublePage, setIsDoublePage] = useState(window.innerWidth > window.innerHeight);
    const { settings, updateSetting } = useSettings();
    const [newSpellbookName, setNewSpellbookName] = useState('');
    const [spellbookName, setSpellbookName] = useState(settings[settingsOptions.CURRENT_SPELLBOOK_DB]);
    const [fontAddition, setFontAddition] = useState(settings[settingsOptions.FONTADDITION] || 0);
    const [spellbookList, setSpellbookList] = useState(settings[settingsOptions.SPELLBOOK_LIST] || []);
    const [needsRefresh, setNeedsRefresh] = useState(false);

    const refreshData = async () => {
        const list = await SpellbookDB.listAllSpellbooks();
        await updateSetting(settingsOptions.SPELLBOOK_LIST, list);
        const currentBook = await SpellbookDB.getCurrentSpellbookName();
        await updateSetting(settingsOptions.CURRENT_SPELLBOOK_DB, currentBook);
        setNeedsRefresh(false);
    };

    useEffect(() => {
        refreshData();
    }, [needsRefresh]);

    useEffect(() => {
        setSpellbookName(settings[settingsOptions.CURRENT_SPELLBOOK_DB]);
        setFontAddition(settings[settingsOptions.FONTADDITION] || 0);
        setSpellbookList(settings[settingsOptions.SPELLBOOK_LIST] || []);
    }, [settings]);

    // Double page detection based on window size
    useEffect(() => {
        const handleResize = () => {
            setIsDoublePage(window.innerWidth > window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleExportSpellbook = async () => {
        try {
            const data = await SpellbookDB.exportSpellbookData();
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${settings[settingsOptions.CURRENT_SPELLBOOK_DB]}.json.spellbook`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    const [importData, setImportData] = useState(null);
    const [importFile, setImportFile] = useState(null);

    const handleImportSpellbookSelect = async (event) => {
        try {
            const file = event.target.files[0];
            if (!file) return;
            setImportFile(file);

            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = JSON.parse(e.target.result);
                setImportData(data);
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('Import failed:', error);
            setImportData(null);
            setImportFile(null);
        }
    };

    const handleImportConfirm = async () => {
        try {
            if (!importData) return;

            // Generate unique name for the imported spellbook
            const uniqueName = await SpellbookDB.generateUniqueSpellbookName(importData.name || 'Imported Spellbook');

            // Create new spellbook and import data
            await SpellbookDB.createNewSpellbook(uniqueName);
            await SpellbookDB.importSpellbookData(importData);

            // Clear import state
            setImportData(null);
            setImportFile(null);
            setNeedsRefresh(true);
        } catch (error) {
            console.error('Import failed:', error);
        }
    };

    const handleSpellbookNameChange = async () => {
        try {
            const currentName = settings[settingsOptions.CURRENT_SPELLBOOK_DB];
            if (currentName !== spellbookName) {
                await SpellbookDB.renameSpellbook(currentName, spellbookName);
                setNeedsRefresh(true);
            }
        } catch (error) {
            console.error('Failed to change spellbook name:', error);
        }
    };

    const [currentFont, setCurrentFont] = useState(null);

    useEffect(() => {
        const loadFont = async () => {
            const fontData = await SpellbookDB.getFont();
            setCurrentFont(fontData);
        };
        loadFont();
    }, []);

    const handleFontUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const fontData = {
                    data: e.target.result,
                    name: file.name
                };
                await SpellbookDB.saveFont(fontData);
                setCurrentFont(fontData);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Failed to upload font:', error);
        }
    };

    const handleRemoveFont = async () => {
        try {
            await SpellbookDB.removeFont();
            setCurrentFont(null);
        } catch (error) {
            console.error('Failed to remove font:', error);
        }
    };

    const handleCreateNewSpellbook = async () => {
        if (!newSpellbookName) return;
        try {
            await SpellbookDB.createNewSpellbook(newSpellbookName);
            await updateSetting(settingsOptions.CURRENT_SPELLBOOK_DB, newSpellbookName);
            setNewSpellbookName('');
            setNeedsRefresh(true);
        } catch (error) {
            console.error('Failed to create new spellbook:', error);
        }
    };

    const handleFontAdditionChange = async (value) => {
        const newValue = parseInt(value) || 0;
        setFontAddition(newValue);
        await updateSetting(settingsOptions.FONTADDITION, newValue);
    };

    const handleAnimationToggle = async (checked) => {
        await updateSetting(settingsOptions.ANIMATION, checked);
    };

    const handlePageFitToggle = async (checked) => {
        await updateSetting(settingsOptions.PAGEFIT, checked);
    };

    const handleDeleteSpellbook = async (name) => {
        if (window.confirm(`Are you sure you want to delete the spellbook "${name}"?`)) {
            try {
                await SpellbookDB.deleteSpellbook(name);
                setNeedsRefresh(true);
            } catch (error) {
                console.error('Failed to delete spellbook:', error);
            }
        }
    };

    return (
        <>
            <Page pageType={PageType.TITLE}>
                <div className='text-overlay' id="title">
                    Settings
                </div>
                <div className='settings__container'>
                    <div>Spellbook Settings</div>
                    {/* Settings for the currently selected spellbook */}
                    <div>
                        <button onClick={handleExportSpellbook}>Export Spellbook</button>
                        <input
                            type="file"
                            accept=".spellbook,.json"
                            onChange={handleImportSpellbookSelect}
                        />
                        {importData && (
                            <div>
                                <p>Import "{importData.name || 'Unnamed Spellbook'}"?</p>
                                <button onClick={handleImportConfirm}>Confirm Import</button>
                                <button onClick={() => {
                                    setImportData(null);
                                    setImportFile(null);
                                }}>Cancel</button>
                            </div>
                        )}
                    </div>
                    <label>
                        Name
                        <input
                            type='text'
                            value={spellbookName}
                            onChange={(e) => setSpellbookName(e.target.value)}
                        />
                        <button className='interact' onClick={handleSpellbookNameChange}>Change</button>
                    </label>
                    <label>
                        Spellbook Font
                        <input
                            type='file'
                            accept=".ttf,.otf,.woff,.woff2"
                            onChange={handleFontUpload}
                        />
                        <button className='interact' onClick={handleRemoveFont}>X</button>
                    </label>
                    <div>Change Spellbook
                        <div>
                            <div><i>Current: {settings[settingsOptions.CURRENT_SPELLBOOK_DB]}</i></div>
                            {settings[settingsOptions.SPELLBOOK_LIST]?.filter(name =>
                                name !== settings[settingsOptions.CURRENT_SPELLBOOK_DB]
                            ).map((name) => (
                                <div key={name}>
                                    <button onClick={async () => {
                                        await SpellbookDB.switchSpellbook(name);
                                        setNeedsRefresh(true);
                                    }}>
                                        {name}
                                    </button>
                                    <button
                                        className="interact"
                                        onClick={() => handleDeleteSpellbook(name)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <label>
                        Create new spellbook
                        <input
                            type='text'
                            value={newSpellbookName}
                            onChange={(e) => setNewSpellbookName(e.target.value)}
                        />
                        <button className='interact' onClick={handleCreateNewSpellbook}>Create</button>
                    </label>

                    <div>General Settings</div>
                    <label>
                        Fontsize:
                        <input
                            type='number'
                            value={fontAddition}
                            onChange={(e) => handleFontAdditionChange(e.target.value)}
                        />
                    </label>
                    <label>
                        Animation:
                        <input
                            type='checkbox'
                            checked={settings[settingsOptions.ANIMATION]}
                            onChange={(e) => handleAnimationToggle(e.target.checked)}
                        />
                    </label>
                    <label>
                        Page Fit:
                        <input
                            type='checkbox'
                            checked={settings[settingsOptions.PAGEFIT]}
                            onChange={(e) => handlePageFitToggle(e.target.checked)}
                        />
                    </label>
                    <div className='settings__container-after'></div>
                </div>
                <Link to='/' className='interact settings__home-button' />
                <button className='interact settings__font-button'></button>
                <button className='interact settings__edit-button'></button>
            </Page>

            {isDoublePage &&
                <Page pageType={PageType.SPELLRIGHT}>
                </Page>
            }
        </>
        // <div className="container">
        //     {/* Page 1 */}
        //     <div className="svg-overlay page-1">
        //         <img className="page-img" src="assets/imgs/spellbook_cover.svg" alt="First page of DnD book" />
        //         <button className="interact" id="p1-next" onClick={nextPage}></button>

        //         {/* Nav */}
        //         <Link href="/settings">
        //             <button className="interact settings"></button>
        //         </Link>
        //         <Link href="/">
        //             <button className="interact home"></button>
        //         </Link>
        //         <button className="interact font" onClick={toggleFont}></button>

        //         <div className="settingsBlock">
        //             <div>
        //                 <button
        //                     className="settings-input"
        //                     type="number"
        //                     id="exportDB"
        //                     onClick={exportSpellPageDB}
        //                 >
        //                     Export spellbook
        //                 </button>
        //                 <input
        //                     className="settings-input"
        //                     type="file"
        //                     id="fileInput"
        //                     accept=".json"
        //                     onChange={(e) => importSpellPageDB(e.target.files[0])}
        //                 />
        //             </div>
        //             <label htmlFor="font_addition">
        //                 Font Addition:
        //                 <input
        //                     className="settings-input"
        //                     type="number"
        //                     id="font_addition"
        //                     value={fontAddition}
        //                     onChange={(e) => updateFontAddition(e.target.value)}
        //                 />
        //             </label>
        //             <label htmlFor="page_fit">
        //                 Page Fit:
        //                 <input
        //                     className="settings-input"
        //                     type="checkbox"
        //                     id="page_fit"
        //                     checked={pageFit}
        //                     onChange={(e) => updatePageFit(e.target.checked)}
        //                 />
        //             </label>
        //             <label htmlFor="animation">
        //                 Animation:
        //                 <input
        //                     className="settings-input"
        //                     type="checkbox"
        //                     id="animation"
        //                     checked={animation}
        //                     onChange={(e) => updateAnimation(e.target.checked)}
        //                 />
        //             </label>
        //             <label htmlFor="local_font">
        //                 Local Font:
        //                 <input
        //                     className="settings-input"
        //                     type="file"
        //                     id="local_font"
        //                     accept=".ttf,.otf,.woff,.woff2"
        //                     onChange={(e) => updateLocalFont(e.target.files[0])}
        //                 />
        //                 <button className="remove-font-button" onClick={removeLocalFont}>X</button>
        //             </label>
        //             <label htmlFor="current_spellbook_db">Select Spellbook DB:</label>
        //         </div>
        //     </div>

        //     {/* Page 2 */}
        //     <div className="svg-overlay page-2">
        //         <img className="page-img" src="assets/imgs/spellbook_cover_right_page.svg" alt="Second page of DnD book" />
        //         <button className="interact" id="p2-previous" onClick={previousPage}></button>
        //     </div>
        // </div>
    );
}
