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
        zIndex = 50,
        elementType,
        elementProps = {},
        onDelete = () => {},
        onChange = () => {},
        onPropsChange = () => {},
        rightPage = false,
        isFocused = false,
        groupId = null,
        groupColor = null,
        groupBounds = null, // { top, left, bottom, right, minW, minH } of the whole group
        groupDelta = null, // { l, t, r, b } live edge deltas while a member is dragged
        onGroupDelta = () => {},
        onGroupDeltaEnd = () => {},
        onOpenOptions = () => {},
    } = $props();

    const ZERO = { l: 0, t: 0, r: 0, b: 0 };
    let liveDelta = $state(null); // this box's own gesture (ungrouped)
    let delta = $derived((groupId ? groupDelta : liveDelta) ?? ZERO);

    let posTop = $derived(top + delta.t);
    let posLeft = $derived(left + delta.l);
    let unitsWide = $derived(widthUnits + delta.r - delta.l);
    let unitsTall = $derived(heightUnits + delta.b - delta.t);

    let cssTop = $derived(`${posTop * unitHeightPercent}%`);
    let cssLeft = $derived(`${posLeft * unitWidthPercent}%`);
    let cssWidth = $derived(`${unitsWide * unitWidthPercent}%`);
    let cssHeight = $derived(`${unitsTall * unitHeightPercent}%`);

    const ElementComponent = $derived(elementRegistry[elementType]?.component);

    // --- Drag state (not reactive UI, just tracking during a gesture) ---
    let dragMode = null; // null | 'move' | 'top' | 'right' | ... | 'bottom-right'
    let startPointerX = 0;
    let startPointerY = 0;
    let containerWidthPx = 0;
    let containerHeightPx = 0;
    let startBounds = null;
    let lastDelta = ZERO;

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

    function clamp(value, lo, hi) {
        return Math.max(lo, Math.min(hi, value));
    }

    function setDelta(d) {
        lastDelta = d;
        if (groupId) onGroupDelta(d);
        else liveDelta = d;
    }

    function startDrag(mode, event) {
        if (!isLayoutMode) return;
        event.preventDefault();
        dragMode = mode;

        startPointerX = event.clientX;
        startPointerY = event.clientY;
        lastDelta = ZERO;

        // Bounds of the whole group, or of this box alone.
        startBounds = groupBounds ?? {
            top,
            left,
            bottom: top + heightUnits,
            right: left + widthUnits,
            minW: widthUnits,
            minH: heightUnits,
        };

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

        const unitPxWidth = (containerWidthPx * unitWidthPercent) / 100;
        const unitPxHeight = (containerHeightPx * unitHeightPercent) / 100;

        const dx = unitPxWidth ? snap(dxPx / unitPxWidth) : 0;
        const dy = unitPxHeight ? snap(dyPx / unitPxHeight) : 0;
        const b = startBounds;

        let l = 0,
            t = 0,
            r = 0,
            bt = 0;

        if (dragMode === "move") {
            const mx = clamp(dx, minLeft - b.left, maxLeft - b.right);
            const my = clamp(dy, minTop - b.top, maxTop - b.bottom);
            l = r = mx;
            t = bt = my;
        } else {
            if (dragMode.includes("right")) {
                r = clamp(dx, 1 - b.minW, maxLeft - b.right);
            }
            if (dragMode.includes("left")) {
                l = clamp(dx, minLeft - b.left, b.minW - 1);
            }
            if (dragMode.includes("bottom")) {
                bt = clamp(dy, 1 - b.minH, maxTop - b.bottom);
            }
            if (dragMode.includes("top")) {
                t = clamp(dy, minTop - b.top, b.minH - 1);
            }
        }

        setDelta({ l, t, r, b: bt });
    }

    function endDrag() {
        dragMode = null;
        window.removeEventListener("pointermove", onDrag);
        window.removeEventListener("pointerup", endDrag);

        const d = lastDelta;
        lastDelta = ZERO;

        if (groupId) {
            // The parent applies the delta to every member in the store.
            onGroupDeltaEnd(d);
            return;
        }

        liveDelta = null;
        onChange({
            top: top + d.t,
            left: left + d.l,
            widthUnits: widthUnits + d.r - d.l,
            heightUnits: heightUnits + d.b - d.t,
        });
    }
</script>

<div
    bind:this={boxEl}
    class="draggable-box"
    class:layout-mode={isLayoutMode}
    class:focused={isFocused}
    class:grouped={!!groupId}
    style="top: {cssTop}; left: {cssLeft}; width: {cssWidth}; height: {cssHeight}; z-index: {isFocused
        ? 200
        : zIndex}; --group-color: {groupColor ?? 'var(--dark-red)'};"
    role="application"
    onpointerdown={(e) => startDrag("move", e)}
    ondblclick={() => isLayoutMode && onOpenOptions()}
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
        touch-action: none;
    }

    .draggable-box.layout-mode.grouped:not(.focused) {
        outline: var(--group-color) 2px dashed;
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

    @media (pointer: coarse) {
        .draggable-box.layout-mode .edge,
        .draggable-box.layout-mode .corner:not(.bottom-right) {
            display: none;
        }

        .draggable-box.layout-mode .corner.bottom-right {
            width: calc(var(--unit-width-px) * 8);
            height: calc(var(--unit-height-px) * 8);
            right: calc(var(--unit-width-px) * -2);
            bottom: calc(var(--unit-height-px) * -2);
            background: color-mix(in srgb, var(--dark-red) 80%, transparent);
        }
    }
</style>
