import { useState, useEffect } from 'preact/hooks';
import '../css/index.css';
import Page from './Page';
import { PageType } from '../constants/pageTypes';

export default function Home() {
    const [loading, setLoading] = useState(true);
    const [isDoublePage, setIsDoublePage] = useState(window.innerWidth > window.innerHeight);

    // Double page detection based on window size
    useEffect(() => {
        const handleResize = () => {
            setIsDoublePage(window.innerWidth > window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Simulate loading time
    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    const handlePageNavigation = () => {
        // Implement your page navigation logic here
        console.log('Navigate to next page');
    };

    const toggleReorderMode = () => {
        // Implement your reorder mode logic here
        console.log('Toggle reorder mode');
    };

    const goToPage = () => {
        // Implement your go to page logic here
        console.log('Go to page');
    };

    return (
        <>
            {loading ? (
                <div className="svg-overlay">
                    <img className="page-img" src={"assets/img/spellbook_cover_case.svg"} alt="Cover of DnD book" />
                </div>
            ) : (
                <>
                    <Page pageType={PageType.TITLE}>
                        {!isDoublePage && (
                            <button
                                className="interact"
                                id="p1-next"
                                onClick={handlePageNavigation}
                            />
                        )}
                        <button
                            id="toggle-reorder-btn"
                            onClick={toggleReorderMode}
                        >
                            ☰
                        </button>
                        <div id="overview-container">
                            <button
                                className="overview-block"
                                onClick={goToPage}
                            >
                                {/* <img
                                    className="overview-icon"
                                    src="assets/imgs/fireball.webp"
                                    onError={(e) => e.target.src = 'assets/imgs/fireball.webp'}
                                    alt="Overview icon"
                                /> */}
                                <div className="overview-text">Overview</div>
                            </button>
                        </div>
                    </Page >

                    {/* Page 2 */}
                    {isDoublePage && (
                        <Page pageType="right">
                            {isDoublePage && (
                                <button
                                    className="interact"
                                    id="p2-next"
                                    onClick={handlePageNavigation}
                                />
                            )}
                        </Page>
                    )}

                    {/* 
                        <script src="spell.js"></script>
                        <script src="js/settings.js"></script>
                        <script src="js/index.js"></script> 
                    */}
                </>
            )}
        </>
    );
}