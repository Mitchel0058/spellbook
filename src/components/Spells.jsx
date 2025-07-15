import { useState, useEffect } from 'preact/hooks';
import { PageType } from "../constants/pageTypes";
import Page from "./Page";
import { SpellbookDB } from '../utils/db';
import '../css/spells.css';

export default function Spells() {
    const [isDoublePage, setIsDoublePage] = useState(window.innerWidth > window.innerHeight);
    const [spells, setSpells] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        const loadSpells = async () => {
            try {
                // Load all spells
                const allSpells = await SpellbookDB.getAllSpells();
                setSpells(allSpells);
                setLoading(false);
                console.log('All spells:', allSpells);
            } catch (error) {
                console.error('Error loading data:', error);
                setLoading(false);
            }
        };

        loadSpells();
    }, []);

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
            <Page pageType={PageType.SPELL}>
                <div className='text-overlay spellname'>Spellname</div>
                <div className='text-overlay incant'>Incant</div>
                <div className='text-overlay speed'>Speed</div>
                <div className='text-overlay range'>Range</div>
                <div className='text-overlay type'>Type</div>
                {editMode
                    ? <textarea onInput={() => console.log('TODO')} className='description textarea' placeholder='Description'></textarea>
                    : <div className='description'>Description</div>}
                <div className='level'>17</div>
                <button className='interact settings-button'></button>
                <button className='interact home-button'></button>
                <button className='interact font-button'></button>
                <button className='interact edit-button' onClick={() => setEditMode(!editMode)}></button>
                <img className='icon' />

                {/* Spell Name */}
                {/* Spell Incant */}
                {/* Spell Speed */}
                {/* Spell Range */}
                {/* Spell Type */}
                {/* Spell Desc */}
                {/* Spell LVL */}
                {/* Spell Icon (Url & objectfit) */}
            </Page>

            {isDoublePage &&
                <Page pageType={PageType.SPELLRIGHT}> </Page>
            }
        </>
    );
}