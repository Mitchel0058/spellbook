<script>
    import {
        layoutSide,
        PATTERN_SIZES,
        PATTERN_UNIT_HEIGHT,
    } from "../lib/borderPatternLayout.js";

    let {
        color = "#000000",
        children,
        variant = "pattern",
        diamondPlacement = "outside",

        showPatterns = true,
        showCorners = true,

        inside = true,
        insideColor1 = "#8f563b",
        insideColor2 = "#a67048",
        fill = true,
        insideFillColor = "#bb8854",

        outerOverlay = true,
        outerOverlayColor = "#fbf236",
        outerOverlayOpacity = 0.25,
    } = $props();

    let frameEl = $state(null);
    let contentWidthPx = $state(0);
    let contentHeightPx = $state(0);
    let unitX = $state(8);
    let unitY = $state(8);
    let ready = $state(false);

    $effect(() => {
        if (!frameEl) return;

        const readUnitVars = () => {
            const cs = getComputedStyle(frameEl);
            const w = parseFloat(cs.getPropertyValue("--unit-width-px"));
            const h = parseFloat(cs.getPropertyValue("--unit-height-px"));
            if (Number.isFinite(w) && w > 0) unitX = w;
            if (Number.isFinite(h) && h > 0) unitY = h;
        };

        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                contentWidthPx = entry.contentRect.width;
                contentHeightPx = entry.contentRect.height;
            }
            readUnitVars();
            ready = true;
        });
        ro.observe(frameEl);

        // ResizeObserver only fires on size changes. The --unit-*-px vars can
        // change without the element itself resizing, so also poll as a backstop.
        let rafId = null;
        const poll = () => {
            readUnitVars();
            rafId = requestAnimationFrame(poll);
        };
        rafId = requestAnimationFrame(poll);

        return () => {
            ro.disconnect();
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    });

    function measureFrame(node) {
        const cs = getComputedStyle(node);
        const w = parseFloat(cs.getPropertyValue("--unit-width-px"));
        const h = parseFloat(cs.getPropertyValue("--unit-height-px"));
        if (Number.isFinite(w) && w > 0) unitX = w;
        if (Number.isFinite(h) && h > 0) unitY = h;

        const rect = node.getBoundingClientRect();
        contentWidthPx = rect.width;
        contentHeightPx = rect.height;
        ready = true;
    }

    let unitsX = $derived(
        Number.isFinite(contentWidthPx / unitX)
            ? Math.max(0, Math.floor(contentWidthPx / unitX))
            : 0,
    );
    let unitsY = $derived(
        Number.isFinite(contentHeightPx / unitY)
            ? Math.max(0, Math.floor(contentHeightPx / unitY))
            : 0,
    );

    let topLayout = $derived(layoutSide(unitsX));
    let bottomLayout = $derived(layoutSide(unitsX));
    let leftLayout = $derived(layoutSide(unitsY));
    let rightLayout = $derived(layoutSide(unitsY));

    // Canonical cells: cy=0 is baseline (nearest border), cy=(H-1) is the
    // outermost tip. Flipped 180deg from the raw source svgs per your correction.
    function cellsFor(pattern) {
        const w = PATTERN_SIZES[pattern];
        const h = PATTERN_UNIT_HEIGHT[pattern];
        return PATTERN_CELLS[pattern].map(([cx, cy]) => [
            w - 1 - cx,
            h - 1 - cy,
        ]);
    }

    const PATTERN_CELLS = {
        large: [
            [2, 0],
            [1, 1],
            [3, 1],
            [8, 1],
            [9, 1],
            [0, 2],
            [2, 2],
            [4, 2],
            [7, 2],
            [10, 2],
            [0, 3],
            [4, 3],
            [6, 3],
            [11, 3],
            [17, 3],
            [18, 3],
            [1, 4],
            [5, 4],
            [12, 4],
            [15, 4],
            [16, 4],
            [19, 4],
            [1, 5],
            [7, 5],
            [8, 5],
            [9, 5],
            [10, 5],
            [13, 5],
            [14, 5],
            [17, 5],
            [18, 5],
            [20, 5],
            [21, 5],
        ],
        medium: [
            [1, 0],
            [2, 0],
            [3, 0],
            [0, 1],
            [4, 1],
            [6, 1],
            [7, 1],
            [0, 2],
            [5, 2],
            [8, 2],
            [10, 2],
            [1, 3],
            [9, 3],
            [11, 3],
        ],
        small: [
            [1, 0],
            [2, 0],
            [0, 1],
            [3, 1],
            [1, 2],
            [4, 2],
            [5, 2],
        ],
    };

    // Raw cell coordinates for the top-left corner, as given - already in its
    // correct final orientation, no flip needed (unlike the patterns).
    const CORNER_SIZE_UNITS = 4;
    const CORNER_CELLS_TL = [
        [0, 0],
        [2, 1],
        [4, 1],
        [1, 2],
        [3, 2],
        [2, 3],
        [1, 4],
        [3, 3],
    ];

    // Rotates a cell's (cx,cy) index within an NxN grid by a multiple of 90deg,
    // clockwise - matching the same rotation direction used for the patterns.
    function rotateCornerCell(cx, cy, angle, N) {
        switch (((angle % 360) + 360) % 360) {
            case 0:
                return [cx, cy];
            case 90:
                return [N - 1 - cy, cx];
            case 180:
                return [N - 1 - cx, N - 1 - cy];
            case 270:
                return [cy, N - 1 - cx];
        }
    }

    function cornerCells(angle) {
        return CORNER_CELLS_TL.map(([cx, cy]) =>
            rotateCornerCell(cx, cy, angle, CORNER_SIZE_UNITS),
        );
    }

    // Max reserved depth (in units) for the pattern margin - "large" is the
    // deepest pattern, so reserving its depth on every side always leaves
    // enough room regardless of which pattern actually gets chosen there.
    const MAX_DEPTH_UNITS = PATTERN_UNIT_HEIGHT.large;

    const DIAMOND_PAD_UNITS = 1; // clearance between content corners and the fill edge
    const DIAMOND_INSIDE_UNITS = 2; // min horizontal thickness of the inside band
    const DIAMOND_BORDER_UNITS = 2; // min horizontal thickness of the border band

    let diamond = $derived.by(() => {
        const wCells = contentWidthPx / unitX;
        const hCells = contentHeightPx / unitY;
        if (wCells <= 0 || hCells <= 0) {
            return { valid: false, extX: 0, extY: 0 };
        }
        const inwards = diamondPlacement === "inside";

        // Edge steepness decides how thick the bands must be (in cells) to
        // keep the staircase connected on very wide or very tall elements.
        const ratio = inwards
            ? wCells / hCells
            : (wCells + 2 * DIAMOND_PAD_UNITS) /
              (hCells + 2 * DIAMOND_PAD_UNITS);
        const stepX = Math.ceil(ratio - 1e-6); // columns the edge moves per row
        const stepY = Math.ceil(1 / ratio - 1e-6); // rows the edge moves per column

        const inX = Math.max(DIAMOND_INSIDE_UNITS, stepX);
        const inY = Math.max(DIAMOND_INSIDE_UNITS, stepY);
        const borX = Math.max(DIAMOND_BORDER_UNITS, stepX);
        const borY = Math.max(DIAMOND_BORDER_UNITS, stepY);

        // a / b = half-width / half-height of the FILL diamond, in cells
        let a, b;
        if (inwards) {
            // outer edge of the border lands exactly on the element's box
            a = wCells / 2 - inX - borX;
            b = hCells / 2 - inY - borY;
        } else {
            // smallest diamond that fully encloses the element
            a = wCells + 2 * DIAMOND_PAD_UNITS;
            b = hCells + 2 * DIAMOND_PAD_UNITS;
        }

        return {
            valid: a > 0 && b > 0,
            a,
            b,
            inX,
            inY,
            borX,
            borY,
            extX: (a + inX + borX) * unitX, // outer half-width in px
            extY: (b + inY + borY) * unitY, // outer half-height in px
        };
    });

    let marginX = $derived(
        variant === "diamond"
            ? unitX *
                  (Math.max(
                      0,
                      Math.ceil((diamond.extX - contentWidthPx / 2) / unitX),
                  ) +
                      2)
            : unitX * (1 + MAX_DEPTH_UNITS),
    );
    let marginY = $derived(
        variant === "diamond"
            ? unitY *
                  (Math.max(
                      0,
                      Math.ceil((diamond.extY - contentHeightPx / 2) / unitY),
                  ) +
                      2)
            : unitY * (1 + MAX_DEPTH_UNITS),
    );

    let svgWidth = $derived(contentWidthPx + marginX * 2);
    let svgHeight = $derived(contentHeightPx + marginY * 2);

    let diamondRects = $derived.by(() => {
        const out = { border: [], inside: [], fill: [] };
        if (variant !== "diamond" || !diamond.valid) return out;

        const { a, b, inX, inY, borX, borY } = diamond;
        const a2 = a + inX;
        const b2 = b + inY;
        const a3 = a2 + borX;
        const b3 = b2 + borY;

        // Snap the centre to a grid line so all four tips come out identical.
        const cx = Math.round((marginX + contentWidthPx / 2) / unitX) * unitX;
        const cy = Math.round((marginY + contentHeightPx / 2) / unitY) * unitY;

        const halfCols = Math.ceil(a3) + 1;
        const halfRows = Math.ceil(b3) + 1;

        // Same rule in every direction: which diamond is this cell centre inside?
        const kindOf = (u, v) => {
            if (u / a + v / b <= 1) return "fill";
            if (u / a2 + v / b2 <= 1) return "inside";
            if (u / a3 + v / b3 <= 1) return "border";
            return null;
        };

        for (let r = -halfRows; r < halfRows; r++) {
            const v = Math.abs(r + 0.5);
            let kind = null;
            let start = 0;

            const flush = (end) => {
                if (kind) {
                    out[kind].push({
                        x: cx + start * unitX,
                        y: cy + r * unitY,
                        w: (end - start) * unitX,
                        h: unitY,
                    });
                }
            };

            for (let c = -halfCols; c < halfCols; c++) {
                const k = kindOf(Math.abs(c + 0.5), v);
                if (k !== kind) {
                    flush(c);
                    kind = k;
                    start = c;
                }
            }
            flush(halfCols);
        }
        return out;
    });

    // Rotate an axis-aligned local rect (lx,ly,lw,lh) by an angle that's a
    // multiple of 90deg, around local origin (0,0), then translate by (ox,oy).
    // Because the angle is always a multiple of 90, the result is always
    // another axis-aligned rect - no arbitrary trigonometry needed.
    function transformRect(lx, ly, lw, lh, ox, oy, angle) {
        let x, y, w, h;
        switch (((angle % 360) + 360) % 360) {
            case 0:
                x = lx;
                y = ly;
                w = lw;
                h = lh;
                break;
            case 90:
                x = -(ly + lh);
                y = lx;
                w = lh;
                h = lw;
                break;
            case 180:
                x = -(lx + lw);
                y = -(ly + lh);
                w = lw;
                h = lh;
                break;
            case 270:
                x = ly;
                y = -(lx + lw);
                w = lh;
                h = lw;
                break;
        }
        return { x: ox + x, y: oy + y, w, h };
    }

    // Build the flat list of {x,y,w,h} rects (in svg-local px coords) for one
    // side's set of pattern items.
    function sideRects(items, side) {
        const rects = [];
        for (const item of items) {
            const pattern = item.pattern;
            const H = PATTERN_UNIT_HEIGHT[pattern];
            let unitAlong, unitDepth, ox, oy, angle;

            if (side === "top") {
                unitAlong = unitX;
                unitDepth = unitY;
                ox = marginX + item.offset * unitX;
                oy = marginY + (-unitY - H * unitY);
                angle = 0;
            } else if (side === "right") {
                unitAlong = unitY;
                unitDepth = unitX;
                ox = marginX + contentWidthPx + unitX + H * unitX;
                oy = marginY + item.offset * unitY;
                angle = 90;
            } else if (side === "bottom") {
                unitAlong = unitX;
                unitDepth = unitY;
                ox = marginX + (item.offset + item.size) * unitX;
                oy = marginY + contentHeightPx + unitY + H * unitY;
                angle = 180;
            } else {
                // left
                unitAlong = unitY;
                unitDepth = unitX;
                ox = marginX + (-unitX - H * unitX);
                oy = marginY + (item.offset + item.size) * unitY;
                angle = 270;
            }

            for (const [cx, cy] of cellsFor(pattern)) {
                const drawY = H - 1 - cy; // baseline (cy=0) at box's own bottom edge
                const lx = cx * unitAlong;
                const ly = drawY * unitDepth;
                rects.push(
                    transformRect(lx, ly, unitAlong, unitDepth, ox, oy, angle),
                );
            }
        }
        return rects;
    }

    let topRects = $derived(sideRects(topLayout.items, "top"));
    let rightRects = $derived(sideRects(rightLayout.items, "right"));
    let bottomRects = $derived(sideRects(bottomLayout.items, "bottom"));
    let leftRects = $derived(sideRects(leftLayout.items, "left"));

    // Base border: one solid rect per side, in svg-local coords.
    let baseTop = $derived({
        x: marginX - unitX,
        y: marginY - unitY,
        w: contentWidthPx + 2 * unitX,
        h: unitY,
    });
    let baseBottom = $derived({
        x: marginX - unitX,
        y: marginY + contentHeightPx,
        w: contentWidthPx + 2 * unitX,
        h: unitY,
    });
    let baseLeft = $derived({
        x: marginX - unitX,
        y: marginY - unitY,
        w: unitX,
        h: contentHeightPx + 2 * unitY,
    });
    let baseRight = $derived({
        x: marginX + contentWidthPx,
        y: marginY - unitY,
        w: unitX,
        h: contentHeightPx + 2 * unitY,
    });

    // Corner tiles always occupy a fixed 5x5-unit footprint (5*unitX by 5*unitY
    // px) at each corner, regardless of rotation - only the artwork inside
    // rotates, not the footprint, since a corner sits at a physical intersection
    // whose size is fixed by the border thickness on both axes.
    let cornerBoxW = $derived(CORNER_SIZE_UNITS * unitX);
    let cornerBoxH = $derived(CORNER_SIZE_UNITS * unitY);

    function cornerRects(originX, originY, angle) {
        return cornerCells(angle).map(([cx, cy]) => ({
            x: originX + cx * unitX,
            y: originY + cy * unitY,
            w: unitX,
            h: unitY,
        }));
    }

    let cornerTLRects = $derived(
        cornerRects(marginX - cornerBoxW, marginY - cornerBoxH, 0),
    );
    let cornerTRRects = $derived(
        cornerRects(marginX + contentWidthPx, marginY - cornerBoxH, 90),
    );
    let cornerBRRects = $derived(
        cornerRects(marginX + contentWidthPx, marginY + contentHeightPx, 180),
    );
    let cornerBLRects = $derived(
        cornerRects(marginX - cornerBoxW, marginY + contentHeightPx, 270),
    );

    // Inside rings: two 1-unit frames just inside the base border, innermost
    // optionally filled with a third color. Guarded against content smaller than
    // the rings themselves.
    let insideFillRect = $derived({
        x: marginX,
        y: marginY,
        w: Math.max(0, contentWidthPx),
        h: Math.max(0, contentHeightPx),
    });
    let insideRing2 = $derived({
        // 1-unit frame, inset 1 unit from content edge (drawn as 4 strips)
        top: { x: marginX, y: marginY + unitY, w: contentWidthPx, h: unitY },
        bottom: {
            x: marginX,
            y: marginY + contentHeightPx - 2 * unitY,
            w: contentWidthPx,
            h: unitY,
        },
        left: {
            x: marginX + unitX,
            y: marginY + unitY,
            w: unitX,
            h: Math.max(0, contentHeightPx - 2 * unitY),
        },
        right: {
            x: marginX + contentWidthPx - 2 * unitX,
            y: marginY + unitY,
            w: unitX,
            h: Math.max(0, contentHeightPx - 2 * unitY),
        },
    });
    let insideRing1 = $derived({
        // 1-unit frame, right at content's edge (touching the base border)
        top: { x: marginX, y: marginY, w: contentWidthPx, h: unitY },
        bottom: {
            x: marginX,
            y: marginY + contentHeightPx - unitY,
            w: contentWidthPx,
            h: unitY,
        },
        left: { x: marginX, y: marginY, w: unitX, h: contentHeightPx },
        right: {
            x: marginX + contentWidthPx - unitX,
            y: marginY,
            w: unitX,
            h: contentHeightPx,
        },
    });

    // Outer semi-transparent overlay: 1-unit band immediately outside the base
    // border, drawn AFTER the patterns so it visually blends over them.
    let outerOverlayRects = $derived({
        top: {
            x: marginX - unitX,
            y: marginY - 2 * unitY,
            w: contentWidthPx + 2 * unitX,
            h: unitY,
        },
        bottom: {
            x: marginX - unitX,
            y: marginY + contentHeightPx + unitY,
            w: contentWidthPx + 2 * unitX,
            h: unitY,
        },
        left: {
            x: marginX - 2 * unitX,
            y: marginY - unitY,
            w: unitX,
            h: contentHeightPx + 2 * unitY,
        },
        right: {
            x: marginX + contentWidthPx + unitX,
            y: marginY - unitY,
            w: unitX,
            h: contentHeightPx + 2 * unitY,
        },
    });
</script>

<div class="border-frame">
    <svg
        class="border-overlay"
        class:is-ready={ready}
        shape-rendering="crispEdges"
        style="left: {-marginX}px; top: {-marginY}px; width: {svgWidth}px; height: {svgHeight}px;"
        viewBox="0 0 {svgWidth} {svgHeight}"
        width={svgWidth}
        height={svgHeight}
    >
        {#if variant === "diamond"}
            {#if fill}
                {#each diamondRects.fill as r}
                    <rect
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        fill={insideFillColor}
                    />
                {/each}
            {/if}
            {#if inside}
                {#each diamondRects.inside as r}
                    <rect
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        fill={insideColor1}
                    />
                {/each}
            {/if}
            {#each diamondRects.border as r}
                <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={color} />
            {/each}
        {:else}
            {#if fill}
                <rect
                    x={insideFillRect.x}
                    y={insideFillRect.y}
                    width={insideFillRect.w}
                    height={insideFillRect.h}
                    fill={insideFillColor}
                />
            {/if}

            <!-- inside rings -->
            {#if inside}
                <rect
                    x={insideRing2.top.x}
                    y={insideRing2.top.y}
                    width={insideRing2.top.w}
                    height={insideRing2.top.h}
                    fill={insideColor2}
                />
                <rect
                    x={insideRing2.bottom.x}
                    y={insideRing2.bottom.y}
                    width={insideRing2.bottom.w}
                    height={insideRing2.bottom.h}
                    fill={insideColor2}
                />
                <rect
                    x={insideRing2.left.x}
                    y={insideRing2.left.y}
                    width={insideRing2.left.w}
                    height={insideRing2.left.h}
                    fill={insideColor2}
                />
                <rect
                    x={insideRing2.right.x}
                    y={insideRing2.right.y}
                    width={insideRing2.right.w}
                    height={insideRing2.right.h}
                    fill={insideColor2}
                />

                <rect
                    x={insideRing1.top.x}
                    y={insideRing1.top.y}
                    width={insideRing1.top.w}
                    height={insideRing1.top.h}
                    fill={insideColor1}
                />
                <rect
                    x={insideRing1.bottom.x}
                    y={insideRing1.bottom.y}
                    width={insideRing1.bottom.w}
                    height={insideRing1.bottom.h}
                    fill={insideColor1}
                />
                <rect
                    x={insideRing1.left.x}
                    y={insideRing1.left.y}
                    width={insideRing1.left.w}
                    height={insideRing1.left.h}
                    fill={insideColor1}
                />
                <rect
                    x={insideRing1.right.x}
                    y={insideRing1.right.y}
                    width={insideRing1.right.w}
                    height={insideRing1.right.h}
                    fill={insideColor1}
                />
            {/if}

            <!-- base border -->
            <rect
                x={baseTop.x}
                y={baseTop.y}
                width={baseTop.w}
                height={baseTop.h}
                fill={color}
            />
            <rect
                x={baseBottom.x}
                y={baseBottom.y}
                width={baseBottom.w}
                height={baseBottom.h}
                fill={color}
            />
            <rect
                x={baseLeft.x}
                y={baseLeft.y}
                width={baseLeft.w}
                height={baseLeft.h}
                fill={color}
            />
            <rect
                x={baseRight.x}
                y={baseRight.y}
                width={baseRight.w}
                height={baseRight.h}
                fill={color}
            />

            <!-- patterns -->
            {#if showPatterns}
                {#each topRects as r}
                    <rect
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        fill={color}
                    />
                {/each}
                {#each rightRects as r}
                    <rect
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        fill={color}
                    />
                {/each}
                {#each bottomRects as r}
                    <rect
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        fill={color}
                    />
                {/each}
                {#each leftRects as r}
                    <rect
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        fill={color}
                    />
                {/each}
            {/if}

            <!-- corners -->
            {#if showCorners}
                {#each cornerTLRects as r}
                    <rect
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        fill={color}
                    />
                {/each}
                {#each cornerTRRects as r}
                    <rect
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        fill={color}
                    />
                {/each}
                {#each cornerBRRects as r}
                    <rect
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        fill={color}
                    />
                {/each}
                {#each cornerBLRects as r}
                    <rect
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        fill={color}
                    />
                {/each}
            {/if}

            <!-- semi-transparent outer overlay, drawn last so it blends over the patterns -->
            {#if outerOverlay}
                <rect
                    x={outerOverlayRects.top.x}
                    y={outerOverlayRects.top.y}
                    width={outerOverlayRects.top.w}
                    height={outerOverlayRects.top.h}
                    fill={outerOverlayColor}
                    opacity={outerOverlayOpacity}
                />
                <rect
                    x={outerOverlayRects.bottom.x}
                    y={outerOverlayRects.bottom.y}
                    width={outerOverlayRects.bottom.w}
                    height={outerOverlayRects.bottom.h}
                    fill={outerOverlayColor}
                    opacity={outerOverlayOpacity}
                />
                <rect
                    x={outerOverlayRects.left.x}
                    y={outerOverlayRects.left.y}
                    width={outerOverlayRects.left.w}
                    height={outerOverlayRects.left.h}
                    fill={outerOverlayColor}
                    opacity={outerOverlayOpacity}
                />
                <rect
                    x={outerOverlayRects.right.x}
                    y={outerOverlayRects.right.y}
                    width={outerOverlayRects.right.w}
                    height={outerOverlayRects.right.h}
                    fill={outerOverlayColor}
                    opacity={outerOverlayOpacity}
                />
            {/if}
        {/if}
    </svg>

    <div class="border-frame__content" bind:this={frameEl} use:measureFrame>
        {@render children?.()}
    </div>
</div>

<style>
    .border-frame {
        position: relative;
        display: inline-block;
        width: 100%;
        height: 100%;
    }
    .border-frame__content {
        position: relative;
        width: 100%;
        height: 100%;
    }
    .border-overlay {
        position: absolute;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0ms ease-out;
    }
    .border-overlay.is-ready {
        opacity: 1;
    }
</style>
