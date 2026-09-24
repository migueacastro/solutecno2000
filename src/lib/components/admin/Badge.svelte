<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Badge de status estilo Polaris (§2.4 del doc de patrones).
	 * Vocabulario de tonos fijo: Draft=info, Active=success, Open=caution,
	 * "On hold"=warning, "Action required"=critical.
	 */
	type Tone = 'info' | 'success' | 'caution' | 'warning' | 'critical' | 'neutral' | 'none';

	let { tone = 'neutral', children }: { tone?: Tone; children: Snippet } = $props();

	// Superficies semánticas de `@shopify/polaris-tokens@9.4.2`, con el color
	// de texto oscuro coherente por tono.
	const estilos: Record<Tone, { bg: string; text: string }> = {
		info: { bg: '#EAF4FF', text: '#003A5A' },
		success: { bg: '#CDFED4', text: '#014B40' },
		caution: { bg: '#FFF8DB', text: '#4F4700' },
		warning: { bg: '#FFF1E3', text: '#5E4200' },
		critical: { bg: '#FEE8EB', text: '#8E0B21' },
		neutral: { bg: '#E3E3E3', text: '#303030' },
		none: { bg: 'transparent', text: '#303030' }
	};

	const estilo = $derived(estilos[tone]);
</script>

<span
	class="inline-flex items-center rounded-full font-semibold whitespace-nowrap"
	style="background: {estilo.bg}; color: {estilo.text}; padding: 2px 8px; font-size: 13px; line-height: 16px;"
>
	{@render children()}
</span>
