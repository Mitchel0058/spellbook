import { useState, useEffect } from 'preact/hooks';
import '../css/index.css';
import '../css/settings.css';

export default function Settings() {
    const [fontAddition, setFontAddition] = useState(0);
    const [pageFit, setPageFit] = useState(false);
    const [animation, setAnimation] = useState(true);

    const nextPage = () => {
        // Implementation for next page
    };

    const previousPage = () => {
        // Implementation for previous page
    };

    const toggleFont = () => {
        // Implementation for font toggle
    };

    const exportSpellPageDB = () => {
        // Implementation for export
    };

    const importSpellPageDB = (file) => {
        // Implementation for import
    };

    const updateFontAddition = (value) => {
        setFontAddition(value);
        // Additional logic for font addition
    };

    const updatePageFit = (checked) => {
        setPageFit(checked);
        // Additional logic for page fit
    };

    const updateAnimation = (checked) => {
        setAnimation(checked);
        // Additional logic for animation
    };

    const updateLocalFont = (file) => {
        // Implementation for local font update
    };

    const removeLocalFont = () => {
        // Implementation for removing local font
    };

    return (
        <div className="container">
            {/* Page 1 */}
            <div className="svg-overlay page-1">
                <img className="page-img" src="assets/imgs/spellbook_cover.svg" alt="First page of DnD book" />
                <button className="interact" id="p1-next" onClick={nextPage}></button>

                {/* Nav */}
                <Link href="/settings">
                    <button className="interact settings"></button>
                </Link>
                <Link href="/">
                    <button className="interact home"></button>
                </Link>
                <button className="interact font" onClick={toggleFont}></button>

                <div className="settingsBlock">
                    <div>
                        <button
                            className="settings-input"
                            type="number"
                            id="exportDB"
                            onClick={exportSpellPageDB}
                        >
                            Export spellbook
                        </button>
                        <input
                            className="settings-input"
                            type="file"
                            id="fileInput"
                            accept=".json"
                            onChange={(e) => importSpellPageDB(e.target.files[0])}
                        />
                    </div>
                    <label htmlFor="font_addition">
                        Font Addition:
                        <input
                            className="settings-input"
                            type="number"
                            id="font_addition"
                            value={fontAddition}
                            onChange={(e) => updateFontAddition(e.target.value)}
                        />
                    </label>
                    <label htmlFor="page_fit">
                        Page Fit:
                        <input
                            className="settings-input"
                            type="checkbox"
                            id="page_fit"
                            checked={pageFit}
                            onChange={(e) => updatePageFit(e.target.checked)}
                        />
                    </label>
                    <label htmlFor="animation">
                        Animation:
                        <input
                            className="settings-input"
                            type="checkbox"
                            id="animation"
                            checked={animation}
                            onChange={(e) => updateAnimation(e.target.checked)}
                        />
                    </label>
                    <label htmlFor="local_font">
                        Local Font:
                        <input
                            className="settings-input"
                            type="file"
                            id="local_font"
                            accept=".ttf,.otf,.woff,.woff2"
                            onChange={(e) => updateLocalFont(e.target.files[0])}
                        />
                        <button className="remove-font-button" onClick={removeLocalFont}>X</button>
                    </label>
                    <label htmlFor="current_spellbook_db">Select Spellbook DB:</label>
                </div>
            </div>

            {/* Page 2 */}
            <div className="svg-overlay page-2">
                <img className="page-img" src="assets/imgs/spellbook_cover_right_page.svg" alt="Second page of DnD book" />
                <button className="interact" id="p2-previous" onClick={previousPage}></button>
            </div>
        </div>
    );
}
