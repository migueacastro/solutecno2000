<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { AppThemeTokens } from '$lib/config/theme';

	/**
	 * Vista previa de la paleta junto al editor JSON: mini-mock con los
	 * tokens del borrador (ya completos, uno por clave) + grid de swatches
	 * nombrados. Los COLORES de datos van inline (vienen de la DB/editor);
	 * el chrome del panel usa tokens --app-* del tema activo.
	 */
	type Props = {
		/** Set completo de 19 tokens del modo que se previsualiza. */
		tokens: AppThemeTokens;
		/** Borrador inválido: se atenúa para dejar claro que es orientativo. */
		dimmed?: boolean;
	};

	let { tokens, dimmed = false }: Props = $props();

	// Reactivo: cambia junto al borrador (no captura el valor inicial).
	const swatches = $derived(Object.keys(tokens) as (keyof AppThemeTokens)[]);
</script>

<div
	class="rounded border border-(--app-border) bg-(--app-bg) p-3 {dimmed ? 'opacity-50' : ''}"
	aria-label={m.admin_settings_preview()}
>
	<!-- Mini-mock: usa los VALORES del borrador (inline), no el tema activo. -->
	<div class="rounded p-2" style="background: {tokens.bg}; border: 1px solid {tokens.border}">
		<div
			class="flex items-center justify-between rounded px-2 py-1"
			style="background: {tokens['nav-bg']}"
		>
			<span class="text-[11px] font-semibold" style="color: {tokens.text}">Aa</span>
			<span
				class="rounded px-2 py-0.5 text-[10px] font-medium"
				style="background: {tokens.primary}; color: {tokens['primary-contrast']}"
			>
				CTA
			</span>
		</div>
		<div
			class="mt-1.5 rounded p-2"
			style="background: {tokens.surface}; border: 1px solid {tokens.border}"
		>
			<span class="text-[11px] font-medium" style="color: {tokens.text}">Card</span>
			<p class="mt-0.5 text-[10px]" style="color: {tokens['text-muted']}">Muted</p>
			<div class="mt-1.5 flex gap-1">
				<span
					class="rounded px-1.5 py-0.5 text-[10px]"
					style="background: {tokens['tone-info-bg']}; color: {tokens['tone-info-text']}"
				>
					Info
				</span>
				<span
					class="rounded px-1.5 py-0.5 text-[10px]"
					style="background: {tokens['tone-success-bg']}; color: {tokens['tone-success-text']}"
				>
					OK
				</span>
				<span
					class="rounded px-1.5 py-0.5 text-[10px]"
					style="background: {tokens['tone-critical-bg']}; color: {tokens['tone-critical-text']}"
				>
					Err
				</span>
			</div>
		</div>
	</div>

	<!-- Swatches: la etiqueta es la clave del token; tooltip con el hex. -->
	<div class="mt-3 flex flex-wrap gap-1.5">
		{#each swatches as key (key)}
			<div
				class="flex w-[calc(33.333%-0.25rem)] flex-col items-center gap-0.5"
				title="{key}: {tokens[key]}"
			>
				<span
					class="h-5 w-full rounded border"
					style="background: {tokens[key]}; border-color: {tokens.border}"
				></span>
				<span class="w-full truncate text-center text-[9px] leading-3 text-(--app-text-muted)">
					{key}
				</span>
			</div>
		{/each}
	</div>
</div>
