<script>
    import { untrack } from "svelte";
    import { appState, AppMode } from "../context/appState.svelte.js";

    let {
        pageNumber,
        drawing = null,
        onDrawingChange = () => {},
        rightPage = false,
    } = $props();

    // Must match the layout bounds defined in DraggableBox.svelte
    const LAYOUT_MIN_TOP = 5;
    const LAYOUT_MIN_LEFT = 10;
    const LAYOUT_MAX_TOP = 180;
    const LAYOUT_MAX_LEFT = 138;

    const styles = getComputedStyle(document.documentElement);
    const unitWidthPercent = parseFloat(
        styles.getPropertyValue("--unit-width"),
    );
    const unitHeightPercent = parseFloat(
        styles.getPropertyValue("--unit-height"),
    );

    const UNITS_WIDE = LAYOUT_MAX_LEFT - LAYOUT_MIN_LEFT;
    const UNITS_TALL = LAYOUT_MAX_TOP - LAYOUT_MIN_TOP;
    // Fixed backing-store resolution per grid unit — decoupled from on-screen
    // size so nothing needs to redraw on resize. Raise for crisper pixel-art
    // blocks / smoother curves, at the cost of memory and save size.
    const PIXELS_PER_UNIT = 6;
    const CANVAS_W = UNITS_WIDE * PIXELS_PER_UNIT;
    const CANVAS_H = UNITS_TALL * PIXELS_PER_UNIT;

    const MAX_UNDO_STEPS = 20;

    let isDrawMode = $derived(appState.mode === AppMode.DRAWING);

    // --- Tool state ---
    let submode = $state("regular"); // 'regular' | 'pixel'
    let erasing = $state(false);
    let color = $state("#000000");
    let hexText = $derived(color.replace("#", ""));
    let brushSize = $state(4); // regular: line width in backing px. pixel: grid cells per side.
    let opacity = $state(1);

    let mainCanvasEl = $state(null);
    let overlayCanvasEl = $state(null);
    let mainCtx = null;
    let overlayCtx = null;

    // Plain (non-reactive) history stacks — these hold large ImageData
    // buffers and don't need Svelte's proxy wrapping.
    let undoStack = [];
    let redoStack = [];
    let undoCount = $state(0);
    let redoCount = $state(0);

    let isDrawing = false;
    let lastX = 0,
        lastY = 0;
    let lastCol = null,
        lastRow = null;
    let pendingPoints = [];
    let rafId = null;

    $effect(() => {
        pageNumber;
        if (!mainCanvasEl || !overlayCanvasEl) return;
        if (!mainCtx) mainCtx = mainCanvasEl.getContext("2d");
        if (!overlayCtx) overlayCtx = overlayCanvasEl.getContext("2d");
        loadPageDrawing(untrack(() => drawing));
    });

    function loadPageDrawing(dataUrl) {
        undoStack = [];
        redoStack = [];
        undoCount = 0;
        redoCount = 0;
        mainCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        if (dataUrl) {
            const img = new Image();
            img.onload = () => mainCtx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
            img.src = dataUrl;
        }
    }

    function toCanvasCoords(event) {
        const rect = mainCanvasEl.getBoundingClientRect();
        const bx = ((event.clientX - rect.left) / rect.width) * CANVAS_W;
        const by = ((event.clientY - rect.top) / rect.height) * CANVAS_H;
        return { bx, by };
    }

    function pushUndoSnapshot() {
        const snap = mainCtx.getImageData(0, 0, CANVAS_W, CANVAS_H);
        undoStack.push(snap);
        if (undoStack.length > MAX_UNDO_STEPS) undoStack.shift();
        redoStack = [];
        undoCount = undoStack.length;
        redoCount = 0;
    }

    function commitStroke() {
        mainCtx.save();
        mainCtx.globalAlpha = opacity;
        mainCtx.globalCompositeOperation = erasing
            ? "destination-out"
            : "source-over";
        mainCtx.drawImage(overlayCanvasEl, 0, 0);
        mainCtx.restore();
        overlayCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        persist();
    }

    function persist() {
        onDrawingChange(mainCanvasEl.toDataURL("image/png"));
    }

    // --- Pixel mode painting ---
    function paintCellBlock(col, row) {
        const n = Math.round(brushSize);
        const startCol = col - Math.floor((n - 1) / 2);
        const startRow = row - Math.floor((n - 1) / 2);
        overlayCtx.fillStyle = color;
        overlayCtx.fillRect(
            startCol * PIXELS_PER_UNIT,
            startRow * PIXELS_PER_UNIT,
            n * PIXELS_PER_UNIT,
            n * PIXELS_PER_UNIT,
        );
    }

    function paintPixelLine(col0, row0, col1, row1) {
        // Bresenham between grid cells so a fast drag doesn't leave gaps.
        let dx = Math.abs(col1 - col0),
            sx = col0 < col1 ? 1 : -1;
        let dy = -Math.abs(row1 - row0),
            sy = row0 < row1 ? 1 : -1;
        let err = dx + dy;
        let col = col0,
            row = row0;
        for (;;) {
            paintCellBlock(col, row);
            if (col === col1 && row === row1) break;
            const e2 = 2 * err;
            if (e2 >= dy) {
                err += dy;
                col += sx;
            }
            if (e2 <= dx) {
                err += dx;
                row += sy;
            }
        }
    }

    // --- Regular mode painting ---
    function strokeSegment(x0, y0, x1, y1) {
        overlayCtx.strokeStyle = color;
        overlayCtx.lineWidth = brushSize;
        overlayCtx.lineCap = "round";
        overlayCtx.lineJoin = "round";
        overlayCtx.beginPath();
        overlayCtx.moveTo(x0, y0);
        overlayCtx.lineTo(x1, y1);
        overlayCtx.stroke();
        // Filled dot at the start so a plain click/tap still registers.
        overlayCtx.beginPath();
        overlayCtx.arc(x0, y0, brushSize / 2, 0, Math.PI * 2);
        overlayCtx.fillStyle = color;
        overlayCtx.fill();
    }

    function flushPending() {
        rafId = null;
        if (!pendingPoints.length) return;
        for (const { bx, by } of pendingPoints) {
            if (submode === "pixel") {
                const col = Math.floor(bx / PIXELS_PER_UNIT);
                const row = Math.floor(by / PIXELS_PER_UNIT);
                if (lastCol === null) paintCellBlock(col, row);
                else paintPixelLine(lastCol, lastRow, col, row);
                lastCol = col;
                lastRow = row;
            } else {
                strokeSegment(lastX, lastY, bx, by);
                lastX = bx;
                lastY = by;
            }
        }
        pendingPoints = [];
    }

    function handlePointerDown(event) {
        if (!isDrawMode) return;
        event.preventDefault();
        isDrawing = true;
        pushUndoSnapshot();
        overlayCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        const { bx, by } = toCanvasCoords(event);
        lastX = bx;
        lastY = by;
        lastCol = Math.floor(bx / PIXELS_PER_UNIT);
        lastRow = Math.floor(by / PIXELS_PER_UNIT);
        if (submode === "pixel") paintCellBlock(lastCol, lastRow);
        else strokeSegment(bx, by, bx, by);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
    }

    function handlePointerMove(event) {
        if (!isDrawing) return;
        const { bx, by } = toCanvasCoords(event);
        pendingPoints.push({ bx, by });
        if (rafId === null) rafId = requestAnimationFrame(flushPending);
    }

    function handlePointerUp() {
        if (!isDrawing) return;
        isDrawing = false;
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            flushPending();
        }
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        commitStroke();
    }

    function undo() {
        if (!undoStack.length) return;
        redoStack.push(mainCtx.getImageData(0, 0, CANVAS_W, CANVAS_H));
        const snap = undoStack.pop();
        mainCtx.putImageData(snap, 0, 0);
        undoCount = undoStack.length;
        redoCount = redoStack.length;
        persist();
    }

    function redo() {
        if (!redoStack.length) return;
        undoStack.push(mainCtx.getImageData(0, 0, CANVAS_W, CANVAS_H));
        const snap = redoStack.pop();
        mainCtx.putImageData(snap, 0, 0);
        undoCount = undoStack.length;
        redoCount = redoStack.length;
        persist();
    }

    function handleKeydown(event) {
        if (!isDrawMode) return;
        if (event.target && event.target.tagName === "INPUT") return;
        const ctrlOrCmd = event.ctrlKey || event.metaKey;
        if (!ctrlOrCmd) return;
        if (event.key === "z" || event.key === "Z") {
            event.preventDefault();
            if (event.shiftKey) redo();
            else undo();
        } else if (event.key === "y" || event.key === "Y") {
            event.preventDefault();
            redo();
        }
    }

    $effect(() => {
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    });

    function setSubmode(next) {
        submode = next;
        const max = next === "pixel" ? 10 : 60;
        if (brushSize > max) brushSize = max;
    }

    function onHexInput(event) {
        const raw = event.target.value.trim().replace(/^#/, "");
        if (/^[0-9a-fA-F]{6}$/.test(raw) || /^[0-9a-fA-F]{3}$/.test(raw)) {
            color = "#" + raw.toLowerCase();
        }
    }
</script>

<div
    class="drawing-layer"
    role="application"
    class:interactive={isDrawMode}
    class:right-page-offset-px-layout={rightPage}
    style="top: calc(var(--unit-height-px) * {LAYOUT_MIN_TOP}); left: calc(var(--unit-width-px) * {LAYOUT_MIN_LEFT}); width: calc(var(--unit-width-px) * {UNITS_WIDE}); height: calc(var(--unit-height-px) * {UNITS_TALL});"
    onpointerdown={handlePointerDown}
>
    <canvas
        bind:this={mainCanvasEl}
        width={CANVAS_W}
        height={CANVAS_H}
        class="draw-canvas"
    ></canvas>
    <canvas
        bind:this={overlayCanvasEl}
        width={CANVAS_W}
        height={CANVAS_H}
        class="draw-canvas overlay"
    ></canvas>
</div>

{#if isDrawMode}
    <div class="drawing-toolbar" class:right-page-offset-px-layout={rightPage}>
        <div class="tool-group modes" aria-label="Drawing mode">
            <button
                class:active={submode === "regular"}
                onclick={() => setSubmode("regular")}>Pen</button
            >
            <button
                class:active={submode === "pixel"}
                onclick={() => setSubmode("pixel")}>Pixel</button
            >
            <button class:active={erasing} onclick={() => (erasing = !erasing)}>
                Erase
            </button>
        </div>

        <div class="tool-group color-group">
            <label for="drawing-color">Color</label>
            <input id="drawing-color" type="color" bind:value={color} />
            <input
                class="hex-input"
                type="text"
                value={hexText}
                oninput={onHexInput}
                placeholder="hex"
                maxlength="7"
                aria-label="Hex color"
            />
        </div>

        <label class="slider-group">
            <span>Size <output>{brushSize}</output></span>
            <input
                type="range"
                min="1"
                max={submode === "pixel" ? 10 : 60}
                bind:value={brushSize}
                class="slider"
            />
        </label>
        <label class="slider-group">
            <span>Opacity <output>{Math.round(opacity * 100)}%</output></span>
            <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                bind:value={opacity}
            />
        </label>

        <div class="tool-group history">
            <button onclick={undo} disabled={undoCount === 0}>Undo</button>
            <button onclick={redo} disabled={redoCount === 0}>Redo</button>
        </div>
    </div>
{/if}

<style>
    .drawing-layer {
        position: absolute;
        top: calc(var(--unit-height-px) * 2);
        pointer-events: none;
        z-index: 99;
    }
    .tool-group,
    .slider-group {
        min-width: 0;
    }
    .tool-group {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: calc(var(--unit-height-px) * 1);
    }
    .modes,
    .history {
        flex-direction: column;
        align-items: stretch;
    }
    .drawing-toolbar button {
        box-sizing: border-box;
        width: 100%;
        height: calc(var(--unit-height-px) * 7);
        padding: 0;
        border: 1px solid var(--darker-brown);
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.22);
        color: var(--dark-red);
        font: inherit;
        white-space: nowrap;
        writing-mode: vertical-rl;
        text-orientation: mixed;
        cursor: pointer;
        font-size: calc(var(--unit-width-px) * 3.2);
    }
    .drawing-toolbar button:disabled {
        cursor: default;
        opacity: 0.45;
    }
    .color-group {
        flex-direction: column;
        align-items: stretch;
        overflow: hidden;
    }
    .color-group label,
    .slider-group span {
        font-weight: bold;
        white-space: nowrap;
        writing-mode: vertical-rl;
        text-orientation: mixed;
    }
    .color-group input[type="color"] {
        flex: 0 0 calc(var(--unit-height-px) * 5);
        width: 100%;
        height: calc(var(--unit-height-px) * 5);
        padding: 0;
    }
    .hex-input {
        box-sizing: border-box;
        min-width: 0;
        width: 100%;
        height: calc(var(--unit-height-px) * 20);
        padding: 0;
        font: inherit;
        writing-mode: vertical-rl;
        text-orientation: mixed;
    }
    .slider-group {
        display: flex;
        flex-direction: row;
        align-items: center;
        writing-mode: vertical-rl;
        text-orientation: rtl;
    }
    .slider-group span {
        display: block;
        flex: 0 0 calc(var(--unit-width-px) * 24);
    }
    .slider-group input {
        width: calc(var(--unit-height-px) * 5);
        height: calc(var(--unit-width-px) * 24);
        min-width: 0;
        margin: 0;
        writing-mode: vertical-lr;
        direction: rtl;
    }
    .slider-group output {
        font-weight: normal;
        writing-mode: vertical-lr;
        direction: rtl;
    }
    .drawing-toolbar {
        position: absolute;
        top: 0;
        left: 0;
        gap: calc(var(--unit-width-px) * 2);
        z-index: 600;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        box-sizing: border-box;
        font-size: calc(var(--unit-width-px) * 3.2);
        width: calc(var(--unit-width-px) * 5);
        height: 100%;
        padding: calc(var(--unit-height-px) * 1) 0;
    }
    .drawing-toolbar.right-page-offset-px-layout {
        left: auto;
        right: 0;
        transform: none;
    }
    .drawing-toolbar button.active {
        background: var(--dark-red);
        color: white;
    }
    .drawing-toolbar input[type="text"] {
        width: 100%;
    }
    .slider {
        writing-mode: vertical-lr;
        direction: rtl;
    }
    .drawing-layer.interactive {
        pointer-events: auto;
        cursor: crosshair;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
    }
    .draw-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }
    .draw-canvas.overlay {
        pointer-events: none;
    }
</style>
