<script>
    import { untrack } from "svelte";
    import { EASING, PERSPECTIVE_PX } from "../context/flipState.svelte.js";
    import { PageType } from "../constants/pageType.js";
    import Page from "./Page.svelte";
    import PageLayout from "./PageLayout.svelte";
    import Overview from "./Overview.svelte";
    import Settings from "./Settings.svelte";

    let { flip, slotKind, onLanded } = $props();

    // A flip is two independent elements (front face, back face) that run the
    // same animation. Whichever face is visible in the FIRST half of the flip
    // is "early", the other is "late". Z-index is fixed per element for its
    // whole life, so stacking never depends on timing:
    //   early faces: older flip on top (they sit on the source side)
    //   late faces:  newer flip on top (they land on the destination side)
    const Z_EARLY = 100000;
    const Z_LATE = 100001;

    let frontEl = $state(null);
    let backEl = $state(null);

    const hingeLeft = $derived(flip.hinge === "left");
    const frontFirst = $derived(flip.fromAngle === 0);
    const origin = $derived(hingeLeft ? "0% 50%" : "100% 50%");
    const frontZ = $derived(frontFirst ? Z_EARLY - flip.id : Z_LATE + flip.id);
    const backZ = $derived(frontFirst ? Z_LATE + flip.id : Z_EARLY - flip.id);

    const startContent = $derived({
        slot: flip.startSlot,
        blank: flip.startBlank,
        rightPage: flip.startRightPage,
    });
    const endContent = $derived({
        slot: flip.endSlot,
        blank: flip.endBlank,
        rightPage: flip.endRightPage,
    });
    const frontContent = $derived(frontFirst ? startContent : endContent);
    const backContent = $derived(frontFirst ? endContent : startContent);

    function frontPose(angle) {
        return `perspective(${PERSPECTIVE_PX}px) rotateY(${angle}deg)`;
    }
    // The back face is mirrored about the hinge so that, once the leaf has
    // turned, its content reads correctly on the other side.
    function backPose(angle) {
        const shift = hingeLeft ? flip.rect.width : -flip.rect.width;
        return `perspective(${PERSPECTIVE_PX}px) rotateY(${angle}deg) translateX(${shift}px) rotateY(180deg)`;
    }

    let started = false;
    $effect(() => {
        // A flip can now be armed before its elements are bound, so wait
        // for both.
        if (!flip.armed || started || !frontEl || !backEl) return;
        started = true;
        untrack(startAnimation);
    });

    function startAnimation() {
        const options = {
            duration: flip.duration,
            easing: EASING,
            fill: "forwards",
        };
        const front = frontEl.animate(
            [
                { transform: frontPose(flip.fromAngle) },
                { transform: frontPose(flip.toAngle) },
            ],
            options,
        );
        const back = backEl.animate(
            [
                { transform: backPose(flip.fromAngle) },
                { transform: backPose(flip.toAngle) },
            ],
            options,
        );
        Promise.all([front.finished, back.finished]).then(
            () => onLanded(flip.id),
            () => {}, // cancelled (panel removed); Home has its own fallback timer
        );
    }
</script>

{#snippet face(content)}
    {#if content.blank || content.slot == null}
        <Page
            pageType={content.rightPage ? PageType.BLANK_RIGHT : PageType.BLANK}
            rightPage={content.rightPage}
            showBackground={false}
        />
    {:else if slotKind(content.slot) === "page"}
        <Page
            pageType={content.rightPage ? PageType.BLANK_RIGHT : PageType.BLANK}
            rightPage={content.rightPage}
            showBackground={false}
        >
            <PageLayout
                pageNumber={content.slot - 1}
                rightPage={content.rightPage}
            />
        </Page>
    {:else if slotKind(content.slot) === "overview"}
        <Page
            pageType={content.rightPage ? PageType.BLANK_RIGHT : PageType.BLANK}
            rightPage={content.rightPage}
            showBackground={false}
        >
            <Overview onSelectPage={() => {}} />
        </Page>
    {:else if slotKind(content.slot) === "blank"}
        <Page
            pageType={content.rightPage ? PageType.BLANK_RIGHT : PageType.BLANK}
            rightPage={content.rightPage}
            showBackground={false}
        />
    {:else}
        <Page
            pageType={PageType.TITLE_RIGHT}
            rightPage={true}
            showBackground={true}
        >
            <Settings />
        </Page>
    {/if}
{/snippet}

<div
    class="flip-face"
    bind:this={frontEl}
    style:top="{flip.rect.top}px"
    style:left="{flip.rect.left}px"
    style:width="{flip.rect.width}px"
    style:height="{flip.rect.height}px"
    style:transform-origin={origin}
    style:transform={frontPose(flip.fromAngle)}
    style:z-index={frontZ}
>
    <div class="face-body">
        {@render face(frontContent)}
    </div>
</div>

<div
    class="flip-face"
    bind:this={backEl}
    style:top="{flip.rect.top}px"
    style:left="{flip.rect.left}px"
    style:width="{flip.rect.width}px"
    style:height="{flip.rect.height}px"
    style:transform-origin={origin}
    style:transform={backPose(flip.fromAngle)}
    style:z-index={backZ}
>
    <div class="face-body">
        {@render face(backContent)}
    </div>
</div>

<style>
    .flip-face {
        position: fixed;
        overflow: hidden;
        pointer-events: none;
        will-change: transform;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
    }
    .face-body {
        position: absolute;
        inset: 0;
    }
</style>
