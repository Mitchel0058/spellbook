<script>
    import { flipState } from "../context/flipState.svelte.js";
    import FlipPanel from "./FlipPanel.svelte";

    let { slotKind, onLanded } = $props();
</script>

<div class="flip-layer" aria-hidden="true">
    {#each flipState.flips as flip (flip.id)}
        <FlipPanel {flip} {slotKind} {onLanded} />
    {/each}
</div>

<style>
    /* One stacking context for every panel. Raise this if anything in the
       static page must be hidden behind the flip, lower it if something
       (menus, modals) must stay above it. */
    .flip-layer {
        position: fixed;
        inset: 0;
        z-index: 9998;
        pointer-events: none;
    }
</style>