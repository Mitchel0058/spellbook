import { SpellbookDB } from "../utils/db";
import { useState, useEffect } from 'preact/hooks';
import '../css/spellsOverview.css';
import { spellOptions } from "../constants/spellOptions";
import { Link } from "wouter";

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
                <Link to={`/spells?page=${spell[spellOptions.PAGE]}`} key={index} className="spell-item">
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
                </Link>
            ))}
            <div className='spells-overview-after' />
        </div>
    );
}