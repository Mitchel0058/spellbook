import { Route, Switch } from 'wouter'
import { useEffect } from 'preact/hooks'
import Home from './components/Home'
import Settings from './components/Settings'
import Spells from './components/Spells'
import { SettingsProvider } from './context/SettingsContext'
import { SettingsDB, SpellbookDB } from './utils/db'
// import './css/spellbook.css';
import './css/root.css'

export default function App() {
    useEffect(() => {
        const loadData = async () => {
            try {
                // Initialize the spellbook database
                const currentSpellbook = await SpellbookDB.getCurrentSpellbookName();
                console.log('Current spellbook:', currentSpellbook);

                // Load all spells and notes
                const allSpells = await SpellbookDB.getAllSpells();
                console.log('All spells:', allSpells);

                const allNotes = await SpellbookDB.getAllNotes();
                console.log('All notes:', allNotes);
            } catch (error) {
                console.error('Error loading data:', error);
            }
        };

        loadData();
    }, []);

    return (
        <SettingsProvider>
            <div className="container">
                <Switch>
                    <Route path="/settings" component={Settings} />
                    <Route path="/spells" component={Spells} />
                    <Route path="/" component={Home} />
                </Switch>
            </div>
        </SettingsProvider>
    )
}

