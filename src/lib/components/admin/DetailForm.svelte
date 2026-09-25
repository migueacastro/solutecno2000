<script lang="ts">
	import type { Snippet } from 'svelte';
	import SaveBar from '$lib/components/admin/SaveBar.svelte';

	/**
	 * Formulario de detalle estilo Polaris: columna primaria (children) +
	 * aside secundario en desktop, con 2fr/1fr vía FLEX. El error global se
	 * muestra ARRIBA del layout; el SaveBar fijo inferior se renderiza aquí.
	 * NO renderiza `<form>` ni conoce callAction: onSave/onDiscard son del caller.
	 */
	let {
		dirty,
		saving = false,
		error,
		onSave,
		onDiscard,
		children,
		aside,
		class: cls = ''
	}: {
		dirty: boolean;
		saving?: boolean;
		/** Error global (ej. slug_conflict): texto crítico sobre el layout. */
		error?: string;
		onSave: () => void;
		onDiscard: () => void;
		children: Snippet;
		/** Columna lateral (estado, organización, metadata). */
		aside?: Snippet;
		class?: string;
	} = $props();
</script>

<div class="pb-24 {cls}">
	{#if error}
		<p
			class="mb-4 rounded border border-(--app-tone-critical-bg) bg-(--app-tone-critical-bg) px-3 py-2 text-[13px] text-(--app-tone-critical-text)"
		>
			{error}
		</p>
	{/if}

	<!-- Columna principal + aside: flex-row con wrap desde lg. -->
	<div class="flex flex-col gap-6 lg:flex-row lg:items-start">
		<div class="min-w-0 flex-1">
			{@render children()}
		</div>
		{#if aside}
			<div class="w-full shrink-0 lg:w-80">
				{@render aside()}
			</div>
		{/if}
	</div>

	<SaveBar {dirty} {saving} {onSave} {onDiscard} />
</div>
