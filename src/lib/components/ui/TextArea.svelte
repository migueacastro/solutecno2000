<script lang="ts">
	/**
	 * Área de texto con el mismo wrapper de TextField. `mono` da el estilo del
	 * editor de tokens JSON (fuente monoespaciada compacta). `spellcheck` va
	 * off por defecto porque los valores que se editan son hex o JSON.
	 */
	let {
		id,
		label,
		value = $bindable(''),
		help,
		error,
		rows = 12,
		mono = false,
		spellcheck = false,
		class: cls = ''
	}: {
		id: string;
		label: string;
		value?: string;
		help?: string;
		error?: string;
		rows?: number;
		mono?: boolean;
		spellcheck?: boolean;
		class?: string;
	} = $props();
</script>

<div>
	<label for={id} class="block text-[13px] font-medium text-(--app-text)">{label}</label>
	<textarea
		{id}
		{rows}
		{spellcheck}
		bind:value
		aria-invalid={error ? 'true' : undefined}
		class="mt-1 w-full cursor-text rounded border border-(--app-border) bg-(--app-bg) px-3 py-2 text-(--app-text) outline-none focus:border-(--app-primary) {mono
			? 'font-mono text-[12px] leading-5'
			: 'text-[14px]'} {cls}"></textarea>
	{#if help}
		<p class="mt-1 text-[12px] text-(--app-text-muted)">{help}</p>
	{/if}
	{#if error}
		<p class="mt-1 text-[12px] text-(--app-tone-critical-text)">{error}</p>
	{/if}
</div>
