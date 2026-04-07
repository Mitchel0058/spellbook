import { useState, useEffect } from 'preact/hooks';
import '../css/home.css';
import Page from './Page';
import { PageType } from '../constants/pageTypes';
import { useSettings } from '../context/SettingsContext';
import { settingsOptions } from '../constants/settingsOptions';
import SpellsOverview from './SpellsOverview';
import { Link } from 'wouter';
import SquareButton from './SquareButton';
import { ButtonType } from '../constants/buttonType';

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

    // Loading check
    useEffect(() => {
        // Check when settings are loaded
        if (!settingsLoading) {
            setLoading(false);
        }
    }, [settings, settingsLoading]);

    const toggleReorderMode = () => {
        setReorderMode(prev => !prev);
    };

    return (
        <>
            <Page pageType={PageType.TITLE} onEditClick={toggleReorderMode} >
                <div className='text-overlay' id="title">
                    {settings[settingsOptions.CURRENT_SPELLBOOK_DB]}
                </div>
                <SquareButton buttonType={ButtonType.HOME} isLink={true} linkTo={"/"} yPosition={21} xPosition={119} />
                <SquareButton buttonType={ButtonType.EDIT} onClick={toggleReorderMode} yPosition={31} xPosition={119} />
                <SquareButton buttonType={ButtonType.REORDER} isLink={true} linkTo={"/notes"} yPosition={41} xPosition={119} />
                <SquareButton buttonType={ButtonType.SETTINGS} isLink={true} linkTo={"/settings"} yPosition={51} xPosition={119} />
                <SpellsOverview reorderMode={reorderMode} />
                {!isDoublePage && (
                    <Link to="/spells" className="interact next-page"></Link>
                )}
            </Page >

            {/* Page 2 */}
            {isDoublePage && (
                <Page pageType={PageType.SPELL_RIGHT}>
                    {isDoublePage && (
                        <Link to="/spells" className="interact next-page"></Link>
                    )}
                </Page>
            )}
        </>
    );
}