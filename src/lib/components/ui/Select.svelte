<script lang="ts">
	/**
	 * Select nativo con label/ayuda/error, espejo de TextField. `value` es
	 * bindable para bind:value. Select nativo (sin appearance-none) para
	 * heredar el picker del navegador; `cursor-pointer` explícito (Tailwind
	 * v4 no lo pone). `bg-(--app-bg)` para destacar dentro de la card.
	 */
	let {
		id,
		label,
		value = $bindable(''),
		options,
		help,
		error,
		disabled = false,
		class: cls = ''
	}: {
		id: string;
		label: string;
		value?: string;
		options: { value: string; label: string }[];
		help?: string;
		error?: string;
		disabled?: boolean;
		class?: string;
	} = $props();
</script>

<div>
	<label for={id} class="block text-[13px] font-medium text-(--app-text)">{label}</label>
	<select
		{id}
		{disabled}
		bind:value
		aria-invalid={error ? 'true' : undefined}
		class="mt-1 w-full cursor-pointer rounded border border-(--app-border) bg-(--app-bg) px-3 py-2 text-[14px] text-(--app-text) outline-none focus:border-(--app-primary) {cls}"
	>
		{#each options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
	{#if help}
		<p class="mt-1 text-[12px] text-(--app-text-muted)">{help}</p>
	{/if}
	{#if error}
		<p class="mt-1 text-[12px] text-(--app-tone-critical-text)">{error}</p>
	{/if}
</div>
