<script>
    import { pageData } from "../context/pageData.svelte.js";

    let { onSelectPage = () => {} } = $props();

    // Pages with showOnOverview = true, paired with their slot number
    // (slot = real array index + 1, since slot 0 is this Overview page).
    let entries = $derived(
        pageData.pages
            .map((page, index) => ({ page, slot: index + 1 }))
            .filter(({ page }) => page.settings.showOnOverview),
    );

    // Object URLs for each entry's overview image, regenerated whenever
    // the entry set changes, and revoked on cleanup to avoid leaks.
    let imageUrls = $state({});

    $effect(() => {
        const nextUrls = {};
        for (const { page } of entries) {
            const blob = page.settings.overviewImage;
            if (blob) {
                nextUrls[page.id] = URL.createObjectURL(blob);
            }
        }
        imageUrls = nextUrls;
        return () => {
            for (const url of Object.values(nextUrls)) {
                URL.revokeObjectURL(url);
            }
        };
    });
</script>

<div class="overview-list">
    {#each entries as { page, slot } (page.id)}
        <button class="overview-row" onclick={() => onSelectPage(slot)}>
            {#if imageUrls[page.id]}
                <img class="overview-thumb" src={imageUrls[page.id]} alt="" />
            {:else}
                <div class="overview-thumb placeholder"></div>
            {/if}
            <span class="overview-name">{page.settings.name || "Untitled"}</span
            >
            <span class="overview-pagenum">{slot}</span>
        </button>
    {/each}
</div>

<style>
    .overview-list {
        position: absolute;
        top: calc(var(--unit-height) * 16);
        left: calc(var(--unit-width) * 20);
        width: calc(var(--unit-width) * 104);
        height: calc(var(--unit-height) * 154);
        display: flex;
        flex-direction: column;
        gap: calc(var(--unit-height) * 2);
        overflow-y: auto;
    }

    .overview-row {
        all: unset;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: calc(var(--unit-width) * 3);
        width: 100%;
        height: calc(var(--unit-height) * 16);
        box-sizing: border-box;
    }

    .overview-thumb {
        width: calc(var(--unit-width) * 20);
        height: 100%;
        object-fit: contain;
        flex-shrink: 0;
    }

    .overview-thumb.placeholder {
        background: rgba(0, 0, 0, 0.00);
    }

    .overview-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .overview-pagenum {
        flex-shrink: 0;
        text-align: right;
    }
</style>
