<script>
    import { ButtonType, ButtonImages } from '../constants/buttonType';
    import '../css/square-button.css';

    let { buttonType, onClick, xPosition, yPosition, isLink, linkTo, rightPage = false } = $props();

    function getImagePath(type) {
        const imageName = ButtonImages[type] || ButtonImages[ButtonType.HOME];
        return `assets/img/buttons/${imageName}`;
    }

    let positionStyle = $derived(
        `left: calc(var(--unit-width) * ${xPosition}); top: calc(var(--unit-height) * ${yPosition});`
    );
</script>

{#if isLink}
    <a href={linkTo} class="interact square-button" class:right-page-offset-px={rightPage} style={positionStyle}  >
        <img class="button-img" src={getImagePath(buttonType)} alt={`${buttonType} button`} draggable="false" />
    </a>
{:else}
    <button class="interact square-button" class:right-page-offset-px={rightPage} onclick={onClick} style={positionStyle}>
        <img class="button-img" src={getImagePath(buttonType)} alt={`${buttonType} button`} draggable="false" />
    </button>
{/if}