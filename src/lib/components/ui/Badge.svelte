<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Badge de status estilo Polaris (§2.4 del doc de patrones).
	 * Vocabulario de tonos fijo: Draft=info, Active=success, Open=caution,
	 * "On hold"=warning, "Action required"=critical.
	 * Tamaños: md (13px, full-rounded, el estándar) y sm (11px, esquinas
	 * cuadradas, para los badges Preset/Activo junto a títulos de settings).
	 */
	type Tone = 'info' | 'success' | 'caution' | 'warning' | 'critical' | 'neutral' | 'none';

	let {
		tone = 'neutral',
		size = 'md',
		children,
		class: cls = ''
	}: {
		tone?: Tone;
		size?: 'md' | 'sm';
		children: Snippet;
		class?: string;
	} = $props();

	// Superficies semánticas de `@shopify/polaris-tokens@9.4.2`, con el color
	// de texto oscuro coherente por tono.
	const colors: Record<Tone, { bg: string; text: string }> = {
		info: { bg: 'var(--app-tone-info-bg)', text: 'var(--app-tone-info-text)' },
		success: { bg: 'var(--app-tone-success-bg)', text: 'var(--app-tone-success-text)' },
		caution: { bg: 'var(--app-tone-caution-bg)', text: 'var(--app-tone-caution-text)' },
		warning: { bg: 'var(--app-tone-warning-bg)', text: 'var(--app-tone-warning-text)' },
		critical: { bg: 'var(--app-tone-critical-bg)', text: 'var(--app-tone-critical-text)' },
		neutral: { bg: 'var(--app-active-bg)', text: 'var(--app-text)' },
		none: { bg: 'transparent', text: 'var(--app-text)' }
	};

	const colorsFor = $derived(colors[tone]);
	const sizeStyle = $derived(
		size === 'sm'
			? 'padding: 1px 6px; font-size: 11px; line-height: 14px; border-radius: 4px;'
			: 'padding: 2px 8px; font-size: 13px; line-height: 16px; border-radius: 9999px;'
	);
</script>

<span
	class="inline-flex items-center font-semibold whitespace-nowrap {cls}"
	style="background: {colorsFor.bg}; color: {colorsFor.text}; {sizeStyle}"
>
	{@render children()}
</span>
