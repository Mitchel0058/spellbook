import { Route, Switch, Router } from 'wouter'
import { useEffect, useState } from 'preact/hooks'
import Home from './components/Home'
import Settings from './components/Settings'
import Spells from './components/Spells'
import { SettingsProvider } from './context/SettingsContext'
import { SettingsDB, SpellbookDB } from './utils/db'
import './css/root.css'
import Notes from './components/Notes'

export default function App() {
    const [firstLoad, setFirstLoad] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Initialize the spellbook database
                const currentSpellbook = await SpellbookDB.getCurrentSpellbookName();
                console.log('Current spellbook:', currentSpellbook);

                // Load custom font if available
                const fontData = await SpellbookDB.getFont();
                if (fontData && fontData.data) {
                    const fontFace = new FontFace('SpellbookFont', `url(${fontData.data})`);
                    await fontFace.load();
                    document.fonts.add(fontFace);
                    document.body.style.fontFamily = 'SpellbookFont, MagicSchool, sans-serif';
                }
            } catch (error) {
                console.error('Error loading data:', error);
            }
        };

        loadData();
    }, []);

    if (firstLoad) {
        // TODO: Animation
        const timer = setTimeout(() => {
            setFirstLoad(false);
        }, 1000);
        return (
            <div className="svg-overlay">
                <img className="page-img" src={"assets/img/spellbook_cover.svg"} alt="Cover of DnD book" />
            </div>
        );
    }

    return (
        <SettingsProvider>
            <div className="container">
                <Router base="/spellbook">
                    <Switch>
                        <Route path="/settings" component={Settings} />
                        <Route path="/spells" component={Spells} />
                        <Route path="/notes" component={Notes} />
                        <Route path="/" component={Home} />
                    </Switch>
                </Router>
            </div>
        </SettingsProvider>
    )
}

