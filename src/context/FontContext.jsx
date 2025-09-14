import { createContext } from 'preact';
import { useState, useContext } from 'preact/hooks';
import { SpellbookDB } from '../utils/db';

const FontContext = createContext(null);

export function FontProvider({ children }) {
    const loadCustomFont = async () => {
        try {
            const fontData = await SpellbookDB.getFont();
            if (fontData && fontData.data) {
                const fontFace = new FontFace('SpellbookFont', `url(${fontData.data})`);
                await fontFace.load();
                document.fonts.add(fontFace);
                document.body.style.fontFamily = 'SpellbookFont, Magneto, sans-serif';
            } else {
                // Reset to default font if no custom font
                document.body.style.fontFamily = 'Magneto, sans-serif';
            }
        } catch (error) {
            console.error('Error loading font:', error);
        }
    };

    return (
        <FontContext.Provider value={{ loadCustomFont }}>
            {children}
        </FontContext.Provider>
    );
}

export const useFont = () => {
    const context = useContext(FontContext);
    if (context === null) {
        throw new Error('useFont must be used within a FontProvider');
    }
    return context;
};