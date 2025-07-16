import { SpellbookDB } from "../utils/db";
import { useState, useEffect } from 'preact/hooks';
import '../css/spellsOverview.css';
import { spellOptions } from "../constants/spellOptions";
import { Link } from "wouter";

export default function SpellsOverview({ reorderMode = false }) {
    const [spells, setSpells] = useState([]);
    const [selectedSpell, setSelectedSpell] = useState(null);
    const [reordering, setReordering] = useState(false);

    useEffect(() => {
        loadSpells();
    }, []);

    // Reset selection when leaving reorder mode
    useEffect(() => {
        if (!reorderMode) {
            setSelectedSpell(null);
        }
    }, [reorderMode]);

    const loadSpells = async () => {
        try {
            const allSpells = await SpellbookDB.getAllSpellsSortedByPage();
            setSpells(allSpells);
        } catch (error) {
            console.error('Error loading spells:', error);
        }
    };

    const handleSpellClick = async (spell) => {
        if (!reorderMode) return;

        if (selectedSpell === null) {
            // First selection
            setSelectedSpell(spell);
        } else if (selectedSpell[spellOptions.PAGE] === spell[spellOptions.PAGE]) {
            // Deselect if clicking the same spell
            setSelectedSpell(null);
        } else {
            // Second selection - perform the swap
            setReordering(true);

            const success = await SpellbookDB.swapSpellPages(
                selectedSpell[spellOptions.PAGE],
                spell[spellOptions.PAGE]
            );

            if (success) {
                await loadSpells(); // Reload the spells with new order
            }

            setSelectedSpell(null);
            setReordering(false);
        }
    };

    const SpellItem = ({ spell, index }) => {
        const isSelected = selectedSpell && selectedSpell[spellOptions.PAGE] === spell[spellOptions.PAGE];

        const content = (
            <>
                <div className="spell-content">
                    <img
                        className='small-icon'
                        src={spell && (spell._iconObjectUrl || spell[spellOptions.ICONURL])
                            ? (spell._iconObjectUrl || spell[spellOptions.ICONURL])
                            : 'assets/img/fireball.webp'}
                        alt=""
                    />
                    <div>{spell[spellOptions.PAGE] + 1}&#41;{spell[spellOptions.NAME]}</div>
                </div>
                <div>{spell[spellOptions.LVL]}</div>
            </>
        );

        return reorderMode ? (
            <div
                key={index}
                className={`spell-item ${isSelected ? 'selected' : ''} ${reordering ? 'disabled' : ''}`}
                onClick={() => !reordering && handleSpellClick(spell)}
            >
                {content}
            </div>
        ) : (
            <Link to={`/spells?page=${spell[spellOptions.PAGE]}`} key={index} className="spell-item">
                {content}
            </Link>
        );
    };

    return (
        <div className={`spells-overview ${reorderMode ? 'reorder-mode' : ''}`}>
            {reorderMode && (
                <div className="reorder-instructions">Reorder</div>
            )}

            {spells.map((spell, index) => (
                <SpellItem spell={spell} index={index} key={index} />
            ))}

            <div className='spells-overview-after' />
        </div>
    );
}