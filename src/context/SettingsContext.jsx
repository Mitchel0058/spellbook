import { createContext } from 'preact';
import { useState, useContext, useEffect } from 'preact/hooks';
import { SettingsDB, SpellbookDB } from '../utils/db';
import { settingsOptions } from '../constants/settingsOptions';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadCustomFont = async () => {
        try {
            // Load font family
            const fontData = await SpellbookDB.getFont();
            if (fontData && fontData.data) {
                const fontFace = new FontFace('SpellbookFont', `url(${fontData.data})`);
                await fontFace.load();
                document.fonts.add(fontFace);
                document.body.style.fontFamily = 'SpellbookFont, MagicSchool, sans-serif';
            } else {
                // Reset to default font if no custom font
                document.body.style.fontFamily = 'MagicSchool, sans-serif';
            }

            // Update font size
            const settings = await SettingsDB.getAll();
            const fontAddition = settings[settingsOptions.FONTADDITION] || 0;
            const fontSize = 3 + (fontAddition / 10);
            document.documentElement.style.setProperty('--reactive-font-size', `${fontSize}vh`);
        } catch (error) {
            console.error('Error loading font:', error);
        }
    };

    useEffect(() => {
        const loadSettings = async () => {
            try {
                setLoading(true);
                const settingsData = await SettingsDB.getAll();
                setSettings(settingsData);
                await loadCustomFont();
                console.log('Settings loaded in context:', settingsData);
            } catch (err) {
                console.error('Error loading settings:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    const updateSetting = async (key, value) => {
        try {
            await SettingsDB.set(key, value);
            setSettings(prev => ({ ...prev, [key]: value }));
            return true;
        } catch (err) {
            console.error('Error updating setting:', err);
            setError(err.message);
            return false;
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, loading, error, updateSetting, loadCustomFont }}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === null) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
