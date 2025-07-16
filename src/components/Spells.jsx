import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { PageType } from "../constants/pageTypes";
import Page from "./Page";
import { SpellbookDB } from '../utils/db';
import { spellOptions, DEFAULT_SPELL_OPTIONS } from '../constants/spellOptions';
import '../css/spells.css';
import { Link } from 'wouter';

// Debounce utility function
const useDebounce = (callback, delay) => {
    const [timer, setTimer] = useState(null);

    const debouncedFunction = useCallback((...args) => {
        if (timer) clearTimeout(timer);

        setTimer(
            setTimeout(() => {
                callback(...args);
                setTimer(null);
            }, delay)
        );
    }, [callback, delay, timer]);

    return debouncedFunction;
};

// Animation component to play webm video
const PageTransitionAnimation = ({ type, id, isDoublePage, onAnimationEnd }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            video.play().catch(err => console.error("Failed to play animation:", err));

            // Listen for the end of the animation
            const handleEnded = () => {
                if (onAnimationEnd) onAnimationEnd(id);
            };

            video.addEventListener('ended', handleEnded);
            return () => video.removeEventListener('ended', handleEnded);
        }
    }, [id, onAnimationEnd]);

    // Choose animation based on type and page mode
    const videoSrc = type === 'next'
        ? (isDoublePage ? 'assets/ani/next-page-double.webm' : 'assets/ani/next-page.webm')
        : (isDoublePage ? 'assets/ani/previous-page-double.webm' : 'assets/ani/previous-page.webm');

    return (
        <video
            ref={videoRef}
            className={`page-transition-animation ${type}-animation`}
            muted
            playsInline
        >
            <source src={videoSrc} type="video/webm" />
        </video>
    );
};

export default function Spells() {
    const [isDoublePage, setIsDoublePage] = useState(window.innerWidth > window.innerHeight);
    const [spells, setSpells] = useState([]);
    const [currentSpell, setCurrentSpell] = useState(null);
    const [nextSpell, setNextSpell] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const fileInputRef = useRef(null);
    const nextFileInputRef = useRef(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isUploadingNextImage, setIsUploadingNextImage] = useState(false);

    // Form state for all editable fields
    const [formValues, setFormValues] = useState({
        [spellOptions.NAME]: '',
        [spellOptions.INCANT]: '',
        [spellOptions.SPEED]: '',
        [spellOptions.RANGE]: '',
        [spellOptions.TYPE]: '',
        [spellOptions.DESC]: '',
        [spellOptions.LVL]: 0,
        [spellOptions.ICONURL]: '',
    });

    // Form state for next spell when in double page mode
    const [nextFormValues, setNextFormValues] = useState({
        [spellOptions.NAME]: '',
        [spellOptions.INCANT]: '',
        [spellOptions.SPEED]: '',
        [spellOptions.RANGE]: '',
        [spellOptions.TYPE]: '',
        [spellOptions.DESC]: '',
        [spellOptions.LVL]: 0,
        [spellOptions.ICONURL]: '',
    });

    // Animation state
    const [animations, setAnimations] = useState([]);
    const [animationCounter, setAnimationCounter] = useState(0);

    // Extract page from URL when component mounts
    useEffect(() => {
        const getPageFromUrl = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const pageParam = urlParams.get('page');
            return pageParam ? parseInt(pageParam, 10) : 0;
        };

        const page = getPageFromUrl();
        setCurrentPage(page);

        // Handle URL changes
        const handleUrlChange = () => {
            const newPage = getPageFromUrl();
            setCurrentPage(newPage);
        };

        window.addEventListener('popstate', handleUrlChange);
        return () => window.removeEventListener('popstate', handleUrlChange);
    }, []);

    // Load all spells once
    useEffect(() => {
        const loadSpells = async () => {
            try {
                const allSpells = await SpellbookDB.getAllSpells();
                setSpells(allSpells);
                setLoading(false);
                console.log('All spells loaded:', allSpells.length);
            } catch (error) {
                console.error('Error loading spells:', error);
                setLoading(false);
            }
        };

        loadSpells();
    }, []);

    // When spells or currentPage changes, find the current and next spell
    useEffect(() => {
        if (spells.length > 0) {
            // Find the current spell
            const spell = spells.find(s => s[spellOptions.PAGE] === currentPage);
            setCurrentSpell(spell || null);

            if (spell) {
                // Update form values with current spell data
                setFormValues({
                    [spellOptions.NAME]: spell[spellOptions.NAME] || '',
                    [spellOptions.INCANT]: spell[spellOptions.INCANT] || '',
                    [spellOptions.SPEED]: spell[spellOptions.SPEED] || '',
                    [spellOptions.RANGE]: spell[spellOptions.RANGE] || '',
                    [spellOptions.TYPE]: spell[spellOptions.TYPE] || '',
                    [spellOptions.DESC]: spell[spellOptions.DESC] || '',
                    [spellOptions.LVL]: spell[spellOptions.LVL] || 0,
                    [spellOptions.ICONURL]: spell._iconObjectUrl || spell[spellOptions.ICONURL] || '',
                });
            } else {
                // Clear form values if no spell exists
                setFormValues({
                    [spellOptions.NAME]: '',
                    [spellOptions.INCANT]: '',
                    [spellOptions.SPEED]: '',
                    [spellOptions.RANGE]: '',
                    [spellOptions.TYPE]: '',
                    [spellOptions.DESC]: '',
                    [spellOptions.LVL]: 0,
                    [spellOptions.ICONURL]: '',
                });
            }

            // Find the next spell for double page mode
            const nextPageSpell = spells.find(s => s[spellOptions.PAGE] === currentPage + 1);
            setNextSpell(nextPageSpell || null);

            if (nextPageSpell) {
                // Update next form values with next spell data
                setNextFormValues({
                    [spellOptions.NAME]: nextPageSpell[spellOptions.NAME] || '',
                    [spellOptions.INCANT]: nextPageSpell[spellOptions.INCANT] || '',
                    [spellOptions.SPEED]: nextPageSpell[spellOptions.SPEED] || '',
                    [spellOptions.RANGE]: nextPageSpell[spellOptions.RANGE] || '',
                    [spellOptions.TYPE]: nextPageSpell[spellOptions.TYPE] || '',
                    [spellOptions.DESC]: nextPageSpell[spellOptions.DESC] || '',
                    [spellOptions.LVL]: nextPageSpell[spellOptions.LVL] || 0,
                    [spellOptions.ICONURL]: nextPageSpell._iconObjectUrl || nextPageSpell[spellOptions.ICONURL] || '',
                });
            } else {
                // Clear next form values if no next spell exists
                setNextFormValues({
                    [spellOptions.NAME]: '',
                    [spellOptions.INCANT]: '',
                    [spellOptions.SPEED]: '',
                    [spellOptions.RANGE]: '',
                    [spellOptions.TYPE]: '',
                    [spellOptions.DESC]: '',
                    [spellOptions.LVL]: 0,
                    [spellOptions.ICONURL]: '',
                });
            }
        }
    }, [spells, currentPage]);

    // Save spell function with nextSpell flag
    const saveSpell = async (updatedValues, isNextSpell = false) => {
        try {
            const pageToUse = isNextSpell ? currentPage + 1 : currentPage;
            const existingSpell = isNextSpell ? nextSpell : currentSpell;

            // Remove _iconObjectUrl from updatedValues if it exists
            const cleanUpdatedValues = { ...updatedValues };
            if ('_iconObjectUrl' in cleanUpdatedValues) {
                delete cleanUpdatedValues._iconObjectUrl;
            }

            let spellToSave;

            if (existingSpell) {
                // Create a copy without _iconObjectUrl
                const { _iconObjectUrl, ...cleanSpell } = existingSpell;

                // Update existing spell
                spellToSave = {
                    ...cleanSpell,
                    ...cleanUpdatedValues
                };
            } else {
                // Create new spell if it doesn't exist
                spellToSave = {
                    ...DEFAULT_SPELL_OPTIONS,
                    [spellOptions.PAGE]: pageToUse,
                    ...cleanUpdatedValues
                };
            }

            await SpellbookDB.saveSpell(spellToSave);
            // console.log(`Spell saved successfully for page ${pageToUse}`);
            // TODO: popup

            // For the UI, we can still keep the _iconObjectUrl
            if (existingSpell && existingSpell._iconObjectUrl) {
                spellToSave._iconObjectUrl = existingSpell._iconObjectUrl;
            }

            // Update spells array
            setSpells(prevSpells => {
                const spellExists = prevSpells.some(s => s[spellOptions.PAGE] === pageToUse);
                if (spellExists) {
                    return prevSpells.map(spell => {
                        if (spell[spellOptions.PAGE] === pageToUse) {
                            // Preserve the _iconObjectUrl if it exists in the current spell
                            if (spell._iconObjectUrl && !spellToSave._iconObjectUrl) {
                                spellToSave._iconObjectUrl = spell._iconObjectUrl;
                            }
                            return spellToSave;
                        }
                        return spell;
                    });
                } else {
                    return [...prevSpells, spellToSave];
                }
            });

            // Update current or next spell reference
            if (isNextSpell) {
                setNextSpell(spellToSave);
            } else {
                setCurrentSpell(spellToSave);
            }
        } catch (error) {
            console.error('Error saving spell:', error);
        }
    };

    // Debounced save function - will execute 800ms after last input
    const debouncedSave = useDebounce((updatedValues, isNextSpell = false) => {
        saveSpell(updatedValues, isNextSpell);
    }, 800);

    // Handle input changes for any field
    const handleInputChange = (field, value) => {
        // Special handling for level which should be a number
        if (field === spellOptions.LVL) {
            value = parseInt(value, 10) || 0;
        }

        // Update form values immediately for responsive UI
        setFormValues(prev => ({
            ...prev,
            [field]: value
        }));

        // Debounce the save operation
        debouncedSave({
            ...formValues,
            [field]: value
        });
    };

    // Handle input changes for next spell
    const handleNextInputChange = (field, value) => {
        // Special handling for level which should be a number
        if (field === spellOptions.LVL) {
            value = parseInt(value, 10) || 0;
        }

        // Update form values immediately for responsive UI
        setNextFormValues(prev => ({
            ...prev,
            [field]: value
        }));

        // Debounce the save operation for the next spell
        debouncedSave({
            ...nextFormValues,
            [field]: value,
            [spellOptions.PAGE]: currentPage + 1
        }, true);
    };

    // Toggle edit mode
    const toggleEditMode = () => {
        setEditMode(!editMode);
    };

    // Double page detection based on window size
    useEffect(() => {
        const handleResize = () => {
            setIsDoublePage(window.innerWidth > window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Render editable or static field based on edit mode
    const renderField = (fieldName, className, placeholder) => {
        if (editMode) {
            return (
                <input
                    type={fieldName === spellOptions.LVL ? 'number' : 'text'}
                    className={`${className} editable`}
                    value={formValues[fieldName]}
                    onInput={(e) => handleInputChange(fieldName, e.target.value)}
                    placeholder={placeholder}
                />
            );
        }
        return (
            <div className={className}>
                {currentSpell ? currentSpell[fieldName] : ''}
            </div>
        );
    };

    // Render editable or static field for next spell
    const renderNextField = (fieldName, className, placeholder) => {
        if (editMode) {
            return (
                <input
                    type={fieldName === spellOptions.LVL ? 'number' : 'text'}
                    className={`${className} editable`}
                    value={nextFormValues[fieldName]}
                    onInput={(e) => handleNextInputChange(fieldName, e.target.value)}
                    placeholder={placeholder}
                />
            );
        }
        return (
            <div className={className}>
                {nextSpell ? nextSpell[fieldName] : ''}
            </div>
        );
    };

    // Handle image upload
    const handleImageUpload = async (e, isNextSpell = false) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            if (isNextSpell) {
                setIsUploadingNextImage(true);
            } else {
                setIsUploadingImage(true);
            }

            const pageToUse = isNextSpell ? currentPage + 1 : currentPage;
            const objectUrl = await SpellbookDB.saveSpellImage(pageToUse, file);

            // Create an updated spell object with the new image
            // The database will store only the file, not the objectUrl
            const updatedSpell = {
                ...(isNextSpell ? nextSpell || {} : currentSpell || {}),
                [spellOptions.PAGE]: pageToUse,
                [spellOptions.ICONURL]: file,
                _iconObjectUrl: objectUrl  // This won't be saved to DB, just for UI
            };

            // Remove the _iconObjectUrl before updating the form state
            const updatedFormValues = {
                ...(isNextSpell ? nextFormValues : formValues),
                [spellOptions.ICONURL]: objectUrl
            };

            // Update UI state
            if (isNextSpell) {
                setNextFormValues(updatedFormValues);
                setNextSpell(updatedSpell);
            } else {
                setFormValues(updatedFormValues);
                setCurrentSpell(updatedSpell);
            }

            // Update spells array (the _iconObjectUrl will be removed before saving to DB)
            setSpells(prevSpells => {
                const spellExists = prevSpells.some(s => s[spellOptions.PAGE] === pageToUse);
                if (spellExists) {
                    return prevSpells.map(spell =>
                        spell[spellOptions.PAGE] === pageToUse ? updatedSpell : spell
                    );
                } else {
                    // If it's a new spell, create it with defaults
                    const newSpell = {
                        ...DEFAULT_SPELL_OPTIONS,
                        [spellOptions.PAGE]: pageToUse,
                        [spellOptions.ICONURL]: file,
                        _iconObjectUrl: objectUrl
                    };
                    return [...prevSpells, newSpell];
                }
            });

        } catch (error) {
            console.error('Error uploading image:', error);
        } finally {
            if (isNextSpell) {
                setIsUploadingNextImage(false);
            } else {
                setIsUploadingImage(false);
            }
        }
    };

    // Clean up object URLs when component unmounts
    useEffect(() => {
        return () => {
            // Revoke any object URLs to prevent memory leaks
            spells.forEach(spell => {
                if (spell._iconObjectUrl) {
                    URL.revokeObjectURL(spell._iconObjectUrl);
                }
            });
        };
    }, [spells]);

    // Trigger the file input click when the image is clicked
    const triggerFileInput = (isNextSpell = false) => {
        if (isNextSpell) {
            nextFileInputRef.current?.click();
        } else {
            fileInputRef.current?.click();
        }
    };

    // Navigate to a specific page
    const navigateToPage = (pageNumber) => {
        // Ensure page number is valid
        const newPage = Math.max(0, pageNumber);

        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('page', newPage);
        window.history.pushState({}, '', url);

        // Update current page state
        setCurrentPage(newPage);
    };

    // Play animation function
    const playAnimation = (type) => {
        const newId = animationCounter;
        setAnimationCounter(prev => prev + 1);

        setAnimations(prev => [...prev, { id: newId, type }]);
    };

    // Remove animation after it completes
    const handleAnimationEnd = (animationId) => {
        setAnimations(prev => prev.filter(anim => anim.id !== animationId));
    };

    // Handle page switch button click with animation
    const handlePageSwitch = () => {
        playAnimation('next');
        // Navigate to next page (current page + 2 if in double page mode, otherwise current page + 1)
        navigateToPage(currentPage + (isDoublePage ? 2 : 1));
    };

    // Handle previous page button click with animation
    const handlePreviousPage = () => {
        if (currentPage === 0 || (isDoublePage && currentPage === 1)) return; // Prevent going to negative page numbers
        playAnimation('previous');
        navigateToPage(currentPage - (isDoublePage ? 2 : 1));
    };

    // Delete spell function
    const deleteSpell = async (isNextSpell = false) => {
        try {
            const pageToDelete = isNextSpell ? currentPage + 1 : currentPage;

            // Confirm deletion
            if (!confirm(`Are you sure you want to delete the spell: ${spells[pageToDelete][spellOptions.NAME]}?`)) {
                return;
            }

            // Delete the spell
            await SpellbookDB.deleteSpellByPage(pageToDelete);

            // Get all remaining spells
            let remainingSpells = await SpellbookDB.getAllSpells();

            // Shift all page numbers that are greater than the deleted page
            for (const spell of remainingSpells) {
                if (spell[spellOptions.PAGE] > pageToDelete) {
                    // Shift page number down by one
                    spell[spellOptions.PAGE] -= 1;
                    await SpellbookDB.saveSpell(spell);
                }
            }

            // Update the spells state with the adjusted spells
            // Fetch fresh data after all updates
            const updatedSpells = await SpellbookDB.getAllSpells();
            setSpells(updatedSpells);

            // If we're on the last page and deleted it, go to the previous page
            const highestPage = updatedSpells.length > 0
                ? Math.max(...updatedSpells.map(s => s[spellOptions.PAGE]))
                : -1;

            if (currentPage > highestPage && currentPage > 0) {
                navigateToPage(currentPage - 1);
            } else {
                // Otherwise just refresh the current page view
                setCurrentSpell(null);
                if (isNextSpell) {
                    setNextSpell(null);
                }
            }

            // Show confirmation
            alert(`Spell deleted successfully!`);
        } catch (error) {
            console.error('Error deleting spell:', error);
            alert('Error deleting spell. Please try again.');
        }
    };

    return (
        <>
            <Page pageType={PageType.SPELL}>
                {renderField(spellOptions.NAME, 'text-overlay spellname', 'Spellname')}
                {renderField(spellOptions.INCANT, 'text-overlay incant', 'Incant')}
                {renderField(spellOptions.SPEED, 'text-overlay speed', 'Speed')}
                {renderField(spellOptions.RANGE, 'text-overlay range', 'Range')}
                {renderField(spellOptions.TYPE, 'text-overlay type', 'Type')}

                {editMode
                    ? <textarea
                        value={formValues[spellOptions.DESC]}
                        onInput={(e) => handleInputChange(spellOptions.DESC, e.target.value)}
                        className='description textarea'
                        placeholder='Description'></textarea>
                    : <div className='description'>
                        {currentSpell ? currentSpell[spellOptions.DESC] : ''}
                    </div>}

                {renderField(spellOptions.LVL, 'level', '0')}

                <div className='pageNumber'>
                    {currentPage + 1}
                </div>

                <button className='interact settings-button'></button>
                <Link to='/' className='interact home-button'></Link>
                <button className='interact font-button'></button>
                <button className='interact edit-button' onClick={toggleEditMode}></button>
                {editMode && <button className="interact delete-button" onClick={() => deleteSpell(false)}>X</button>}
                <button className="interact previous-page" onClick={handlePreviousPage}></button>
                {!isDoublePage && <button className="interact next-page" onClick={handlePageSwitch}></button>}

                {editMode ? (
                    <>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e)}
                        />
                        <img
                            className='icon interact'
                            src={formValues[spellOptions.ICONURL] || 'assets/img/fireball.webp'}
                            style={{ objectFit: currentSpell?.[spellOptions.ICONOBJECTFIT] || 'contain' }}
                            alt=""
                            onClick={() => triggerFileInput()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    triggerFileInput();
                                }
                            }}
                            tabIndex={0}
                        />
                        {isUploadingImage && <div className="loading-indicator">Uploading...</div>}
                    </>
                ) : (
                    <img
                        className='icon'
                        src={currentSpell && (currentSpell._iconObjectUrl || currentSpell[spellOptions.ICONURL])
                            ? (currentSpell._iconObjectUrl || currentSpell[spellOptions.ICONURL])
                            : 'assets/img/fireball.webp'}
                        style={currentSpell ? { objectFit: currentSpell[spellOptions.ICONOBJECTFIT] } : {}}
                        alt=""
                    />
                )}
            </Page>

            {isDoublePage && (
                <Page pageType={PageType.SPELLRIGHT}>
                    {renderNextField(spellOptions.NAME, 'text-overlay spellname right-page-offset', 'Spellname')}
                    {renderNextField(spellOptions.INCANT, 'text-overlay incant right-page-offset', 'Incant')}
                    {renderNextField(spellOptions.SPEED, 'text-overlay speed right-page-offset', 'Speed')}
                    {renderNextField(spellOptions.RANGE, 'text-overlay range right-page-offset', 'Range')}
                    {renderNextField(spellOptions.TYPE, 'text-overlay type right-page-offset', 'Type')}

                    {editMode
                        ? <textarea
                            value={nextFormValues[spellOptions.DESC]}
                            onInput={(e) => handleNextInputChange(spellOptions.DESC, e.target.value)}
                            className='description textarea right-page-offset'
                            placeholder='Description'></textarea>
                        : <div className='description right-page-offset'>
                            {nextSpell ? nextSpell[spellOptions.DESC] : ''}
                        </div>}

                    {renderNextField(spellOptions.LVL, 'level right-page-offset', '0')}

                    <div className='pageNumber right-page-offset'>
                        {currentPage + 2}
                    </div>

                    <button className='interact settings-button right-page-offset'></button>
                    <Link to='/' className='interact home-button right-page-offset'></Link>
                    <button className='interact font-button right-page-offset'></button>
                    {editMode && <button className="interact delete-button right-page-offset" onClick={() => deleteSpell(true)}>X</button>}
                    <button className='interact edit-button right-page-offset' onClick={toggleEditMode}></button>
                    {isDoublePage && <button className="interact next-page" onClick={handlePageSwitch}></button>}

                    {editMode ? (
                        <>
                            <input
                                type="file"
                                ref={nextFileInputRef}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, true)}
                            />
                            <img
                                className='icon right-page-offset interact'
                                src={nextFormValues[spellOptions.ICONURL] || 'assets/img/fireball.webp'}
                                style={{ objectFit: nextSpell?.[spellOptions.ICONOBJECTFIT] || 'contain' }}
                                alt=""
                                onClick={() => triggerFileInput(true)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        triggerFileInput(true);
                                    }
                                }}
                                tabIndex={0}
                            />
                            {isUploadingNextImage && <div className="loading-indicator right-page-offset">Uploading...</div>}
                        </>
                    ) : (
                        <img
                            className='icon right-page-offset'
                            src={nextSpell && (nextSpell._iconObjectUrl || nextSpell[spellOptions.ICONURL])
                                ? (nextSpell._iconObjectUrl || nextSpell[spellOptions.ICONURL])
                                : 'assets/img/fireball.webp'}
                            style={nextSpell ? { objectFit: nextSpell[spellOptions.ICONOBJECTFIT] } : {}}
                            alt=""
                        />
                    )}
                </Page>
            )}

            {/* Render all active animations */}
            {animations.map(animation => (
                <PageTransitionAnimation
                    key={animation.id}
                    id={animation.id}
                    type={animation.type}
                    isDoublePage={isDoublePage}
                    onAnimationEnd={handleAnimationEnd}
                />
            ))}
        </>
    );
}