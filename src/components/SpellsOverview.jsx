import { SpellbookDB } from "../utils/db";
import { useState, useEffect } from 'preact/hooks';

export default function SpellsOverview({ onSpellClick }) {
    const [spells, setSpells] = useState([]);

    useEffect(() => {
        const loadSpells = async () => {
            try {
                const allSpells = await SpellbookDB.getAllSpells();
                setSpells(allSpells);
            } catch (error) {
                console.error('Error loading spells:', error);
            }
        }
        loadSpells();
    }, []);

    return (
        <div className="spells-overview">
            {spells.map((spell, index) => (
                <div
                    key={index}
                    className="spell-item"
                    onClick={() => onSpellClick(spell)}
                >
                    <h3>{spell.name}</h3>
                    <p>{spell.description}</p>
                </div>
            ))}
        </div>
    );
}