import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { PageType } from "../constants/pageTypes";
import Page from "./Page";
import '../css/spells.css';
import { Link } from 'wouter';
import { useSettings } from '../context/SettingsContext';
import { settingsOptions } from '../constants/settingsOptions';

export default function Notes() {
    const [loading, setLoading] = useState(true);
    const [isDoublePage, setIsDoublePage] = useState(window.innerWidth > window.innerHeight);
    const [editMode, setEditMode] = useState(false);
    const { settings, loading: settingsLoading } = useSettings();

    // Double page detection based on window size
    useEffect(() => {
        const handleResize = () => {
            setIsDoublePage(window.innerWidth > window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <>
            <Page pageType={PageType.TITLE} onEditClick={() => setEditMode(prev => !prev)} >
                {!isDoublePage && (
                    <button className="interact next-page"></button>
                )}
                <button className="interact square-button note__pageType-button" onClick={() => {}} />
            </Page >

            {/* Page 2 */}
            {isDoublePage && (
                <Page pageType={PageType.SPELL_RIGHT}>
                    {isDoublePage && (
                        <button className="interact next-page"></button>
                    )}
                </Page>
            )}
        </>
    );
}