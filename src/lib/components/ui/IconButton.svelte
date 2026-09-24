<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Botón solo-iconos. Dos formas:
	 * - circle: toggle flotantes (tema/idioma), h-9 con borde y fondo surface.
	 * - square: acciones compactas del sidebar, h-8 sin borde ni fondo.
	 * El caller añade extras vía `class` (min-w-9 px-2 del toggle de idioma,
	 * md:hidden, shrink-0, etc.). `label` es obligatorio por accesibilidad.
	 */
	type Shape = 'circle' | 'square';

	let {
		shape = 'circle',
		label,
		onclick,
		children,
		class: cls = '',
		...rest
	}: {
		shape?: Shape;
		label: string;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
		class?: string;
	} = $props();

	const look = $derived(
		shape === 'circle'
			? 'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-(--app-border) bg-(--app-surface) text-(--app-text) transition-colors hover:bg-black/2'
			: 'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-(--app-text) hover:bg-black/2'
	);
</script>

<button type="button" {onclick} aria-label={label} class="{look} {cls}" {...rest}>
	{@render children()}
</button>
