<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Botón base estilo Polaris. Variantes:
	 * - primary: relleno con --app-primary (acciones principales).
	 * - secondary: relleno con --app-active-bg (acciones secundarias).
	 * - danger: relleno crítico (confirmaciones destructivas).
	 * - critical-text: solo texto crítico, sin relleno (p. ej. "Quitar").
	 *
	 * El tamaño de tipografía lo aporta el caller vía `class` (p. ej. text-[13px]).
	 * Nota: `cursor-pointer` explícito porque Tailwind v4 deja los botones con
	 * cursor por defecto.
	 */
	type Variant = 'primary' | 'secondary' | 'danger' | 'critical-text';
	type Size = 'sm' | 'md'; // sm: 6px 12px · md: 8px 16px

	let {
		variant = 'secondary',
		size = 'md',
		type = 'button',
		disabled = false,
		onclick,
		children,
		class: cls = '',
		...rest
	}: {
		variant?: Variant;
		size?: Size;
		type?: 'button' | 'submit';
		disabled?: boolean;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
		class?: string;
	} = $props();

	const pad = $derived(size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2');
	const look = $derived.by(() => {
		switch (variant) {
			case 'primary':
				return 'bg-(--app-primary) text-white hover:opacity-90';
			case 'secondary':
				return 'bg-(--app-active-bg) text-(--app-text) hover:opacity-80';
			case 'danger':
				return 'bg-(--app-tone-critical-text) text-white hover:opacity-90';
			case 'critical-text':
				return 'text-(--app-tone-critical-text) hover:opacity-80';
		}
	});
	// critical-text no lleva padding (es solo texto, como el "Quitar" de settings).
	const padding = $derived(variant === 'critical-text' ? '' : pad);
</script>

<button
	{type}
	{disabled}
	{onclick}
	class="cursor-pointer rounded font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-60 {padding} {look} {cls}"
	{...rest}
>
	{@render children()}
</button>
