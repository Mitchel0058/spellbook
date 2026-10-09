<script>
    let { modal, rightPage } = $props();

    function isVisible(option) {
        if (!option.showIf) return true;
        const { key, value, values, notValue } = option.showIf;
        const current = modal.state.values[key];
        if (values) return values.includes(current);
        if (notValue !== undefined) return current !== notValue;
        return current === value;
    }

    function getDefaultValue(option) {
        if (option.default !== undefined) return option.default;
        if (
            modal.state.defaultValues &&
            Object.prototype.hasOwnProperty.call(
                modal.state.defaultValues,
                option.key,
            )
        ) {
            return modal.state.defaultValues[option.key];
        }
        return option.min ?? 0;
    }

    function normalizeHexColor(value) {
        if (typeof value !== "string") return null;
        const trimmed = value.trim();
        const withoutHash = trimmed.startsWith("#")
            ? trimmed.slice(1)
            : trimmed;

        if (
            !/^[0-9a-fA-F]{3}$/.test(withoutHash) &&
            !/^[0-9a-fA-F]{6}$/.test(withoutHash)
        ) {
            return null;
        }

        const expanded =
            withoutHash.length === 3
                ? withoutHash
                      .split("")
                      .map((char) => char + char)
                      .join("")
                : withoutHash;

        return `#${expanded.toLowerCase()}`;
    }

    function resetRange(option) {
        modal.state.values[option.key] = getDefaultValue(option);
        modal.notifyChange();
    }

    function updateRangeFromInput(option, event) {
        const value = Number(event.currentTarget.value);
        if (!Number.isFinite(value)) return;

        const min = option.min ?? -Infinity;
        const max = option.max ?? Infinity;
        const clamped = Math.min(max, Math.max(min, value));
        modal.state.values[option.key] = clamped;
        event.currentTarget.value = String(clamped);
        modal.notifyChange();
    }
</script>

{#if modal.state.open}
    <div class="options-overlay" class:right-page-offset-px-layout={rightPage}>
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
                    {#if isVisible(option)}
                        <div
                            class="option-row"
                            class:option-row-range={option.type === "range"}
                            class:option-row-stacked={option.type ===
                                "page-select" ||
                                option.type === "symbol-select" ||
                                option.type === "choice-group"}
                        >
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
                                <div class="range-control">
                                    <input
                                        id={option.key}
                                        type="range"
                                        min={option.min}
                                        max={option.max}
                                        step={option.step ?? 1}
                                        bind:value={
                                            modal.state.values[option.key]
                                        }
                                        oninput={modal.notifyChange}
                                    />
                                    <input
                                        class="range-value"
                                        type="number"
                                        min={option.min}
                                        max={option.max}
                                        step={option.step ?? 1}
                                        value={modal.state.values[option.key]}
                                        aria-label="{option.label} value"
                                        oninput={(event) =>
                                            updateRangeFromInput(option, event)}
                                    />
                                    <button
                                        type="button"
                                        class="range-reset"
                                        onclick={() => resetRange(option)}
                                    >
                                        ⟳
                                    </button>
                                </div>
                            {:else if option.type === "checkbox"}
                                <input
                                    id={option.key}
                                    type="checkbox"
                                    bind:checked={
                                        modal.state.values[option.key]
                                    }
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
                                <div class="color-control">
                                    <input
                                        type="text"
                                        class="color-text"
                                        value={normalizeHexColor(
                                            modal.state.values[option.key],
                                        ) ?? "#000000"}
                                        placeholder="#RRGGBB"
                                        oninput={(event) => {
                                            const value = event.target.value;
                                            const nextValue =
                                                normalizeHexColor(value);
                                            if (!nextValue) return;
                                            modal.state.values[option.key] =
                                                nextValue;
                                            modal.notifyChange();
                                        }}
                                    />
                                    <input
                                        id={option.key}
                                        type="color"
                                        value={normalizeHexColor(
                                            modal.state.values[option.key],
                                        ) ?? "#000000"}
                                        onchange={(event) => {
                                            const nextValue = normalizeHexColor(
                                                event.target.value,
                                            );
                                            if (!nextValue) return;
                                            modal.state.values[option.key] =
                                                nextValue;
                                            modal.notifyChange();
                                        }}
                                    />
                                </div>
                            {:else if option.type === "choice-group"}
                                {#each option.choices as choice (choice.value)}
                                    <div class="choice-row">
                                        <button
                                            type="button"
                                            class="choice-button"
                                            class:choice-highlighted={choice.highlighted}
                                            onclick={choice.onClick}
                                        >
                                            {choice.label}
                                        </button>
                                        {#if choice.onRename}
                                            <button
                                                type="button"
                                                class="choice-action"
                                                title="Rename"
                                                onclick={choice.onRename}
                                            >
                                                ✎
                                            </button>
                                        {/if}
                                        {#if choice.onDelete}
                                            <button
                                                type="button"
                                                class="choice-action"
                                                title="Delete"
                                                onclick={choice.onDelete}
                                            >
                                                ✕
                                            </button>
                                        {/if}
                                    </div>
                                {/each}
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
                                            modal.state.values[option.key] =
                                                file;
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
                            {:else if option.type === "page-select"}
                                <div class="page-select">
                                    {#each option.choices as choice (choice.value)}
                                        <label class="page-select-row">
                                            <input
                                                type="checkbox"
                                                checked={(
                                                    modal.state.values[
                                                        option.key
                                                    ] ?? []
                                                ).includes(choice.value)}
                                                onchange={() => {
                                                    const current =
                                                        modal.state.values[
                                                            option.key
                                                        ] ?? [];
                                                    const isSelected =
                                                        current.includes(
                                                            choice.value,
                                                        );
                                                    modal.state.values[
                                                        option.key
                                                    ] = isSelected
                                                        ? current.filter(
                                                              (v) =>
                                                                  v !==
                                                                  choice.value,
                                                          )
                                                        : option.choices
                                                              .map(
                                                                  (c) =>
                                                                      c.value,
                                                              )
                                                              .filter(
                                                                  (v) =>
                                                                      v ===
                                                                          choice.value ||
                                                                      current.includes(
                                                                          v,
                                                                      ),
                                                              );
                                                    modal.notifyChange();
                                                }}
                                            />
                                            {choice.label}
                                        </label>
                                    {/each}
                                </div>
                            {:else if option.type === "symbol-select"}
                                <div class="symbol-select">
                                    {#each option.choices as choice (choice.value)}
                                        <button
                                            type="button"
                                            class="symbol-choice"
                                            class:symbol-choice-selected={modal
                                                .state.values[option.key] ===
                                                choice.value}
                                            title={choice.label}
                                            onclick={() => {
                                                modal.state.values[option.key] =
                                                    choice.value;
                                                modal.notifyChange();
                                            }}
                                        >
                                            {#if choice.cells}
                                                <svg
                                                    viewBox="0 0 {choice.width} {choice.height}"
                                                    preserveAspectRatio="xMidYMid meet"
                                                    shape-rendering="crispEdges"
                                                    class="symbol-choice-svg"
                                                >
                                                    {#each choice.cells as [x, y]}
                                                        <rect
                                                            {x}
                                                            {y}
                                                            width="1"
                                                            height="1"
                                                            fill="currentColor"
                                                        />
                                                    {/each}
                                                </svg>
                                            {:else}
                                                <span
                                                    class="symbol-choice-label"
                                                    >{choice.label}</span
                                                >
                                            {/if}
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/if}
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    .options-overlay {
        position: absolute;
        top: calc(var(--unit-height-px) * 24);
        left: calc(var(--unit-width-px) * 19);
        width: calc(var(--unit-width-px) * 100);
        height: calc(var(--unit-height-px) * 135);
        max-height: calc(var(--unit-height-px) * 135);
        z-index: 9999;
        pointer-events: auto;
        padding: calc(var(--unit-height-px) * 5) calc(var(--unit-width-px) * 5);
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
        gap: var(--unit-height-px);
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

    .option-row-range {
        display: grid;
        grid-template-columns: minmax(0, 42%) minmax(0, 1fr);
    }

    .option-row-range label {
        min-width: 0;
        overflow-wrap: anywhere;
    }

    .range-control {
        display: flex;
        flex: 0 0 auto;
        min-width: 0;
        gap: calc(var(--unit-width-px) * 4);
        width: 100%;
    }

    .range-control input[type="range"] {
        flex: 1 1 0;
        min-width: 0;
        width: 0;
    }

    .range-value {
        box-sizing: border-box;
        flex: 0 0 7ch;
        min-width: 0;
        text-align: right;
    }

    .range-reset {
        all: unset;
        flex: 0 0 auto;
        cursor: pointer;
        font-size: 1rem;
    }

    .color-control {
        display: flex;
        justify-content: end;
        gap: calc(var(--unit-width-px) * 4);
        width: 100%;
    }

    .color-text {
        width: calc(var(--unit-width-px) * 34);
    }

    .choice-group {
        display: flex;
        flex-direction: column;
        gap: calc(var(--unit-height-px) * 4);
        width: 100%;
    }

    .choice-button {
        all: unset;
        cursor: pointer;
        text-align: center;
    }
    .choice-row {
        display: flex;
        align-items: center;
        gap: calc(var(--unit-width-px) * 2);
    }

    .choice-row .choice-button {
        flex: 1;
        min-width: 0;
        overflow-wrap: anywhere;
    }

    .choice-action {
        all: unset;
        cursor: pointer;
        flex: 0 0 auto;
        padding: 0 calc(var(--unit-width-px) * 2);
    }

    .options-header-actions {
        display: flex;
        align-items: center;
        gap: calc(var(--unit-width-px) * 4);
    }

    .image-option {
        display: flex;
        align-items: center;
        gap: calc(var(--unit-width-px) * 4);
    }

    .delete-button {
        all: unset;
        cursor: pointer;
        padding: calc(var(--unit-height-px) * 2) calc(var(--unit-width-px) * 2);
        text-align: center;
        color: #b00020;
        font-weight: bold;
    }

    .choice-button.choice-highlighted {
        background: rgba(255, 215, 0, 0.1);
        font-weight: bold;
    }

    .option-row-stacked {
        flex-direction: column;
        align-items: stretch;
    }

    .page-select {
        display: flex;
        flex-direction: column;
        gap: calc(var(--unit-height-px) * 2);
        max-height: calc(var(--unit-height-px) * 60);
        overflow-y: auto;
    }

    .page-select-row {
        display: flex;
        align-items: center;
        gap: calc(var(--unit-width-px) * 3);
    }

    .symbol-select {
        display: flex;
        flex-wrap: wrap;
        gap: calc(var(--unit-width-px) * 3);
        justify-content: flex-end;
        width: 100%;
    }

    .symbol-choice {
        all: unset;
        cursor: pointer;
        box-sizing: border-box;
        width: calc(var(--unit-width-px) * 14);
        height: calc(var(--unit-height-px) * 14);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(0, 0, 0, 0.2);
        color: #000;
    }

    .symbol-choice-selected {
        border-color: currentColor;
        background: rgba(255, 215, 0, 0.15);
    }

    .symbol-choice-svg {
        width: 80%;
        height: 80%;
    }

    .symbol-choice-label {
        font-size: 0.75rem;
        text-align: center;
    }
</style>
