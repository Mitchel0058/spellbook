import { Route, Switch } from 'wouter'
import { useEffect } from 'preact/hooks'
import Home from './components/Home'
import Settings from './components/Settings'
import Spells from './components/Spells'
import { SettingsProvider } from './context/SettingsContext'
import { SettingsDB, SpellbookDB } from './utils/db'
import './css/root.css'

export default function App() {
    useEffect(() => {
        const loadData = async () => {
            try {
                // Initialize the spellbook database
                const currentSpellbook = await SpellbookDB.getCurrentSpellbookName();
                console.log('Current spellbook:', currentSpellbook);
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

