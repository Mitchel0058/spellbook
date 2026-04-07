import '../css/page.css';
import '../css/page-buttons.css';
import { PageType, pageImages } from '../constants/pageTypes';
import { Link } from 'wouter';

export default function Page({ pageType, children, onEditClick, onSettingsClick, isEditMode, isDoublePage }) {
    // Get image path based on page type
    const getImagePath = (type) => {
        const imageName = pageImages[type] || pageImages[PageType.COVER];
        return `assets/img/${imageName}`;
    };

    // // Render buttons based on page type
    // const renderButtons = () => {
    //     switch (pageType) {
    //         case PageType.TITLE:
    //             return (
    //                 <>
    //                     <Link to='/settings' className='interact square-button home__settings-button'></Link>
    //                     <button className="interact square-button home__edit-button" onClick={onEditClick} />
    //                 </>
    //             );
    //         case PageType.SPELL:
    //             return (
    //                 <>
    //                     <Link to='/settings' className='interact square-button spell__settings-button'></Link>
    //                     <Link to='/' className='interact square-button spell__home-button'></Link>
    //                     <button className='interact square-button spell__font-button'></button>
    //                     <button className='interact square-button spell__edit-button' onClick={onEditClick}></button>
    //                 </>
    //             );
    //         case PageType.SPELLRIGHT:
    //             return (
    //                 <>
    //                     <Link to='/settings' className='interact square-button spell__settings-button right-page-offset'></Link>
    //                     <Link to='/' className='interact square-button spell__home-button right-page-offset'></Link>
    //                     <button className='interact square-button spell__font-button right-page-offset'></button>
    //                     <button className='interact square-button spell__edit-button right-page-offset' onClick={onEditClick}></button>
    //                 </>
    //             );
    //         default:
    //             return null;
    //     }
    // };

    return (
        <div className="svg-overlay">
            <img className={`page-img`} src={getImagePath(pageType)} alt={`${pageType} page of DnD book`} draggable={false} />
            {children}
            {/* {renderButtons()} */}
        </div>
    );
}