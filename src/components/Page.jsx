import '../css/page.css';
import { PageType, pageImages } from '../constants/pageTypes';

export default function Page({ pageType, children }) {
    // Get image path based on page type
    const getImagePath = (type) => {
        // TODO: different fallback page type
        const imageName = pageImages[type] || pageImages[PageType.COVER];
        return `assets/img/${imageName}`;
    };

    return (
        <div className="svg-overlay">
            <img className={`page-img`} src={getImagePath(pageType)} alt={`${pageType} page of DnD book`} draggable={false} />
            {children}
        </div>
    );
}