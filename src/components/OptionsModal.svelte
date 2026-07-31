<script>
    let { modal, rightPage } = $props();
</script>

{#if modal.state.open}
    <div
        class="options-overlay"
        class:right-page-offset-px-layout={rightPage}
    >
        <img
            class="options-bg"
            src="assets/img/spellbook_modal.svg"
            alt="Modal Background"
            draggable="false"
        />

        <div class="options-content">
            <div class="options-header">
                <span>{modal.state.title}</span>
                <div class="options-header-actions">
                    <button
                        type="button"
                        class="options-close"
                        onclick={modal.close}>✕</button
                    >
                </div>
            </div>

            <div class="options-body">
                {#each modal.state.schema as option (option.key)}
                    <div class="option-row">
                        <label for={option.key}>{option.label}</label>

                        {#if option.type === "select"}
                            <select
                                id={option.key}
                                bind:value={modal.state.values[option.key]}
                                onchange={modal.notifyChange}
                            >
                                {#each option.choices as choice (choice.value)}
                                    <option value={choice.value}
                                        >{choice.label}</option
                                    >
                                {/each}
                            </select>
                        {:else if option.type === "number"}
                            <input
                                id={option.key}
                                type="number"
                                min={option.min}
                                max={option.max}
                                step={option.step ?? 1}
                                bind:value={modal.state.values[option.key]}
                                oninput={modal.notifyChange}
                            />
                        {:else if option.type === "range"}
                            <input
                                id={option.key}
                                type="range"
                                min={option.min}
                                max={option.max}
                                step={option.step ?? 1}
                                bind:value={modal.state.values[option.key]}
                                oninput={modal.notifyChange}
                            />
                            <span class="range-value"
                                >{modal.state.values[option.key]}</span
                            >
                        {:else if option.type === "checkbox"}
                            <input
                                id={option.key}
                                type="checkbox"
                                bind:checked={modal.state.values[option.key]}
                                onchange={modal.notifyChange}
                            />
                        {:else if option.type === "text"}
                            <input
                                id={option.key}
                                type="text"
                                bind:value={modal.state.values[option.key]}
                                oninput={modal.notifyChange}
                            />
                        {:else if option.type === "color"}
                            <input
                                id={option.key}
                                type="color"
                                bind:value={modal.state.values[option.key]}
                                oninput={modal.notifyChange}
                            />
                        {:else if option.type === "choice-group"}
                            <div class="choice-group">
                                {#each option.choices as choice (choice.value)}
                                    <button
                                        type="button"
                                        class="choice-button"
                                        onclick={choice.onClick}
                                    >
                                        {choice.label}
                                    </button>
                                {/each}
                            </div>
                        {:else if option.type === "delete-button"}
                            <button
                                type="button"
                                class="delete-button"
                                onclick={() => {
                                    if (
                                        window.confirm(
                                            option.confirmMessage ??
                                                "Delete this element? This cannot be undone.",
                                        )
                                    ) {
                                        option.onDelete?.();
                                        modal.close();
                                    }
                                }}
                            >
                                {option.label}
                            </button>
                        {:else if option.type === "image"}
                            <div class="image-option">
                                <input
                                    id={option.key}
                                    type="file"
                                    accept="image/*"
                                    onchange={(e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        modal.state.values[option.key] = file;
                                        modal.notifyChange();
                                    }}
                                />
                                {#if modal.state.values[option.key]}
                                    <button
                                        type="button"
                                        class="options-close"
                                        onclick={() => {
                                            modal.state.values[option.key] =
                                                null;
                                            modal.notifyChange();
                                        }}
                                    >
                                        Remove
                                    </button>
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    .options-overlay {
        position: absolute;
        top: calc(var(--unit-height) * 24);
        left: calc(var(--unit-width) * 19);
        width: calc(var(--unit-width) * 100);
        height: calc(var(--unit-height) * 135);
        max-height: 70%;
        z-index: 9999;
        pointer-events: auto;
        padding: calc(var(--unit-height) * 5) calc(var(--unit-width) * 5);
    }

    .options-bg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0.8;
        object-fit: fill;
        pointer-events: none;
        z-index: 0;
    }

    .options-content {
        position: relative; /* sits above the background image */
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: var(--unit-height);
        max-height: 100%;
        box-sizing: border-box;
    }

    .options-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: bold;
    }

    .options-close {
        all: unset;
        cursor: pointer;
    }

    .options-body {
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--unit-height);
    }

    .option-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--unit-height);
    }

    .option-row label {
        flex-shrink: 0;
    }

    .range-value {
        min-width: 2ch;
        text-align: right;
    }

    .choice-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
    }

    .choice-button {
        all: unset;
        cursor: pointer;
        padding: 0.5rem 0.75rem;
        text-align: center;
    }

    .options-header-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .image-option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .delete-button {
        all: unset;
        cursor: pointer;
        padding: 0.5rem 0.75rem;
        text-align: center;
        color: #b00020;
        font-weight: bold;
    }
</style>
