
import { ButtonType, ButtonImages } from '../constants/buttonType';
import { Link } from 'wouter';
import '../css/square-button.css';

export default function SquareButton({ buttonType, onClick, xPosition, yPosition, isLink, linkTo }) {
    // Get image path based on button type
    const getImagePath = (type) => {
        const imageName = ButtonImages[type] || ButtonImages[ButtonType.HOME];
        return `assets/img/buttons/${imageName}`;
    };

    return (
        <>
            {isLink ? (
                <Link to={linkTo} className='interact square-button' style={{ left: `calc(var(--unit-width) * ${xPosition})`, top: `calc(var(--unit-height) * ${yPosition})` }}>
                    <img className={`button-img`} src={getImagePath(buttonType)} alt={`${buttonType} button`} draggable={false} />
                </Link>
            ) : (
                <button className='interact square-button' onClick={onClick} style={{ left: `calc(var(--unit-width) * ${xPosition})`, top: `calc(var(--unit-height) * ${yPosition})` }}>
                    <img className={`button-img`} src={getImagePath(buttonType)} alt={`${buttonType} button`} draggable={false} />
                </button>
            )}
        </>
    );
}