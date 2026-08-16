<script>
    import { untrack } from "svelte";
    import { appState, AppMode } from "../context/appState.svelte.js";
    import { elementRegistry } from "../constants/elementTypes.js";

    const styles = getComputedStyle(document.documentElement);
    const unitWidthPercent = parseFloat(
        styles.getPropertyValue("--unit-width"),
    );
    const unitHeightPercent = parseFloat(
        styles.getPropertyValue("--unit-height"),
    );
    let isLayoutMode = $derived(appState.mode === AppMode.LAYOUT);

    const minTop = 5;
    const minLeft = 10;
    const maxTop = 180;
    const maxLeft = 138;

    let {
        top = (minTop + maxTop) / 2 - 25,
        left = (minLeft + maxLeft) / 2 - 25,
        widthUnits = 50,
        heightUnits = 50,
        zIndex = 0,
        elementType,
        elementProps = {},
        onDelete = () => {},
        onChange = () => {},
        onPropsChange = () => {},
        rightPage = false,
        isFocused = false,
    } = $props();

    let posTop = $state(untrack(() => top));
    let posLeft = $state(untrack(() => left));
    let unitsWide = $state(untrack(() => widthUnits));
    let unitsTall = $state(untrack(() => heightUnits));

    let cssTop = $derived(`${posTop * unitHeightPercent}%`);
    let cssLeft = $derived(`${posLeft * unitWidthPercent}%`);
    let cssWidth = $derived(`${unitsWide * unitWidthPercent}%`);
    let cssHeight = $derived(`${unitsTall * unitHeightPercent}%`);

    const ElementComponent = $derived(elementRegistry[elementType]?.component);

    // --- Drag state (not reactive UI, just tracking during a gesture) ---
    let dragMode = null; // null | 'move' | 'top' | 'right' | 'bottom' | 'left' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    let startPointerX = 0;
    let startPointerY = 0;
    let startTop = 0;
    let startLeft = 0;
    let startWidth = 0;
    let startHeight = 0;
    let containerWidthPx = 0;
    let containerHeightPx = 0;

    let boxEl = $state(null);

    function getContainerSize() {
        const parent = boxEl?.parentElement;
        if (!parent) return { w: 0, h: 0 };
        const rect = parent.getBoundingClientRect();
        return { w: rect.width, h: rect.height };
    }

    function snap(value) {
        return Math.round(value);
    }

    function startDrag(mode, event) {
        if (!isLayoutMode) return;
        event.preventDefault();
        dragMode = mode;

        startPointerX = event.clientX;
        startPointerY = event.clientY;
        startTop = posTop;
        startLeft = posLeft;
        startWidth = unitsWide;
        startHeight = unitsTall;

        const { w, h } = getContainerSize();
        containerWidthPx = w;
        containerHeightPx = h;

        window.addEventListener("pointermove", onDrag);
        window.addEventListener("pointerup", endDrag);
    }

    function onDrag(event) {
        if (!dragMode) return;

        const dxPx = event.clientX - startPointerX;
        const dyPx = event.clientY - startPointerY;

        // Convert pixel delta -> unit delta based on container size
        const unitPxWidth = (containerWidthPx * unitWidthPercent) / 100;
        const unitPxHeight = (containerHeightPx * unitHeightPercent) / 100;

        const dUnitsX = unitPxWidth ? dxPx / unitPxWidth : 0;
        const dUnitsY = unitPxHeight ? dyPx / unitPxHeight : 0;

        if (dragMode === "move") {
            posLeft = Math.max(
                minLeft,
                Math.min(maxLeft - unitsWide, snap(startLeft + dUnitsX)),
            );
            posTop = Math.max(
                minTop,
                Math.min(maxTop - unitsTall, snap(startTop + dUnitsY)),
            );
            return;
        }

        // Resize logic per handle
        const involvesTop = dragMode.includes("top");
        const involvesBottom = dragMode.includes("bottom");
        const involvesLeft = dragMode.includes("left");
        const involvesRight = dragMode.includes("right");

        if (involvesRight) {
            unitsWide = Math.max(
                1,
                Math.min(maxLeft - posLeft, snap(startWidth + dUnitsX)),
            );
        }
        if (involvesLeft) {
            const fixedRightEdge = startLeft + startWidth; // right edge doesn't move
            const rawLeft = startLeft + dUnitsX;
            const clampedLeft = Math.max(
                minLeft,
                Math.min(fixedRightEdge - 1, snap(rawLeft)),
            );
            unitsWide = fixedRightEdge - clampedLeft;
            posLeft = clampedLeft;
        }
        if (involvesBottom) {
            unitsTall = Math.max(
                1,
                Math.min(maxTop - posTop, snap(startHeight + dUnitsY)),
            );
        }
        if (involvesTop) {
            const fixedBottomEdge = startTop + startHeight;
            const rawTop = startTop + dUnitsY;
            const clampedTop = Math.max(
                minTop,
                Math.min(fixedBottomEdge - 1, snap(rawTop)),
            );
            unitsTall = fixedBottomEdge - clampedTop;
            posTop = clampedTop;
        }
    }

    function endDrag() {
        dragMode = null;
        window.removeEventListener("pointermove", onDrag);
        window.removeEventListener("pointerup", endDrag);

        // Report the final position/size back to the shared store
        onChange({
            top: posTop,
            left: posLeft,
            widthUnits: unitsWide,
            heightUnits: unitsTall,
        });
    }
</script>

<div
    bind:this={boxEl}
    class="draggable-box"
    class:layout-mode={isLayoutMode}
    class:focused={isFocused}
    style="top: {cssTop}; left: {cssLeft}; width: {cssWidth}; height: {cssHeight}; z-index: {zIndex};"
    role="application"
    onpointerdown={(e) => startDrag("move", e)}
    class:right-page-offset-px-layout={rightPage}
>
    <div
        class="handle edge top"
        role="button"
        onpointerdown={(e) => {
            e.stopPropagation();
            startDrag("top", e);
        }}
        tabindex="0"
    ></div>
    <div
        class="handle edge bottom"
        role="button"
        onpointerdown={(e) => {
            e.stopPropagation();
            startDrag("bottom", e);
        }}
        tabindex="0"
    ></div>
    <div
        class="handle edge left"
        role="button"
        onpointerdown={(e) => {
            e.stopPropagation();
            startDrag("left", e);
        }}
        tabindex="0"
    ></div>
    <div
        class="handle edge right"
        role="button"
        onpointerdown={(e) => {
            e.stopPropagation();
            startDrag("right", e);
        }}
        tabindex="0"
    ></div>

    <div
        class="handle corner top-left"
        role="button"
        onpointerdown={(e) => {
            e.stopPropagation();
            startDrag("top-left", e);
        }}
        tabindex="0"
    ></div>
    <div
        class="handle corner top-right"
        role="button"
        onpointerdown={(e) => {
            e.stopPropagation();
            startDrag("top-right", e);
        }}
        tabindex="0"
    ></div>
    <div
        class="handle corner bottom-left"
        role="button"
        onpointerdown={(e) => {
            e.stopPropagation();
            startDrag("bottom-left", e);
        }}
        tabindex="0"
    ></div>
    <div
        class="handle corner bottom-right"
        role="button"
        onpointerdown={(e) => {
            e.stopPropagation();
            startDrag("bottom-right", e);
        }}
        tabindex="0"
    ></div>

    <div class="content">
        {#if ElementComponent}
            <ElementComponent
                {...elementProps}
                {onDelete}
                onChange={onPropsChange}
            />
        {/if}
        {#if isLayoutMode}
            <span class="size-label">{unitsWide} &times; {unitsTall}</span>
        {/if}
    </div>
</div>

<style>
    .draggable-box {
        position: absolute;
        box-sizing: border-box;
        user-select: none;
        pointer-events: none; /* let clicks pass through to children by default */
    }

    .draggable-box.layout-mode {
        outline: var(--dark-red) 2px solid;
        cursor: move;
        background: rgba(100, 100, 100, 0.15);
        pointer-events: auto; /* only capture pointer events in layout mode */
    }

    .draggable-box.focused {
        outline: gold 6px solid;
        outline-offset: 2px;
    }

    .content {
        position: relative;
        pointer-events: none;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        font-size: 0.75rem;
        color: #333;
    }

    .size-label {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
        white-space: nowrap;
    }

    .handle {
        display: none;
        position: absolute;
        touch-action: none;
    }

    .draggable-box.layout-mode .handle {
        display: block;
    }

    /* Edges: thin strips along each side, slightly oversized hit area for touch */
    .edge.top,
    .edge.bottom {
        left: 8px;
        right: 8px;
        height: 12px;
        cursor: ns-resize;
    }
    .edge.top {
        top: -6px;
    }
    .edge.bottom {
        bottom: -6px;
    }

    .edge.left,
    .edge.right {
        top: 8px;
        bottom: 8px;
        width: 12px;
        cursor: ew-resize;
    }
    .edge.left {
        left: -6px;
    }
    .edge.right {
        right: -6px;
    }

    /* Corners: small squares, sized generously for touch targets */
    .corner {
        width: 16px;
        height: 16px;
    }
    .corner.top-left {
        top: -8px;
        left: -8px;
        cursor: nwse-resize;
    }
    .corner.top-right {
        top: -8px;
        right: -8px;
        cursor: nesw-resize;
    }
    .corner.bottom-left {
        bottom: -8px;
        left: -8px;
        cursor: nesw-resize;
    }
    .corner.bottom-right {
        bottom: -8px;
        right: -8px;
        cursor: nwse-resize;
    }
</style>
