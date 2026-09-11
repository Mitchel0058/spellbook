<script>
    let { symbol, color = "#000000" } = $props();
</script>

{#if symbol}
    <svg
        class="symbol-icon"
        viewBox="0 0 {symbol.width} {symbol.height}"
        preserveAspectRatio="none"
        shape-rendering="crispEdges"
        style="width: calc(var(--unit-width-px) * {symbol.width}); height: calc(var(--unit-height-px) * {symbol.height});"
    >
        {#each symbol.cells as [x, y]}
            <rect {x} {y} width="1" height="1" fill={color} />
        {/each}
    </svg>
{/if}

<style>
    .symbol-icon {
        display: block;
        pointer-events: none;
    }
</style>
