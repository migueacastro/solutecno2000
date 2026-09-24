<script lang="ts">
	/**
	 * Icono SVG estándar (viewBox 24x24, stroke currentColor) para reemplazar
	 * los bloques svg repetidos a mano. `paths` recibe los <path .../> como
	 * string. aria-hidden: el significado va en el aria-label del botón que
	 * lo envuelve.
	 */
	let {
		paths,
		size = 24,
		class: cls = ''
	}: { paths: string; size?: number; class?: string } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class="shrink-0 {cls}"
	aria-hidden="true"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- paths internos del proyecto, no input de usuario -->
	{@html paths}
</svg>
