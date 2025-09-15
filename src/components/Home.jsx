import { useState, useEffect } from 'preact/hooks';
import '../css/home.css';
import Page from './Page';
import { PageType } from '../constants/pageTypes';
import { useSettings } from '../context/SettingsContext';
import { settingsOptions } from '../constants/settingsOptions';
import SpellsOverview from './SpellsOverview';
import { Link } from 'wouter';

export default function Home() {
    const [loading, setLoading] = useState(true);
    const [isDoublePage, setIsDoublePage] = useState(window.innerWidth > window.innerHeight);
    const [reorderMode, setReorderMode] = useState(false);
    const { settings, loading: settingsLoading } = useSettings();

    // Double page detection based on window size
    useEffect(() => {
        const handleResize = () => {
            setIsDoublePage(window.innerWidth > window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Combined loading effect that waits for both timeout and settings
    useEffect(() => {
        let timeoutPassed = false;
        let settingsLoaded = false;

        // Timer for simulated loading
        const timer = setTimeout(() => {
            timeoutPassed = true;
            if (settingsLoaded) setLoading(false);
        }, 500);

        // Check when settings are loaded
        if (!settingsLoading) {
            settingsLoaded = true;
            if (timeoutPassed) setLoading(false);
        }

        return () => clearTimeout(timer);
    }, [settings, settingsLoading]);

    const toggleReorderMode = () => {
        setReorderMode(prev => !prev);
    };

    return (
        <>
            {loading ? (
                <div className="svg-overlay">
                    <img className="page-img" src={"assets/img/spellbook_cover.svg"} alt="Cover of DnD book" />
                </div>
            ) : (
                <>
                    <Page pageType={PageType.TITLE}>
                        <div className='text-overlay' id="title">
                            {settings[settingsOptions.CURRENT_SPELLBOOK_DB]}
                        </div>
                        <SpellsOverview reorderMode={reorderMode} />
                        {!isDoublePage && (
                            <Link to="/spells" className="interact next-page"></Link>
                        )}
                        <button class="interact home__edit-button" onClick={toggleReorderMode} />
                        <Link to='/settings' class="interact home__settings-button" />
                    </Page >

                    {/* Page 2 */}
                    {isDoublePage && (
                        <Page pageType={PageType.SPELLRIGHT}>
                            {isDoublePage && (
                                <Link to="/spells" className="interact next-page"></Link>
                            )}
                        </Page>
                    )}

                    {/* 
                        <script src="spell.js"></script>
                        <script src="js/settings.js"></script>
                        <script src="js/index.js"></script> 
                    */}
                </>
            )}
        </>
    );
}