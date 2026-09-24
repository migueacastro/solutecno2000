<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Superficie de card estilo Polaris. El padding y el ancho los aporta el
	 * caller vía `class` (p-5, p-8 text-center max-w-sm, ...). Radius y sombra
	 * van inline porque son los mismos valores del diseño en todos los casos.
	 */
	let { class: cls = '', children, ...rest }: { class?: string; children: Snippet } = $props();
</script>

<div
	class="bg-(--app-surface) {cls}"
	style="border-radius: 8px; box-shadow: 0 1px 0 rgba(26, 26, 26, 0.07);"
	{...rest}
>
	{@render children()}
</div>
