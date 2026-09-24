<script lang="ts">
	/**
	 * Campo de texto con label/ayuda/error. El wrapper reemplaza el patrón
	 * repetido a mano en settings (label + input + help). `value` es bindable
	 * para usarlo con bind:value. `bg-(--app-bg)` (no surface) para que el
	 * input destaque dentro de la card en ambos modos.
	 */
	let {
		id,
		label,
		value = $bindable(''),
		help,
		error,
		type = 'text',
		disabled = false,
		placeholder,
		maxlength,
		class: cls = ''
	}: {
		id: string;
		label: string;
		value?: string;
		help?: string;
		error?: string;
		type?: string;
		disabled?: boolean;
		placeholder?: string;
		maxlength?: number;
		class?: string;
	} = $props();
</script>

<div>
	<label for={id} class="block text-[13px] font-medium text-(--app-text)">{label}</label>
	<input
		{id}
		{type}
		{disabled}
		{placeholder}
		{maxlength}
		bind:value
		aria-invalid={error ? 'true' : undefined}
		class="mt-1 w-full cursor-text rounded border border-(--app-border) bg-(--app-bg) px-3 py-2 text-[14px] text-(--app-text) outline-none focus:border-(--app-primary) {cls}"
	/>
	{#if help}
		<p class="mt-1 text-[12px] text-(--app-text-muted)">{help}</p>
	{/if}
	{#if error}
		<p class="mt-1 text-[12px] text-(--app-tone-critical-text)">{error}</p>
	{/if}
</div>
