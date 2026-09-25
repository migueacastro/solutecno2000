<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Estado vacío estilo Polaris: título, texto y CTAs opcionales (snippet
	 * `children`). Centrado y con aire vertical para listas sin contenido.
	 */
	let {
		title,
		text,
		children,
		class: cls = ''
	}: {
		title: string;
		text: string;
		children?: Snippet;
		class?: string;
	} = $props();
</script>

<div class="flex flex-col items-center gap-2 py-16 text-center {cls}">
	<h3 class="text-[16px] font-semibold text-(--app-text)">{title}</h3>
	<p class="max-w-md text-[13px] leading-5 text-(--app-text-muted)">{text}</p>
	{#if children}
		<div class="mt-3 flex flex-wrap justify-center gap-2">
			{@render children()}
		</div>
	{/if}
</div>
