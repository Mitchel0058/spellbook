import { createContext } from 'preact';
import { useState, useContext, useEffect } from 'preact/hooks';
import { SettingsDB } from '../utils/db';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                setLoading(true);
                const settingsData = await SettingsDB.getAll();
                setSettings(settingsData);
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
        <SettingsContext.Provider value={{ settings, loading, error, updateSetting }}>
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
